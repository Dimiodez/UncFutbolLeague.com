// Keep module failures visible instead of leaving the dressing room loading forever.
import('/team-hub.js?v=20261013-recovery2').catch(()=>{
 const root=document.querySelector('#team-hub-root');
 const message=document.querySelector('#hub-message');
 if(message)message.textContent='The tactical editor could not load. Your saved playbook has not been changed.';
 if(root){root.replaceChildren();const button=document.createElement('button');button.type='button';button.textContent='Retry loading team hub';button.addEventListener('click',()=>location.reload());root.append(button);}
});
