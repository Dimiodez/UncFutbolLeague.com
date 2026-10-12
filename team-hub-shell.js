export const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function installWorkshopBrand(){
 document.querySelector('main').classList.add('unc-workspace');
 const css=document.createElement('link');css.rel='stylesheet';css.href='/team-hub-live.css?v=20261012-hubs1';document.head.append(css);
}
