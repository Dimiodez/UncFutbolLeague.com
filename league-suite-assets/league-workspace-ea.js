import {installWorkshopBrand} from './league-workshop-brand.js';
const main=document.querySelector('main.preview-ea');
main.classList.add('workshop');main.classList.remove('preview-ea');
const header=document.createElement('header'),back=main.querySelector(':scope>a'),title=main.querySelector('h1'),intro=title.nextElementSibling;
header.append(back,title,intro);main.prepend(header);
installWorkshopBrand();
