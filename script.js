/* Set this to your existing Google Apps Script deployment URL. No other backend changes are required. */
const API_URL = 'https://script.google.com/macros/s/AKfycbynM_Gva75Wb61DUxIeOFEJhKKm-ZMqERo3IxQ9TVd3F7nipucRdfmIJj4oxbVmvduf/exec'; // e.g. 'https://script.google.com/macros/s/AKfycb.../exec'
const WHATSAPP = '918985390330';
const CACHE_KEY = 'praswa_gifts_products_v1';
const CACHE_MAX_AGE = 1000 * 60 * 30;
const PAGE_SIZE = 12;
let products = [], filtered = [], visibleCount = PAGE_SIZE;

const occasions = [
  ['Wedding', 'Keepsakes for your beautiful beginning', '❋'], ['Housewarming', 'Warm wishes for a new home', '⌂'],
  ['Varalakshmi Vratham', 'Blessings wrapped with love', '✦'], ['Baby Functions', 'Sweet details for little joys', '♡'],
  ['Pooja & Religious', 'Thoughtful tokens of devotion', '☼'], ['Birthday', 'A happy little thank you', '✹'],
  ['Festive Gifts', 'Joyful gifts for festive days', '❈'], ['Custom Gifts', 'Created especially for your moment', '✧']
];
const $ = selector => document.querySelector(selector);
const clean = value => String(value ?? '').trim();
const value = (p, ...keys) => clean(keys.map(k => p[k]).find(v => v !== undefined && v !== null && String(v).trim() !== ''));
const productName = p => value(p, 'ProductName', 'productName', 'name') || 'Praswa Gift';
const productCode = p => value(p, 'ProductCode', 'productCode', 'code');
const category = p => value(p, 'Category', 'category') || 'Gifts';
const subcategory = p => value(p, 'SubCategory', 'subCategory', 'subcategory');
const active = p => value(p, 'Status', 'status').toLowerCase() === 'active';

function driveUrl(url) {
  url = clean(url);
  if (!url) return '';
  const id = url.match(/[-\w]{25,}/)?.[0];
  return id && /drive\.google\.com/i.test(url) ? `https://drive.google.com/thumbnail?id=${id}&sz=w1200` : url;
}
function imagesOf(p) { return ['Image1','Image2','Image3','image1','image2','image3'].map(k => driveUrl(p[k])).filter((v,i,a) => v && a.indexOf(v) === i); }
function whatsappLink(p) { return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi, I'm interested in ${productName(p)} (${productCode(p)}).\n\nPlease share the price and details.`)}`; }
function renderOccasions(){ $('#occasionGrid').innerHTML = occasions.map(([title,desc,icon]) => `<a href="#shop" class="occasion-card" data-icon="${icon}" data-occasion="${title}"><h3>${title}</h3><p>${desc}</p></a>`).join(''); }
function card(p) {
  const node = $('#productTemplate').content.cloneNode(true), image = imagesOf(p)[0], name = productName(p), code = productCode(p);
  const img = node.querySelector('img'); img.alt = name; if(image){ img.src=image; img.onerror=()=>{img.style.display='none'}; }
  node.querySelector('.product-category').textContent = category(p); node.querySelector('h3').textContent=name; node.querySelector('.product-code').textContent=code ? `Code: ${code}` : 'Customised return gift';
  node.querySelector('.product-moq').textContent = value(p,'MOQ','moq') ? `MOQ: ${value(p,'MOQ','moq')}` : 'Enquire for MOQ';
  node.querySelector('.enquire-product').href=whatsappLink(p); node.querySelector('.product-image').onclick=()=>openProduct(p); node.querySelector('.view-product').onclick=()=>openProduct(p);
  return node;
}
function renderProducts(){ const grid=$('#catalogueGrid'); grid.innerHTML=''; filtered.slice(0,visibleCount).forEach(p=>grid.append(card(p))); $('#loadMore').hidden=visibleCount>=filtered.length; $('#catalogueStatus').textContent=products.length ? `${filtered.length} ${filtered.length===1?'gift':'gifts'} found` : ''; }
function renderFeatured(){ const grid=$('#featuredGrid'); grid.innerHTML=''; (products.length ? products.slice(0,8) : []).forEach(p=>grid.append(card(p))); if(!products.length) grid.innerHTML='<p class="empty-message">Our curated collection is arriving shortly. Please check back soon.</p>'; }
function renderCategories(){ const groups = [...new Set(products.map(category))]; $('#categoryGrid').innerHTML = groups.length ? groups.map(c=>`<button class="category-card" data-category="${escapeHtml(c)}"><h3>${escapeHtml(c)}</h3><p>${products.filter(p=>category(p)===c).length} curated gifts <span>→</span></p></button>`).join('') : '<p class="empty-message">Categories will appear once the catalogue connects.</p>'; document.querySelectorAll('.category-card').forEach(b=>b.onclick=()=>{ $('#categoryFilter').value=b.dataset.category; applyFilters(); location.hash='shop'; }); }
function escapeHtml(t){ const div=document.createElement('div'); div.textContent=t; return div.innerHTML; }
function populateFilters(){ const cats=[...new Set(products.map(category))].sort(); $('#categoryFilter').innerHTML='<option value="">All categories</option>'+cats.map(x=>`<option>${escapeHtml(x)}</option>`).join(''); updateSubcategories(); }
function updateSubcategories(){ const cat=$('#categoryFilter').value; const subs=[...new Set(products.filter(p=>!cat||category(p)===cat).map(subcategory).filter(Boolean))].sort(); $('#subcategoryFilter').innerHTML='<option value="">All sub-categories</option>'+subs.map(x=>`<option>${escapeHtml(x)}</option>`).join(''); }
function applyFilters(){ const q=$('#searchInput').value.toLowerCase().trim(), cat=$('#categoryFilter').value, sub=$('#subcategoryFilter').value, sort=$('#sortSelect').value; filtered=products.filter(p=>{const hay=[productName(p),productCode(p),category(p),subcategory(p)].join(' ').toLowerCase();return (!q||hay.includes(q))&&(!cat||category(p)===cat)&&(!sub||subcategory(p)===sub);}); if(sort==='name-asc')filtered.sort((a,b)=>productName(a).localeCompare(productName(b))); if(sort==='name-desc')filtered.sort((a,b)=>productName(b).localeCompare(productName(a))); visibleCount=PAGE_SIZE;renderProducts(); }
function openProduct(p){ const imgs=imagesOf(p), modal=$('#productModal'); const detail=(label, data)=>data?`<div><span>${label}</span><b>${escapeHtml(data)}</b></div>`:''; $('#modalContent').innerHTML=`<div class="modal-layout"><div class="modal-gallery"><img class="modal-main-image" src="${imgs[0]||''}" alt="${escapeHtml(productName(p))}" ${imgs.length?'':'style="display:none"'} /><div class="image-fallback" ${imgs.length?'style="display:none"':''}>PRASWA<br>GIFTS</div><div class="modal-thumbs">${imgs.map((src,i)=>`<button class="${i===0?'active':''}" data-src="${src}"><img src="${src}" alt="Product image ${i+1}"></button>`).join('')}</div></div><div class="modal-info"><p class="product-category">${escapeHtml(category(p))}</p><h2>${escapeHtml(productName(p))}</h2><p class="modal-code">${productCode(p)?`Product code: ${escapeHtml(productCode(p))}`:'Customised return gift'}</p><div class="detail-list">${detail('Category',category(p))}${detail('Sub category',subcategory(p))}${detail('Material',value(p,'Material','material'))}${detail('Size',value(p,'Size','size'))}${detail('MOQ',value(p,'MOQ','moq'))}</div><a class="btn modal-whatsapp" target="_blank" rel="noopener" href="${whatsappLink(p)}">Enquire on WhatsApp <span>→</span></a></div></div>`; document.querySelectorAll('.modal-thumbs button').forEach(b=>b.onclick=()=>{document.querySelector('.modal-main-image').src=b.dataset.src;document.querySelectorAll('.modal-thumbs button').forEach(x=>x.classList.remove('active'));b.classList.add('active')}); modal.showModal(); }
function setProducts(data, source){ products=(Array.isArray(data)?data:data.products||data.data||[]).filter(active); filtered=[...products]; populateFilters(); renderCategories(); renderFeatured(); renderProducts(); $('#catalogueStatus').textContent=products.length?`${products.length} curated gifts ${source==='cache'?'· showing saved catalogue':''}`:'No active gifts are available right now.'; }
async function loadProducts(){ const saved=localStorage.getItem(CACHE_KEY); if(saved){try{const c=JSON.parse(saved);if(c.data?.length){setProducts(c.data,'cache');}}catch{localStorage.removeItem(CACHE_KEY)}} if(!API_URL){ if(!products.length){renderCategories();renderFeatured();$('#catalogueStatus').textContent='Add your existing API URL in script.js to load your catalogue.';} return; } try{const response=await fetch(API_URL);if(!response.ok)throw new Error('API request failed');const data=await response.json();const raw=Array.isArray(data)?data:data.products||data.data||[];localStorage.setItem(CACHE_KEY,JSON.stringify({data:raw,updated:Date.now()}));setProducts(raw,'api');}catch(err){if(!products.length){renderCategories();renderFeatured();$('#catalogueStatus').textContent='We could not load the catalogue right now. Please try again shortly.';}console.warn('Praswa Gifts API:',err);} }
function init(){ renderOccasions(); $('.menu-toggle').onclick=()=>{const n=$('.nav'),open=n.classList.toggle('open');$('.menu-toggle').setAttribute('aria-expanded',open)}; $('.search-trigger').onclick=()=>{location.hash='shop';setTimeout(()=>$('#searchInput').focus(),350)}; $('#searchInput').oninput=applyFilters; $('#categoryFilter').onchange=()=>{updateSubcategories();applyFilters()}; $('#subcategoryFilter').onchange=applyFilters; $('#sortSelect').onchange=applyFilters; $('#loadMore').onclick=()=>{visibleCount+=PAGE_SIZE;renderProducts()}; $('.modal-close').onclick=()=>$('#productModal').close(); $('#productModal').addEventListener('click',e=>{if(e.target===$('#productModal'))$('#productModal').close()}); document.querySelectorAll('.occasion-card').forEach(c=>c.onclick=()=>{const target=c.dataset.occasion;const matching=[...$('#categoryFilter').options].find(o=>o.value.toLowerCase().includes(target.toLowerCase()));if(matching)$('#categoryFilter').value=matching.value;applyFilters();}); loadProducts(); }
init();
