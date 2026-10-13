(function(){
  const OFFICES=[
   ['New Baneshwor (Head Office)','The Next Centre, New Baneshwor, Kathmandu','01-5970268','info@thenext.edu.np'],
   ['Putalisadak','Putalisadak Chowk, Kathmandu 44600','01-5971287','info@thenext.edu.np'],
   ['Maharajgunj','Opposite to USA Embassy, Maharajgunj, Kathmandu','01-5971601',''],
   ['Kumaripati (Lalitpur)','Opposite of Kumari Bank Manbhawan, Kumaripati, Lalitpur','01-5971449 / 9851246975','info@thenext.edu.np'],
   ['Pokhara','Mangal Bhawan, 4th and 5th Floor, Chipledhunga, Pokhara','061-597154',''],
   ['Biratnagar','Rainbow Galli, Biratnagar','021-590668',''],
   ['Birtamode','Hanuman Centre, 5th Floor, Birtamode-04, Jhapa','023-591498',''],
   ['Damak','Damak Beldangi Road, Damak','023-577400','damak@thenext.edu.np'],
   ['Butwal','Milanchowk, Butwal','071-530737 / 535102','butwal@thenext.edu.np'],
   ['Bhairahawa','Barmeli Tole-8, Rupendehi','071-574452 / 574457',''],
   ['Narayangarh (Chitwan)','Lions Chowk, Narayangarh','056-596412 / 596512','chitwan@thenext.edu.np'],
   ['Tandi','Ratnanagar 01, Chitwan Bakulahar','056-590058','tandi@thenext.edu.np'],
   ['Parsa','Naya Road, Parsa-Chitwan','056-582497',''],
   ['Damauli','Vyas-2, Ganeshman Chowk','065-590066','damauli@thenext.edu.np'],
   ['Nepalgunj','Nepalgunj-2, Banke','081-590199','nepalgunj@thenextglobal.com'],
   ['Kawasoti','Thana Chowk, Kawasoti 2, Nawalparasi','078-540349',''],
   ['Sydney, Australia','Suite 401, Level 4, 255 Castlereagh Street, Sydney NSW 2000','+61 2 8084 6249','frontdesk@thenext.com.au'],
   ['Perth, Australia','Suite 3, 305 Murray Street, Perth, WA','+61 457 280 628','perth@thenext.com.au'],
   ['Colombo, Sri Lanka','No. 654, Galle Road, Colombo 03','+94 11 258 9342','srilanka@thenextglobal.com']
  ];
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sel=$('officeSel'),card=$('ocard'),fOff=$('fOffice');
  OFFICES.forEach((o,i)=>{[sel,fOff].forEach(s=>{const op=document.createElement('option');op.value=i;op.textContent=o[0];s.appendChild(op)})});
  function tel(n){const f=n.split(' / ')[0].replace(/[^\d+]/g,'');return f.startsWith('+')?f:'+977'+f.replace(/^0/,'')}
  function show(){
    const [n,a,p,m]=OFFICES[sel.value];
    const map='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('The Next Education '+n+' '+a);
    card.innerHTML='<h3>'+esc(n)+'</h3><dl><div><dt>Address</dt><dd>'+esc(a)+'</dd></div><div><dt>Phone</dt><dd><a href="tel:'+tel(p)+'">'+esc(p)+'</a></dd></div>'+(m?'<div><dt>Email</dt><dd><a href="mailto:'+esc(m)+'">'+esc(m)+'</a></dd></div>':'')+'</dl><div class="actions"><a class="btn primary" href="'+map+'" target="_blank" rel="noopener">Get directions</a> <a class="btn" href="https://wa.me/9761789708" target="_blank" rel="noopener">WhatsApp</a></div>';
  }
  sel.addEventListener('change',show);show();

  // enquiry -> WhatsApp
  $('fSend').addEventListener('click',()=>{
    const name=$('fName').value.trim(),phone=$('fPhone').value.trim();
    const t=$('toast');
    if(!name||!phone){t.textContent='Please add your name and phone number.';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);return}
    const msg='Hello The Next, I am '+name+' ('+phone+'). I would like free counselling for '+$('fDest').value+'. My nearest office is '+OFFICES[fOff.value][0]+'.';
    window.open('https://wa.me/9761789708?text='+encodeURIComponent(msg),'_blank','noopener');
  });

  // review carousel
  const tr=$('rvTrack');
  const step=()=>{const c=tr.querySelector('.rv-card');return c?c.getBoundingClientRect().width+14:300};
  $('rvPrev').addEventListener('click',()=>tr.scrollBy({left:-step(),behavior:'smooth'}));
  $('rvNext').addEventListener('click',()=>tr.scrollBy({left:step(),behavior:'smooth'}));

  const hd=$('hd');
  addEventListener('scroll',()=>hd.classList.toggle('scrolled',document.documentElement.scrollTop>10),{passive:true});
  const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
  function countUp(el){
    const m=el.textContent.trim().match(/^(\d+)(.*)$/);if(!m)return;
    const n=+m[1],suf=m[2],t0=performance.now(),dur=1600;
    (function step(t){const p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,3);el.textContent=Math.round(n*e)+suf;if(p<1)requestAnimationFrame(step)})(t0);
  }
  if(rm)return;
  document.body.classList.add('armed');
  [['.hero h1',0],['.hero .kicker',120],['.hero .dedic',180],['.hero .cards',240],['.hero-actions',420]].forEach(([s,d])=>{
    const el=document.querySelector(s);el.setAttribute('data-h','');el.style.setProperty('--d',d+'ms');
  });
  setTimeout(()=>document.querySelectorAll('.scard b').forEach(countUp),450);
  const sel2='.head,.tool,.why>div,.proof,.how>div,.photo,.countries,.clist,.svc-list li,.rv,.dgrid,.faq details,.offices>div,.fcard';
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.1,rootMargin:'0px 0px -5% 0px'});
  [...document.querySelectorAll(sel2)].forEach(el=>{
    el.classList.add('reveal');
    const sibs=[...el.parentElement.children].filter(c=>c.matches(sel2));
    el.style.setProperty('--d',(sibs.indexOf(el)%4)*80+'ms');
    io.observe(el);
  });
})();
