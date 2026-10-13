(function(){
  const files=document.getElementById('files'),bar=document.getElementById('filesBar'),cnt=document.getElementById('fileCount');
  function upd(){const n=files.children.length;bar.hidden=n===0;cnt.textContent=n+(n===1?' file':' files')+' added'}
  new MutationObserver(upd).observe(files,{childList:true});upd();
  document.getElementById('compressAll').addEventListener('click',()=>{[...files.querySelectorAll('.go')].forEach(b=>{if(!b.closest('.goRow').hidden)b.click()})});
  const dlBtn=document.getElementById('downloadAll'),toastEl=document.getElementById('toast');
  let dlTimer,busy=false;
  function say(m){toastEl.textContent=m;toastEl.classList.add('show');clearTimeout(dlTimer);dlTimer=setTimeout(()=>toastEl.classList.remove('show'),3500)}
  dlBtn.addEventListener('click',async()=>{
    if(busy)return;
    const cards=[...files.querySelectorAll('.file')];
    const links=cards.filter(c=>!c.querySelector('.actions').hidden).map(c=>c.querySelector('a.dl')).filter(a=>a&&a.href);
    if(!links.length){say('Compress your files first, then press Download all.');return}
    busy=true;dlBtn.disabled=true;
    const waiting=cards.length-links.length;
    for(let i=0;i<links.length;i++){
      dlBtn.textContent='Downloading '+(i+1)+' of '+links.length+'…';
      links[i].click();
      await new Promise(r=>setTimeout(r,900));
    }
    dlBtn.textContent='Download all';dlBtn.disabled=false;busy=false;
    say(links.length+(links.length===1?' file':' files')+' downloaded'+(waiting>0?'. '+waiting+' not ready yet.':'.')+' If some are missing, allow multiple downloads in your browser.');
  });
  document.getElementById('clearAll').addEventListener('click',()=>{[...files.querySelectorAll('.rm')].forEach(b=>b.click())});
})();
