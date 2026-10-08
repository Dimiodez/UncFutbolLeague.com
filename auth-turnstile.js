(() => {
  const button=document.getElementById('discord-continue');
  const status=document.getElementById('verification-status');
  const container=document.getElementById('human-check');
  const form=document.getElementById('login-form');
  let verified=false,widget;
  const pending=message=>{verified=false;button.disabled=true;status.textContent=message;};
  function start(){
    if(!window.turnstile){pending('Human verification could not load. Reload this page to try again.');return;}
    try {
      widget=window.turnstile.render(container,{
        sitekey:container.dataset.sitekey,action:'discord-login',theme:'dark',size:'flexible',
        callback:()=>{verified=true;button.disabled=false;status.textContent='Human check complete. Continue securely to Discord.';},
        'expired-callback':()=>pending('Verification expired. Complete the check again.'),
        'error-callback':()=>pending('Verification couldn’t finish. Please retry or reload this page.'),
        'timeout-callback':()=>pending('Verification timed out. Complete the check again.')
      });
      status.textContent='Complete the human check to continue.';
    } catch {pending('Human verification could not load. Reload this page to try again.');}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const token=window.turnstile?.getResponse(widget);
    if(!verified || !token){pending('Please complete human verification first.');return;}
    button.disabled=true;status.textContent='Verifying securely…';
    try{
      const response=await fetch(form.action,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({'cf-turnstile-response':token}),signal:AbortSignal.timeout(15000)});
      if(!response.ok){console.warn('UFL login verification status',response.status);throw new Error('Verification failed');}
      const data=await response.json(),target=new URL(data.authorizeUrl);
      if(target.origin!=='https://discord.com'||target.pathname!=='/oauth2/authorize')throw new Error('Invalid login destination');
      window.location.assign(target.href);
    }catch{
      pending('Verification could not finish. Complete a fresh check and try again.');
      window.turnstile?.reset(widget);
    }
  });
  window.addEventListener('pageshow',event=>{if(event.persisted){pending('Complete a fresh human check to continue.');window.turnstile?.reset(widget);}});
  if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});
})();
