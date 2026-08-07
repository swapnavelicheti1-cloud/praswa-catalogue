const API_URL = "https://script.google.com/macros/s/AKfycbynM_Gva75Wb61DUxIeOFEJhKKm-ZMqERo3IxQ9TVd3F7nipucRdfmIJj4oxbVmvduf/exec";

const CACHE_KEY = "praswa_products";
const CACHE_TIME = 5 * 60 * 1000;

let allProducts = [];
let selectedCategory = "All";

let currentProduct = null;
let currentImageIndex = 0;


/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts() {

    const container =
        document.getElementById("productContainer");

    container.innerHTML = `
        <div class="loading">
            Loading products...
        </div>
    `;


    const cachedData =
        localStorage.getItem(CACHE_KEY);


    if (cachedData) {

        const cached =
            JSON.parse(cachedData);


        const cacheIsValid =
            Date.now() - cached.time < CACHE_TIME;


        if (cacheIsValid) {

            allProducts =
                cached.products;


            displayCategories();

            displayProducts(allProducts);

            refreshProducts();

            return;
        }
    }


    await refreshProducts();
}


/* =========================
   REFRESH API DATA
========================= */

async function refreshProducts() {

    try {

        const response =
            await fetch(API_URL);


        if (!response.ok) {

            throw new Error(
                "Unable to load products"
            );

        }


        const products =
            await response.json();


        // Only Active products

        allProducts =
            products.filter(
                product =>
                    String(product.Status)
                        .toLowerCase() === "active"
            );


        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
                time: Date.now(),
                products: allProducts
            })
        );


        displayCategories();

        displayProducts(allProducts);


    } catch (error) {

        console.error(
            "Error loading products:",
            error
        );


        document.getElementById(
            "productContainer"
        ).innerHTML = `
            <p>
                Unable to load products.
                Please try again.
            </p>
        `;
    }
}


/* =========================
   DRIVE IMAGE URL
========================= */

function getDriveImageUrl(driveLink) {

    if (!driveLink) {

        return "";
    }


    const match =
        driveLink.match(
            /\/d\/([^/]+)/
        );


    if (match && match[1]) {

        const fileId =
            match[1];


        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }


    return driveLink;
}


/* =========================
   GET PRODUCT IMAGES
========================= */

function getProductImages(product) {

    const images = [];


    if (product.Image1) {

        images.push(
            getDriveImageUrl(
                product.Image1
            )
        );
    }


    if (product.Image2) {

        images.push(
            getDriveImageUrl(
                product.Image2
            )
        );
    }


    if (product.Image3) {

        images.push(
            getDriveImageUrl(
                product.Image3
            )
        );
    }


    return images;
}


/* =========================
   CATEGORIES
========================= */

function displayCategories() {

    const container =
        document.getElementById(
            "categoryContainer"
        );


    container.innerHTML = "";


    const allCategory =
        document.createElement("div");


    allCategory.className =
        selectedCategory === "All"
            ? "category-card active"
            : "category-card";


    allCategory.innerHTML = `
        <div class="category-icon">
            🛍️
        </div>

        <h3>
            All Products
        </h3>
    `;


    allCategory.addEventListener(
        "click",
        function () {

            selectedCategory = "All";

            displayCategories();

            displayProducts(
                allProducts
            );
        }
    );


    container.appendChild(
        allCategory
    );


    const categories = [
        ...new Set(
            allProducts
                .map(
                    product =>
                        product.Category
                )
                .filter(
                    category =>
                        category
                )
        )
    ];


    categories.forEach(
        category => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                selectedCategory === category
                    ? "category-card active"
                    : "category-card";


            card.innerHTML = `
                <div class="category-icon">
                    📦
                </div>

                <h3>
                    ${category}
                </h3>
            `;


            card.addEventListener(
                "click",
                function () {

                    selectedCategory =
                        category;


                    const filteredProducts =
                        allProducts.filter(
                            product =>
                                product.Category ===
                                category
                        );


                    displayCategories();

                    displayProducts(
                        filteredProducts
                    );
                }
            );


            container.appendChild(
                card
            );
        }
    );
}


/* =========================
   DISPLAY PRODUCTS
========================= */

function displayProducts(products) {

    const container =
        document.getElementById(
            "productContainer"
        );


    const title =
        document.getElementById(
            "productsTitle"
        );


    container.innerHTML = "";


    title.textContent =
        selectedCategory === "All"
            ? "All Products"
            : `${selectedCategory} Products`;


    if (products.length === 0) {

        container.innerHTML = `
            <p>
                No products found.
            </p>
        `;

        return;
    }


    products.forEach(
        product => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "product-card";


            const images =
                getProductImages(
                    product
                );


            const imageUrl =
                images.length > 0
                    ? images[0]
                    : "";


            card.innerHTML = `

                <div class="product-image">

                    ${
                        imageUrl
                            ? `
                                <img
                                    src="${imageUrl}"
                                    alt="${product.ProductName}"
                                    loading="lazy"
                                >
                              `
                            : `
                                <span>
                                    No Image
                                </span>
                              `
                    }

                </div>


                <h3>
                    ${product.ProductName || "-"}
                </h3>


                <p>
                    ${product.ProductCode || "-"}
                </p>


                <button
                    class="view-details-button"
                >
                    View Details
                </button>

            `;


            card
                .querySelector(
                    ".view-details-button"
                )
                .addEventListener(
                    "click",
                    function () {

                        openProductModal(
                            product
                        );

                    }
                );


            container.appendChild(
                card
            );
        }
    );
}


/* =========================
   PRODUCT MODAL
========================= */

function openProductModal(product) {

    currentProduct =
        product;


    currentImageIndex = 0;


    document.getElementById(
        "modalProductName"
    ).textContent =
        product.ProductName || "-";


    document.getElementById(
        "modalProductCode"
    ).textContent =
        product.ProductCode || "-";


    document.getElementById(
        "modalProductCategory"
    ).textContent =
        product.Category || "-";


    document.getElementById(
        "modalProductSubCategory"
    ).textContent =
        product.SubCategory || "-";


    document.getElementById(
        "modalProductMaterial"
    ).textContent =
        product.Material || "-";


    document.getElementById(
        "modalProductSize"
    ).textContent =
        product.Size || "-";


    document.getElementById(
        "modalProductMOQ"
    ).textContent =
        product.MOQ || "-";


    displayModalImage();


    const modal =
        document.getElementById(
            "productModal"
        );


    modal.classList.add(
        "show"
    );
}


/* =========================
   DISPLAY MODAL IMAGE
========================= */

function displayModalImage() {

    if (!currentProduct) {

        return;
    }


    const images =
        getProductImages(
            currentProduct
        );


    const imageContainer =
        document.getElementById(
            "modalProductImage"
        );


    if (images.length === 0) {

        imageContainer.innerHTML =
            "<span>No Image</span>";

        return;
    }


    imageContainer.innerHTML = `

        <img
            src="${images[currentImageIndex]}"
            alt="${currentProduct.ProductName}"
        >

        ${
            images.length > 1
                ? `
                    <button
                        id="previousImage"
                        class="image-navigation previous"
                    >
                        ❮
                    </button>

                    <button
                        id="nextImage"
                        class="image-navigation next"
                    >
                        ❯
                    </button>
                  `
                : ""
        }

    `;


    if (images.length > 1) {

        document
            .getElementById(
                "previousImage"
            )
            .addEventListener(
                "click",
                function () {

                    currentImageIndex--;

                    if (
                        currentImageIndex < 0
                    ) {

                        currentImageIndex =
                            images.length - 1;
                    }


                    displayModalImage();
                }
            );


        document
            .getElementById(
                "nextImage"
            )
            .addEventListener(
                "click",
                function () {

                    currentImageIndex++;


                    if (
                        currentImageIndex >=
                        images.length
                    ) {

                        currentImageIndex = 0;
                    }


                    displayModalImage();
                }
            );
    }
}


/* =========================
   CLOSE MODAL
========================= */

document
    .getElementById("closeModal")
    .addEventListener(
        "click",
        function () {

            document
                .getElementById(
                    "productModal"
                )
                .classList.remove(
                    "show"
                );
        }
    );


document
    .getElementById(
        "productModal"
    )
    .addEventListener(
        "click",
        function (event) {

            if (
                event.target === this
            ) {

                this.classList.remove(
                    "show"
                );
            }
        }
    );


/* =========================
   WHATSAPP
========================= */

document
    .getElementById(
        "whatsappButton"
    )
    .addEventListener(
        "click",
        function () {

            if (!currentProduct) {

                return;
            }


            const message =
                `Hi, I'm interested in ${currentProduct.ProductName} (${currentProduct.ProductCode}).`;

const whatsappNumber = "918985390330";

const whatsappUrl =
    "https://wa.me/" +
    whatsappNumber +
    "?text=" +
    encodeURIComponent(message);

            window.open(
                whatsappUrl,
                "_blank"
            );
        }
    );


/* =========================
   SEARCH
========================= */

document
    .getElementById(
        "searchInput"
    )
    .addEventListener(
        "input",
        function () {

            const searchText =
                this.value
                    .trim()
                    .toLowerCase();


            if (
                searchText === ""
            ) {

                if (
                    selectedCategory ===
                    "All"
                ) {

                    displayProducts(
                        allProducts
                    );

                } else {

                    const filtered =
                        allProducts.filter(
                            product =>
                                product.Category ===
                                selectedCategory
                        );


                    displayProducts(
                        filtered
                    );
                }


                return;
            }


            const searchResults =
                allProducts.filter(
                    product => {

                        const name =
                            String(
                                product.ProductName ||
                                ""
                            ).toLowerCase();


                        const code =
                            String(
                                product.ProductCode ||
                                ""
                            ).toLowerCase();


                        const category =
                            String(
                                product.Category ||
                                ""
                            ).toLowerCase();


                        const subCategory =
                            String(
                                product.SubCategory ||
                                ""
                            ).toLowerCase();


                        return (
                            name.includes(
                                searchText
                            ) ||
                            code.includes(
                                searchText
                            ) ||
                            category.includes(
                                searchText
                            ) ||
                            subCategory.includes(
                                searchText
                            )
                        );
                    }
                );


            displayProducts(
                searchResults
            );
        }
    );


/* =========================
   VIEW ALL
========================= */

document
    .getElementById(
        "allProductsButton"
    )
    .addEventListener(
        "click",
        function () {

            selectedCategory = "All";

            displayCategories();

            displayProducts(
                allProducts
            );
        }
    );


/* =========================
   START
========================= */

loadProducts();