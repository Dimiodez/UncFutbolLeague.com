// Reused by league creation, league editing, and independent cup/event settings.
export function bindTeamRuleControls(form){
 const sync=()=>{
  const fixed=form.elements.format.value==='6v6'?6:form.elements.format.value==='10v10'?10:null;
  form.elements.size.readOnly=fixed!==null;
  if(fixed!==null)form.elements.size.value=fixed;
  const size=Number(form.elements.size.value)||1;
  form.elements.maxTeamSize.min=size;
  if(Number(form.elements.maxTeamSize.value)<size)form.elements.maxTeamSize.value=size;
 };
 form.elements.format.addEventListener('change',sync);
 form.elements.size.addEventListener('input',sync);sync();
}
export function readTeamRuleControls(form){
 return {...Object.fromEntries(new FormData(form)),keepersEnabled:form.elements.keepersEnabled.checked};
}
