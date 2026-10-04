/* ============================================================
   PRASWA GIFTS - SCRIPT.JS
   ============================================================
   Includes:
   - Google Sheets API
   - Product catalogue
   - Search and sorting
   - Material / occasion filters
   - Applied filter chips with remove buttons
   - Product details
   - MOQ quantity controls
   - Cart
   - WhatsApp checkout
   - Pagination
   - Lazy-loaded images
   ============================================================ */


/* ============================================================
   CONFIGURATION
   ============================================================ */

const API_URL =
  'https://script.google.com/macros/s/AKfycbzdJfJ2x7nZvdkoCQlJ3nKRit8EJlX-luqJlVNYxdN6JTq1JSz12_dV3tJMPXTZ5gei/exec';

const WHATSAPP = '918985390330';

const STORE = {
  phone: '+91 89853 90330',
  email: 'praswareturngifts@gmail.com',
  instagram: 'https://www.instagram.com/praswa_gifts_crafts',
  address: 'Flat No 101, Rajaratna Residency, Street No 2, HMT Nagar, Nacharam, 500076',
  mapsUrl: 'https://www.google.com/maps/place/Praswa+Gifts/@17.4237807,78.5484847,17z/data=!4m16!1m9!3m8!1s0x3bcb99f9c6ac8207:0x22d9d96afd2f94f4!2sPraswa+Gifts!8m2!3d17.4237807!4d78.5484847!9m1!1b1!16s%2Fg%2F11y5p5t02b!3m5!1s0x3bcb99f9c6ac8207:0x22d9d96afd2f94f4!8m2!3d17.4237807!4d78.5484847!16s%2Fg%2F11y5p5t02b?entry=ttu&g_ep=EgoyMDI2MDkwMi4wIKXMDSoASAFQAw%3D%3D'
};

const CACHE_KEY = 'praswa_gifts_products_v1';
const CART_KEY = 'praswa_gifts_cart_v1';


const HOME_PAGE_SIZE = 12;


/* ============================================================
   GLOBAL STATE
   ============================================================ */

let products = [];
let cart = [];

// Precomputed catalogue indexes. These avoid repeatedly scanning every product
// while building the header/sidebar filters and applying the main filter.
let productIndex = {
  materialCounts: new Map(),
  occasionCounts: new Map(),
  materials: [],
  occasions: []
};

/* Load product images only when they are near the viewport. */
const lazyImageObserver =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            const img = entry.target;
            const src = img.dataset.src;

            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
            }

            lazyImageObserver.unobserve(img);
          });
        },
        { rootMargin: '100px 0px' }
      )
    : null;

function observeLazyImage(img) {
  if (!img) return;

  if (lazyImageObserver) {
    lazyImageObserver.observe(img);
  } else if (img.dataset.src) {
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  }
}

let homeMaterial = '';
let homeOccasion = '';

let homePage = 1;

/*
   Price filter state

   null = not initialized
*/
let homeMinPrice = null;
let homeMaxPrice = null;


/* ============================================================
   OCCASIONS
   ============================================================ */

const occasions = [

  [
    'Wedding',
    'Keepsakes for your beautiful beginning',
    '❋'
  ],

  [
    'Housewarming',
    'Warm wishes for a new home',
    '⌂'
  ],

  [
    'Varalakshmi Vratham',
    'Blessings wrapped with love',
    '✦'
  ],

  [
    'Baby Functions',
    'Sweet details for little joys',
    '♡'
  ],

  [
    'Pooja & Religious',
    'Thoughtful tokens of devotion',
    '☼'
  ],

  [
    'Birthday',
    'A happy little thank you',
    '✹'
  ],

  [
    'Festive Gifts',
    'Joyful gifts for festive days',
    '❈'
  ],

  [
    'Custom Gifts',
    'Created especially for your moment',
    '✧'
  ]

];


/* ============================================================
   HELPER
   ============================================================ */

const $ = selector =>
  document.querySelector(selector);


const clean = value =>
  String(value ?? '').trim();


const value = (p, ...keys) => {

  const normaliseKey = key =>
    String(key)
      .replace(/\s+/g, '')
      .toLowerCase();

  const entries =
    Object.entries(p || {});

  return clean(
    keys
      .map(key => {

        const direct = p?.[key];

        if (
          direct !== undefined &&
          direct !== null &&
          String(direct).trim() !== ''
        ) {
          return direct;
        }

        const match =
          entries.find(
            ([actual, data]) =>
              normaliseKey(actual) ===
                normaliseKey(key) &&
              data !== undefined &&
              data !== null &&
              String(data).trim() !== ''
          );

        return match?.[1];

      })
      .find(
        v =>
          v !== undefined &&
          v !== null &&
          String(v).trim() !== ''
      )
  );

};


/* ============================================================
   MULTIPLE OCCASIONS
   ------------------------------------------------------------
   Supports multiple values in the existing Occasion column.
   Preferred separator: | (also accepts comma/semicolon).
   Example: Wedding | Birthday | Baby Functions
   ============================================================ */
const occasionValuesCache = new WeakMap();

function occasionValues(p) {
  if (p && typeof p === 'object') {
    const cached = occasionValuesCache.get(p);
    if (cached) return cached;
  }

  const raw = clean(value(p, 'Occasion', 'occasion'));
  const result = raw
    ? raw
        .split(/[|;,]+/)
        .map(item => item.trim())
        .filter(Boolean)
    : [];

  if (p && typeof p === 'object') {
    occasionValuesCache.set(p, result);
  }

  return result;
}

function hasOccasion(p, selectedOccasion) {
  const selected = clean(selectedOccasion).toLowerCase();
  if (!selected) return true;
  return occasionValues(p).some(
    occasion => occasion.toLowerCase() === selected
  );
}


const productName = p =>
  value(
    p,
    'ProductName',
    'productName',
    'name'
  ) || 'Praswa Gift';


const productCode = p =>
  value(
    p,
    'ProductCode',
    'productCode',
    'code'
  );


const category = p =>
  value(
    p,
    'Category',
    'category'
  ) || 'Gifts';


const subcategory = p =>
  value(
    p,
    'SubCategory',
    'subCategory',
    'subcategory'
  );


const active = p =>
  value(
    p,
    'Status',
    'status'
  ).toLowerCase() === 'active';


const productId = p =>
  value(
    p,
    'ProductID',
    'productId',
    'id',
    'ID'
  );


/* ============================================================
   PRICE
   ============================================================ */
function priceOf(p) {

  const raw =
    value(
      p,
      'Price',
      'price'
    );

  const n =
    Number(
      String(raw || '').replace(
        /[^0-9.]/g,
        ''
      )
    );

  // Normal Price column has priority when available.
  if (Number.isFinite(n) && n > 0) {
    return n;
  }

  // If Price is blank, use the lowest SizePrices value.
  // Example:
  // Small=80, Medium=120, Large=150, XL=200
  // → product price becomes ₹80 for filtering.
  const sizePrices = sizePriceMap(p);

  const values = Object.values(sizePrices)
    .map(Number)
    .filter(price => Number.isFinite(price) && price > 0);

  return values.length
    ? Math.min(...values)
    : 0;
}

/* ============================================================
   SIZE-WISE PRICING
   ------------------------------------------------------------
   Optional Google Sheet column: SizePrices

   Examples:
     4"=100, 5"=120, 6"=130
     7x4=100, 8x5=130
     7 × 4: 100; 8 × 5: 130
     {"4"":100,"5"":120,"6"":130}

   Products without SizePrices continue using the normal Price
   column exactly as before.
   ============================================================ */

function sizePriceMap(p) {

  const raw = clean(
    value(
      p,
      'SizePrices',
      'sizePrices',
      'Size Price',
      'size price'
    )
  );

  if (!raw) return {};

  const result = {};

  // JSON object support.
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      Object.entries(parsed).forEach(([size, price]) => {
        const n = Number(String(price).replace(/[^0-9.]/g, ''));
        if (size && Number.isFinite(n)) result[String(size).trim()] = n;
      });
      if (Object.keys(result).length) return result;
    }
  } catch {}

  // Human-friendly format: size=price, size:price, size-price.
  raw
    .split(/[;,\n]+/)
    .map(x => x.trim())
    .filter(Boolean)
    .forEach(part => {
      const match = part.match(/^(.+?)\s*(?:=|:|\s+-\s+)\s*₹?\s*([0-9]+(?:\.[0-9]+)?)\s*$/);
      if (!match) return;

      const size = match[1].trim();
      const price = Number(match[2]);
      if (size && Number.isFinite(price)) result[size] = price;
    });

  return result;
}

function sizeOptions(p) {
  return Object.keys(sizePriceMap(p));
}

function sizePrice(p, selectedSize = '') {
  const map = sizePriceMap(p);
  const key = String(selectedSize || '').trim();
  return key && Number.isFinite(map[key])
    ? map[key]
    : priceOf(p);
}

function priceLabel(p, selectedSize = '') {

  const raw =
    value(
      p,
      'Price',
      'price'
    );

  const price =
    sizePrice(p, selectedSize);

  return price > 0
    ? `₹${price.toLocaleString('en-IN')}`
    : (raw ? 'Price on request' : 'Price on request');
}


/* ============================================================
   MOQ
   ============================================================ */

function moqOf(p) {

  const raw =
    value(
      p,
      'MOQ',
      'moq'
    );

  const n =
    Number(
      raw.replace(
        /[^0-9]/g,
        ''
      )
    );

  return Number.isFinite(n) && n > 0
    ? n
    : 1;
}


/* ============================================================
   GOOGLE DRIVE IMAGE URL
   ============================================================ */

function driveUrl(url) {

  url = clean(url);

  if (!url) {
    return '';
  }

  const id =
    url.match(
      /[-\w]{25,}/
    )?.[0];

  return id &&
    /drive\.google\.com/i.test(url)

    ? `https://drive.google.com/thumbnail?id=${id}&sz=w800`

    : url;
}


/* ============================================================
   PRODUCT IMAGES
   ============================================================ */

function imagesOf(p) {

  return [
    'Image1',
    'Image2',
    'Image3',
    'image1',
    'image2',
    'image3'
  ]

    .map(
      k => driveUrl(p[k])
    )

    .filter(
      (v, i, a) =>
        v &&
        a.indexOf(v) === i
    );
}


/* ============================================================
   PRODUCT CARD
   ============================================================ */

function card(p) {

  const node =
    $('#productTemplate')
      .content
      .cloneNode(true);

  const image =
    imagesOf(p)[0];

  const name =
    productName(p);

  const code =
    productCode(p);


  const img =
    node.querySelector('img');

  img.alt = name;


  if (image) {
    img.dataset.src = image;
    img.classList.add('lazy-image');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.fetchPriority = 'low';

    img.onload = () => {
      img.classList.add('loaded');
    };

    img.onerror = () => {
      img.style.display = 'none';
    };
  }


  node.querySelector(
    '.product-category'
  ).textContent =
    category(p);


  node.querySelector(
    'h3'
  ).textContent =
    name;


  node.querySelector(
    '.product-code'
  ).textContent =
    code
      ? `Code: ${code}`
      : 'Customised return gift';


  /*
     Always show a Size control on every product card so all cards
     keep the same vertical layout. Products with SizePrices get
     selectable sizes; products with only a normal Size value show
     that value as the default (disabled) selection.
  */
  const sizeChoices = sizeOptions(p);
  const fixedSize = value(p, 'Size', 'size') || 'Standard';
  let selectedSize = sizeChoices[0] || '';

  const priceEl = node.querySelector('.product-price');
  const wrap = document.createElement('div');
  wrap.className = 'size-selector-wrap';
  wrap.innerHTML = `
    <span>Size</span>
    <div class="size-options" role="group" aria-label="Select size">
      ${sizeChoices.length
        ? sizeChoices.map((size, index) => `
            <button type="button" class="size-option${index === 0 ? ' active' : ''}" data-size="${escapeHtml(size)}" aria-pressed="${index === 0 ? 'true' : 'false'}">
              ${escapeHtml(size)}
            </button>
          `).join('')
        : `<button type="button" class="size-option is-disabled" disabled aria-pressed="true">${escapeHtml(fixedSize)}</button>`}
    </div>
  `;
  priceEl.parentNode.insertBefore(wrap, priceEl);

  const sizeButtons = [...wrap.querySelectorAll('.size-option:not(:disabled)')];
  priceEl.textContent = priceLabel(p, selectedSize);

  sizeButtons.forEach(button => {
    button.onclick = () => {
      selectedSize = button.dataset.size || '';
      sizeButtons.forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      priceEl.textContent = priceLabel(p, selectedSize);
    };
  });


  const minimum =
    moqOf(p);


  node.querySelector(
    '.minimum-note'
  ).textContent =
    `Minimum qty: ${minimum}`;


  let quantity =
    minimum;


  const quantityValue =
    node.querySelector(
      '.quantity-value'
    );


  quantityValue.min =
    minimum;


  const updateQuantity = () => {

    quantityValue.value =
      quantity;

  };


  updateQuantity();


  quantityValue.oninput = () => {

    const typed =
      Number(
        quantityValue.value
      );

    if (
      Number.isFinite(typed) &&
      typed >= minimum
    ) {
      quantity = typed;
    }

  };


  quantityValue.onblur = () => {

    quantity =
      Math.max(
        minimum,
        Number(
          quantityValue.value
        ) || minimum
      );

    updateQuantity();

  };


  node.querySelector(
    '.quantity-minus'
  ).onclick = () => {

    quantity =
      Math.max(
        minimum,
        quantity - 1
      );

    updateQuantity();

  };


  node.querySelector(
    '.quantity-plus'
  ).onclick = () => {

    quantity++;

    updateQuantity();

  };
  node.querySelector(
    '.product-image'
  ).onclick = () =>
    openProduct(p, selectedSize);


  node.querySelector(
    '.add-cart'
  ).onclick = () =>
    addToCart(
      p,
      quantity,
      selectedSize
    );

  observeLazyImage(img);

  return node;

}


/* ============================================================
   MAIN CATALOGUE PRODUCTS
   ============================================================ */



/* ============================================================
   FEATURED PRODUCTS
   ============================================================ */



/* ============================================================
   CATEGORY CARDS
   ============================================================ */



/* ============================================================
   CATEGORY ICON
   ============================================================ */



/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHtml(t) {

  const div =
    document.createElement(
      'div'
    );

  div.textContent =
    t;

  return div.innerHTML;

}


/* ============================================================
   POPULATE CATALOGUE FILTERS
   ============================================================ */



/* ============================================================
   UPDATE SUBCATEGORIES
   ============================================================ */


/* ============================================================
   MAIN CATALOGUE FILTERS
   ============================================================ */



/* ============================================================
   PRODUCT DETAILS MODAL
   ============================================================ */

function openProduct(p, initialSize = '') {

  const imgs =
    imagesOf(p);

  const modal =
    $('#productModal');

  const minimum =
    moqOf(p);


  const detail =
    (label, data) =>
      `
      <div>
        <span>${label}</span>
        <b>
          ${escapeHtml(
            data ||
            'Not specified'
          )}
        </b>
      </div>
      `;


  $('#modalContent').innerHTML =

    `
    <div class="modal-layout">

      <div class="modal-gallery">

        <img
          class="modal-main-image"
          src="${imgs[0] || ''}"
          alt="${escapeHtml(
            productName(p)
          )}"
          ${
            imgs.length
              ? ''
              : 'style="display:none"'
          }
        />

        <div
          class="image-fallback"
          ${
            imgs.length
              ? 'style="display:none"'
              : ''
          }
        >
          PRASWA<br>
          GIFTS
        </div>


        <div class="modal-thumbs">

          ${
            imgs
              .map(
                (src, i) =>
                  `
                  <button
                    class="${
                      i === 0
                        ? 'active'
                        : ''
                    }"
                    data-src="${src}"
                  >
                    <img
                      src="${src}"
                      alt="Product image ${
                        i + 1
                      }"
                    >
                  </button>
                  `
              )
              .join('')
          }

        </div>

      </div>


      <div class="modal-info">

        <p class="product-category">
          ${escapeHtml(
            category(p)
          )}
        </p>


        <h2>
          ${escapeHtml(
            productName(p)
          )}
        </h2>


        <p class="modal-code">
          ${
            productCode(p)
              ? `Product code: ${escapeHtml(
                  productCode(p)
                )}`
              : 'Customised return gift'
          }
        </p>


        <p class="modal-price">
          ${escapeHtml(
            priceLabel(p, initialSize || sizeOptions(p)[0] || '')
          )}
        </p>


        ${`
          <div class="modal-size-selector-wrap">
            <span>Size</span>
            <div class="size-options modal-size-options" role="group" aria-label="Select size">
              ${sizeOptions(p).length
                ? sizeOptions(p).map((size, index) => {
                    const selected = size === (initialSize || sizeOptions(p)[0]);
                    return `<button type="button" class="size-option${selected ? ' active' : ''}" data-size="${escapeHtml(size)}" aria-pressed="${selected ? 'true' : 'false'}">${escapeHtml(size)}</button>`;
                  }).join('')
                : `<button type="button" class="size-option is-disabled" disabled aria-pressed="true">${escapeHtml(value(p, 'Size', 'size') || 'Standard')}</button>`}
            </div>
          </div>
        `}


        <div class="detail-list">

          ${detail(
            'Price',
            priceLabel(p)
          )}

          ${detail(
            'Material',
            value(
              p,
              'Material',
              'material'
            )
          )}

          ${detail(
            'Size',
            value(
              p,
              'Size',
              'size'
            )
          )}

          ${detail(
            'Description',
            value(
              p,
              'Description',
              'description'
            )
          )}

          ${detail(
            'MOQ',
            value(
              p,
              'MOQ',
              'moq'
            )
          )}

        </div>


        <div class="modal-actions">

          <div
            class="product-quantity modal-quantity"
            aria-label="Select quantity"
          >

            <button
              type="button"
              class="modal-quantity-minus"
              aria-label="Decrease quantity"
            >
              −
            </button>


            <input
              class="modal-quantity-value"
              type="number"
              min="${minimum}"
              value="${minimum}"
              inputmode="numeric"
              aria-label="Quantity"
            />


            <button
              type="button"
              class="modal-quantity-plus"
              aria-label="Increase quantity"
            >
              +
            </button>

          </div>


          <button
            class="btn add-cart modal-add"
            type="button"
          >
            Add to Bag
          </button>
        </div>

      </div>

    </div>
    `;


  document
    .querySelectorAll(
      '.modal-thumbs button'
    )
    .forEach(
      b =>
        b.onclick = () => {

          $('.modal-main-image')
            .src =
            b.dataset.src;


          document
            .querySelectorAll(
              '.modal-thumbs button'
            )
            .forEach(
              x =>
                x.classList.remove(
                  'active'
                )
            );


          b.classList.add(
            'active'
          );

        }
    );


  const qty =
    $('.modal-quantity-value');

  const modalSizeButtons =
    [...document.querySelectorAll('#modalContent .modal-size-options .size-option:not(:disabled)')];

  let selectedSize =
    initialSize ||
    sizeOptions(p)[0] ||
    '';

  const updateModalPrice = () => {
    const label = priceLabel(p, selectedSize);
    $('.modal-price').textContent = label;

    const detailPrice = [...document.querySelectorAll('#modalContent .detail-list > div')]
      .find(el => el.querySelector('span')?.textContent?.trim() === 'Price')
      ?.querySelector('b');
    if (detailPrice) detailPrice.textContent = label;
  };

  modalSizeButtons.forEach(button => {
    button.onclick = () => {
      selectedSize = button.dataset.size || '';
      modalSizeButtons.forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      updateModalPrice();
    };
  });

  updateModalPrice();


  const normalise =
    () => {

      qty.value =
        Math.max(
          minimum,
          Number(
            qty.value
          ) || minimum
        );

    };


  qty.oninput =
    normalise;


  $('.modal-quantity-minus')
    .onclick = () => {

      qty.value =
        Math.max(
          minimum,
          Number(
            qty.value ||
            minimum
          ) - 1
        );

    };


  $('.modal-quantity-plus')
    .onclick = () => {

      qty.value =
        Number(
          qty.value ||
          minimum
        ) + 1;

    };


  $('.modal-add')
    .onclick = () => {

      normalise();

      addToCart(
        p,
        Number(
          qty.value
        ),
        selectedSize
      );

    };


  modal.showModal();

}


/* ============================================================
   SIDE MENU HELPERS
   ============================================================ */

function closeSideMenu() {

  const side = $('#sideMenu');
  const backdrop = $('#menuBackdrop');
  const menuButton = $('.menu-toggle');

  if (!side) return;

  side.classList.remove('open');

  /* Restore the exact page position after closing the menu. */
  if (document.body.classList.contains('menu-open')) {
    const scrollY = Number(document.body.dataset.menuScrollY || 0);
    document.body.classList.remove('menu-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, scrollY);
    delete document.body.dataset.menuScrollY;
  }

  if (backdrop) {
    backdrop.classList.remove('open');
  }

  if (menuButton) {
    menuButton.setAttribute('aria-expanded', 'false');
  }

  side.setAttribute('aria-hidden', 'true');
}

function openSideMenu() {

  const side = $('#sideMenu');
  const backdrop = $('#menuBackdrop');
  const menuButton = $('.menu-toggle');

  if (!side) return;

  /* Freeze the entire page underneath the side menu on desktop and mobile. */
  if (!document.body.classList.contains('menu-open')) {
    document.body.dataset.menuScrollY = String(window.scrollY);
    document.body.classList.add('menu-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${window.scrollY}px`;
    document.body.style.width = '100%';
  }

  side.classList.add('open');

  if (backdrop) {
    backdrop.classList.add('open');
  }

  if (menuButton) {
    menuButton.setAttribute('aria-expanded', 'true');
  }

  side.setAttribute('aria-hidden', 'false');
}

function toggleSideMenu() {
  const side = $('#sideMenu');
  if (!side) return;

  if (side.classList.contains('open')) {
    closeSideMenu();
  } else {
    openSideMenu();
  }
}


/* ============================================================
   SIDE MENU FILTERS
   ============================================================ */

function renderSideFilters() {

  const materialMenu =
    $('#sideMaterialMenu');

  const occasionMenu =
    $('#sideOccasionMenu');

  const priceMenu =
    $('#sidePriceMenu');

  if (!materialMenu || !occasionMenu || !priceMenu) {
    return;
  }

  /* ----------------------------------------------------------
     MATERIAL LIST
     ---------------------------------------------------------- */

  const materials = productIndex.materials;

  materialMenu.innerHTML = `
    <button
      type="button"
      class="side-filter-item ${!homeMaterial ? 'active' : ''}"
      data-material=""
    >
      <span>All Items</span>
      <span class="side-filter-count">${products.length}</span>
    </button>

    ${materials.map(name => {
      const count = productIndex.materialCounts.get(name) || 0;

      return `
        <button
          type="button"
          class="side-filter-item ${homeMaterial === name ? 'active' : ''}"
          data-material="${escapeHtml(name)}"
        >
          <span>${escapeHtml(name)}</span>
          <span class="side-filter-count">${count}</span>
        </button>
      `;
    }).join('')}
  `;

  /* ----------------------------------------------------------
     OCCASION LIST
     ---------------------------------------------------------- */

  const occasionList = productIndex.occasions;

  occasionMenu.innerHTML = `
    <button
      type="button"
      class="side-filter-item ${!homeOccasion ? 'active' : ''}"
      data-occasion=""
    >
      <span>All Occasions</span>
      <span class="side-filter-count">${products.length}</span>
    </button>

    ${occasionList.map(name => {
      const count = productIndex.occasionCounts.get(name) || 0;

      return `
        <button
          type="button"
          class="side-filter-item ${homeOccasion === name ? 'active' : ''}"
          data-occasion="${escapeHtml(name)}"
        >
          <span>${escapeHtml(name)}</span>
          <span class="side-filter-count">${count}</span>
        </button>
      `;
    }).join('')}
  `;

  /* ----------------------------------------------------------
     QUICK PRICE FILTERS
     ---------------------------------------------------------- */

  priceMenu.innerHTML = `
    <button type="button" class="side-price-item" data-price-filter="all">
      All Prices
    </button>

    <button type="button" class="side-price-item" data-price-filter="100">
      Under ₹100
    </button>

    <button type="button" class="side-price-item" data-price-filter="200">
      Under ₹200
    </button>

    <button type="button" class="side-price-item" data-price-filter="300">
      Under ₹300
    </button>

    <button type="button" class="side-price-item" data-price-filter="500">
      Under ₹500
    </button>

    <button type="button" class="side-price-item" data-price-filter="1000-plus">
      ₹1,000 &amp; Above
    </button>


  `;

  /* ----------------------------------------------------------
     MATERIAL CLICK
     ---------------------------------------------------------- */

  materialMenu
    .querySelectorAll('[data-material]')
    .forEach(button => {
      button.onclick = () => {
        homeMaterial = button.dataset.material;
        homeOccasion = '';
        homePage = 1;
        renderHomeCategories();
        renderSideFilters();
        closeSideMenu();
      };
    });

  /* ----------------------------------------------------------
     OCCASION CLICK
     ---------------------------------------------------------- */

  occasionMenu
    .querySelectorAll('[data-occasion]')
    .forEach(button => {
      button.onclick = () => {
        homeOccasion = button.dataset.occasion;
        homeMaterial = '';
        homePage = 1;
        renderHomeCategories();
        renderSideFilters();
        closeSideMenu();
      };
    });

  /* ----------------------------------------------------------
     QUICK PRICE CLICK
     ---------------------------------------------------------- */

  priceMenu
    .querySelectorAll('[data-price-filter]')
    .forEach(button => {
      button.onclick = () => {
        const filter = button.dataset.priceFilter;

        if (filter === 'all') {
          homeMinPrice = 0;
          homeMaxPrice = null;
        } else if (filter === '100') {
          homeMinPrice = 0;
          homeMaxPrice = 100;
        } else if (filter === '200') {
          homeMinPrice = 0;
          homeMaxPrice = 200;
        } else if (filter === '300') {
          homeMinPrice = 0;
          homeMaxPrice = 300;
        } else if (filter === '500') {
          homeMinPrice = 0;
          homeMaxPrice = 500;
        } else if (filter === '1000-plus') {
          homeMinPrice = 1000;
          homeMaxPrice = null;
        }

        homePage = 1;
        renderHomeCategories();
        renderSideFilters();
        closeSideMenu();
      };
    });


}



/* ============================================================
   HEADER FILTER MENUS
   ============================================================ */

function closeHeaderFilterMenus() {
  document.querySelectorAll('.header-filter-trigger').forEach(trigger => {
    trigger.setAttribute('aria-expanded', 'false');
  });
  document.querySelectorAll('.header-filter-dropdown').forEach(menu => {
    menu.hidden = true;
  });
}

function renderHeaderFilterMenus() {
  const materialMenu = $('#headerMaterialMenu');
  const occasionMenu = $('#headerOccasionMenu');
  if (!materialMenu || !occasionMenu) return;

  const materials = productIndex.materials;
  const occasions = productIndex.occasions;

  materialMenu.innerHTML = `
    <button type="button" data-header-material=""><span>All Items</span><span>${products.length}</span></button>
    ${materials.map(name => `<button type="button" data-header-material="${escapeHtml(name)}"><span>${escapeHtml(name)}</span><span>${productIndex.materialCounts.get(name) || 0}</span></button>`).join('')}
  `;

  occasionMenu.innerHTML = `
    <button type="button" data-header-occasion=""><span>All Items</span><span>${products.length}</span></button>
    ${occasions.map(name => `<button type="button" data-header-occasion="${escapeHtml(name)}"><span>${escapeHtml(name)}</span><span>${productIndex.occasionCounts.get(name) || 0}</span></button>`).join('')}
  `;

  materialMenu.querySelectorAll('[data-header-material]').forEach(button => {
    button.onclick = () => {
      homeMaterial = button.dataset.headerMaterial;
      homeOccasion = '';
      homePage = 1;
      closeHeaderFilterMenus();
      renderHomeCategories();
      renderSideFilters();
      $('#homeCategories')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });

  occasionMenu.querySelectorAll('[data-header-occasion]').forEach(button => {
    button.onclick = () => {
      homeOccasion = button.dataset.headerOccasion;
      homeMaterial = '';
      homePage = 1;
      closeHeaderFilterMenus();
      renderHomeCategories();
      renderSideFilters();
      $('#homeCategories')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
}


/* ============================================================
   LOAD / SET PRODUCTS
   ============================================================ */

function setProducts(data) {

  products =
    (
      Array.isArray(data)
        ? data
        : data.products ||
          data.data ||
          []
    )
      .filter(active);

  // Build all filter/search metadata once when products arrive.
  // Rendering and filtering can then use O(1) lookups instead of repeatedly
  // scanning/parsing the full product list.
  const materialCounts = new Map();
  const occasionCounts = new Map();
  const materialSet = new Set();
  const occasionSet = new Set();

  products.forEach(p => {
    const material = value(p, 'Material', 'material');
    if (material) {
      materialSet.add(material);
      materialCounts.set(material, (materialCounts.get(material) || 0) + 1);
    }

    const occasionsForProduct = occasionValues(p);
    occasionsForProduct.forEach(occasion => {
      occasionSet.add(occasion);
      occasionCounts.set(occasion, (occasionCounts.get(occasion) || 0) + 1);
    });

    // Cache the expensive generic field lookups used by the main catalogue.
    p.__pgSearchText = [
      productName(p),
      productCode(p),
      productId(p),
      category(p),
      subcategory(p),
      material,
      value(p, 'Occasion', 'occasion')
    ].join(' ').toLowerCase();
    p.__pgPrice = priceOf(p);
    p.__pgMaterial = material;
  });

  productIndex = {
    materialCounts,
    occasionCounts,
    materials: [...materialSet].sort((a, b) => a.localeCompare(b)),
    occasions: [...occasionSet].sort((a, b) => a.localeCompare(b))
  };

  renderHeaderFilterMenus();


  renderSideFilters();


  renderHomeCategories();

}


/* ============================================================
   LOAD PRODUCTS FROM API
   ============================================================ */

async function loadProducts() {

  const saved =
    localStorage.getItem(
      CACHE_KEY
    );


  if (saved) {

    try {

      const c =
        JSON.parse(saved);


      if (c.data?.length) {

        setProducts(
          c.data
        );

      }

    } catch {

      localStorage.removeItem(
        CACHE_KEY
      );

    }

  }


  if (!API_URL) {

    if (!products.length) {

      renderHomeCategories();

    }

    return;

  }


  try {

    const response =
      await fetch(
        API_URL
      );


    if (!response.ok) {

      throw new Error(
        'API request failed'
      );

    }


    const data =
      await response.json();


    const raw =
      Array.isArray(data)
        ? data
        : data.products ||
          data.data ||
          [];


    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: raw,
        updated: Date.now()
      })
    );


    setProducts(
      raw
    );


  } catch (err) {

    if (!products.length) {

      renderHomeCategories();

    }


    console.warn(
      'Praswa Gifts API:',
      err
    );

  }

}


/* ============================================================
   CART KEY
   ============================================================ */

function cartKey(p, selectedSize = '') {

  const base =
    productId(p) ||
    productCode(p) ||
    productName(p);

  return selectedSize
    ? `${base}::size=${String(selectedSize).trim()}`
    : base;

}


/* ============================================================
   CART COUNT
   ============================================================ */

function updateCartCount() {

  $('#cartCount')
    .textContent =
      cart.reduce(
        (n, item) =>
          n + item.quantity,
        0
      );

}


/* ============================================================
   ADD TO CART
   ============================================================ */

function addToCart(
  p,
  quantity = 1,
  selectedSize = ''
) {

  const item =
    cart.find(
      x =>
        cartKey(
          x.product,
          x.size || ''
        ) ===
        cartKey(
          p,
          selectedSize
        )
    );


  if (item) {

    item.quantity +=
      quantity;

  } else {

    cart.push({
      product: p,
      quantity,
      ...(selectedSize ? { size: selectedSize, unitPrice: sizePrice(p, selectedSize) } : {})
    });

  }


  localStorage.setItem(
    CART_KEY,
    JSON.stringify(cart)
  );


  updateCartCount();

}


/* ============================================================
   RENDER CART
   ============================================================ */

function renderCart() {

  const list =
    $('#cartItems');


  const total =
    cart.reduce(
      (n, item) =>
        n +
        (item.unitPrice ?? priceOf(item.product)) *
        item.quantity,
      0
    );


  list.innerHTML =
    cart.length

      ? cart
          .map(
            (item, i) => {

              const minimum =
                moqOf(
                  item.product
                );

              const image =
                imagesOf(
                  item.product
                )[0];

              const subtotal =
                (item.unitPrice ?? priceOf(item.product)) *
                item.quantity;


              return `

                <div
                  class="cart-item"
                >

                  <button
                    class="cart-item-image"
                    data-view="${i}"
                    type="button"
                  >

                    ${
                      image
                        ? `<img
                             src="${image}"
                             alt=""
                           >`
                        : 'PRASWA'
                    }

                  </button>


                  <div
                    class="cart-item-info"
                  >

                    <button
                      class="cart-product-title"
                      data-view="${i}"
                      type="button"
                    >
                      ${escapeHtml(
                        productName(
                          item.product
                        )
                      )}
                    </button>


                    <small>
                      ${escapeHtml(
                        productCode(
                          item.product
                        ) ||
                        productId(
                          item.product
                        )
                      )}
                    </small>


                    ${item.size ? `<span class="cart-item-size">Size: ${escapeHtml(item.size)}</span>` : ''}

                    <span>
                      ${escapeHtml(
                        priceLabel(
                          item.product,
                          item.size || ''
                        )
                      )}
                      each
                    </span>


                    <b
                      class="cart-subtotal"
                    >
                      Subtotal:
                      ₹${subtotal.toLocaleString(
                        'en-IN'
                      )}
                    </b>

                  </div>


                  <div
                    class="cart-item-controls"
                  >

                    <div
                      class="quantity"
                    >

                      <button
                        data-index="${i}"
                        data-change="-1"
                      >
                        −
                      </button>


                      <input
                        class="cart-quantity-value"
                        data-index="${i}"
                        type="number"
                        min="${minimum}"
                        value="${item.quantity}"
                        inputmode="numeric"
                        aria-label="Quantity"
                      />


                      <button
                        data-index="${i}"
                        data-change="1"
                      >
                        +
                      </button>

                    </div>


                    <button
                      class="remove-cart-item"
                      data-index="${i}"
                      type="button"
                    >
                      Cancel
                    </button>

                  </div>

                </div>

              `;

            }
          )
          .join('')

      : `
        <p class="empty-message">
          Your gift bag is empty.
        </p>
      `;


  $('#cartTotal')
    .textContent =
      `₹${total.toLocaleString(
        'en-IN'
      )}`;


  $('#checkoutButton')
    .disabled =
      !cart.length;


  const save =
    () => {

      localStorage.setItem(
        CART_KEY,
        JSON.stringify(cart)
      );

      updateCartCount();

      renderCart();

    };


  list
    .querySelectorAll(
      '.quantity button'
    )
    .forEach(
      b =>
        b.onclick = () => {

          const i =
            Number(
              b.dataset.index
            );

          const minimum =
            moqOf(
              cart[i].product
            );


          cart[i].quantity =
            Math.max(
              minimum,
              cart[i].quantity +
                Number(
                  b.dataset.change
                )
            );


          save();

        }
    );


  list
    .querySelectorAll(
      '.cart-quantity-value'
    )
    .forEach(
      input =>
        input.oninput =
          () => {

            const i =
              Number(
                input.dataset.index
              );


            const minimum =
              moqOf(
                cart[i].product
              );


            cart[i].quantity =
              Math.max(
                minimum,
                Number(
                  input.value
                ) ||
                minimum
              );


            save();

          }
    );


  list
    .querySelectorAll(
      '.remove-cart-item'
    )
    .forEach(
      b =>
        b.onclick = () => {

          cart.splice(
            Number(
              b.dataset.index
            ),
            1
          );


          save();

        }
    );


  list
    .querySelectorAll(
      '[data-view]'
    )
    .forEach(
      b =>
        b.onclick = () => {

          const item =
            cart[
              Number(
                b.dataset.view
              )
            ];


          $('#cartModal')
            .close();


          openProduct(
            item.product,
            item.size || ''
          );

        }
    );

}


/* ============================================================
   STORE CONTACT
   ============================================================ */

function configureStore() {

  if ($('#sideEmail')) {
    $('#sideEmail').href = `mailto:${STORE.email}`;
  }

  if ($('#sideInstagram')) {
    $('#sideInstagram').href = STORE.instagram;
  }

  if ($('#sideWhatsApp')) {
    $('#sideWhatsApp').href = `https://wa.me/${WHATSAPP}`;
  }

  if ($('#sideMap')) {
    $('#sideMap').href = STORE.mapsUrl;
  }

  if ($('#footerAddress')) {
    $('#footerAddress').textContent = STORE.address;
  }

  if ($('#footerMap')) {
    $('#footerMap').href = STORE.mapsUrl;
  }

  if ($('#footerWhatsApp')) {
    $('#footerWhatsApp').href = `https://wa.me/${WHATSAPP}`;
  }

  if ($('#footerEmail')) {
    $('#footerEmail').href = `mailto:${STORE.email}`;
  }

  if ($('#footerInstagram')) {
    $('#footerInstagram').href = STORE.instagram;
  }

}


/* ============================================================
   HOME PRODUCT FILTERING
   ============================================================ */

function renderAppliedFilters() {

  const container = $('#appliedFilters');
  if (!container) return;

  const filters = [];

  if (homeMaterial) {
    filters.push({ type: 'material', label: `Material: ${homeMaterial}` });
  }

  if (homeOccasion) {
    filters.push({ type: 'occasion', label: `Occasion: ${homeOccasion}` });
  }

  const priceCeiling = Math.max(25000, ...products.map(priceOf).filter(price => price > 0));
  const priceIsFiltered = homeMinPrice > 0 || (homeMaxPrice !== null && homeMaxPrice < priceCeiling);

  if (priceIsFiltered) {
    let label = 'Price';
    if (homeMinPrice === 0 && homeMaxPrice === 100) label = 'Price: Under ₹100';
    else if (homeMinPrice === 0 && homeMaxPrice === 200) label = 'Price: Under ₹200';
    else if (homeMinPrice === 0 && homeMaxPrice === 300) label = 'Price: Under ₹300';
    else if (homeMinPrice === 0 && homeMaxPrice === 500) label = 'Price: Under ₹500';
    else if (homeMinPrice === 1000 && (homeMaxPrice === null || homeMaxPrice >= priceCeiling)) label = 'Price: ₹1,000 & Above';
    else label = `Price: ₹${homeMinPrice} - ₹${homeMaxPrice}`;
    filters.push({ type: 'price', label });
  }

  const search = clean($('#homeSearchInput')?.value);
  if (search) filters.push({ type: 'search', label: `Search: ${search}` });

  if (!filters.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <span class="applied-filters-label">Applied Filters:</span>
    ${filters.map(filter => `
      <button
        type="button"
        class="filter-chip"
        data-remove-filter="${filter.type}"
        aria-label="${escapeHtml(`Remove ${filter.label}`)}"
        title="Remove filter"
      >
        <span>${escapeHtml(filter.label)}</span>
        <b aria-hidden="true">×</b>
      </button>
    `).join('')}
    <button type="button" class="clear-filters" id="clearAllFilters">Clear All</button>
  `;

  container.querySelectorAll('[data-remove-filter]').forEach(button => {
    button.onclick = () => {
      const filter = button.dataset.removeFilter;
      if (filter === 'material') homeMaterial = '';
      if (filter === 'occasion') homeOccasion = '';
      if (filter === 'price') { homeMinPrice = 0; homeMaxPrice = null; }
      if (filter === 'search') {
        const input = $('#homeSearchInput');
        if (input) input.value = '';
      }
      homePage = 1;
      renderHomeCategories();
      renderSideFilters();
    };
  });

  $('#clearAllFilters')?.addEventListener('click', () => {
    homeMaterial = '';
    homeOccasion = '';
    homeMinPrice = 0;
    homeMaxPrice = null;
    const input = $('#homeSearchInput');
    if (input) input.value = '';
    homePage = 1;
    renderHomeCategories();
    renderSideFilters();
  });
}


function renderHomeCategories() {

  /* ----------------------------------------------------------
     SEARCH + SORT
     ---------------------------------------------------------- */


  const query =
    clean(
      $('#homeSearchInput')
        ?.value
    ).toLowerCase();


  const sort =
    $('#homeSortSelect')
      ?.value ||
    'default';


  /* ----------------------------------------------------------
     PRICE CEILING
     ---------------------------------------------------------- */

  const priceCeiling =
    Math.max(
      25000,
      ...products
        .map(p => p.__pgPrice ?? priceOf(p))
        .filter(
          price =>
            price > 0
        )
    );


  /* ----------------------------------------------------------
     INITIAL PRICE STATE
     ---------------------------------------------------------- */

  if (
    homeMinPrice === null
  ) {

    homeMinPrice =
      0;

  }


  if (
    homeMaxPrice === null
  ) {

    homeMaxPrice =
      priceCeiling;

  }


  /* ----------------------------------------------------------
     NORMALISE PRICE VALUES
     ---------------------------------------------------------- */

  homeMinPrice =
    Math.max(
      0,
      Math.min(
        Number(
          homeMinPrice
        ) || 0,
        priceCeiling
      )
    );


  homeMaxPrice =
    Math.max(
      homeMinPrice,
      Math.min(
        Number(
          homeMaxPrice
        ) || priceCeiling,
        priceCeiling
      )
    );


  /* ----------------------------------------------------------
     FILTER PRODUCTS
     ---------------------------------------------------------- */

  const shown =
    products.filter(
      p => {

        const hay = p.__pgSearchText || '';
        const price = p.__pgPrice ?? priceOf(p);


        /*
           Products without a numeric price are shown
           only when no custom price filter is active.
        */

        const noPriceFilter =
          homeMinPrice === 0 &&
          homeMaxPrice ===
            priceCeiling;


        const matchesPrice =
          price > 0
            ? (
                price >=
                  homeMinPrice &&
                price <=
                  homeMaxPrice
              )
            : noPriceFilter;


        return (


          (
            !homeMaterial ||
            (p.__pgMaterial ?? value(p, 'Material', 'material')) ===
              homeMaterial
          )

          &&

          (
            !homeOccasion ||
            hasOccasion(p, homeOccasion)
          )

          &&

          (
            !query ||
            hay.includes(query)
          )

          &&

          matchesPrice

        );

      }
    );


  /* ----------------------------------------------------------
     SORT
     ---------------------------------------------------------- */

  if (
    sort ===
    'price-asc'
  ) {

    shown.sort(
      (a, b) =>
        priceOf(a) -
        priceOf(b)
    );

  }


  if (
    sort ===
    'price-desc'
  ) {

    shown.sort(
      (a, b) =>
        priceOf(b) -
        priceOf(a)
    );

  }


  if (
    sort ===
    'name-asc'
  ) {

    shown.sort(
      (a, b) =>
        productName(a)
          .localeCompare(
            productName(b)
          )
    );

  }


  if (
    sort ===
    'name-desc'
  ) {

    shown.sort(
      (a, b) =>
        productName(b)
          .localeCompare(
            productName(a)
          )
    );

  }


  /* ----------------------------------------------------------
     PAGINATION
     ---------------------------------------------------------- */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        shown.length /
        HOME_PAGE_SIZE
      )
    );


  homePage =
    Math.min(
      homePage,
      totalPages
    );


  const pageItems =
    shown.slice(
      (homePage - 1) *
        HOME_PAGE_SIZE,

      homePage *
        HOME_PAGE_SIZE
    );


  /* ----------------------------------------------------------
     HEADING + APPLIED FILTERS + SORT
     ---------------------------------------------------------- */

  $('#homeProductsHeading').innerHTML = `
    <div class="products-heading-row">
      <div class="products-heading-left">
        <h3>
          All Items
          <span>
            ${shown.length}
            ${shown.length === 1 ? 'gift' : 'gifts'}
          </span>
        </h3>
      </div>

      <div class="products-heading-right">
        <label class="sort-label">Sort by</label>
        <select id="homeSortSelect" aria-label="Sort products">
          <option value="default">Sort: Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name-asc">Name: A–Z</option>
          <option value="name-desc">Name: Z–A</option>
        </select>
      </div>
    </div>

    <div class="applied-filters" id="appliedFilters"></div>
  `;

  renderAppliedFilters();

  /* ----------------------------------------------------------
     RESTORE SORT
     ---------------------------------------------------------- */

  $('#homeSortSelect')
    .value =
      sort;


  /* ----------------------------------------------------------
     SORT CHANGE
     ---------------------------------------------------------- */

  $('#homeSortSelect')
    .onchange =
      () => {

        homePage =
          1;


        renderHomeCategories();

      };


  /* ----------------------------------------------------------
     PRODUCT GRID
     ---------------------------------------------------------- */

  const grid =
    $('#homeProductsGrid');


  grid.innerHTML =
    '';


  pageItems
    .forEach(
      p =>
        grid.append(
          card(p)
        )
    );


  /* ==========================================================
     COMPACT PAGINATION
     ========================================================== */

  function createPagination(
    currentPage,
    totalPages
  ) {

    if (
      totalPages <= 1
    ) {

      return '';

    }


    const pages =
      [];


    function addPage(
      page
    ) {

      if (

        page >= 1 &&

        page <=
          totalPages &&

        !pages.includes(
          page
        )

      ) {

        pages.push(
          page
        );

      }

    }


    /* Always first */

    addPage(1);


    /* Beginning */

    if (
      currentPage <= 3
    ) {

      addPage(2);
      addPage(3);
      addPage(4);


      if (
        totalPages > 5
      ) {

        pages.push(
          '...'
        );

      }

    }


    /* End */

    else if (
      currentPage >=
      totalPages - 2
    ) {

      if (
        totalPages > 5
      ) {

        pages.push(
          '...'
        );

      }


      addPage(
        totalPages - 3
      );

      addPage(
        totalPages - 2
      );

      addPage(
        totalPages - 1
      );

    }


    /* Middle */

    else {

      pages.push(
        '...'
      );


      addPage(
        currentPage - 1
      );


      addPage(
        currentPage
      );


      addPage(
        currentPage + 1
      );


      pages.push(
        '...'
      );

    }


    /* Always last */

    addPage(
      totalPages
    );


    /* Remove duplicate dots */

    const cleanPages =
      pages.filter(
        (page, index) =>
          !(
            page === '...' &&
            pages[index - 1] ===
              '...'
          )
      );


    return `

      <button
        type="button"
        class="page-prev"
        data-page="${
          currentPage - 1
        }"
        ${
          currentPage === 1
            ? 'disabled'
            : ''
        }
      >
        ← Previous
      </button>


      ${
        cleanPages
          .map(
            page => {

              if (
                page ===
                '...'
              ) {

                return `
                  <span
                    class="page-dots"
                  >
                    ...
                  </span>
                `;

              }


              return `
                <button
                  type="button"
                  class="${
                    page ===
                    currentPage
                      ? 'active'
                      : ''
                  }"
                  data-page="${page}"
                >
                  ${page}
                </button>
                `;

            }
          )
          .join('')
      }


      <button
        type="button"
        class="page-next"
        data-page="${
          currentPage + 1
        }"
        ${
          currentPage ===
          totalPages
            ? 'disabled'
            : ''
        }
      >
        Next →
      </button>

    `;

  }


  /* ----------------------------------------------------------
     CREATE PAGINATION
     ---------------------------------------------------------- */

  const paginationHtml =
    createPagination(
      homePage,
      totalPages
    );


  /* ----------------------------------------------------------
     TOP PAGINATION
     ---------------------------------------------------------- */

  const pagerTop =
    $('#homePaginationTop');


  if (pagerTop) {

    pagerTop.innerHTML =
      paginationHtml;

  }


  /* ----------------------------------------------------------
     BOTTOM PAGINATION
     ---------------------------------------------------------- */

  const pagerBottom =
    $('#homePagination');


  if (pagerBottom) {

    pagerBottom.innerHTML =
      paginationHtml;

  }


  /* ----------------------------------------------------------
     PAGINATION EVENTS
     ---------------------------------------------------------- */

  document
    .querySelectorAll(
      '#homePagination button[data-page]'
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            if (
              button.disabled
            ) {

              return;

            }


            homePage =
              Number(
                button.dataset
                  .page
              );


            renderHomeCategories();


            $('#homeProductsHeading')
              ?.scrollIntoView({
                behavior:
                  'smooth',

                block:
                  'start'
              });

          };

      }
    );

}

/* ============================================================
   QUANTITY TYPING HANDLER
   ============================================================ */

function setupQuantityTyping() {

  /* ----------------------------------------------------------
     INPUT
     ---------------------------------------------------------- */

  document.addEventListener(
    'input',
    event => {

      const input =
        event.target;


      /*
         Prevent error:

         input.matches is not a function

         Only process actual HTML input elements.
      */

      if (
        !(input instanceof
          HTMLInputElement)
      ) {

        return;

      }


      if (
        input.matches(
          '.modal-quantity-value, .cart-quantity-value'
        )
      ) {

        event.stopImmediatePropagation();

      }

    },
    true
  );


  /* ----------------------------------------------------------
     BLUR
     ---------------------------------------------------------- */

  document.addEventListener(
    'blur',
    event => {

      const input =
        event.target;


      if (
        !(input instanceof
          HTMLInputElement)
      ) {

        return;

      }


      /* ------------------------------------------------------
         MODAL QUANTITY
         ------------------------------------------------------ */

      if (
        input.matches(
          '.modal-quantity-value'
        )
      ) {

        const minimum =
          Number(
            input.min
          ) || 1;


        input.value =
          Math.max(
            minimum,
            Number(
              input.value
            ) ||
            minimum
          );

      }


      /* ------------------------------------------------------
         CART QUANTITY
         ------------------------------------------------------ */

      if (
        input.matches(
          '.cart-quantity-value'
        )
      ) {

        const index =
          Number(
            input.dataset
              .index
          );


        if (
          !cart[index]
        ) {

          return;

        }


        const minimum =
          moqOf(
            cart[index]
              .product
          );


        cart[index]
          .quantity =
          Math.max(
            minimum,
            Number(
              input.value
            ) ||
            minimum
          );


        localStorage.setItem(
          CART_KEY,
          JSON.stringify(
            cart
          )
        );


        updateCartCount();

        renderCart();

      }

    },
    true
  );

}


/* ============================================================
   INITIALIZATION
   ============================================================ */

function init() {

  /* ----------------------------------------------------------
     STORE
     ---------------------------------------------------------- */

  configureStore();



  /* ----------------------------------------------------------
     HEADER NAVIGATION
     ---------------------------------------------------------- */

  document.querySelectorAll('.header-filter-trigger').forEach(trigger => {
    trigger.onclick = e => {
      e.stopPropagation();
      const menu = trigger.dataset.headerFilter === 'material'
        ? $('#headerMaterialMenu')
        : $('#headerOccasionMenu');
      const open = menu && menu.hidden;
      closeHeaderFilterMenus();
      if (menu) {
        menu.hidden = !open;
        trigger.setAttribute('aria-expanded', String(open));
      }
    };
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.header-filter-nav-item')) closeHeaderFilterMenus();
  });

  document.querySelectorAll('[data-header-quick-filter]').forEach(link => {
    link.onclick = e => {
      e.preventDefault();
      if (link.dataset.headerQuickFilter === 'material') {
        homeMaterial = '';
        homeOccasion = '';
      } else {
        homeOccasion = '';
        homeMaterial = '';
      }
      homePage = 1;
      renderHomeCategories();
      renderSideFilters();
      $('#homeCategories')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });


  /* ----------------------------------------------------------
     POLICIES POPUP
     ---------------------------------------------------------- */

  const policyContent = {
    terms: {
      eyebrow: 'Please note',
      title: 'Terms & <em>Conditions</em>',
      sections: [
        ['Orders & Customisation', 'Most products can be customised based on your requirements. Please verify names, spellings, colours, quantities and other customisation details before confirming an order. Changes may not be possible once customised production has started.'],
        ['Orders & Confirmation', 'Orders are confirmed after the required payment/advance and final details are received. Some products may have a minimum order quantity (MOQ), as shown on the product page or communicated before confirmation.'],
        ['Pricing & Payment', 'Prices may change without prior notice. Customisation, packaging, delivery or other applicable charges may be added to the final order price. Advance payments for customised orders may become non-refundable once production has started.'],
        ['Product Availability', 'Products, colours, materials and accessories are subject to availability. If a specific component becomes unavailable, a suitable alternative may be offered after discussion with the customer.'],
        ['Product Appearance', 'Product images are for reference. Slight differences in colour, texture, size or appearance may occur due to lighting, screens, materials and handmade/customised production.'],
        ['Cancellation, Returns & Exchanges', 'Cancellation requests must be made as early as possible. Customised products generally cannot be returned or exchanged once production has started. If you receive a damaged, defective or incorrect product, please contact us within 24 hours of delivery with clear photos/videos.'],
        ['Delivery', 'Delivery timelines are estimates and may vary depending on customisation, quantity, availability and courier services. Customers are responsible for providing a complete and accurate delivery address and contact number.'],
        ['Customer Information', 'Customers are responsible for the accuracy of names, spellings, addresses, photographs, designs and other information supplied for an order.'],
        ['Customer-Provided Content', 'By providing photographs, logos, names or other content for customisation, the customer confirms that they have the necessary permission to use that content.'],
        ['Intellectual Property', 'Praswa Gifts retains rights in its original photographs, graphics, catalogue content, designs and branding unless otherwise stated. These materials may not be copied or commercially used without permission.'],
        ['Promotional Use', 'With the customer’s consent where appropriate, photographs of completed products may be used by Praswa Gifts for promotional purposes. Customers may request that their personalised photographs/details not be used.'],
        ['Force Majeure', 'Praswa Gifts is not responsible for delays caused by circumstances beyond reasonable control, including natural events, transportation disruptions, government restrictions, strikes, technical failures or other unforeseen events.'],
        ['Acceptance', 'By placing an order with Praswa Gifts, the customer acknowledges that they have read, understood and agreed to the applicable Terms & Conditions.']
      ]
    },
    privacy: {
      eyebrow: 'Your information',
      title: 'Privacy <em>Policy</em>',
      sections: [
        ['Information We Receive', 'We may receive information you provide while making an enquiry or order, such as your name, phone number, delivery address, email address and customisation details.'],
        ['How We Use Information', 'We use order information to respond to enquiries, prepare and deliver orders, communicate about order status and provide customer support.'],
        ['Payment Information', 'Where payment is handled through a third-party payment provider, payment processing is subject to that provider’s terms and privacy practices.'],
        ['Sharing Information', 'We may share necessary delivery details with service providers such as courier partners when required to fulfil an order. We do not needlessly share customer information for unrelated purposes.'],
        ['Customer-Provided Photos', 'Photos or other personal content submitted for customisation are used for fulfilling the requested service. Please tell us if you do not want completed personalised work used for promotional purposes.'],
        ['Data Security', 'We take reasonable steps to protect customer information, but no online transmission or storage method can be guaranteed to be completely secure.'],
        ['Contact', 'For privacy-related questions or requests, please contact Praswa Gifts using the contact details provided on the website.']
      ]
    },
    refund: {
      eyebrow: 'Before confirming',
      title: 'Cancellation & <em>Refund</em>',
      sections: [
        ['Cancellation Before Production', 'Please contact us as soon as possible if you need to cancel an order. If production or procurement has not started, we will review the cancellation and applicable refund based on the order status.'],
        ['Customised Orders', 'Once customisation, printing, engraving, preparation or procurement has started, cancellation may not be possible and advance payments may be non-refundable.'],
        ['Damaged or Incorrect Products', 'If an order arrives damaged, defective or different from what was confirmed, contact us within 24 hours of delivery with clear photos/videos. We will review the issue and provide an appropriate resolution where applicable.'],
        ['Returns & Exchanges', 'Because customised products are made specifically for the customer, customised products generally cannot be returned or exchanged unless there is a verified defect, damage or fulfilment error.'],
        ['Refund Processing', 'Where a refund is approved, the method and timing will depend on the original payment method and applicable payment-provider or banking timelines.']
      ]
    },
    shipping: {
      eyebrow: 'Order delivery',
      title: 'Shipping & <em>Delivery</em>',
      sections: [
        ['Processing Time', 'Processing time depends on the product, quantity, customisation and material availability. Bulk and customised orders may require additional preparation time.'],
        ['Delivery Estimates', 'Delivery dates are estimates rather than guaranteed dates unless specifically confirmed. Courier delays, weather, holidays and other circumstances may affect delivery.'],
        ['Address Accuracy', 'Please provide a complete delivery address, PIN code and reachable phone number. Delays or failed deliveries caused by incorrect or incomplete details may require additional delivery arrangements or charges.'],
        ['Courier Delays', 'Once an order has been handed to the courier, delivery is subject to the courier’s network and operating conditions. We will assist with tracking and coordination where possible.'],
        ['Transit Damage', 'Please inspect the package when received. If the product is damaged during transit, contact us within 24 hours with clear photos/videos of the outer package and product.'],
        ['Shipping Charges', 'Applicable delivery/shipping charges will be communicated before final order confirmation when they are not already included in the product price.']
      ]
    }
  };

  function openPolicy(policy = 'terms') {
    const data = policyContent[policy] || policyContent.terms;
    const modal = $('#termsModal');
    if (!modal) return;

    const eyebrow = $('#policyEyebrow');
    const title = $('#policyTitle');
    const content = $('#policyContent');

    if (eyebrow) eyebrow.textContent = data.eyebrow;
    if (title) title.innerHTML = data.title;
    if (content) {
      content.innerHTML = data.sections.map((section, index) => `
        <details class="policy-item" ${index === 0 ? 'open' : ''}>
          <summary>${escapeHtml(section[0])}<span aria-hidden="true">+</span></summary>
          <div class="policy-item-body">${escapeHtml(section[1])}</div>
        </details>
      `).join('');
    }

    if (!modal.open) modal.showModal();
  }

  document.querySelectorAll('[data-open-policy]').forEach(link => {
    link.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      closeSideMenu();
      openPolicy(link.dataset.openPolicy || 'terms');
    };
  });

  $('#termsModal')?.addEventListener('click', e => {
    if (e.target === $('#termsModal')) $('#termsModal').close();
  });

  /* ----------------------------------------------------------
     CART
     ---------------------------------------------------------- */

  try {

    cart =
      JSON.parse(
        localStorage.getItem(
          CART_KEY
        ) ||
        '[]'
      );

  } catch {

    cart = [];

  }


  updateCartCount();


  /* ----------------------------------------------------------
     SIDE MENU
     ---------------------------------------------------------- */

  const side = $('#sideMenu');
  const backdrop = $('#menuBackdrop');

  if (side) {

    $('.menu-toggle')?.addEventListener('click', toggleSideMenu);
    $('.side-menu-close')?.addEventListener('click', closeSideMenu);
    backdrop?.addEventListener('click', closeSideMenu);

    /* Collapse / expand Material, Occasion and Price Range. */
    side.querySelectorAll('.side-filter-heading').forEach(heading => {

  const content = heading.nextElementSibling;
  if (!content) return;

  // Collapsed by default
  heading.setAttribute('aria-expanded', 'false');
  content.classList.add('collapsed');

  heading.onclick = e => {
    e.preventDefault();
    e.stopPropagation();

    const isExpanded =
      heading.getAttribute('aria-expanded') === 'true';

    heading.setAttribute(
      'aria-expanded',
      String(!isExpanded)
    );

    content.classList.toggle(
      'collapsed',
      isExpanded
    );
  };

});

    /* Normal side navigation closes the menu. Terms is handled separately. */
    side.querySelectorAll('nav a:not([data-open-terms])').forEach(a => {
      a.addEventListener('click', closeSideMenu);
    });

  }


  /* ----------------------------------------------------------
     CART
     ---------------------------------------------------------- */

  $('.cart-trigger')
    .onclick =
      () => {

        renderCart();

        $('#cartModal')
          .showModal();

      };


  /* ----------------------------------------------------------
     HOME SEARCH
     ---------------------------------------------------------- */

  $('#homeSearchInput')
    .oninput =
      renderHomeCategories;


  /* ----------------------------------------------------------
     MODAL CLOSE
     ---------------------------------------------------------- */

  document
    .querySelectorAll(
      '.modal-close'
    )
    .forEach(
      b =>
        b.onclick =
          () =>
            b.closest(
              'dialog'
            ).close()
    );


  /* ----------------------------------------------------------
     CLOSE DIALOG WHEN CLICKING BACKDROP
     ---------------------------------------------------------- */

  [
    '#productModal',
    '#cartModal',
    '#checkoutModal'
  ]
    .forEach(
      s =>
        $(s).addEventListener(
          'click',
          e => {

            if (
              e.target ===
              $(s)
            ) {

              $(s).close();

            }

          }
        )
    );


  /* ----------------------------------------------------------
     CHECKOUT
     ---------------------------------------------------------- */

  $('#checkoutButton')
    .onclick =
      () => {

        $('#cartModal')
          .close();


        $('#checkoutModal')
          .showModal();

      };


  /* ----------------------------------------------------------
     CHECKOUT FORM
     ---------------------------------------------------------- */

  $('#checkoutForm')
    .onsubmit =
      e => {

        e.preventDefault();


        const f =
          new FormData(
            e.currentTarget
          );


        const lines =
          cart.map(
            item =>
              `• ${
                productName(
                  item.product
                )
              }${item.size ? ` (${item.size})` : ''} × ${
                item.quantity
              } — ${
                priceLabel(
                  item.product,
                  item.size || ''
                )
              }`
          );


        const total =
          cart.reduce(
            (n, item) =>
              n +
              (item.unitPrice ?? priceOf(item.product)) *
              item.quantity,
            0
          );


        const message =

          `Hello Praswa Gifts, I would like to place an order.

${lines.join('\n')}

*Total: ₹${total.toLocaleString(
            'en-IN'
          )}*

Customer name: ${f.get(
            'name'
          )}

Phone: ${f.get(
            'phone'
          )}

Address: ${f.get(
            'address'
          )}

Please confirm availability and final order details.`;


        window.open(
          `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
            message
          )}`,
          '_blank'
        );

      };


  /* ----------------------------------------------------------
     LOAD PRODUCTS
     ---------------------------------------------------------- */

  loadProducts();

}


/* ============================================================
   START APPLICATION
   ============================================================ */

setupQuantityTyping();

init();
