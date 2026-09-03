/* ============================================================
   PRASWA GIFTS - SCRIPT.JS
   ============================================================
   Includes:
   - Google Sheets API
   - Categories / Subcategories
   - Product catalogue
   - Search
   - Sorting
   - Product details
   - MOQ quantity controls
   - Cart
   - WhatsApp
   - Checkout
   - Compact pagination
   - OPTION 5 PRICE FILTER
     Quick filters + Custom From/To
   ============================================================ */


/* ============================================================
   CONFIGURATION
   ============================================================ */

const API_URL =
  'https://script.google.com/macros/s/AKfycbzdJfJ2x7nZvdkoCQlJ3nKRit8EJlX-luqJlVNYxdN6JTq1JSz12_dV3tJMPXTZ5gei/exec';

const WHATSAPP = '918985390330';

const STORE = {
  phone: '+91 89853 90330',
  email: 'hello@praswagifts.com',
  instagram: 'https://www.instagram.com/praswa_gifts_crafts',
  address: 'Add your business address here',
  mapsUrl: 'https://maps.google.com/?q=Add+your+business+address+here'
};

const CACHE_KEY = 'praswa_gifts_products_v1';
const CART_KEY = 'praswa_gifts_cart_v1';

const CACHE_MAX_AGE = 1000 * 60 * 30;

const PAGE_SIZE = 12;
const HOME_PAGE_SIZE = 12;


/* ============================================================
   GLOBAL STATE
   ============================================================ */

let products = [];
let filtered = [];
let visibleCount = PAGE_SIZE;
let cart = [];

let homeCategory = '';
let homeSubcategory = '';

let homeMaterial = '';
let homeOccasion = '';

let homePage = 1;

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

  const material = p =>
  value(
    p,
    'Material',
    'material'
  );


const occasion = p =>
  value(
    p,
    'Occasion',
    'occasion'
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
      raw.replace(
        /[^0-9.]/g,
        ''
      )
    );

  return Number.isFinite(n)
    ? n
    : 0;
}

function getMaterial(p) {
    return value(p, 'Material', 'material');
}

function getOccasion(p) {
    return value(p, 'Occasion', 'occasion');
}

function priceLabel(p) {

  const raw =
    value(
      p,
      'Price',
      'price'
    );

  const price =
    priceOf(p);

  return raw && price
    ? `₹${price.toLocaleString('en-IN')}`
    : 'Price on request';
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

    ? `https://drive.google.com/thumbnail?id=${id}&sz=w1200`

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
   WHATSAPP PRODUCT LINK
   ============================================================ */

function whatsappLink(p) {

  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
    `Hi, I'm interested in ${productName(p)} (${productCode(p)}).

Please share the price and details.`
  )}`;

}


/* ============================================================
   OCCASIONS
   ============================================================ */

function renderOccasions() {

  $('#occasionGrid').innerHTML =
    occasions
      .map(
        ([title, desc, icon]) =>
          `
          <a
            href="#shop"
            class="occasion-card"
            data-icon="${icon}"
            data-occasion="${title}"
          >
            <h3>${title}</h3>
            <p>${desc}</p>
          </a>
          `
      )
      .join('');

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

    img.src = image;

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


  node.querySelector(
    '.product-price'
  ).textContent =
    priceLabel(p);


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
    '.enquire-product'
  ).href =
    whatsappLink(p);


  node.querySelector(
    '.product-image'
  ).onclick = () =>
    openProduct(p);


  node.querySelector(
    '.add-cart'
  ).onclick = () =>
    addToCart(
      p,
      quantity
    );


  return node;

}


/* ============================================================
   MAIN CATALOGUE PRODUCTS
   ============================================================ */

function renderProducts() {

  const grid =
    $('#catalogueGrid');

  grid.innerHTML = '';


  filtered
    .slice(
      0,
      visibleCount
    )
    .forEach(
      p =>
        grid.append(
          card(p)
        )
    );


  $('#loadMore').hidden =
    visibleCount >=
    filtered.length;


  $('#catalogueStatus')
    .textContent =
      products.length
        ? `${filtered.length} ${
            filtered.length === 1
              ? 'gift'
              : 'gifts'
          } found`
        : '';

}


/* ============================================================
   FEATURED PRODUCTS
   ============================================================ */

function renderFeatured() {

  const grid =
    $('#featuredGrid');

  grid.innerHTML = '';


  (
    products.length
      ? products.slice(0, 8)
      : []
  )
    .forEach(
      p =>
        grid.append(
          card(p)
        )
    );


  if (!products.length) {

    grid.innerHTML =
      '<p class="empty-message">' +
      'Our curated collection is arriving shortly. ' +
      'Please check back soon.' +
      '</p>';

  }

}


/* ============================================================
   CATEGORY CARDS
   ============================================================ */

function renderCategories() {

  const groups =
    [
      ...new Set(
        products.map(category)
      )
    ];


  $('#categoryGrid').innerHTML =
    groups.length

      ? groups
          .map(
            c =>
              `
              <button
                class="category-card"
                data-category="${escapeHtml(c)}"
              >
                <h3>${escapeHtml(c)}</h3>

                <p>
                  ${
                    products.filter(
                      p =>
                        category(p) === c
                    ).length
                  }
                  curated gifts
                  <span>→</span>
                </p>

              </button>
              `
          )
          .join('')

      : '<p class="empty-message">' +
        'Categories will appear once the catalogue connects.' +
        '</p>';


  document
    .querySelectorAll(
      '.category-card'
    )
    .forEach(
      b =>
        b.onclick = () => {

          $('#categoryFilter').value =
            b.dataset.category;

          applyFilters();

          location.hash =
            'shop';

        }
    );

}


/* ============================================================
   CATEGORY ICON
   ============================================================ */

function categoryIcon(
  name,
  index
) {

  const icons = [
    '🎁',
    '💐',
    '✨',
    '🏵️',
    '🪔',
    '🎀',
    '🌸',
    '💝',
    '🎉',
    '🕯️'
  ];

  return icons[
    index % icons.length
  ];

}


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

function populateFilters() {

  const cats =
    [
      ...new Set(
        products.map(category)
      )
    ].sort();


  $('#categoryFilter').innerHTML =
    '<option value="">All categories</option>' +

    cats
      .map(
        x =>
          `<option>${escapeHtml(x)}</option>`
      )
      .join('');


  updateSubcategories();

}


/* ============================================================
   UPDATE SUBCATEGORIES
   ============================================================ */

function updateSubcategories() {

  const cat =
    $('#categoryFilter').value;


  const subs =
    [
      ...new Set(
        products
          .filter(
            p =>
              !cat ||
              category(p) === cat
          )
          .map(
            subcategory
          )
          .filter(Boolean)
      )
    ].sort();


  $('#subcategoryFilter').innerHTML =
    '<option value="">All sub-categories</option>' +

    subs
      .map(
        x =>
          `<option>${escapeHtml(x)}</option>`
      )
      .join('');

}


/* ============================================================
   MAIN CATALOGUE FILTERS
   ============================================================ */

function applyFilters() {

  const q =
    $('#searchInput')
      .value
      .toLowerCase()
      .trim();

  const cat =
    $('#categoryFilter').value;

  const sub =
    $('#subcategoryFilter').value;

  const sort =
    $('#sortSelect').value;

const minPrice =
  homeMinPrice;

const maxPrice =
  homeMaxPrice;

  filtered =
    products.filter(
      p => {

        const hay =
          [
            productName(p),
            productCode(p),
            productId(p),
            category(p),
            subcategory(p)
          ]
            .join(' ')
            .toLowerCase();

return (
  (!q ||
    hay.includes(q)) &&

  (!cat ||
    category(p) === cat) &&

  (!sub ||
    subcategory(p) === sub) &&

  (!homeMaterial ||
    material(p) === homeMaterial) &&

  (!homeOccasion ||
    occasion(p) === homeOccasion) &&

  (minPrice === null ||
    priceOf(p) >= minPrice) &&

  (maxPrice === null ||
    priceOf(p) <= maxPrice)
);
      }
    );


  if (
    sort ===
    'name-asc'
  ) {

    filtered.sort(
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

    filtered.sort(
      (a, b) =>
        productName(b)
          .localeCompare(
            productName(a)
          )
    );

  }


  if (
    sort ===
    'price-asc'
  ) {

    filtered.sort(
      (a, b) =>
        priceOf(a) -
        priceOf(b)
    );

  }


  if (
    sort ===
    'price-desc'
  ) {

    filtered.sort(
      (a, b) =>
        priceOf(b) -
        priceOf(a)
    );

  }


  visibleCount =
    PAGE_SIZE;


  renderProducts();

}


/* ============================================================
   PRODUCT DETAILS MODAL
   ============================================================ */

function openProduct(p) {

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
            priceLabel(p)
          )}
        </p>


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


          <a
            class="btn modal-whatsapp"
            aria-label="Enquire on WhatsApp"
            title="Enquire on WhatsApp"
            target="_blank"
            rel="noopener"
            href="${whatsappLink(p)}"
          >
            ◉
          </a>

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
        )
      );

    };


  modal.showModal();

}

function renderSideFilters() {

  const materialMenu =
    document.getElementById('sideMaterialMenu');

  const occasionMenu =
    document.getElementById('sideOccasionMenu');

  const priceMenu =
    document.getElementById('sidePriceMenu');

  if (!materialMenu || !occasionMenu || !priceMenu) {
    return;
  }


  /* ==========================================================
     SHOP BY CATEGORY - MATERIAL
     ========================================================== */

  const materials = [
    ...new Set(
      products
        .map(p =>
          value(p, 'Material', 'material')
        )
        .filter(Boolean)
    )
  ].sort();


  materialMenu.innerHTML = `
    <button
      type="button"
      class="side-filter-item active"
      data-material=""
    >
      All Items
    </button>

    ${materials.map(name => `
      <button
        type="button"
        class="side-filter-item"
        data-material="${name}"
      >
        ${name}
      </button>
    `).join('')}
  `;


  /* ==========================================================
     SHOP BY OCCASION
     ========================================================== */

  const occasionsList = [
    ...new Set(
      products
        .map(p =>
          value(p, 'Occasion', 'occasion')
        )
        .filter(Boolean)
    )
  ].sort();


  occasionMenu.innerHTML = `
    <button
      type="button"
      class="side-filter-item active"
      data-occasion=""
    >
      All Occasions
    </button>

    ${occasionsList.map(name => `
      <button
        type="button"
        class="side-filter-item"
        data-occasion="${name}"
      >
        ${name}
      </button>
    `).join('')}
  `;


  /* ==========================================================
     PRICE RANGE
     ========================================================== */

  priceMenu.innerHTML = `
    <button
      type="button"
      class="side-price-item"
      data-price-filter="all">
      All Prices
    </button>

    <button
      type="button"
      class="side-price-item"
      data-price-filter="100">
      Under ₹100
    </button>

    <button
      type="button"
      class="side-price-item"
      data-price-filter="200">
      Under ₹200
    </button>

    <button
      type="button"
      class="side-price-item"
      data-price-filter="300">
      Under ₹300
    </button>

    <button
      type="button"
      class="side-price-item"
      data-price-filter="500">
      Under ₹500
    </button>

    <button
      type="button"
      class="side-price-item"
      data-price-filter="1000-plus">
      ₹1,000 & Above
    </button>
  `;


  /* ==========================================================
     MATERIAL CLICK
     ========================================================== */

  materialMenu
    .querySelectorAll('[data-material]')
    .forEach(button => {

      button.onclick = () => {

        homeMaterial =
          button.dataset.material;

        homeOccasion = '';

        homeCategory = '';
        homeSubcategory = '';

        homePage = 1;

        renderHomeCategories();

        closeSideMenu();
      };

    });


  /* ==========================================================
     OCCASION CLICK
     ========================================================== */

  occasionMenu
    .querySelectorAll('[data-occasion]')
    .forEach(button => {

      button.onclick = () => {

        homeOccasion =
          button.dataset.occasion;

        homeMaterial = '';

        homeCategory = '';
        homeSubcategory = '';

        homePage = 1;

        renderHomeCategories();

        closeSideMenu();
      };

    });


  /* ==========================================================
     PRICE CLICK
     ========================================================== */

  priceMenu
    .querySelectorAll('[data-price-filter]')
    .forEach(button => {

      button.onclick = () => {

        const filter =
          button.dataset.priceFilter;


        if (filter === 'all') {

          homeMinPrice = null;
          homeMaxPrice = null;

        } else if (filter === '100') {

          homeMinPrice = null;
          homeMaxPrice = 100;

        } else if (filter === '200') {

          homeMinPrice = null;
          homeMaxPrice = 200;

        } else if (filter === '300') {

          homeMinPrice = null;
          homeMaxPrice = 300;

        } else if (filter === '500') {

          homeMinPrice = null;
          homeMaxPrice = 500;

        } else if (filter === '1000-plus') {

          homeMinPrice = 1000;
          homeMaxPrice = null;

        }


        homePage = 1;

        renderHomeCategories();

        closeSideMenu();

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

  filtered =
    [...products];

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

function cartKey(p) {

  return (
    productId(p) ||
    productCode(p) ||
    productName(p)
  );

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
  quantity = 1
) {

  const item =
    cart.find(
      x =>
        cartKey(
          x.product
        ) ===
        cartKey(p)
    );


  if (item) {

    item.quantity +=
      quantity;

  } else {

    cart.push({
      product: p,
      quantity
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
        priceOf(
          item.product
        ) *
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
                priceOf(
                  item.product
                ) *
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


                    <span>
                      ${escapeHtml(
                        priceLabel(
                          item.product
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
            item.product
          );

        }
    );

}


/* ============================================================
   STORE CONTACT
   ============================================================ */

function configureStore() {

  const phoneHref =
    `tel:${STORE.phone.replace(
      /\s/g,
      ''
    )}`;


  if ($('#sidePhone')) {

    $('#sidePhone').href =
      phoneHref;

    $('#sidePhone').textContent =
      STORE.phone;

  }


  if ($('#sideEmail')) {

    $('#sideEmail').href =
      `mailto:${STORE.email}`;

    $('#sideEmail').textContent =
      STORE.email;

  }


  if ($('#sideInstagram')) {

    $('#sideInstagram').href =
      STORE.instagram;

  }


  if ($('#footerAddress')) {

    $('#footerAddress').textContent =
      STORE.address;

  }


  if ($('#footerPhone')) {

    $('#footerPhone').href =
      phoneHref;

    $('#footerPhone').textContent =
      STORE.phone;

  }


  if ($('#footerEmail')) {

    $('#footerEmail').href =
      `mailto:${STORE.email}`;

    $('#footerEmail').textContent =
      STORE.email;

  }


  if ($('#footerInstagram')) {

    $('#footerInstagram').href =
      STORE.instagram;

  }

}

function renderSideFilters() {

  const materialMenu =
    document.getElementById('sideMaterialMenu');

  const occasionMenu =
    document.getElementById('sideOccasionMenu');

  if (!materialMenu || !occasionMenu) {
    return;
  }


  /* -------------------------------
     SHOP BY CATEGORY - MATERIAL
     ------------------------------- */

  const materials = [
    ...new Set(
      products
        .map(material)
        .filter(Boolean)
    )
  ].sort();


  materialMenu.innerHTML = `

    <button
      type="button"
      class="side-filter-item"
      data-material=""
    >
      <span>All Items</span>
      <span>${products.length}</span>
    </button>

    ${materials.map(name => {

      const count =
        products.filter(
          p => material(p) === name
        ).length;

      return `
        <button
          type="button"
          class="side-filter-item"
          data-material="${escapeHtml(name)}"
        >
          <span>${escapeHtml(name)}</span>
          <span>${count}</span>
        </button>
      `;

    }).join('')}

  `;


  /* -------------------------------
     SHOP BY OCCASION
     ------------------------------- */

  const occasionsList = [
    ...new Set(
      products
        .map(occasion)
        .filter(Boolean)
    )
  ].sort();


  occasionMenu.innerHTML = `

    <button
      type="button"
      class="side-filter-item"
      data-occasion=""
    >
      <span>All Occasions</span>
      <span>${products.length}</span>
    </button>

    ${occasionsList.map(name => {

      const count =
        products.filter(
          p => occasion(p) === name
        ).length;

      return `
        <button
          type="button"
          class="side-filter-item"
          data-occasion="${escapeHtml(name)}"
        >
          <span>${escapeHtml(name)}</span>
          <span>${count}</span>
        </button>
      `;

    }).join('')}

  `;


  /* -------------------------------
     CLICK - MATERIAL
     ------------------------------- */

  materialMenu
    .querySelectorAll('[data-material]')
    .forEach(button => {

      button.onclick = () => {

        homeMaterial =
          button.dataset.material;

        homeOccasion = '';

        homeCategory = '';
        homeSubcategory = '';

        homePage = 1;

        applyFilters();

        closeSideMenu();

      };

    });


  /* -------------------------------
     CLICK - OCCASION
     ------------------------------- */

  occasionMenu
    .querySelectorAll('[data-occasion]')
    .forEach(button => {

      button.onclick = () => {

        homeOccasion =
          button.dataset.occasion;

        homeMaterial = '';

        homeCategory = '';
        homeSubcategory = '';

        homePage = 1;

        applyFilters();

        closeSideMenu();

      };

    });

}
/* ============================================================
   HOME CATEGORY / PRODUCT SECTION
   OPTION 5 PRICE FILTER
   ============================================================ */
/* ============================================================
   HOME CATEGORY / PRODUCT SECTION
   CUSTOM PRICE FILTER ONLY
   ============================================================ */

function renderHomeCategories() {

  /* ----------------------------------------------------------
     CATEGORIES
     ---------------------------------------------------------- */

  const categories =
    [
      ...new Set(
        products.map(category)
      )
    ].sort();


  const rotator =
    $('#homeCategoryRotator');


  if (!categories.length) {

    rotator.innerHTML =
      '<p class="empty-message">' +
      'Categories will appear once the catalogue connects.' +
      '</p>';

    return;

  }


  const choices =
    [
      'All Categories',
      ...categories
    ];


  rotator.innerHTML =
    choices
      .map(
        (name, index) =>
          `
          <button
            class="rotator-item ${
              (
                !homeCategory &&
                index === 0
              ) ||
              name === homeCategory
                ? 'active'
                : ''
            }"
            data-category="${
              escapeHtml(
                name ===
                'All Categories'
                  ? ''
                  : name
              )
            }"
            type="button"
          >

            <span
              class="rotator-icon"
            >
              ${
                name ===
                'All Categories'
                  ? '✦'
                  : categoryIcon(
                      name,
                      index
                    )
              }
            </span>

            <b>
              ${escapeHtml(name)}
            </b>

          </button>
          `
      )
      .join('');


  rotator
    .querySelectorAll(
      'button'
    )
    .forEach(
      button =>
        button.onclick =
          () => {

            homeCategory =
              button.dataset.category;

            homeSubcategory =
              '';

            homePage =
              1;

            renderHomeCategories();

          }
    );


  /* ----------------------------------------------------------
     SUBCATEGORIES
     ---------------------------------------------------------- */

  const subs =
    [
      ...new Set(
        products
          .filter(
            p =>
              !homeCategory ||
              category(p) ===
                homeCategory
          )
          .map(
            subcategory
          )
          .filter(Boolean)
      )
    ].sort();


  const panel =
    $('#homeSubcategoryPanel');


  panel.hidden =
    !homeCategory ||
    !subs.length;


  $('#homeSubcategoryRotator')
    .innerHTML =
      subs
        .map(
          (name, index) =>
            `
            <button
              class="rotator-item subcategory-item ${
                name ===
                homeSubcategory
                  ? 'active'
                  : ''
              }"
              data-subcategory="${escapeHtml(
                name
              )}"
              type="button"
            >

              <span
                class="rotator-icon"
              >
                ${categoryIcon(
                  name,
                  index + 3
                )}
              </span>

              <b>
                ${escapeHtml(name)}
              </b>

            </button>
            `
        )
        .join('');


  $('#homeSubcategoryRotator')
    .querySelectorAll(
      'button'
    )
    .forEach(
      button =>
        button.onclick =
          () => {

            homeSubcategory =
              homeSubcategory ===
              button.dataset
                .subcategory

                ? ''

                : button.dataset
                    .subcategory;


            homePage =
              1;


            renderHomeCategories();

          }
    );


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
        .map(priceOf)
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

        const hay =
  [
    productName(p),
    productCode(p),
    productId(p),
    category(p),
    subcategory(p),
    material(p),
    occasion(p)
  ]
            .join(' ')
            .toLowerCase();


        const price =
          priceOf(p);


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
            !homeCategory ||
            category(p) ===
              homeCategory
          )

          &&

          (
            !homeSubcategory ||
            subcategory(p) ===
              homeSubcategory
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
     HEADING + CUSTOM PRICE FILTER
     ---------------------------------------------------------- */

  $('#homeProductsHeading')
    .innerHTML =

    `
    <h3>

      ${
        escapeHtml(
          homeSubcategory ||
          homeCategory ||
          'All Categories'
        )
      }

      <span>
        ${shown.length}
        ${
          shown.length === 1
            ? 'gift'
            : 'gifts'
        }
      </span>

    </h3>

<div class="custom-price-filter">

    <span class="custom-price-label">
        Price Range
    </span>

    <div class="price-input">
        <span>₹</span>
        <input
            id="homePriceFrom"
            type="number"
            min="0"
            max="25000"
            value="${homeMinPrice ?? 0}"
            aria-label="Minimum price"
        />
    </div>

    <span class="price-to">–</span>

    <div class="price-input">
        <span>₹</span>
        <input
            id="homePriceTo"
            type="number"
            min="0"
            max="25000"
            value="${homeMaxPrice ?? 25000}"
            aria-label="Maximum price"
        />
    </div>

    <button
        type="button"
        id="applyCustomPrice"
    >
        Apply
    </button>

    <button
        type="button"
        id="clearCustomPrice"
        class="clear-custom-price"
    >
        Clear
    </button>

</div>
    


      <!-- EXISTING SORT -->

      <select
        id="homeSortSelect"
        aria-label="Sort products"
      >

        <option value="default">
          Sort: Featured
        </option>

        <option value="price-asc">
          Price: Low to High
        </option>

        <option value="price-desc">
          Price: High to Low
        </option>

        <option value="name-asc">
          Name: A–Z
        </option>

        <option value="name-desc">
          Name: Z–A
        </option>

      </select>

    </div>

    `;


  /* ----------------------------------------------------------
     RESTORE SORT
     ---------------------------------------------------------- */

  $('#homeSortSelect')
    .value =
      sort;


  /* ----------------------------------------------------------
     APPLY CUSTOM PRICE
     ---------------------------------------------------------- */

  $('#applyCustomPrice')
    .onclick =
      () => {

        const fromValue =
          $('#homePriceFrom')
            .value
            .trim();


        const toValue =
          $('#homePriceTo')
            .value
            .trim();


        let from =
          fromValue === ''
            ? 0
            : Number(
                fromValue
              );


        let to =
          toValue === ''
            ? priceCeiling
            : Number(
                toValue
              );


        /* Invalid From */

        if (
          !Number.isFinite(
            from
          )
        ) {

          from = 0;

        }


        /* Invalid To */

        if (
          !Number.isFinite(
            to
          )
        ) {

          to =
            priceCeiling;

        }


        /* Keep values within valid range */

        from =
          Math.max(
            0,
            Math.min(
              from,
              priceCeiling
            )
          );


        to =
          Math.max(
            0,
            Math.min(
              to,
              priceCeiling
            )
          );


        /* Swap if From is greater than To */

        if (
          from > to
        ) {

          [
            from,
            to
          ] =
            [
              to,
              from
            ];

        }


        homeMinPrice =
          from;


        homeMaxPrice =
          to;


        homePage =
          1;


        renderHomeCategories();

      };


  /* ----------------------------------------------------------
     CLEAR CUSTOM PRICE
     ---------------------------------------------------------- */

  $('#clearCustomPrice')
    .onclick =
      () => {

        homeMinPrice =
          0;


        homeMaxPrice =
          priceCeiling;


        homePage =
          1;


        renderHomeCategories();

      };


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
      '#homePaginationTop button[data-page],' +
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

  const side =
    $('#sideMenu');


  const backdrop =
    $('#menuBackdrop');


  const toggle =
    () => {

      const open =
        side.classList.toggle(
          'open'
        );


      backdrop.classList.toggle(
        'open',
        open
      );


      $('.menu-toggle')
        .setAttribute(
          'aria-expanded',
          open
        );


      side.setAttribute(
        'aria-hidden',
        !open
      );

    };


  $('.menu-toggle')
    .onclick =
      toggle;


  $('.side-menu-close')
    .onclick =
      toggle;


  backdrop.onclick =
    toggle;


  side
    .querySelectorAll(
      'nav a'
    )
    .forEach(
      a =>
        a.onclick =
          () =>
            side.classList.contains(
              'open'
            ) &&
            toggle()
    );


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
              } × ${
                item.quantity
              } — ${
                priceLabel(
                  item.product
                )
              }`
          );


        const total =
          cart.reduce(
            (n, item) =>
              n +
              priceOf(
                item.product
              ) *
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