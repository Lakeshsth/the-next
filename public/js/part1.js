(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const MB=1048576, KB=1024;
const fmtKB=b=>Math.max(1,Math.round(b/KB)).toLocaleString('en-US')+' KB';
const fmtMB=b=>Math.max(0.01,b/MB).toFixed(2)+' MB';
let unit=MB;
/* follows the unit the person chose: MB shows MB only, KB shows KB only */
const fmt=b=>unit===MB?fmtMB(b):fmtKB(b);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tick=()=>new Promise(r=>setTimeout(r,0));
const toBlob=(c,q)=>new Promise(r=>c.toBlob(r,'image/jpeg',q));

/* toast */
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),3200)}

/* ---------- target size ---------- */
let target=4*MB;
const docs=[];let uid=0;
const PRE={[MB]:[1,2,3,4,5,10],[KB]:[50,100,200,300,500,750]};
function drawChips(){
  const box=$('#chips');box.innerHTML='';
  PRE[unit].forEach(v=>{
    const c=document.createElement('button');c.type='button';c.className='chip';c.textContent=v+(unit===MB?' MB':' KB');
    c.setAttribute('aria-pressed',String(Math.round(v*unit)===target));
    c.addEventListener('click',()=>{$('#limitVal').value=v;applyLimit(true)});box.appendChild(c);
  });
  document.querySelectorAll('#unitSeg button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.u===unit)));
  $('#limitNow').textContent='Limit: '+fmt(target);
}
function setTarget(b){
  target=b;drawChips();
  docs.forEach(d=>{
    if(d.status==='done'||d.status==='working'){
      d.run++;d.manual=false;
      if(d.result){if(d.result.url)URL.revokeObjectURL(d.result.url);if(d.result.preview)URL.revokeObjectURL(d.result.preview);d.result=null}
      d.status='ready';
    }
    update(d);
  });
}
function applyLimit(loud){
  const v=parseFloat($('#limitVal').value);
  if(!(v>0)){if(loud)toast('Type a size, for example 4.');return}
  const b=Math.round(v*unit);
  if(b<10*KB){if(loud)toast('That limit is too small. Try at least 10 KB.');return}
  if(b!==target)setTarget(b);else drawChips();
}
let limTimer;
$('#limitVal').addEventListener('input',()=>{clearTimeout(limTimer);limTimer=setTimeout(()=>applyLimit(false),350)});
$('#limitVal').addEventListener('change',()=>applyLimit(true));
document.querySelectorAll('#unitSeg button').forEach(b=>b.addEventListener('click',()=>{
  unit=+b.dataset.u;$('#limitVal').value=unit===MB?4:500;applyLimit(true);docs.forEach(update);
}));
drawChips();

/* ---------- libs ---------- */
async function needPdf(){
  for(let i=0;i<60;i++){if(window.pdfjsLib)break;await new Promise(r=>setTimeout(r,100))}
  if(!window.pdfjsLib)throw new Error('PDF engine did not load. Check your connection and refresh.');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}
async function needJsPdf(){
  for(let i=0;i<60;i++){if(window.jspdf)break;await new Promise(r=>setTimeout(r,100))}
  if(!window.jspdf)throw new Error('PDF builder did not load. Check your connection and refresh.');
}

/* ---------- reading files ---------- */
const MAX_PX=4000;
async function prepare(d){
  if(d.kind==='image'){
    let bmp;
    try{bmp=await createImageBitmap(d.file)}catch(e){
      bmp=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(d.file)});
    }
    const w=bmp.width,h=bmp.height,s=Math.min(1,MAX_PX/Math.max(w,h));
    const c=document.createElement('canvas');c.width=Math.round(w*s);c.height=Math.round(h*s);
    const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
    x.imageSmoothingQuality='high';x.drawImage(bmp,0,0,c.width,c.height);
    d.canvases=[c];d.pageSizes=[[c.width,c.height]];d.pages=1;
  }else{
    await needPdf();
    const buf=await d.file.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:buf}).promise;
    const n=Math.min(pdf.numPages,40);
    d.pages=pdf.numPages;d.truncated=pdf.numPages>40;
    d.canvases=[];d.pageSizes=[];
    for(let i=1;i<=n;i++){
      const p=await pdf.getPage(i);
      const v1=p.getViewport({scale:1});
      let sc=(n>12?150:n>4?200:250)/72;
      while(v1.width*sc*v1.height*sc>8e6&&sc>0.8)sc-=0.1;
      const vp=p.getViewport({scale:sc});
      const c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);
      const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
      await p.render({canvasContext:x,viewport:vp}).promise;
      d.canvases.push(c);d.pageSizes.push([v1.width,v1.height]);
      d.progress=i/n;update(d);await tick();
    }
  }
  const ob=await toBlob(d.canvases[0],0.92);
  d.origUrl=URL.createObjectURL(ob);
}

/* ---------- encoding ---------- */
function stepDown(c,scale){
  const tw=Math.max(1,Math.round(c.width*scale)),th=Math.max(1,Math.round(c.height*scale));
  let cur=c;
  while(cur.width/2>=tw&&cur.height/2>=th){
    const n=document.createElement('canvas');n.width=Math.round(cur.width/2);n.height=Math.round(cur.height/2);
    const x=n.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(cur,0,0,n.width,n.height);cur=n;
  }
  const o=document.createElement('canvas');o.width=tw;o.height=th;
  const x=o.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,tw,th);x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(cur,0,0,tw,th);
  return o;
}
function scaledPages(d,scale){
  if(scale>=1)return d.canvases;
  if(d._sc&&d._sc.scale===scale)return d._sc.list;
  const list=d.canvases.map(c=>stepDown(c,scale));
  d._sc={scale,list};return list;
}
async function encode(d,scale,q){
  const blobs=[];let total=0;
  for(const src of scaledPages(d,scale)){
    const b=await toBlob(src,q);blobs.push(b);total+=b.size;
  }
  if(d.kind==='pdf')total+=1200+700*blobs.length;
  return{blobs,bytes:total,scale,q};
}
async function buildPdf(d,blobs){
  await needJsPdf();
  const {jsPDF}=window.jspdf;let pdf=null;
  for(let i=0;i<blobs.length;i++){
    const [w,h]=d.pageSizes[i],o=w>h?'l':'p';
    if(!pdf)pdf=new jsPDF({orientation:o,unit:'pt',format:[w,h],compress:true});
    else pdf.addPage([w,h],o);
    const u8=new Uint8Array(await blobs[i].arrayBuffer());
    pdf.addImage(u8,'JPEG',0,0,w,h,undefined,'FAST');
  }
  return pdf.output('blob');
}
async function finalize(d,enc,limit){
  let e=enc,out;
  for(let t=0;t<4;t++){
    out=d.kind==='pdf'?await buildPdf(d,e.blobs):e.blobs[0];
    if(!limit||out.size<=limit||t===3)break;
    e=await encode(d,e.scale,Math.max(0.2,e.q-0.04));
  }
  return{blob:out,size:out.size,q:e.q,scale:e.scale,preview:URL.createObjectURL(e.blobs[0])};
}
function setResult(d,r){
  if(d.result){if(d.result.url)URL.revokeObjectURL(d.result.url);if(d.result.preview)URL.revokeObjectURL(d.result.preview)}
  r.url=URL.createObjectURL(r.blob);d.result=r;
}

async function autoFit(d){
  if(d.status==='loading'||d.status==='error'||!d.canvases.length)return;
  const run=++d.run;d.status='working';d.msg='Finding the highest quality that fits…';update(d);
  try{
    if(d.file.size<=target){
      setResult(d,{blob:d.file,size:d.file.size,original:true,q:1,scale:1,preview:null});
      d.status='done';update(d);return;
    }
    /* Goal: the clearest result that fits. Text stays sharp when the page keeps its
       resolution, so we accept a lower JPEG quality before we shrink the page.
       Roomy limits still end at up to 98% quality. */
    const QMAX=0.98;
    const plan=[];
    [1,.9,.8,.7,.6,.5].forEach(s=>plan.push([s,0.4]));
    [1,.9,.8,.7,.6,.5].forEach(s=>plan.push([s,0.28]));
    [.42,.35,.3,.25].forEach(s=>plan.push([s,0.28]));
    let best=null;
    for(const [sc,floor] of plan){
      const low=await encode(d,sc,floor);if(run!==d.run)return;
      if(low.bytes>target)continue;
      let lo=floor,hi=QMAX,good=low;
      const top=await encode(d,sc,QMAX);if(run!==d.run)return;
      if(top.bytes<=target){good=top}
      else{
        for(let i=0;i<7;i++){
          const mid=(lo+hi)/2,e=await encode(d,sc,mid);if(run!==d.run)return;
          if(e.bytes<=target){lo=mid;good=e}else hi=mid;
        }
      }
      best=good;break;
    }
    let tooBig=false;
    if(!best){best=await encode(d,0.25,0.28);if(run!==d.run)return;tooBig=best.bytes>target}
    d.suggestBytes=null;
    if(best.scale<.85||best.q<.5){
      const ref=await encode(d,1,0.6);if(run!==d.run)return;
      d.suggestBytes=ref.bytes;
    }
    const r=await finalize(d,best,target);if(run!==d.run)return;
    r.tooBig=tooBig||r.size>target;
    setResult(d,r);d.status='done';d.q=r.q;update(d);
  }catch(err){d.status='error';d.msg=err.message||'Something went wrong with this file.';update(d)}
}
let manualTimer;
function manualEncode(d,qPct){
  clearTimeout(manualTimer);
  manualTimer=setTimeout(async()=>{
    const run=++d.run;d.manual=true;d.status='working';d.msg='Calculating exact size…';update(d);
    try{
      const e=await encode(d,1,qPct/100);if(run!==d.run)return;
      const r=await finalize(d,e,0);if(run!==d.run)return;
      r.tooBig=r.size>target;setResult(d,r);d.status='done';update(d);
    }catch(err){d.status='error';d.msg=err.message;update(d)}
  },280);
}

/* ---------- cards ---------- */
function qualityLabel(r){
  if(r.original)return['Original','ok'];
  const eff=r.q*(0.5+0.5*r.scale);
  if(eff>=0.78)return['Excellent','ok'];
  if(eff>=0.62)return['Good','ok'];
  if(eff>=0.48)return['Readable','ok'];
  return['Soft. Check text','warn'];
}
function createCard(d){
  const el=document.createElement('article');el.className='file';el.dataset.id=d.id;
  el.innerHTML=`
  <div class="file-top">
    <div class="ficon">${d.kind==='pdf'?'PDF':'IMG'}</div>
    <div class="fmeta"><div class="fname">${esc(d.file.name)}</div><div class="fsub"></div></div>
    <button class="rmbtn rm" aria-label="Remove ${esc(d.file.name)}"><span aria-hidden="true">✕</span> Remove</button>
  </div>
  <div class="g-rows">
    <div class="g-inner"><div class="g-limit"><span></span></div></div>
    <div class="g-row"><span class="lbl">Before</span><div class="g-track"><div class="g-fill g-before"></div></div><span class="val v-before"></span></div>
    <div class="g-row"><span class="lbl">After</span><div class="g-track"><div class="g-fill g-after"></div></div><span class="val v-after">…</span></div>
  </div>
  <div class="status"><span class="spin"></span><span class="msg"></span><span class="q-badge" hidden></span></div>
  <div class="goRow" hidden><button class="btn primary go" type="button">Compress</button><span class="gohint"></span></div>
  <div class="fine" hidden>
    <label for="q${d.id}">Quality</label>
    <input type="range" id="q${d.id}" min="30" max="98" value="80">
    <output>80%</output>
    <span class="pred"></span>
    <button class="btn small auto">Compress again</button>
  </div>
  <div class="actions" hidden>
    <a class="btn primary dl" download>Download</a>
    <button class="btn cmpbtn">Compare quality</button>
  </div>
  <div class="compare" hidden>
    <div class="cmp-box" tabindex="0" aria-label="Before and after comparison">
      <img class="base" alt="Compressed preview"><img class="top" alt="Original preview">
      <div class="cmp-line"></div><span class="cmp-tag l">Original</span><span class="cmp-tag r">Compressed</span>
    </div>
    <input type="range" class="cmp-range" min="0" max="100" value="50" aria-label="Comparison slider">
    <p class="cmp-help">Drag the slider. Tap the picture to zoom in 3× and move your finger or mouse to inspect small text. First page shown.</p>
  </div>`;
  $('.rm',el).addEventListener('click',()=>{
    d.run++;docs.splice(docs.indexOf(d),1);
    if(d.result&&d.result.url)URL.revokeObjectURL(d.result.url);
    el.remove();
  });
  const rng=$('.fine input',el);
  rng.addEventListener('input',()=>{
    $('.fine output',el).textContent=rng.value+'%';
    $('.pred',el).textContent='Calculating…';
    manualEncode(d,+rng.value);
  });
  $('.auto',el).addEventListener('click',()=>{d.manual=false;autoFit(d)});
  $('.go',el).addEventListener('click',()=>{d.manual=false;autoFit(d)});
  const cb=$('.compare',el),box=$('.cmp-box',el),cr=$('.cmp-range',el);
  $('.cmpbtn',el).addEventListener('click',()=>{cb.hidden=!cb.hidden;$('.cmpbtn',el).textContent=cb.hidden?'Compare quality':'Hide comparison';update(d)});
  cr.addEventListener('input',()=>box.style.setProperty('--pos',cr.value+'%'));
  box.addEventListener('click',()=>box.classList.toggle('zoom'));
  box.addEventListener('pointermove',e=>{
    const r=box.getBoundingClientRect();
    box.style.setProperty('--ox',((e.clientX-r.left)/r.width*100)+'%');
    box.style.setProperty('--oy',((e.clientY-r.top)/r.height*100)+'%');
  });
  d.el=el;return el;
}
function update(d){
  const el=d.el;if(!el)return;
  const st=$('.status',el),msg=$('.msg',el),spin=$('.spin',el),badge=$('.q-badge',el);
  const fine=$('.fine',el),act=$('.actions',el);
  const r=d.result;
  $('.fsub',el).textContent=fmt(d.file.size)+(d.pages?` · ${d.pages} page${d.pages>1?'s':''}`:'')+(d.truncated?' (first 40 pages used)':'');
  // gauge
  const orig=d.file.size,aft=r?r.size:0;
  const mx=Math.max(orig,target,aft)*1.06;
  $('.g-before',el).style.width=(orig/mx*100)+'%';
  $('.g-before',el).style.background=orig>target?'var(--stamp)':'var(--muted)';
  $('.v-before',el).textContent=fmt(orig);
  $('.g-after',el).style.width=(aft/mx*100)+'%';
  $('.g-after',el).style.background=r&&aft<=target?'var(--ok)':'var(--warn)';
  $('.v-after',el).textContent=r?fmt(aft):'…';
  const lim=$('.g-limit',el);lim.style.left=(target/mx*100)+'%';$('span',lim).textContent=fmt(target)+' limit';
  // status
  st.className='status';badge.hidden=true;spin.hidden=false;
  if(d.status==='loading'){msg.textContent=d.kind==='pdf'?`Reading pages… ${Math.round((d.progress||0)*100)}%`:'Reading image…'}
  else if(d.status==='working'){msg.textContent=d.msg}
  else if(d.status==='ready'){spin.hidden=true;msg.innerHTML='<b>Ready.</b> Press Compress to fit under '+fmt(target)+'.'}
  else if(d.status==='error'){spin.hidden=true;st.classList.add('warn');msg.textContent=d.msg}
  else if(d.status==='done'&&r){
    spin.hidden=true;
    if(r.original){st.classList.add('ok');msg.innerHTML='<b>Already under your limit.</b> No compression needed.'}
    else if(r.tooBig){st.classList.add('warn');msg.innerHTML=`<b>Could not reach ${fmt(target)}</b> without making it unreadable. Best result is ${fmt(r.size)}. Try fewer pages or a bigger limit.`}
    else{st.classList.add('ok');const sv=Math.round((1-r.size/orig)*100);msg.innerHTML=`<b>Fits under ${fmt(target)}.</b> Now ${fmt(r.size)}, ${sv}% smaller.`+(r.q>=.95&&r.scale>=1?' This is already the highest quality.':'');
      if(!d.manual&&d.suggestBytes){const step=unit===MB?0.25*MB:50*KB;const need=Math.max(step,Math.ceil(d.suggestBytes*1.05/step)*step);if(need>target)msg.innerHTML+=`<br><b>Small text may look soft at this size.</b> For clear text, try a limit of about ${fmt(need)}.`}}
    const [lab,tone]=qualityLabel(r);
    badge.hidden=false;badge.textContent=lab;badge.style.color=tone==='ok'?'var(--ok)':'var(--warn)';
  }
  // controls
  const ready=d.status==='done'&&r;
  fine.hidden=!(d.canvases&&d.canvases.length&&(d.status==='done'||d.status==='working'));
  act.hidden=!ready;
  const gr=$('.goRow',el);gr.hidden=d.status!=='ready';
  if(d.status==='ready'){$('.go',el).textContent='Compress to under '+fmt(target);$('.gohint',el).textContent=d.file.size<=target?'This file is already under the limit.':''}
  if(ready){
    const a=$('.dl',el);a.href=r.url;
    const base=d.file.name.replace(/\.[^.]+$/,'');
    a.download=r.original?d.file.name:base+'-fitdoc.'+(d.kind==='pdf'?'pdf':'jpg');
    a.textContent='Download '+fmt(r.size);
    const rg=$('.fine input',el);
    if(!r.original&&!d.manual){rg.value=Math.round(r.q*100);$('.fine output',el).textContent=rg.value+'%'}
    if(!r.original){
      $('.pred',el).textContent='File size: '+fmt(r.size);
      $('.pred',el).style.color=r.size>target?'var(--warn)':'var(--ok)';
    }else $('.pred',el).textContent='Move to compress anyway';
    $('.cmpbtn',el).hidden=!(r.preview&&d.origUrl);
    const cmp=$('.compare',el);
    if(!cmp.hidden&&r.preview){
      const c0=d.canvases[0];
      $('.cmp-box',el).style.aspectRatio=c0.width+'/'+c0.height;
      $('.base',el).src=r.preview;$('.top',el).src=d.origUrl;
    }
  }
}
async function addFiles(list){
  for(const file of list){
    const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
    const isImg=file.type.startsWith('image/');
    if(!isPdf&&!isImg){toast(file.name+' is not a PDF or image.');continue}
    const d={id:++uid,file,kind:isPdf?'pdf':'image',status:'loading',progress:0,canvases:[],run:0,result:null,manual:false};
    docs.push(d);$('#files').appendChild(createCard(d));update(d);
    prepare(d).then(()=>{d.status='ready';update(d)}).catch(err=>{
      d.status='error';
      d.msg=/password/i.test(err.message||'')?'This PDF is password-protected. Remove the password and try again.':(err.message||'Could not read this file. It may be damaged.');
      update(d);
    });
    await tick();
  }
}
const fi=$('#fileInput'),drop=$('#drop');
fi.addEventListener('change',()=>{addFiles([...fi.files]);fi.value=''});
['dragenter','dragover'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',ev=>addFiles([...ev.dataTransfer.files]));

/* ---------- photo resizer ---------- */
const pc=$('#pCanvas'),px=pc.getContext('2d');
let pImg=null,pBlob=null,pName='photo',pTimer;
function pDraw(){
  if(!pImg)return;
  const [W,H]=$('#pPreset').value.split('x').map(Number);
  pc.width=W;pc.height=H;
  const z=+$('#pZoom').value,ox=+$('#pX').value/100,oy=+$('#pY').value/100;
  const iw=pImg.width,ih=pImg.height,s=Math.max(W/iw,H/ih)*z;
  const dw=iw*s,dh=ih*s;
  const x=(W-dw)/2-ox*Math.max(0,(dw-W)/2),y=(H-dh)/2-oy*Math.max(0,(dh-H)/2);
  px.fillStyle='#fff';px.fillRect(0,0,W,H);px.imageSmoothingQuality='high';px.drawImage(pImg,x,y,dw,dh);
  pc.hidden=false;$('#pEmpty').hidden=true;
  clearTimeout(pTimer);pTimer=setTimeout(pExport,200);
}
async function pExport(){
  const max=Math.max(10,+$('#pMax').value||100)*KB;
  let lo=0.2,hi=0.95,best=null;
  const first=await toBlob(pc,hi);
  if(first.size<=max)best=first;
  else{
    for(let i=0;i<8;i++){const m=(lo+hi)/2,b=await toBlob(pc,m);if(b.size<=max){best=b;lo=m}else hi=m}
    if(!best)best=await toBlob(pc,0.2);
  }
  pBlob=best;
  const st=$('#pStatus'),ok=best.size<=max;
  st.className='status '+(ok?'ok':'warn');
  st.innerHTML=ok?`<b>${fmtKB(best.size)}</b>, under your ${fmtKB(max)} limit.`:`<b>${fmtKB(best.size)}</b> is still above ${fmtKB(max)}. Choose a smaller photo type or a higher limit.`;
  $('#pDl').disabled=false;
}
$('#pFile').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  pName=f.name.replace(/\.[^.]+$/,'');
  try{pImg=await createImageBitmap(f)}catch(_){
    pImg=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(f)}).catch(()=>null);
  }
  if(!pImg){toast('Could not read that photo.');return}
  $('#pZoom').value=1;$('#pX').value=0;$('#pY').value=0;pDraw();
});
['pPreset','pZoom','pX','pY','pMax'].forEach(id=>$('#'+id).addEventListener('input',pDraw));
$('#pDl').addEventListener('click',()=>{
  if(!pBlob)return;
  const a=document.createElement('a');a.href=URL.createObjectURL(pBlob);a.download=pName+'-'+$('#pPreset').value+'.jpg';
  document.body.appendChild(a);a.click();a.remove();
});

/* ---------- checklist ---------- */
const COMMON=[
  ['Passport (valid 6+ months)','Scan every page with stamps, in colour, as one PDF.'],
  ['Academic transcripts and certificates','SEE/SLC, +2 or A-levels, Bachelor. Scan at 150 to 200 dpi.'],
  ['English test result (IELTS, PTE, TOEFL)','Keep the original test report PDF.'],
  ['Statement of Purpose','Check the word limit and file type the university asks for.'],
  ['Recommendation letters','Usually two, signed and on letterhead.'],
  ['CV / resume','One or two pages, PDF.'],
  ['Passport-size photo','Use the photo resizer above for the exact size.'],
  ['Financial documents','Bank statements, loan or sponsor letters. Names must match.']
];
const COUNTRIES={
  'Australia':[['Offer letter / Confirmation of Enrolment','Needed for the student visa application.'],['Genuine Student statement','Your own words, specific to the course and why Australia.'],['Overseas student health cover','Arranged for the full visa period.']],
  'United Kingdom':[['CAS statement','Issued by the university after you accept the offer.'],['Proof of funds held for 28 days','Check the current amount and date rules.'],['TB test certificate','From an approved clinic, if required for your country.']],
  'United States':[['I-20 form','Issued by the university after the financial proof.'],['DS-160 confirmation page','Print the confirmation with the barcode.'],['SEVIS fee receipt','Pay before the visa interview.']],
  'Canada':[['Letter of acceptance','From a designated learning institution.'],['Provincial attestation letter','Check if it applies to your programme.'],['Proof of funds','Savings, GIC or other accepted proof.']],
  'New Zealand':[['Offer of Place','From the education provider after you accept.'],['Proof of funds','Bank documents that clearly show who is sponsoring you.'],['Police certificate and medical','Needed for most student visa applications.']],
  'Ireland':[['Letter of acceptance','From the Irish institution.'],['Proof of funds','Savings or sponsor documents with matching names.'],['Medical insurance','Arranged before you travel.']]
};
let country='Australia';
function ckey(){return 'fitdoc-check-'+country}
function loadChecks(){try{return JSON.parse(localStorage.getItem(ckey())||'{}')}catch(_){return{}}}
function saveChecks(o){try{localStorage.setItem(ckey(),JSON.stringify(o))}catch(_){}}
function drawCountries(){
  const box=$('#countries');box.innerHTML='';
  Object.keys(COUNTRIES).forEach(n=>{
    const b=document.createElement('button');b.className='country';b.textContent=n;
    b.setAttribute('aria-pressed',String(n===country));
    b.addEventListener('click',()=>{country=n;drawCountries();drawChecks()});box.appendChild(b);
  });
}
function drawChecks(){
  const items=[...COUNTRIES[country],...COMMON],saved=loadChecks();
  const box=$('#cItems');box.innerHTML='';
  items.forEach(([t,tip],i)=>{
    const l=document.createElement('label');l.className='citem'+(saved[i]?' done':'');
    l.innerHTML=`<input type="checkbox" ${saved[i]?'checked':''}><span><b>${esc(t)}</b><small>${esc(tip)}</small></span>`;
    $('input',l).addEventListener('change',e=>{
      const s=loadChecks();s[i]=e.target.checked;saveChecks(s);
      l.classList.toggle('done',e.target.checked);prog(items.length);
    });
    box.appendChild(l);
  });
  prog(items.length);
}
function prog(n){
  const s=loadChecks();let done=0;for(let i=0;i<n;i++)if(s[i])done++;
  $('#cCount').textContent=done+' of '+n+' ready';
  $('#cBar').style.width=(done/n*100)+'%';
}
drawCountries();drawChecks();
})();
