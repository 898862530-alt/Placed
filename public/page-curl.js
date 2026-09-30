// The folded region is reflected across the bisector of the moving corner.
export function clipHalfPlane(points,n,d,side=1){
 const out=[];
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],da=(a.x*n.x+a.y*n.y-d)*side,db=(b.x*n.x+b.y*n.y-d)*side;
  if(da>=-1e-8)out.push(a);
  if((da>0&&db<0)||(da<0&&db>0)){const t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})}
 }return out;
}
export function calculatePageCurl(progress,width,height){
 const p=Math.max(.000001,Math.min(.999999,progress));
 const corner={x:width*(1-2*p),y:height*.24*Math.sin(Math.PI*p)**2};
 const dx=width-corner.x,dy=-corner.y,length=Math.hypot(dx,dy),n={x:dx/length,y:dy/length};
 const d=n.x*(width+corner.x)/2+n.y*corner.y/2;
 const rect=[{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}];
 const front=clipHalfPlane(rect,n,d,-1),fold=clipHalfPlane(rect,n,d,1);
 const reflection=[1-2*n.x*n.x,-2*n.x*n.y,-2*n.x*n.y,1-2*n.y*n.y,2*d*n.x,2*d*n.y];
 const reflect=q=>({x:reflection[0]*q.x+reflection[2]*q.y+reflection[4],y:reflection[1]*q.x+reflection[3]*q.y+reflection[5]});
 return{front,fold,back:fold.map(reflect),reflection,n,d,corner};
}
export const polygon=points=>points.length?`polygon(${points.map(p=>`${p.x}px ${p.y}px`).join(',')})`:'polygon(0 0,0 0,0 0)';
export function animateSheet(spread,frontPage,backPage,direction){
 const vertical=matchMedia('(max-aspect-ratio: 1.4142/1)').matches;
 const box=spread.getBoundingClientRect(),w=vertical?box.height/2:box.width/2,h=vertical?box.width:box.height;
 const layer=document.createElement('div');layer.className='sheet-layer';layer.inert=true;
 const stage=document.createElement('div');stage.className='sheet-space';stage.style.cssText=`width:${w}px;height:${h}px;transform:${vertical?(direction>0?`matrix(0,1,1,0,0,${w})`:`matrix(0,-1,1,0,0,${w})`):(direction>0?`translateX(${w}px)`:`matrix(-1,0,0,1,${w},0)`)};`;
 const front=document.createElement('div'),back=document.createElement('div'),shadow=document.createElement('div');
 front.className='sheet-front';back.className='sheet-back';shadow.className='sheet-shadow';
 const contentTransform=vertical?(direction>0?'matrix(0,1,1,0,0,0)':`matrix(0,1,-1,0,${w},0)`):(direction>0?'none':`matrix(-1,0,0,1,${w},0)`);
 for(const page of [frontPage,backPage]){page.style.cssText=`width:${vertical?h:w}px;height:${vertical?w:h}px;transform:${contentTransform};transform-origin:0 0;`;page.classList.add('sheet-content')}
 const reverse=document.createElement('div');reverse.className='sheet-reverse';reverse.style.transform=`translateX(${w}px) scaleX(-1)`;reverse.append(backPage);
 const sheen=document.createElement('div');sheen.className='sheet-sheen';back.append(reverse,sheen);front.append(frontPage);stage.append(shadow,front,back);layer.append(stage);spread.append(layer);
 return new Promise(resolve=>{
  const start=performance.now(),duration=1420;
  function frame(now){
   const t=Math.min(1,(now-start)/duration),p=t*t*(3-2*t),state=calculatePageCurl(p,w,h),lift=Math.sin(Math.PI*p);
   front.style.clipPath=polygon(state.front);back.style.clipPath=polygon(state.fold);back.style.transform=`matrix(${state.reflection.join(',')})`;
   shadow.style.clipPath=polygon(state.back);shadow.style.opacity=String(.13*lift);shadow.style.transform=`translate(${4*lift}px,${5*lift}px)`;
   const angle=Math.atan2(state.n.y,state.n.x)*180/Math.PI+90;
   const center=state.n.x*w/2+state.n.y*h/2,stop=state.d-center+(Math.abs(state.n.x)*w+Math.abs(state.n.y)*h)/2;
   sheen.style.background=`linear-gradient(${angle}deg,transparent ${stop-1}px,rgba(64,57,40,${.18*lift}) ${stop+1}px,rgba(255,255,255,${.3*lift}) ${stop+25}px,transparent ${stop+85}px)`;
   if(t<1)requestAnimationFrame(frame);else{layer.remove();resolve()}
  }frame(start);
 });
}
