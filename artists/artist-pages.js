(function(){
  const path=window.location.pathname.replace(/\\/+$/,'');
  const slug=path.split('/').filter(Boolean).pop()||'';
  const params=new URLSearchParams(window.location.search);
  const preview=params.get('preview')==='1';
  const state=document.getElementById('profile-state');
  const content=document.getElementById('artist-content');
  const slugNode=document.getElementById('requested-slug');
  if(slugNode) slugNode.textContent=slug && slug!=='profile.html' ? slug.replace(/[-_]+/g,' ') : 'this artist';
  if(preview){
    if(state) state.hidden=true;
    if(content) content.hidden=false;
    document.title='Artist Page Template Preview | ALLEGRO VIBEZ';
    const banner=document.getElementById('preview-banner');
    if(banner) banner.hidden=false;
  }else{
    if(state) state.hidden=false;
    if(content) content.hidden=true;
  }
})();