const WHATSAPP_NUMBER = '5511975197754';
const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
let products = [];

const config = window.SUPABASE_CONFIG || {};
const supabaseClient = window.supabase && config.url && config.anonKey
    ? window.supabase.createClient(config.url, config.anonKey)
    : null;
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
const searchInput = document.getElementById('productSearch');
const productGrid = document.getElementById('productGrid');
const emptyState = document.getElementById('emptyState');
const resultCount = document.getElementById('resultCount');
const catalogStatus = document.getElementById('catalogStatus');
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
const checkoutStatus = document.getElementById('checkoutStatus');
const inventoryPanel = document.getElementById('inventoryPanel');
const inventoryBackdrop = document.getElementById('inventoryBackdrop');
const inventoryStatus = document.getElementById('inventoryStatus');
const inventoryLogin = document.getElementById('inventoryLogin');
const inventoryDashboard = document.getElementById('inventoryDashboard');
const inventoryList = document.getElementById('inventoryList');
const pendingOrders = document.getElementById('pendingOrders');
const productForm = document.getElementById('productForm');
const variantForm = document.getElementById('variantForm');
const cart = new Map();
let variants = [];
let activeCategory = 'Todos';
let lastFocusedElement = null;

function showStatus(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle('is-error', isError);
}

function formatVariant(variant) {
    return [variant.color, variant.size, variant.sku].filter(Boolean).join(' · ');
}

function getProduct(productId) {
    return products.find(product => product.id === productId);
}

function getVariant(variantId) {
    return variants.find(variant => variant.id === variantId);
}

async function loadVariants() {
    if (!supabaseClient) {
        showStatus(catalogStatus, 'O estoque compartilhado ainda não foi configurado. Configure o Supabase para liberar os pedidos.', true);
        renderProducts();
        return;
    }

    const [productResult, variantResult] = await Promise.all([
        supabaseClient
            .from('products')
            .select('id, name, price_cents, category, image_url, alt_text, tag, active')
            .eq('active', true)
            .order('sort_order')
            .order('name'),
        supabaseClient
            .from('inventory_variants')
            .select('id, product_id, size, color, quantity')
            .order('product_id')
            .order('color')
            .order('size')
    ]);

    if (productResult.error || variantResult.error) {
        const error = productResult.error || variantResult.error;
        showStatus(catalogStatus, `Não foi possível carregar a loja: ${error.message}`, true);
        return;
    }

    products = productResult.data.map(product => ({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price_cents,
        tag: product.tag || 'Novidade',
        image: product.image_url || '',
        alt: product.alt_text || product.name
    }));
    variants = variantResult.data;
    showStatus(catalogStatus, '');
    renderProducts();
    renderCart();
}

function createProductCard(product) {
    const card = document.createElement('article');
    card.className = 'product-card';
    const productVariants = variants.filter(variant => variant.product_id === product.id && variant.quantity > 0);

    const imageWrap = document.createElement('div');
    imageWrap.className = 'product-image-wrap';
    const image = document.createElement('img');
    image.className = 'product-image';
    image.src = product.image;
    image.alt = product.alt;
    if (!product.image) image.hidden = true;
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
    addButton.disabled = productVariants.length === 0;
    addButton.setAttribute('aria-label', productVariants.length
        ? `Adicionar ${product.name} à sacola`
        : `${product.name} indisponível`);

    const variantSelect = document.createElement('select');
    variantSelect.className = 'product-variant';
    variantSelect.setAttribute('aria-label', `Cor e tamanho de ${product.name}`);
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = productVariants.length ? 'Selecione cor e tamanho' : 'Indisponível';
    variantSelect.append(placeholder);
    for (const variant of productVariants) {
        const option = document.createElement('option');
        option.value = variant.id;
        option.textContent = formatVariant(variant);
        variantSelect.append(option);
    }
    addButton.addEventListener('click', () => {
        if (!variantSelect.value) {
            variantSelect.focus();
            return;
        }
        addToCart(variantSelect.value);
    });
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
    card.append(imageWrap, meta, variantSelect);
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

function addToCart(variantId) {
    const variant = getVariant(variantId);
    const nextQuantity = (cart.get(variantId) || 0) + 1;
    if (!variant || nextQuantity > variant.quantity) {
        showStatus(checkoutStatus, 'A quantidade selecionada não está mais disponível. Atualize o estoque e tente novamente.', true);
        loadVariants();
        return;
    }
    cart.set(variantId, nextQuantity);
    renderCart();
    openCart();
}

function updateQuantity(variantId, change) {
    const nextQuantity = (cart.get(variantId) || 0) + change;
    if (nextQuantity <= 0) {
        cart.delete(variantId);
    } else {
        const variant = getVariant(variantId);
        if (!variant || nextQuantity > variant.quantity) {
            showStatus(checkoutStatus, 'Não há unidades suficientes para aumentar este item.', true);
            return;
        }
        cart.set(variantId, nextQuantity);
    }
    showStatus(checkoutStatus, '');
    renderCart();
}

function renderCart() {
    let itemCount = 0;
    let total = 0;
    const items = [];

    for (const [variantId, quantity] of cart) {
        const variant = getVariant(variantId);
        const product = variant && getProduct(variant.product_id);
        if (!product) {
            continue;
        }
        itemCount += quantity;
        total += product.price * quantity;
        items.push({ product, variant, quantity });
    }

    cartCount.textContent = String(itemCount);
    cartButton.setAttribute('aria-label', `Abrir sacola, ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`);
    cartEmpty.hidden = itemCount !== 0;
    cartSummary.hidden = itemCount === 0;
    checkoutButton.disabled = itemCount === 0 || !supabaseClient;
    cartItems.replaceChildren(...items.map(createCartItem));
    cartTotal.textContent = formatter.format(total / 100);
}

function createCartItem({ product, variant, quantity }) {
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
    price.textContent = `${formatVariant(variant)} · ${formatter.format(product.price / 100)}`;
    const controls = document.createElement('div');
    controls.className = 'quantity-controls';
    const decrease = document.createElement('button');
    decrease.type = 'button';
    decrease.textContent = '−';
    decrease.setAttribute('aria-label', `Diminuir quantidade de ${product.name}`);
    decrease.addEventListener('click', () => updateQuantity(variant.id, -1));
    const quantityLabel = document.createElement('span');
    quantityLabel.textContent = String(quantity);
    const increase = document.createElement('button');
    increase.type = 'button';
    increase.textContent = '+';
    increase.disabled = quantity >= variant.quantity;
    increase.setAttribute('aria-label', `Aumentar quantidade de ${product.name}`);
    increase.addEventListener('click', () => updateQuantity(variant.id, 1));
    controls.append(decrease, quantityLabel, increase);
    details.append(name, price, controls);

    const remove = document.createElement('button');
    remove.className = 'remove-item';
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remover ${product.name} da sacola`);
    remove.addEventListener('click', () => {
        cart.delete(variant.id);
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

async function checkout() {
    if (!supabaseClient || cart.size === 0) {
        return;
    }

    const whatsappWindow = window.open('about:blank', '_blank');
    if (!whatsappWindow) {
        showStatus(checkoutStatus, 'Permita a abertura de janelas para enviar o pedido pelo WhatsApp.', true);
        return;
    }

    checkoutButton.disabled = true;
    showStatus(checkoutStatus, 'Registrando pedido...');
    const items = [...cart].map(([variantId, quantity]) => ({ variant_id: variantId, quantity }));
    const { data: orderId, error } = await supabaseClient.rpc('create_order', { p_items: items });

    if (error) {
        whatsappWindow.close();
        checkoutButton.disabled = false;
        showStatus(checkoutStatus, `Não foi possível registrar o pedido: ${error.message}`, true);
        await loadVariants();
        return;
    }

    const orderLines = [...cart].map(([variantId, quantity]) => {
        const variant = getVariant(variantId);
        const product = variant && getProduct(variant.product_id);
        return product ? `• ${quantity}x ${product.name} (${formatVariant(variant)}) — ${formatter.format(product.price * quantity / 100)}` : '';
    }).filter(Boolean);
    const total = [...cart].reduce((sum, [variantId, quantity]) => {
        const variant = getVariant(variantId);
        const product = variant && getProduct(variant.product_id);
        return sum + (product ? product.price * quantity : 0);
    }, 0);
    const message = [
        `Olá, Dona Kah! Gostaria de confirmar este pedido. Número: ${orderId}`,
        '',
        ...orderLines,
        '',
        `Total: ${formatter.format(total / 100)}`,
        'Aguardo a confirmação do pedido e do pagamento.'
    ].join('\n');

    whatsappWindow.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    cart.clear();
    renderCart();
    showStatus(checkoutStatus, `Pedido ${orderId} registrado.`);
}

function openInventory() {
    lastFocusedElement = document.activeElement;
    inventoryPanel.hidden = false;
    inventoryBackdrop.hidden = false;
    document.body.classList.add('cart-open');
    document.getElementById('closeInventory').focus();
    checkInventorySession();
}

function closeInventory() {
    if (inventoryPanel.hidden) {
        return;
    }
    inventoryPanel.hidden = true;
    inventoryBackdrop.hidden = true;
    document.body.classList.remove('cart-open');
    if (lastFocusedElement instanceof HTMLElement) {
        lastFocusedElement.focus();
    }
}

async function checkInventorySession() {
    if (!supabaseClient) {
        showStatus(inventoryStatus, 'Configure a URL e a chave pública do Supabase em supabase-config.js.', true);
        inventoryLogin.hidden = true;
        inventoryDashboard.hidden = true;
        return;
    }
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) {
        showStatus(inventoryStatus, `Não foi possível verificar a sessão: ${error.message}`, true);
        return;
    }
    if (session) {
        await showInventoryDashboard(session.user);
    } else {
        inventoryLogin.hidden = false;
        inventoryDashboard.hidden = true;
        showStatus(inventoryStatus, '');
    }
}

async function showInventoryDashboard(user) {
    const { data: isAdmin, error } = await supabaseClient.rpc('is_inventory_admin');
    if (error) {
        showStatus(inventoryStatus, `Não foi possível verificar a permissão: ${error.message}`, true);
        return;
    }
    if (!isAdmin) {
        await supabaseClient.auth.signOut();
        showStatus(inventoryStatus, 'Este usuário não tem permissão para administrar o estoque.', true);
        return;
    }

    inventoryLogin.hidden = true;
    inventoryDashboard.hidden = false;
    document.getElementById('inventoryUser').textContent = user.email;
    const productSelect = document.getElementById('variantProduct');
    productSelect.replaceChildren(...products.map(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.name;
        return option;
    }));
    showStatus(inventoryStatus, '');
    await refreshInventoryDashboard();
}

async function refreshInventoryDashboard() {
    await loadVariants();
    const [variantResult, orderResult] = await Promise.all([
        supabaseClient.from('inventory_variants')
            .select('id, product_id, size, color, sku, quantity')
            .order('product_id').order('color').order('size'),
        supabaseClient.from('orders')
            .select('id, created_at, order_items(product_name, variant_label, quantity, unit_price_cents)')
            .eq('status', 'pending').order('created_at')
    ]);

    if (variantResult.error || orderResult.error) {
        const error = variantResult.error || orderResult.error;
        showStatus(inventoryStatus, `Não foi possível atualizar o painel: ${error.message}`, true);
        return;
    }

    variants = variantResult.data;
    renderInventoryList();
    renderPendingOrders(orderResult.data);
    renderProducts();
    renderCart();
}

function renderInventoryList() {
    if (variants.length === 0) {
        inventoryList.textContent = 'Ainda não há variações cadastradas.';
        return;
    }

    inventoryList.replaceChildren(...variants.map(variant => {
        const row = document.createElement('form');
        row.className = 'inventory-row';
        const label = document.createElement('div');
        label.className = 'inventory-row-label';
        const product = getProduct(variant.product_id);
        const name = document.createElement('strong');
        name.textContent = product ? product.name : variant.product_id;
        const detail = document.createElement('span');
        detail.textContent = [variant.color, variant.size, variant.sku].filter(Boolean).join(' · ');
        label.append(name, detail);

        const quantity = document.createElement('input');
        quantity.type = 'number';
        quantity.min = '0';
        quantity.step = '1';
        quantity.value = String(variant.quantity);
        quantity.setAttribute('aria-label', `Unidades de ${product ? product.name : variant.product_id}, ${formatVariant(variant)}`);
        const save = document.createElement('button');
        save.className = 'small-button';
        save.type = 'submit';
        save.textContent = 'Salvar';
        row.addEventListener('submit', event => {
            event.preventDefault();
            saveInventoryQuantity(variant.id, quantity, save);
        });
        row.append(label, quantity, save);
        return row;
    }));
}

async function saveInventoryQuantity(variantId, input, button) {
    const quantity = Number(input.value);
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
        showStatus(inventoryStatus, 'Informe uma quantidade inteira igual ou maior que zero.', true);
        return;
    }
    button.disabled = true;
    const { error } = await supabaseClient
        .from('inventory_variants')
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq('id', variantId);
    button.disabled = false;
    if (error) {
        showStatus(inventoryStatus, `Não foi possível salvar o estoque: ${error.message}`, true);
        return;
    }
    showStatus(inventoryStatus, 'Estoque atualizado.');
    await refreshInventoryDashboard();
}

function renderPendingOrders(orders) {
    if (orders.length === 0) {
        pendingOrders.textContent = 'Nenhum pedido aguardando confirmação.';
        return;
    }

    pendingOrders.replaceChildren(...orders.map(order => {
        const card = document.createElement('article');
        card.className = 'pending-order';
        const heading = document.createElement('strong');
        heading.textContent = `Pedido ${order.id}`;
        const date = document.createElement('time');
        date.dateTime = order.created_at;
        date.textContent = new Date(order.created_at).toLocaleString('pt-BR');
        const list = document.createElement('ul');
        for (const item of order.order_items) {
            const line = document.createElement('li');
            line.textContent = `${item.quantity}x ${item.product_name} (${item.variant_label})`;
            list.append(line);
        }
        const confirm = document.createElement('button');
        confirm.className = 'small-button';
        confirm.type = 'button';
        confirm.textContent = 'Confirmar pedido';
        confirm.addEventListener('click', () => confirmOrder(order.id, confirm));
        const cancel = document.createElement('button');
        cancel.className = 'small-button';
        cancel.type = 'button';
        cancel.textContent = 'Cancelar pedido';
        cancel.addEventListener('click', () => cancelOrder(order.id, cancel));
        card.append(heading, date, list, confirm, cancel);
        return card;
    }));
}

async function confirmOrder(orderId, button) {
    if (!window.confirm('Confirmar este pedido?')) {
        return;
    }
    button.disabled = true;
    const { error } = await supabaseClient.rpc('confirm_order', { p_order_id: orderId });
    button.disabled = false;
    if (error) {
        showStatus(inventoryStatus, `Não foi possível confirmar a venda: ${error.message}`, true);
        return;
    }
    showStatus(inventoryStatus, 'Pedido confirmado.');
    await refreshInventoryDashboard();
}

async function cancelOrder(orderId, button) {
    if (!window.confirm('Cancelar este pedido e devolver as peças selecionadas?')) {
        return;
    }
    button.disabled = true;
    const { error } = await supabaseClient.rpc('cancel_order', { p_order_id: orderId });
    button.disabled = false;
    if (error) {
        showStatus(inventoryStatus, `Não foi possível cancelar o pedido: ${error.message}`, true);
        return;
    }
    showStatus(inventoryStatus, 'Pedido cancelado e peças devolvidas.');
    await refreshInventoryDashboard();
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

inventoryLogin.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(inventoryLogin);
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: formData.get('email'),
        password: formData.get('password')
    });
    if (error) {
        showStatus(inventoryStatus, `Não foi possível entrar: ${error.message}`, true);
        return;
    }
    await showInventoryDashboard(data.user);
});

productForm.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(productForm);
    const name = formData.get('name').trim();
    const price = Number(formData.get('price'));
    if (!name || !Number.isFinite(price) || price < 0) {
        showStatus(inventoryStatus, 'Informe o nome e um preço válido.', true);
        return;
    }

    const slugBase = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'produto';
    const product = {
        id: `${slugBase}-${crypto.randomUUID().slice(0, 8)}`,
        name,
        price_cents: Math.round(price * 100),
        category: formData.get('category').trim() || 'Outros',
        image_url: formData.get('imageUrl').trim() || null,
        alt_text: name,
        tag: formData.get('tag').trim() || null,
        active: true
    };

    const { error } = await supabaseClient.from('products').insert(product);
    if (error) {
        showStatus(inventoryStatus, `Não foi possível cadastrar o produto: ${error.message}`, true);
        return;
    }

    productForm.reset();
    showStatus(inventoryStatus, 'Produto cadastrado. Agora adicione tamanho, cor e quantidade.');
    await refreshInventoryDashboard();
    await loadVariants();
});

variantForm.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(variantForm);
    const variant = {
        product_id: formData.get('productId'),
        size: formData.get('size').trim(),
        color: formData.get('color').trim(),
        sku: formData.get('sku').trim() || null,
        quantity: Number(formData.get('quantity'))
    };
    if (!Number.isSafeInteger(variant.quantity) || variant.quantity < 0) {
        showStatus(inventoryStatus, 'Informe uma quantidade inteira igual ou maior que zero.', true);
        return;
    }
    const { error } = await supabaseClient.from('inventory_variants').insert(variant);
    if (error) {
        showStatus(inventoryStatus, `Não foi possível cadastrar a variação: ${error.message}`, true);
        return;
    }
    variantForm.reset();
    document.getElementById('variantProduct').value = products[0].id;
    showStatus(inventoryStatus, 'Variação cadastrada.');
    await refreshInventoryDashboard();
});

document.getElementById('inventoryLogout').addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        showStatus(inventoryStatus, `Não foi possível sair: ${error.message}`, true);
        return;
    }
    inventoryDashboard.hidden = true;
    inventoryLogin.hidden = false;
    showStatus(inventoryStatus, 'Sessão encerrada.');
});

document.getElementById('refreshInventory').addEventListener('click', refreshInventoryDashboard);
document.getElementById('openInventory').addEventListener('click', openInventory);
document.getElementById('closeInventory').addEventListener('click', closeInventory);
inventoryBackdrop.addEventListener('click', closeInventory);
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
        closeInventory();
    }
    const openDialog = !inventoryPanel.hidden ? inventoryPanel : !cartDrawer.hidden ? cartDrawer : null;
    if (event.key === 'Tab' && openDialog) {
        const focusable = [...openDialog.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])')]
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

window.addEventListener('focus', loadVariants);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        loadVariants();
    }
});
document.querySelector('.hero-visual img').addEventListener('error', event => {
    event.currentTarget.hidden = true;
});

document.getElementById('currentYear').textContent = String(new Date().getFullYear());
renderProducts();
renderCart();
loadVariants();
