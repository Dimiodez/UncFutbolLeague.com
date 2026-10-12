// Shared by the creation wizard and the league calendar editor.
export function bindMatchnightControls(form){
 if(!form.elements.matchnightCount){
  const frequency=document.createElement('label');
  frequency.innerHTML='Matchnights per week<select name="matchnightCount"><option value="1">One matchnight per week</option><option value="2">Two matchnights per week</option></select><small>Each playing night has two games. “Every 2 weeks” below means alternate weeks, not twice weekly.</small>';
  const first=form.elements.weekday.closest('label');
  let group=first;while(group.parentElement!==form)group=group.parentElement;
  group.before(frequency);
  const second=document.createElement('label');second.dataset.secondMatchnight='';
  second.innerHTML='Second matchnight<select name="secondWeekday">'+form.elements.weekday.innerHTML+'</select>';
  first.after(second);form.elements.secondWeekday.value='2';
 }
 const sync=()=>{
  const twice=form.elements.matchnightCount.value==='2',second=form.elements.secondWeekday;
  second.closest('label').hidden=!twice;second.disabled=!twice;
  second.setCustomValidity(twice&&second.value===form.elements.weekday.value?'Choose two different matchnights.':'');
 };
 for(const name of ['matchnightCount','weekday','secondWeekday','format'])form.elements[name].addEventListener('change',sync);
 form.addEventListener('reset',()=>queueMicrotask(sync));sync();
}
