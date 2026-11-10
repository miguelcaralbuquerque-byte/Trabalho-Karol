const WHATSAPP_NUMBER = '5511975197754';
const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const products = [
    {
        id: 'blusa-linho',
        name: 'Blusa leve de linho',
        category: 'Blusas',
        price: 11990,
        tag: 'Mais querida',
        image: 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&w=800&q=82',
        alt: 'Blusa feminina em tecido leve'
    },
    {
        id: 'vestido-midi',
        name: 'Vestido midi fluido',
        category: 'Vestidos',
        price: 18990,
        tag: 'Novidade',
        image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=82',
        alt: 'Vestido midi feminino'
    },
    {
        id: 'conjunto-alfaiataria',
        name: 'Conjunto de alfaiataria',
        category: 'Conjuntos',
        price: 24990,
        tag: 'Versátil',
        image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=82',
        alt: 'Look feminino de alfaiataria'
    },
    {
        id: 'calca-reta',
        name: 'Calça reta essencial',
        category: 'Calças',
        price: 15990,
        tag: 'Clássico',
        image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=82',
        alt: 'Calça feminina de corte reto'
    },
    {
        id: 'blusa-tricot',
        name: 'Blusa de tricô macio',
        category: 'Blusas',
        price: 13990,
        tag: 'Conforto',
        image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=800&q=82',
        alt: 'Blusa feminina de tricô'
    },
    {
        id: 'vestido-casual',
        name: 'Vestido casual estampado',
        category: 'Vestidos',
        price: 17990,
        tag: 'Leveza',
        image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=82',
        alt: 'Vestido estampado para o dia a dia'
    },
    {
        id: 'conjunto-casual',
        name: 'Conjunto casual comfy',
        category: 'Conjuntos',
        price: 21990,
        tag: 'Prático',
        image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=800&q=82',
        alt: 'Conjunto feminino casual'
    },
    {
        id: 'calca-pantalona',
        name: 'Calça pantalona fluida',
        category: 'Calças',
        price: 16990,
        tag: 'Favorita',
        image: 'https://images.unsplash.com/photo-1551854838-212c50b4c184?auto=format&fit=crop&w=800&q=82',
        alt: 'Calça pantalona feminina'
    }
];

const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
const searchInput = document.getElementById('productSearch');
const productGrid = document.getElementById('productGrid');
const emptyState = document.getElementById('emptyState');
const resultCount = document.getElementById('resultCount');
const filterButtons = [...document.querySelectorAll('.filter-chip')];
const cartButton = document.getElementById('openCart');
const cartDrawer = document.getElementById('cartDrawer');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartEmpty = document.getElementById('cartEmpty');
const cartSummary = document.getElementById('cartSummary');
const cartTotal = document.getElementById('cartTotal');
const checkoutButton = document.getElementById('checkoutButton');
const cart = new Map();
let activeCategory = 'Todos';
let lastFocusedElement = null;

function createProductCard(product) {
    const card = document.createElement('article');
    card.className = 'product-card';

    const imageWrap = document.createElement('div');
    imageWrap.className = 'product-image-wrap';

    const image = document.createElement('img');
    image.className = 'product-image';
    image.src = product.image;
    image.alt = product.alt;
    image.loading = 'lazy';
    image.addEventListener('error', () => {
        image.hidden = true;
        const fallback = document.createElement('span');
        fallback.className = 'image-fallback';
        fallback.textContent = 'Foto ilustrativa';
        imageWrap.prepend(fallback);
    }, { once: true });

    const tag = document.createElement('span');
    tag.className = 'product-tag';
    tag.textContent = product.tag;

    const addButton = document.createElement('button');
    addButton.className = 'product-add';
    addButton.type = 'button';
    addButton.textContent = '+';
    addButton.setAttribute('aria-label', `Adicionar ${product.name} à sacola`);
    addButton.addEventListener('click', () => addToCart(product.id));

    imageWrap.append(image, tag, addButton);

    const meta = document.createElement('div');
    meta.className = 'product-meta';
    const details = document.createElement('div');
    const category = document.createElement('p');
    category.className = 'product-category';
    category.textContent = product.category;
    const name = document.createElement('h3');
    name.className = 'product-name';
    name.textContent = product.name;
    details.append(category, name);

    const price = document.createElement('span');
    price.className = 'product-price';
    price.textContent = formatter.format(product.price / 100);
    meta.append(details, price);
    card.append(imageWrap, meta);
    return card;
}

function renderProducts() {
    const query = searchInput.value.trim().toLocaleLowerCase('pt-BR');
    const visibleProducts = products.filter(product => {
        const matchesCategory = activeCategory === 'Todos' || product.category === activeCategory;
        const matchesSearch = `${product.name} ${product.category}`.toLocaleLowerCase('pt-BR').includes(query);
        return matchesCategory && matchesSearch;
    });

    productGrid.replaceChildren(...visibleProducts.map(createProductCard));
    resultCount.textContent = `${visibleProducts.length} ${visibleProducts.length === 1 ? 'peça' : 'peças'}`;
    emptyState.hidden = visibleProducts.length !== 0;
}

function addToCart(productId) {
    cart.set(productId, (cart.get(productId) || 0) + 1);
    renderCart();
    openCart();
}

function updateQuantity(productId, change) {
    const nextQuantity = (cart.get(productId) || 0) + change;
    if (nextQuantity <= 0) {
        cart.delete(productId);
    } else {
        cart.set(productId, nextQuantity);
    }
    renderCart();
}

function renderCart() {
    let itemCount = 0;
    let total = 0;
    const items = [];

    for (const [productId, quantity] of cart) {
        const product = products.find(item => item.id === productId);
        if (!product) {
            continue;
        }
        itemCount += quantity;
        total += product.price * quantity;
        items.push({ product, quantity });
    }

    cartCount.textContent = String(itemCount);
    cartButton.setAttribute('aria-label', `Abrir sacola, ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`);
    cartEmpty.hidden = itemCount !== 0;
    cartSummary.hidden = itemCount === 0;
    cartItems.replaceChildren(...items.map(createCartItem));
    cartTotal.textContent = formatter.format(total / 100);
}

function createCartItem({ product, quantity }) {
    const row = document.createElement('div');
    row.className = 'cart-item';

    const image = document.createElement('img');
    image.src = product.image;
    image.alt = '';
    image.loading = 'lazy';
    image.addEventListener('error', () => { image.hidden = true; }, { once: true });

    const details = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'cart-item-name';
    name.textContent = product.name;
    const price = document.createElement('p');
    price.className = 'cart-item-price';
    price.textContent = formatter.format(product.price / 100);

    const controls = document.createElement('div');
    controls.className = 'quantity-controls';
    const decrease = document.createElement('button');
    decrease.type = 'button';
    decrease.textContent = '−';
    decrease.setAttribute('aria-label', `Diminuir quantidade de ${product.name}`);
    decrease.addEventListener('click', () => updateQuantity(product.id, -1));
    const quantityLabel = document.createElement('span');
    quantityLabel.textContent = String(quantity);
    const increase = document.createElement('button');
    increase.type = 'button';
    increase.textContent = '+';
    increase.setAttribute('aria-label', `Aumentar quantidade de ${product.name}`);
    increase.addEventListener('click', () => updateQuantity(product.id, 1));
    controls.append(decrease, quantityLabel, increase);
    details.append(name, price, controls);

    const remove = document.createElement('button');
    remove.className = 'remove-item';
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remover ${product.name} da sacola`);
    remove.addEventListener('click', () => {
        cart.delete(product.id);
        renderCart();
    });
    row.append(image, details, remove);
    return row;
}

function openCart() {
    lastFocusedElement = document.activeElement;
    cartDrawer.hidden = false;
    cartBackdrop.hidden = false;
    document.body.classList.add('cart-open');
    document.getElementById('closeCart').focus();
}

function closeCart() {
    if (cartDrawer.hidden) {
        return;
    }
    cartDrawer.hidden = true;
    cartBackdrop.hidden = true;
    document.body.classList.remove('cart-open');
    if (lastFocusedElement instanceof HTMLElement) {
        lastFocusedElement.focus();
    }
}

function checkout() {
    const orderLines = [...cart].map(([productId, quantity]) => {
        const product = products.find(item => item.id === productId);
        return product ? `• ${quantity}x ${product.name} — ${formatter.format(product.price * quantity / 100)}` : '';
    }).filter(Boolean);

    if (orderLines.length === 0) {
        return;
    }

    const total = [...cart].reduce((sum, [productId, quantity]) => {
        const product = products.find(item => item.id === productId);
        return sum + (product ? product.price * quantity : 0);
    }, 0);
    const message = [
        'Olá, Dona Kah! Gostaria de consultar este pedido (catálogo demonstrativo):',
        '',
        ...orderLines,
        '',
        `Total de exemplo: ${formatter.format(total / 100)}`,
        'Pode confirmar disponibilidade, valores e formas de pagamento?'
    ].join('\n');

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Abrir menu' : 'Fechar menu');
    navLinks.classList.toggle('open', !isOpen);
});

navLinks.addEventListener('click', event => {
    if (event.target.closest('a')) {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Abrir menu');
        navLinks.classList.remove('open');
    }
});

searchInput.addEventListener('input', renderProducts);
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        activeCategory = button.dataset.category;
        filterButtons.forEach(filter => {
            const isActive = filter === button;
            filter.classList.toggle('active', isActive);
            filter.setAttribute('aria-pressed', String(isActive));
        });
        renderProducts();
    });
});

cartButton.addEventListener('click', openCart);
document.getElementById('closeCart').addEventListener('click', closeCart);
document.getElementById('continueShopping').addEventListener('click', closeCart);
cartBackdrop.addEventListener('click', closeCart);
checkoutButton.addEventListener('click', checkout);

document.addEventListener('keydown', event => {
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey
        && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        event.preventDefault();
        searchInput.focus();
    }
    if (event.key === 'Escape') {
        closeCart();
    }
    if (event.key === 'Tab' && !cartDrawer.hidden) {
        const focusable = [...cartDrawer.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])')]
            .filter(element => element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});

document.querySelector('.hero-visual img').addEventListener('error', event => {
    event.currentTarget.hidden = true;
});

document.getElementById('currentYear').textContent = String(new Date().getFullYear());
renderProducts();
renderCart();
