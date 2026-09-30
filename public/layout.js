export const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const displayDate = value => String(value ?? '').replace(/^(\d{4})-(\d{2})$/,'$1.$2');
const fitSize = (ratio,maxWidth,maxHeight) => {const width=Math.min(maxWidth,maxHeight*ratio);return [width,width/ratio]};
const frameStyle = value => {const ratio=Number(value)||1.5,[fw,fh]=fitSize(ratio,90,60),[lw,lh]=fitSize(ratio,76.5,51),[mw,mh]=fitSize(ratio,54,36),[sw,sh]=fitSize(ratio,27,18);return `--ratio:${ratio};--fill-w:${fw}cqw;--fill-h:${fh}cqw;--large-w:${lw}cqw;--large-h:${lh}cqw;--medium-w:${mw}cqw;--medium-h:${mh}cqw;--small-w:${sw}cqw;--small-h:${sh}cqw`};
const titleMarkup = value => esc(value).replace(/([\u3400-\u9fff\uf900-\ufaff]+)/g,'<span class="zh-title">$1</span>');
export function frameFraction(p){const factor=({fill:1,large:.85,medium:.6,small:.3})[p.size]||.85;return Math.min(.9,.6*(Number(p.ratio)||1.5))*factor}
export function imageSizes(p){const f=frameFraction(p);return `(max-aspect-ratio: 1.4142/1) min(${90*f}vw, ${.7071*f*100}dvh - ${162*.7071*f}px), min(${45.5*f}vw, ${141.42*f}dvh - ${210*1.4142*f}px)`}
export function pageMarkup(p, i, source) {
 if (!p) return '<div class="page blank-page" aria-label="空白页"></div>';
 const parity=i%2===0?'page-odd':'page-even';
 if (p.type !== 'photo') return `<article class="page text-page ${parity} ${p.type==='chapter'?'no-folio':''} ${esc(p.template || 'center')}"><div class="text-block">${p.type==='chapter'?'<span class="chapter-kicker">CHAPTER / '+String(p.chapter||1).padStart(2,'0')+'</span>':''}<h2>${titleMarkup(p.title)}</h2><p>${esc(p.text)}</p></div><span class="folio">${String(i+1).padStart(2,'0')}</span></article>`;
 const meta=[p.location,displayDate(p.date),p.film,p.format].filter(Boolean);
 return `<article class="page photo-page ${parity} ${p.size==='fill'?'no-folio':''}"><div class="photo-area"><button class="photo-frame size-${esc(p.size||'large')}" data-page="${i}" aria-label="细读 ${esc(p.title||'作品 '+(i+1))}" style="${frameStyle(p.ratio)}"><img ${!source&&p.variants?.length?`srcset="${esc(p.variants.map(v=>v.url+' '+v.width+'w').join(','))}" sizes="${esc(imageSizes(p))}"`: ''} src="${esc(source||p.image)}" decoding="async" alt="${esc(p.title||p.description||'摄影作品')}" draggable="false"></button></div><div class="caption">${p.title?`<span class="photo-title">${titleMarkup(p.title)}</span>`:''}<span class="caption-details">${meta.length?`<span class="photo-meta">${meta.map(esc).join(' · ')}</span>`:''}${p.description?`<span class="photo-description">${esc(p.description)}</span>`:''}</span></div><span class="folio">${String(i+1).padStart(2,'0')}</span></article>`;
}
export function cropRect(width,height,ratio,zoom=1,x=.5,y=.5){
 ratio=ratio||width/height; zoom=Math.max(1,Math.min(4,zoom));
 let w=width,h=w/ratio;if(h>height){h=height;w=h*ratio}w/=zoom;h/=zoom;
 return {sx:(width-w)*Math.max(0,Math.min(1,x)),sy:(height-h)*Math.max(0,Math.min(1,y)),sw:w,sh:h};
}
