document.getElementById('year').textContent=new Date().getFullYear();
const play=document.querySelector('.play');
if(play){play.addEventListener('click',()=>{play.innerHTML='SOON <span>↗</span>';play.setAttribute('aria-label','ALLEGRO Radio is being prepared for launch');});}
