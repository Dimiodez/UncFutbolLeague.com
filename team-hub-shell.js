export const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function installWorkshopBrand(){
 document.querySelector('main').classList.add('unc-workspace');
 // Essential styling must not depend on successful module initialization.
}
