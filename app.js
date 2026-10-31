document.getElementById('year').textContent=new Date().getFullYear();
const play=document.querySelector('.play');
if(play){play.addEventListener('click',()=>{play.innerHTML='SOON <span>↗</span>';play.setAttribute('aria-label','ALLEGRO Radio is being prepared for launch');});}

// Premium share action — uses native device sharing where available and clipboard fallback elsewhere.
(function(){
  const share=document.createElement('button');
  share.type='button'; share.id='allegro-share';
  share.setAttribute('aria-label','Share ALLEGRO-VIBEZ');
  share.innerHTML='<span aria-hidden="true">↗</span><b>SHARE</b>';
  Object.assign(share.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:'999',display:'inline-flex',alignItems:'center',gap:'9px',padding:'12px 16px',border:'1px solid rgba(25,237,125,.55)',borderRadius:'999px',background:'rgba(5,12,8,.9)',color:'#19ed7d',font:'800 10px DM Mono,monospace',letterSpacing:'.12em',cursor:'pointer',boxShadow:'0 14px 40px rgba(0,0,0,.35)',backdropFilter:'blur(14px)',transition:'transform .2s,background .2s,color .2s'});
  share.onmouseenter=()=>{share.style.transform='translateY(-3px)';share.style.background='#19ed7d';share.style.color='#031007';};
  share.onmouseleave=()=>{share.style.transform='translateY(0)';share.style.background='rgba(5,12,8,.9)';share.style.color='#19ed7d';};
  share.addEventListener('click',async()=>{
    const data={title:document.title,text:'Discover ALLEGRO-VIBEZ — where music becomes a career.',url:window.location.href};
    try{
      if(navigator.share){await navigator.share(data);return;}
      await navigator.clipboard.writeText(window.location.href);
      const old=share.innerHTML; share.innerHTML='<span aria-hidden="true">✓</span><b>COPIED</b>';
      setTimeout(()=>share.innerHTML=old,1800);
    }catch(e){
      if(e && e.name==='AbortError') return;
      try{await navigator.clipboard.writeText(window.location.href);}catch(_){window.prompt('Copy the ALLEGRO-VIBEZ link:',window.location.href);}
    }
  });
  document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(share));
})();

// Artist-first conversion CTA — always available without crowding the main navigation.
(function(){
  const join=document.createElement('a');
  join.href='/join.html'; join.id='allegro-join'; join.textContent='JOIN ALLEGRO';
  join.setAttribute('aria-label','Join ALLEGRO-VIBEZ');
  Object.assign(join.style,{position:'fixed',left:'18px',bottom:'18px',zIndex:'998',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'12px 17px',border:'1px solid rgba(232,194,93,.55)',borderRadius:'999px',background:'rgba(10,12,9,.9)',color:'#e8c25d',font:'800 10px DM Mono,monospace',letterSpacing:'.12em',boxShadow:'0 14px 40px rgba(0,0,0,.3)',backdropFilter:'blur(14px)',transition:'transform .2s,background .2s,color .2s'});
  join.onmouseenter=()=>{join.style.transform='translateY(-3px)';join.style.background='#e8c25d';join.style.color='#111';};
  join.onmouseleave=()=>{join.style.transform='translateY(0)';join.style.background='rgba(10,12,9,.9)';join.style.color='#e8c25d';};
  document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(join));
})();