const status=document.querySelector('[data-workspace-loading]');
try{await import('./league-workshop.js?v=20261022-flow1');document.body.classList.remove('workspace-loading');status?.remove();}
catch{if(status){status.setAttribute('role','alert');status.innerHTML='League Suite could not be loaded. Your stored drafts have not been cleared. <a href="">Reload workspace</a> · <a href="/league">Return to League</a>';}}
