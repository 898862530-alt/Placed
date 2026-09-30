import {pageMarkup,esc,imageSizes} from './layout.js';
import {animateSheet} from './page-curl.js';
const $=s=>document.querySelector(s);let book,at=0,zoom=1,pan={x:0,y:0},down,lastFocus,turning=false;
const spread=$('#spread'),lb=$('#lightbox'),image=$('#detail-image');
function render(){const pages=book.pages;spread.innerHTML=pageMarkup(pages[at],at)+pageMarkup(pages[at+1],at+1);$('#page-count').textContent=`${String(at+1).padStart(2,'0')} — ${String(Math.min(at+2,pages.length)).padStart(2,'0')} / ${String(pages.length).padStart(2,'0')}`;$('#prev').disabled=at===0;$('#next').disabled=at+2>=pages.length;$('#chapter-label').textContent=pages.slice(0,at+2).findLast(p=>p.type==='chapter')?.title||book.title;}
function pageElement(index){const holder=document.createElement('div');holder.innerHTML=pageMarkup(book.pages[index],index);return holder.firstElementChild}
async function ready(root){await Promise.all([...root.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})))}
async function navigate(next,direction){
 if(turning)return;turning=true;spread.setAttribute('aria-busy','true');
 try{
  const front=spread.children[direction>0?1:0].cloneNode(true),back=pageElement(direction>0?next:next+1),under=pageElement(direction>0?next+1:next);
  // Decode all four faces before changing a single visible layer.
  await Promise.all([ready(front),ready(back),ready(under)]);
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
   spread.children[direction>0?1:0].replaceWith(under);
   await animateSheet(spread,front,back,direction);
  }
  at=next;render();preload();
 }finally{turning=false;spread.removeAttribute('aria-busy')}
}
const prefetched=new Set();
function preload(){
 if(navigator.connection?.saveData)return;
 for(const p of book.pages.slice(at+2,at+4)){
  if(p.type!=='photo'||prefetched.has(p.image))continue;
  const img=new Image();img.decoding='async';img.fetchPriority='low';
  if(p.variants?.length){img.sizes=imageSizes(p);img.srcset=p.variants.map(v=>v.url+' '+v.width+'w').join(',')}
  img.src=p.image;prefetched.add(p.image);
 }
}
function turn(n){if(turning||lb.open||$('#contents').open)return;const next=Math.max(0,Math.min(Math.floor((book.pages.length-1)/2)*2,at+n*2));if(next===at)return;navigate(next,n);}
$('#prev').onclick=()=>turn(-1);$('#next').onclick=()=>turn(1);
function transform(){image.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;image.style.cursor=zoom>1?'grab':'zoom-in';$('#zoom-reset').textContent=Math.round(zoom*100)+'%';}
function setZoom(v){zoom=Math.min(4,Math.max(1,v));if(zoom===1)pan={x:0,y:0};transform()}
spread.onclick=async e=>{const btn=e.target.closest('[data-page]');if(!btn||turning)return;const p=book.pages[+btn.dataset.page];lastFocus=btn;const start=btn.getBoundingClientRect();image.src=btn.querySelector('img').currentSrc||p.image;const detail=p.detail||p.image;const full=new Image();full.src=detail;full.decode().then(()=>{if(lb.open&&lastFocus===btn)image.src=detail}).catch(()=>{});image.alt=p.title||'摄影作品';$('#lightbox-title').textContent=[p.title,p.location,p.date].filter(Boolean).join(' · ');setZoom(1);lb.showModal();try{await image.decode()}catch{}if(!lb.open)return;const end=image.getBoundingClientRect();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)image.animate([{transform:`translate(${start.x+start.width/2-end.x-end.width/2}px,${start.y+start.height/2-end.y-end.height/2}px) scale(${start.width/end.width})`,opacity:.7},{transform:'translate(0,0) scale(1)',opacity:1}],{duration:380,easing:'cubic-bezier(.2,.7,.2,1)'});};
$('#close-lightbox').onclick=()=>lb.close();lb.addEventListener('close',()=>{setZoom(1);lastFocus?.focus()});$('#zoom-in').onclick=()=>setZoom(zoom+.5);$('#zoom-out').onclick=()=>setZoom(zoom-.5);$('#zoom-reset').onclick=()=>setZoom(1);
image.ondragstart=e=>e.preventDefault();const stage=$('#lightbox-stage');stage.onpointerdown=e=>{down={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y,moved:false};stage.setPointerCapture(e.pointerId)};stage.onpointermove=e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>5)down.moved=true;if(zoom>1){const bx=Math.max(0,(image.clientWidth*zoom-stage.clientWidth)/2),by=Math.max(0,(image.clientHeight*zoom-stage.clientHeight)/2);pan={x:Math.max(-bx,Math.min(bx,down.px+dx)),y:Math.max(-by,Math.min(by,down.py+dy))};transform()}};stage.onpointerup=()=>{if(down&&!down.moved)setZoom(zoom===1?2:1);down=null};stage.onpointercancel=()=>down=null;
$('#index-toggle').onclick=()=>$('#contents').showModal();$('#close-contents').onclick=()=>$('#contents').close();$('#contents-list').onclick=e=>{const b=e.target.closest('[data-at]');if(b){const next=Math.floor(+b.dataset.at/2)*2,direction=Math.sign(next-at);$('#contents').close();if(direction)navigate(next,direction)}};
document.addEventListener('keydown',e=>{if(lb.open){if(e.key==='+'||e.key==='=')setZoom(zoom+.5);if(e.key==='-')setZoom(zoom-.5);return}if($('#contents').open)return;if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();turn(1)}if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();turn(-1)}});
let touch;spread.addEventListener('touchstart',e=>touch=e.touches[0],{passive:true});spread.addEventListener('touchend',e=>{if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.clientX,dy=t.clientY-touch.clientY;if(Math.max(Math.abs(dx),Math.abs(dy))>60)turn((Math.abs(dx)>Math.abs(dy)?dx:dy)<0?1:-1);touch=null},{passive:true});
try{const res=await fetch('./book.json',{cache:'no-cache'});if(!res.ok)throw Error();book=await res.json();if(!book.pages.length)book.pages=[{type:'text',title:'来过之地',text:'PLACES, ONCE HERE',template:'center'},{type:'text',title:'',text:'摄影集正在整理中。',template:'center'}];document.title=book.title+' · 摄影集';$('#contents-list').innerHTML=book.pages.map((p,i)=>p.type==='chapter'||i===0?`<button data-at="${i}"><span>${esc(p.title||'开始阅读')}</span><span>${String(i+1).padStart(2,'0')}</span></button>`:'').join('');render();preload()}catch{spread.innerHTML='<div class="page text-page"><p>摄影集暂时未能加载，请刷新重试。</p></div>';$('#prev').disabled=$('#next').disabled=true;$('#index-toggle').disabled=true}
