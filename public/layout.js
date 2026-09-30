export const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function pageMarkup(p, i, source) {
 if (!p) return '<div class="page blank-page" aria-label="空白页"></div>';
 if (p.type !== 'photo') return `<article class="page text-page ${esc(p.template || 'center')}"><div class="text-block">${p.type==='chapter'?'<span class="chapter-kicker">CHAPTER / '+String(p.chapter||1).padStart(2,'0')+'</span>':''}<h2>${esc(p.title)}</h2><p>${esc(p.text)}</p></div><span class="folio">${String(i+1).padStart(2,'0')}</span></article>`;
 const meta=[p.location,p.date,p.film,p.format].filter(Boolean);
 return `<article class="page photo-page"><div class="photo-area"><button class="photo-frame size-${esc(p.size||'large')}" data-page="${i}" aria-label="细读 ${esc(p.title||'作品 '+(i+1))}" style="--ratio:${Number(p.ratio)||1.5}"><img src="${esc(source||p.image)}" alt="${esc(p.title||p.description||'摄影作品')}" draggable="false"></button></div><div class="caption">${p.title?`<span class="photo-title">${esc(p.title)}</span>`:''}${meta.length?`<span class="photo-meta">${meta.map(esc).join(' · ')}</span>`:''}${p.description?`<span class="photo-description">${esc(p.description)}</span>`:''}</div><span class="folio">${String(i+1).padStart(2,'0')}</span></article>`;
}
export function cropRect(width,height,ratio,zoom=1,x=.5,y=.5){
 ratio=ratio||width/height; zoom=Math.max(1,Math.min(4,zoom));
 let w=width,h=w/ratio;if(h>height){h=height;w=h*ratio}w/=zoom;h/=zoom;
 return {sx:(width-w)*Math.max(0,Math.min(1,x)),sy:(height-h)*Math.max(0,Math.min(1,y)),sw:w,sh:h};
}
