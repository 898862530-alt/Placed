import http from 'node:http';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual} from 'node:crypto';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.dirname(fileURLToPath(import.meta.url)),PRIVATE=path.resolve(process.env.DATA_DIR||path.join(ROOT,'.private'));
const PORT=Number(process.env.PORT||4317),origin=(process.env.PUBLIC_ORIGIN||`http://127.0.0.1:${PORT}`).replace(/\/$/,''),remote=Boolean(process.env.PUBLIC_ORIGIN);
const token=process.env.AUTHOR_ACCESS_TOKEN||randomBytes(32).toString('hex'),session=randomBytes(32).toString('hex');let consumed=false,busy=false,mutationQueue=Promise.resolve();
const authorName=process.env.AUTHOR_USERNAME||'',passwordHash=process.env.AUTHOR_PASSWORD_HASH||'',loginAttempts=new Map();
const authorPath=(process.env.AUTHOR_PATH||'author').replace(/^\/+|\/+$/g,'');if(!/^[a-zA-Z0-9_-]{3,96}$/.test(authorPath))throw Error('AUTHOR_PATH 只能使用字母、数字、下划线和连字符');
const authorBase=`/${authorPath}/`;
const PUBLISHED=remote?path.join(PRIVATE,'published'):path.join(ROOT,'public');
await fs.mkdir(path.join(PRIVATE,'originals'),{recursive:true,mode:0o700});
await fs.mkdir(PUBLISHED,{recursive:true,mode:0o700});
const initial={title:'来过之地',assets:[],pages:[]};
async function draft(){try{return JSON.parse(await fs.readFile(path.join(PRIVATE,'draft.json'),'utf8'))}catch(e){if(e.code==='ENOENT')return structuredClone(initial);throw e}}
async function atomic(file,data){const temp=file+'.'+randomUUID()+'.tmp';await fs.writeFile(temp,data,{mode:0o600});await fs.rename(temp,file)}
async function body(req,max=100*1024*1024){let chunks=[],length=0;for await(const c of req){length+=c.length;if(length>max)throw Object.assign(Error('文件太大，请使用 100 MB 以下的图像'),{status:413});chunks.push(c)}return Buffer.concat(chunks)}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
function equal(a,b){return a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b))}
function authorized(req){return (req.headers.cookie||'').split(';').some(c=>equal(c.trim(),`author=${session}`))}
function checkPassword(password){const [salt,expected]=passwordHash.split(':');if(!salt||!expected)return false;const actual=scryptSync(password,salt,64).toString('hex');return equal(actual,expected)}
function validate(data){if(!data||!Array.isArray(data.pages)||data.pages.length>1000)throw Error('无效的作品集');for(const p of data.pages){if(!['photo','text','chapter'].includes(p.type))throw Error('无效页面');for(const key of ['title','text','description','location','date','film','format'])if(p[key]!=null&&(typeof p[key]!=='string'||p[key].length>3000))throw Error('文字过长或格式无效');if(p.type==='photo'&&(!Number.isFinite(p.ratio)||p.ratio<.1||p.ratio>10))throw Error('无效画幅比例')}}
async function sendFile(res,file){try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data)}catch(e){if(e.code==='ENOENT'){res.writeHead(404);res.end('Not found')}else throw e}}
const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
try{
 if(req.headers.host!==new URL(origin).host){res.writeHead(403);return res.end('Invalid host')}
 const url=new URL(req.url,origin),route=url.pathname;
 if(route===authorBase+'session'&&req.method==='POST'){
  if(req.headers.origin!==origin)throw Object.assign(Error('拒绝跨站请求'),{status:403});
  const ip=req.socket.remoteAddress||'unknown',record=loginAttempts.get(ip)||{count:0,until:0};
  if(record.until>Date.now())throw Object.assign(Error('尝试次数过多，请稍后再试'),{status:429});
  let accepted=false;
  if(passwordHash){const credentials=JSON.parse((await body(req,4096)).toString());accepted=equal(String(credentials.username||''),authorName)&&checkPassword(String(credentials.password||''));}
  else{const value=(await body(req,1024)).toString();accepted=!consumed&&equal(value,token);if(accepted)consumed=true;}
  if(!accepted){record.count++;if(record.count>=5){record.until=Date.now()+15*60_000;record.count=0}loginAttempts.set(ip,record);throw Object.assign(Error('账号或密码不正确'),{status:401})}
  loginAttempts.delete(ip);res.setHeader('Set-Cookie',`author=${session}; HttpOnly; SameSite=Strict; Path=/${remote?'; Secure':''}`);res.writeHead(204);return res.end();
 }
 if(route===authorBase+'login.js')return sendFile(res,path.join(ROOT,'admin/login.js'));
 if(route===authorBase&&!authorized(req))return sendFile(res,path.join(ROOT,'admin/login.html'));
 if(route.startsWith('/api/')||route.startsWith('/originals/')||route.startsWith(authorBase)){
  if(!authorized(req))throw Object.assign(Error('请先登录作者账号'),{status:401});
  if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==origin)throw Object.assign(Error('拒绝跨站请求'),{status:403});
 }
 if(route.startsWith('/api/')&&!['GET','HEAD'].includes(req.method)){let release;const previous=mutationQueue;mutationQueue=new Promise(resolve=>release=resolve);await previous;res.once('finish',release);res.once('close',release)}
 if(route==='/api/draft'&&req.method==='GET'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(await draft()))}
 if(route==='/api/draft'&&req.method==='PUT'){const data=JSON.parse(await body(req,8*1024*1024));validate(data);const old=await draft();data.assets=old.assets;await atomic(path.join(PRIVATE,'draft.json'),JSON.stringify(data,null,2));return res.end('{}')}
 if(route==='/api/assets'&&req.method==='POST'){
  const buffer=await body(req);let ext;
  if(buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff)ext='.jpg';
  else if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))ext='.png';
  else if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')ext='.webp';
  else throw Error('请上传 JPEG、PNG 或 WebP 图像；TIFF / HEIC 请先导出为 JPEG');
  const id=randomUUID(),asset={id,name:decodeURIComponent(req.headers['x-filename']||'未命名照片').slice(0,200),url:`/originals/${id}${ext}`};await fs.writeFile(path.join(PRIVATE,'originals',id+ext),buffer,{mode:0o600});const data=await draft();data.assets.push(asset);await atomic(path.join(PRIVATE,'draft.json'),JSON.stringify(data,null,2));res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(asset));
 }
 if(route==='/api/publish'&&req.method==='POST'){
  if(busy)throw Error('正在生成，请稍后');busy=true;
  try{const data=JSON.parse(await body(req,250*1024*1024));validate(data);const version=randomUUID(),dir=path.join(PUBLISHED,'images',version);await fs.mkdir(dir,{recursive:true});const pages=[];
   for(let i=0;i<data.pages.length;i++){const p=data.pages[i],out={};for(const key of ['type','title','text','template','chapter','location','date','film','format','description','size','ratio'])if(p[key]!==undefined)out[key]=p[key];
    if(p.type==='photo'){if(typeof p.rendered!=='string'||!p.rendered.startsWith('data:image/jpeg;base64,'))throw Error('照片导出失败');const bytes=Buffer.from(p.rendered.split(',')[1],'base64');if(bytes.length>20*1024*1024||bytes[0]!==255||bytes[1]!==216)throw Error('图像格式无效');await fs.writeFile(path.join(dir,`${i}.jpg`),bytes);out.image=`./images/${version}/${i}.jpg`}pages.push(out)}
   await atomic(path.join(PUBLISHED,'book.json'),JSON.stringify({title:'来过之地',pages},null,2));
   res.end(JSON.stringify({ok:true,pages:pages.length,message:'发布版本已生成，可以预览；推送到 GitHub 后自动上线。'}));
  }finally{busy=false}return;
 }
 if(route.startsWith('/originals/')){const name=route.slice(11);if(!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(name))throw Error('无效路径');return sendFile(res,path.join(PRIVATE,'originals',name))}
 if(route.startsWith(authorBase)){const name=route===authorBase?'index.html':route.slice(authorBase.length);if(!['index.html','admin.js','admin.css'].includes(name))throw Object.assign(Error('Not found'),{status:404});return sendFile(res,path.join(ROOT,'admin',name))}
 if(req.method!=='GET'&&req.method!=='HEAD')throw Object.assign(Error('Method not allowed'),{status:405});
 if(remote&&(route==='/book.json'||route.startsWith('/images/'))){const published=path.resolve(PUBLISHED,'.'+route);if(!published.startsWith(PUBLISHED+path.sep))throw Object.assign(Error('Forbidden'),{status:403});try{await fs.access(published);return sendFile(res,published)}catch(e){if(e.code!=='ENOENT')throw e}}
 const rel=decodeURIComponent(route==='/'?'/index.html':route);const file=path.resolve(ROOT,'public','.'+rel);if(!file.startsWith(path.join(ROOT,'public')+path.sep))throw Object.assign(Error('Forbidden'),{status:403});return sendFile(res,file);
}catch(e){if(!res.headersSent){res.writeHead(e.status||400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}))}else res.end()}});
server.listen(PORT,remote?'0.0.0.0':'127.0.0.1',()=>{console.log(`游客预览：${origin}/`);if(passwordHash)console.log(`作者工作台：${origin}${authorBase}`);else console.log(`作者工作台（私密链接）：${origin}${authorBase}#${token}`)});
