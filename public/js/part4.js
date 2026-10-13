(function(){
  const map={'United Kingdom':'UK','Netherlands':'Denmark / Europe','Europe':'Denmark / Europe'};
  document.querySelectorAll('.dtile').forEach(b=>b.addEventListener('click',()=>{
    const v=map[b.dataset.d]||b.dataset.d,sel=document.getElementById('fDest');
    [...sel.options].forEach(o=>{if(o.text===v)sel.value=o.value||o.text});
    document.getElementById('enquiry').scrollIntoView({behavior:'smooth'});
    setTimeout(()=>document.getElementById('fName').focus({preventScroll:true}),600);
  }));
})();
