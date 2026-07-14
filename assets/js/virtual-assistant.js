/**
 * EDG IA - Asistente virtual inteligente de la tienda
 * Funciona sin servicios externos y utiliza el catálogo/datos del proyecto.
 * Está preparado para sustituir processQuery() por una API de IA en producción.
 */
(function () {
    "use strict";

    const store = window.EDG_STORE || {};
    const STORAGE_KEY = "edg_ai_history_v1";
    const CART_KEY = "carrito_edg";
    const ORDER_KEY = "pedidos_edg";
    const ADMIN_PRODUCTS_KEY = "admin_productos_edg";
    const MAX_HISTORY = 24;

    const state = {
        awaiting: null,
        isOpen: false,
        isBusy: false,
        history: readJson(STORAGE_KEY, []),
        lastProducts: []
    };

    const pageIsNested = /\/assets\/pages\//.test(location.pathname.replace(/\\/g, "/"));
    const pageIsAdmin = /admin-/.test(location.pathname);

    const routes = {
        inicio: pageIsNested ? "../../index.html" : "index.html",
        productos: pageIsNested ? "productos.html" : "assets/pages/productos.html",
        pago: pageIsNested ? "pago.html" : "assets/pages/pago.html",
        contacto: pageIsNested ? "contacto.html" : "assets/pages/contacto.html",
        nosotros: pageIsNested ? "nosotros.html" : "assets/pages/nosotros.html",
        inventario: pageIsNested ? "admin-inventario.html" : "assets/pages/admin-inventario.html",
        ventas: pageIsNested ? "admin-ventas.html" : "assets/pages/admin-ventas.html",
        usuarios: pageIsNested ? "admin-usuarios.html" : "assets/pages/admin-usuarios.html",
        adminProductos: pageIsNested ? "admin-productos.html" : "assets/pages/admin-productos.html"
    };

    const icon = (name) => `<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;

    function readJson(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
        } catch (_) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (_) {
            // La aplicación debe seguir funcionando incluso en modo privado.
        }
    }

    function assetPath(path) {
        if (!path) return pageIsNested ? "../img/LOGO 1.png" : "assets/img/LOGO 1.png";
        if (/^(https?:|data:|blob:|file:)/i.test(path)) return path;
        const clean = path.replace(/^\.\//, "");
        if (pageIsNested && clean.startsWith("assets/")) return "../../" + clean;
        if (!pageIsNested && clean.startsWith("../")) return "assets/" + clean.slice(3);
        return clean;
    }

    function normalize(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9ñ\s./-]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function money(value) {
        return new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency: "PEN",
            minimumFractionDigits: 2
        }).format(Number(value || 0)).replace("PEN", "S/");
    }

    function getCatalog() {
        const base = Array.isArray(store.products) ? store.products : [];
        const admin = readJson(ADMIN_PRODUCTS_KEY, []);
        const merged = [...base, ...admin].filter(item => item && item.nombre);
        const seen = new Set();
        return merged.filter(item => {
            const key = `${normalize(item.nombre)}|${Number(item.precio || 0)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).map(item => ({
            id: Number(item.id || Date.now()),
            nombre: item.nombre,
            precio: Number(item.precio || 0),
            categoria: item.categoria || "otros",
            imagen: assetPath(item.imagen),
            stock: item.stock == null ? null : Number(item.stock)
        }));
    }

    function categoryLabel(category) {
        return store.categories?.[category] || {
            destacados: "Productos destacados",
            manuales: "Herramientas manuales",
            electricas: "Herramientas eléctricas",
            inalambricas: "Herramientas inalámbricas"
        }[category] || "Ferretería";
    }

    function searchProducts(query, limit = 5) {
        const catalog = getCatalog();
        const q = normalize(query);
        const stop = new Set(["quiero", "busco", "necesito", "precio", "cuanto", "cuesta", "producto", "productos", "una", "un", "para", "con", "que", "hay", "tienen", "tienes", "recomienda", "recomiendame", "mostrar", "muestrame", "comprar"]);
        const tokens = q.split(" ").filter(token => token.length > 1 && !stop.has(token));
        const synonyms = {
            taladro: ["taladro", "rotomartillo", "percutor", "demoledor"],
            concreto: ["rotomartillo", "percutor", "demoledor", "broca"],
            soldar: ["soldar", "soldadura", "careta", "magnetico"],
            soldadura: ["soldar", "soldadura", "careta", "magnetico"],
            pintar: ["pintura", "pintar", "pulverizadora", "rodillo"],
            pintura: ["pintura", "pintar", "pulverizadora", "rodillo"],
            madera: ["madera", "sierra", "disco", "ingleteadora"],
            metal: ["metal", "broca", "pulidora", "taladro magnetico"],
            agua: ["bomba", "centrifuga", "periferica", "sumergible"],
            bomba: ["bomba", "centrifuga", "periferica", "sumergible"],
            auto: ["llave de impacto", "compresora", "ratchet"],
            carro: ["llave de impacto", "compresora", "ratchet"],
            cortar: ["cortador", "disco de corte", "sierra", "pulidora"],
            lijar: ["lijadora", "pulidora"],
            inalambrica: ["inalambrica", "20v", "bateria"],
            electrica: ["electrica", "220v", "w"]
        };

        return catalog
            .map(product => {
                const haystack = normalize(`${product.nombre} ${categoryLabel(product.categoria)} ${product.categoria}`);
                let score = 0;
                if (haystack.includes(q) && q.length > 2) score += 18;
                tokens.forEach(token => {
                    if (haystack.includes(token)) score += token.length >= 5 ? 7 : 4;
                    (synonyms[token] || []).forEach(word => {
                        if (haystack.includes(normalize(word))) score += 5;
                    });
                });
                if (q.includes("inalambr") && product.categoria === "inalambricas") score += 8;
                if (q.includes("electric") && product.categoria === "electricas") score += 8;
                if (q.includes("manual") && product.categoria === "manuales") score += 8;
                return { product, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score || a.product.precio - b.product.precio)
            .slice(0, limit)
            .map(item => item.product);
    }

    function budgetFromText(text) {
        const q = normalize(text);
        const match = q.match(/(?:menos de|hasta|maximo|max|presupuesto(?: de)?|s\/?\.?)[\s:]*(\d+(?:[.,]\d+)?)/i)
            || q.match(/(\d+(?:[.,]\d+)?)\s*(?:soles|s\/)/i);
        return match ? Number(match[1].replace(",", ".")) : null;
    }

    function cartSummary() {
        const cart = readJson(CART_KEY, []);
        const quantity = cart.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
        const total = cart.reduce((sum, item) => sum + Number(item.precio || 0) * Number(item.cantidad || 0), 0);
        return { cart, quantity, total };
    }

    function addProductToCart(product) {
        const cart = readJson(CART_KEY, []);
        const existing = cart.find(item => Number(item.id) === Number(product.id));
        if (existing) {
            existing.cantidad = Number(existing.cantidad || 0) + 1;
        } else {
            cart.push({
                id: Number(product.id),
                nombre: product.nombre,
                precio: Number(product.precio),
                imagen: product.imagen,
                cantidad: 1
            });
        }
        writeJson(CART_KEY, cart);
        if (typeof window.actualizarBadge === "function") window.actualizarBadge();
        if (typeof window.renderCarritoPanel === "function") window.renderCarritoPanel();
        announce(`${product.nombre} fue añadido al carrito.`);
    }

    function quickActions() {
        if (pageIsAdmin) {
            return [
                { label: "Inventario", icon: "boxes-stacked", action: "route", value: "inventario" },
                { label: "Ventas", icon: "chart-line", action: "route", value: "ventas" },
                { label: "Usuarios", icon: "users", action: "route", value: "usuarios" },
                { label: "Productos", icon: "box-open", action: "route", value: "adminProductos" },
                { label: "Ver tienda", icon: "store", action: "route", value: "inicio" },
                { label: "Ayuda del sistema", icon: "circle-question", action: "query", value: "¿Qué puedo hacer en el panel administrador?" }
            ];
        }
        return [
            { label: "Buscar producto", icon: "magnifying-glass", action: "mode", value: "product" },
            { label: "Recomiéndame", icon: "wand-magic-sparkles", action: "mode", value: "recommend" },
            { label: "Categorías", icon: "grip", action: "query", value: "Muéstrame las categorías" },
            { label: "Mi carrito", icon: "cart-shopping", action: "query", value: "¿Qué tengo en mi carrito?" },
            { label: "Formas de pago", icon: "credit-card", action: "query", value: "¿Cuáles son las formas de pago?" },
            { label: "Estado de pedido", icon: "truck-fast", action: "mode", value: "order" },
            { label: "Envíos y horarios", icon: "clock", action: "query", value: "Cuéntame sobre envíos y horarios" },
            { label: "Hablar con asesor", icon: "headset", action: "whatsapp", value: "" }
        ];
    }

    function createAssistant() {
        if (document.getElementById("edgAiAssistant")) return;

        const root = document.createElement("section");
        root.id = "edgAiAssistant";
        root.className = "edg-ai";
        root.innerHTML = `
            <div class="edg-ai-invite" role="status">
                <button type="button" class="edg-ai-invite-close" aria-label="Cerrar sugerencia">×</button>
                <strong>¿Necesitas ayuda?</strong>
                <span>Pregúntale a EDG IA</span>
            </div>
            <button class="edg-ai-launcher" type="button" aria-label="Abrir asistente virtual" aria-expanded="false">
                <span class="edg-ai-launcher-rings" aria-hidden="true"></span>
                <span class="edg-ai-cloud">${icon("cloud")}</span>
                <span class="edg-ai-badge" aria-hidden="true">1</span>
            </button>
            <div class="edg-ai-panel" role="dialog" aria-modal="false" aria-label="Asistente virtual EDG IA" aria-hidden="true">
                <header class="edg-ai-header">
                    <div class="edg-ai-avatar">${icon("cloud-bolt")}</div>
                    <div class="edg-ai-title-wrap">
                        <strong>${escapeHtml(store.assistantName || "EDG IA")}</strong>
                        <span><i></i> Asistente virtual en línea</span>
                    </div>
                    <button class="edg-ai-icon-btn edg-ai-reset" type="button" title="Nueva conversación" aria-label="Nueva conversación">${icon("rotate-right")}</button>
                    <button class="edg-ai-icon-btn edg-ai-close" type="button" title="Cerrar" aria-label="Cerrar asistente">${icon("xmark")}</button>
                </header>
                <div class="edg-ai-context-bar">
                    ${icon("shield-halved")} <span>Respuestas basadas en la información de la tienda</span>
                </div>
                <div class="edg-ai-messages" aria-live="polite" aria-relevant="additions"></div>
                <div class="edg-ai-quick" aria-label="Opciones rápidas"></div>
                <form class="edg-ai-form">
                    <button class="edg-ai-mic" type="button" aria-label="Dictar consulta" title="Dictar consulta">${icon("microphone")}</button>
                    <input type="text" maxlength="280" autocomplete="off" placeholder="Escribe tu consulta..." aria-label="Escribe tu consulta">
                    <button class="edg-ai-send" type="submit" aria-label="Enviar consulta">${icon("paper-plane")}</button>
                </form>
                <footer class="edg-ai-footer"><span>EDG IA</span> puede ayudarte con productos, compras y atención.</footer>
            </div>
        `;
        document.body.appendChild(root);

        const panel = root.querySelector(".edg-ai-panel");
        const messages = root.querySelector(".edg-ai-messages");
        const input = root.querySelector(".edg-ai-form input");
        const launcher = root.querySelector(".edg-ai-launcher");
        const invite = root.querySelector(".edg-ai-invite");

        renderQuickActions(root.querySelector(".edg-ai-quick"));
        restoreHistory(messages);
        if (!state.history.length) showWelcome(messages);

        launcher.addEventListener("click", () => toggleAssistant(true));
        root.querySelector(".edg-ai-close").addEventListener("click", () => toggleAssistant(false));
        root.querySelector(".edg-ai-reset").addEventListener("click", () => resetConversation(messages));
        root.querySelector(".edg-ai-invite-close").addEventListener("click", event => {
            event.stopPropagation();
            invite.classList.remove("edg-ai-invite-visible");
        });
        invite.addEventListener("click", () => toggleAssistant(true));

        root.querySelector(".edg-ai-form").addEventListener("submit", event => {
            event.preventDefault();
            const text = input.value.trim();
            if (!text || state.isBusy) return;
            input.value = "";
            submitQuery(text, messages);
        });

        root.addEventListener("click", event => handleAssistantAction(event, messages));
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && state.isOpen) toggleAssistant(false);
        });

        setupVoiceInput(root.querySelector(".edg-ai-mic"), input, messages);

        setTimeout(() => {
            invite.classList.remove("edg-ai-invite-visible");
            sessionStorage.setItem("edg_ai_invite_seen", "1");
        }, 50);

        function toggleAssistant(open) {
            state.isOpen = open;
            panel.classList.toggle("edg-ai-panel-open", open);
            panel.setAttribute("aria-hidden", String(!open));
            launcher.setAttribute("aria-expanded", String(open));
            launcher.classList.toggle("edg-ai-launcher-open", open);
            invite.classList.remove("edg-ai-invite-visible");
            root.querySelector(".edg-ai-badge").style.display = "none";
            if (open) {
                setTimeout(() => input.focus(), 180);
                messages.scrollTop = messages.scrollHeight;
            }
        }

        window.EDGAssistant = {
            open(query) {
                toggleAssistant(true);
                if (query) submitQuery(query, messages);
            },
            close() { toggleAssistant(false); },
            clear() { resetConversation(messages); }
        };
    }

    function renderQuickActions(container) {
        // Los quick actions quedan desactivados: el menú numerado del
        // saludo (opciones 1-4) ya cubre estas mismas funciones y evita
        // duplicar acciones. Si quieres reactivarlos, reemplaza este
        // cuerpo por: container.innerHTML = quickActions().map(...);
        if (container) container.innerHTML = "";
    }

    function showWelcome(messages) {
        addBotMessage(messages, {
            title: `Hola, soy ${store.assistantName || "EDG IA"}`,
            text: pageIsAdmin
                ? "Puedo orientarte dentro del panel de gestión y llevarte rápidamente a inventario, ventas, usuarios o productos."
                : "Puedo ayudarte de dos formas: escribe un número para navegar por el menú, o pregúntame directamente con tus propias palabras (ej: \"busco un taladro para concreto\").",
            actions: pageIsAdmin ? [] : [
                { label: "1. Ver herramientas por categoría",   action: "menu", value: "1" },
                { label: "2. Buscar por necesidad",             action: "menu", value: "2" },
                { label: "3. Consultar carrito y compra",       action: "menu", value: "3" },
                { label: "4. Ayuda y asesoría",                 action: "menu", value: "4" }
            ]
        }, false);
    }

    function restoreHistory(messages) {
        if (!Array.isArray(state.history) || !state.history.length) return;
        state.history.slice(-MAX_HISTORY).forEach(item => {
            if (!item || !item.text) return;
            if (item.role === "user") addUserMessage(messages, item.text, false);
            else addBotMessage(messages, { text: item.text }, false);
        });
    }

    function saveHistory(role, text) {
        state.history.push({ role, text: String(text), at: Date.now() });
        state.history = state.history.slice(-MAX_HISTORY);
        writeJson(STORAGE_KEY, state.history);
    }

    function resetConversation(messages) {
        state.history = [];
        state.awaiting = null;
        state.lastProducts = [];
        writeJson(STORAGE_KEY, []);
        messages.innerHTML = "";
        showWelcome(messages);
    }

    function addUserMessage(container, text, persist = true) {
        const wrapper = document.createElement("div");
        wrapper.className = "edg-ai-row edg-ai-row-user";
        wrapper.innerHTML = `<div class="edg-ai-message edg-ai-message-user">${escapeHtml(text)}</div>`;
        container.appendChild(wrapper);
        if (persist) saveHistory("user", text);
        scrollMessages(container);
    }

    function addBotMessage(container, response, persist = true) {
        const row = document.createElement("div");
        row.className = "edg-ai-row edg-ai-row-bot";

        const card = document.createElement("div");
        card.className = "edg-ai-message edg-ai-message-bot";
        let html = "";
        if (response.title) html += `<strong class="edg-ai-message-title">${escapeHtml(response.title)}</strong>`;
        if (response.text) html += `<p>${escapeHtml(response.text).replace(/\n/g, "<br>")}</p>`;
        if (Array.isArray(response.list) && response.list.length) {
            html += `<ul>${response.list.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
        }
        card.innerHTML = html;

        if (Array.isArray(response.products) && response.products.length) {
            const productWrap = document.createElement("div");
            productWrap.className = "edg-ai-products";
            response.products.forEach(product => productWrap.appendChild(productCard(product)));
            card.appendChild(productWrap);
        }

        if (Array.isArray(response.actions) && response.actions.length) {
            const actions = document.createElement("div");
            actions.className = "edg-ai-actions";
            response.actions.forEach(action => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "edg-ai-action-btn";
                button.dataset.aiAction = action.action;
                button.dataset.aiValue = action.value || "";
                button.innerHTML = `<span>${escapeHtml(action.label)}</span>`;
                actions.appendChild(button);
            });
            card.appendChild(actions);
        }

        row.innerHTML = `<div class="edg-ai-mini-avatar">${icon("cloud")}</div>`;
        row.appendChild(card);
        container.appendChild(row);
        if (persist && response.text) saveHistory("assistant", response.text);
        scrollMessages(container);
    }

    function productCard(product) {
        const card = document.createElement("article");
        card.className = "edg-ai-product";
        card.innerHTML = `
            <img src="${escapeHtml(product.imagen)}" alt="${escapeHtml(product.nombre)}" loading="lazy">
            <div>
                <span>${escapeHtml(categoryLabel(product.categoria))}</span>
                <strong>${escapeHtml(product.nombre)}</strong>
                <b>${escapeHtml(money(product.precio))}</b>
            </div>
            <button type="button" data-ai-action="add" data-ai-value="${escapeHtml(String(product.id))}" title="Añadir al carrito" aria-label="Añadir ${escapeHtml(product.nombre)} al carrito">${icon("cart-plus")}</button>
        `;
        card.querySelector("img").addEventListener("error", function () {
            this.src = pageIsNested ? "../img/LOGO 1.png" : "assets/img/LOGO 1.png";
        }, { once: true });
        return card;
    }

    function showTyping(container) {
        const row = document.createElement("div");
        row.className = "edg-ai-row edg-ai-row-bot edg-ai-typing-row";
        row.innerHTML = `<div class="edg-ai-mini-avatar">${icon("cloud")}</div><div class="edg-ai-message edg-ai-message-bot edg-ai-typing"><i></i><i></i><i></i></div>`;
        container.appendChild(row);
        scrollMessages(container);
        return row;
    }

    // ═══════════════════════════════════════════════════════════
    //  MODO MENÚ NUMERADO (árbol de decisión)
    //  Convive con la búsqueda inteligente: si el usuario escribe
    //  "1", "1.1", "1.2.3", "menu", "atras"… navega por el menú.
    //  Si escribe una frase, sigue funcionando processQuery().
    // ═══════════════════════════════════════════════════════════

    // Estado del menú: guarda dónde está el usuario dentro del árbol
    const menuState = {
        currentPath: null,        // ej: "1.1.1"
        lastProductList: null,    // productos mostrados en la última pantalla
        history: []               // pila para volver al paso anterior
    };

    // Buscar producto en el catálogo por coincidencia de nombre (parcial)
    function findProductByName(fragment) {
        const products = getCatalog();
        const target = normalize(fragment);
        return products.find(p => normalize(p.nombre).includes(target)) || null;
    }

    // Cada nodo devuelve un objeto de respuesta {title, text, actions}
    // Los "actions" con action:"menu" navegan a otro nodo del árbol.
    const menuTree = {
        // ─── RAÍZ ──────────────────────────────────────────
        "root": () => ({
            title: "¿Qué deseas hacer?",
            text: "Elige una opción escribiendo el número, o pregúntame directamente con tus propias palabras.",
            actions: [
                { label: "1. Ver herramientas por categoría", action: "menu", value: "1" },
                { label: "2. Buscar herramienta por necesidad", action: "menu", value: "2" },
                { label: "3. Consultar carrito y compra", action: "menu", value: "3" },
                { label: "4. Ayuda y asesoría", action: "menu", value: "4" }
            ]
        }),

        // ─── 1. CATEGORÍAS ─────────────────────────────────
        "1": () => ({
            title: "Ver herramientas por categoría",
            text: "Elige una categoría:",
            actions: [
                { label: "1.1 Herramientas manuales",     action: "menu", value: "1.1" },
                { label: "1.2 Herramientas eléctricas",   action: "menu", value: "1.2" },
                { label: "1.3 Herramientas inalámbricas", action: "menu", value: "1.3" },
                { label: "↩ Volver al menú principal",    action: "menu", value: "root" }
            ]
        }),

        // ─── 1.1 MANUALES ──────────────────────────────────
        "1.1": () => ({
            title: "Herramientas manuales",
            text: "¿Qué grupo deseas revisar?",
            actions: [
                { label: "1.1.1 Golpe y ajuste",             action: "menu", value: "1.1.1" },
                { label: "1.1.2 Corte y perforación",        action: "menu", value: "1.1.2" },
                { label: "1.1.3 Soldadura y soporte",        action: "menu", value: "1.1.3" },
                { label: "↩ Volver a categorías",            action: "menu", value: "1" }
            ]
        }),
        "1.1.1": () => productListNode("Golpe y ajuste", [
            "Mini Martillo Tubular", "Pala", "Mazo Fibra de Vidrio"
        ], "1.1"),
        "1.1.2": () => productListNode("Corte y perforación", [
            "Hoja de Sierra", "Disco de Corte", "Broca Metal"
        ], "1.1"),
        "1.1.3": () => productListNode("Soldadura y soporte", [
            "Careta Automatica", "Soporte Magnetico", "Cepillos de Alambre"
        ], "1.1"),

        // ─── 1.2 ELÉCTRICAS ────────────────────────────────
        "1.2": () => ({
            title: "Herramientas eléctricas",
            text: "¿Qué grupo deseas revisar?",
            actions: [
                { label: "1.2.1 Taladros y demolición",  action: "menu", value: "1.2.1" },
                { label: "1.2.2 Lijadoras y pulidoras",  action: "menu", value: "1.2.2" },
                { label: "1.2.3 Bombas y compresoras",   action: "menu", value: "1.2.3" },
                { label: "↩ Volver a categorías",        action: "menu", value: "1" }
            ]
        }),
        "1.2.1": () => productListNode("Taladros y demolición", [
            "Taladro Magnetico", "Taladro Percutor", "Demoledor"
        ], "1.2"),
        "1.2.2": () => productListNode("Lijadoras y pulidoras", [
            "Lijadora Orbital", "Lijadora de Palma", "Pulidora Angular"
        ], "1.2"),
        "1.2.3": () => productListNode("Bombas y compresoras", [
            "Bomba Centrifuga", "Bomba Periferica", "Compresora"
        ], "1.2"),

        // ─── 1.3 INALÁMBRICAS ──────────────────────────────
        "1.3": () => ({
            title: "Herramientas inalámbricas",
            text: "¿Qué grupo deseas revisar?",
            actions: [
                { label: "1.3.1 Taladros, rotomartillos y llaves",    action: "menu", value: "1.3.1" },
                { label: "1.3.2 Sierras y corte",                     action: "menu", value: "1.3.2" },
                { label: "1.3.3 Limpieza, iluminación y accesorios",  action: "menu", value: "1.3.3" },
                { label: "↩ Volver a categorías",                     action: "menu", value: "1" }
            ]
        }),
        "1.3.1": () => productListNode("Taladros, rotomartillos y llaves", [
            "Rotomartillo", "Llave de Impacto", "Llave Ratchet"
        ], "1.3"),
        "1.3.2": () => productListNode("Sierras y corte inalámbrico", [
            "Sierra Sable", "Sierra Circular", "Conjunto de Herramientas"
        ], "1.3"),
        "1.3.3": () => productListNode("Limpieza, iluminación y accesorios", [
            "Lampara", "Sopladora Aspiradora", "Cargador para Baterias"
        ], "1.3"),

        // ─── 2. POR NECESIDAD ──────────────────────────────
        "2": () => ({
            title: "Buscar herramienta por necesidad",
            text: "¿Para qué necesitas la herramienta?",
            actions: [
                { label: "2.1 Perforar o demoler",          action: "menu", value: "2.1" },
                { label: "2.2 Cortar o lijar",              action: "menu", value: "2.2" },
                { label: "2.3 Soldar, ajustar o reparar",   action: "menu", value: "2.3" },
                { label: "↩ Volver al menú principal",      action: "menu", value: "root" }
            ]
        }),
        "2.1": () => productListNode("Para perforar o demoler te recomendamos:", [
            "Taladro Percutor", "Taladro Magnetico", "Rotomartillo"
        ], "2"),
        "2.2": () => productListNode("Para cortar o lijar te recomendamos:", [
            "Sierra Ingleteadora", "Sierra Circular", "Lijadora Orbital"
        ], "2"),
        "2.3": () => productListNode("Para soldar, ajustar o reparar te recomendamos:", [
            "Careta Automatica", "Soporte Magnetico", "Llave de Impacto"
        ], "2"),

        // ─── 3. CARRITO Y COMPRA ───────────────────────────
        "3": () => {
            const summary = cartSummary();
            return {
                title: "Carrito y compra",
                text: summary.count
                    ? `Tienes ${summary.count} producto${summary.count > 1 ? "s" : ""} por un total de ${money(summary.total)}.`
                    : "Tu carrito está vacío por ahora.",
                actions: [
                    { label: "3.1 Ver mi carrito",              action: "cart" },
                    { label: "3.2 Añadir producto",             action: "menu", value: "1" },
                    { label: "3.3 Ir a pagar",                  action: "route", value: "pago" },
                    { label: "↩ Volver al menú principal",      action: "menu", value: "root" }
                ]
            };
        },

        // ─── 4. AYUDA Y ASESORÍA ───────────────────────────
        "4": () => ({
            title: "Centro de ayuda y asesoría",
            text: "¿Qué necesitas?",
            actions: [
                { label: "4.1 Hablar con un asesor",       action: "menu", value: "4.1" },
                { label: "4.2 Preguntas frecuentes",       action: "menu", value: "4.2" },
                { label: "4.3 Buscar producto por nombre", action: "menu", value: "4.3" },
                { label: "↩ Volver al menú principal",     action: "menu", value: "root" }
            ]
        }),
        "4.1": () => ({
            title: "Hablar con un asesor",
            text: "Te derivaremos con un asesor por WhatsApp. Puedes iniciar la conversación con un solo clic:",
            actions: [
                { label: "Abrir WhatsApp", action: "whatsapp", value: "Hola, quisiera hablar con un asesor de la ferretería." },
                { label: "Ir a Contacto",  action: "route",    value: "contacto" },
                { label: "↩ Volver a ayuda", action: "menu",   value: "4" }
            ]
        }),
        "4.2": () => ({
            title: "Preguntas frecuentes",
            text: [
                "• ¿Hacen delivery? Sí, envío gratis por compras mayores a S/ 99; en Lima el costo estándar es S/ 10.",
                `• ¿Métodos de pago? ${(store.paymentMethods || []).join(", ") || "Tarjeta, Yape, Plin y WhatsApp"}.`,
                "• ¿Garantía? Todos los productos cuentan con la garantía del fabricante.",
                `• Horario: ${store.hours || "Lunes a sábado, 8:00 a. m. – 7:00 p. m."}`
            ].join("\n"),
            actions: [
                { label: "↩ Volver a ayuda",           action: "menu", value: "4" },
                { label: "↩ Volver al menú principal", action: "menu", value: "root" }
            ]
        }),
        "4.3": () => {
            state.awaiting = "product";
            return {
                title: "Buscar producto por nombre",
                text: "Escribe el nombre o palabra clave del producto que buscas. Ejemplos: taladro, sierra, lijadora, martillo, soldadura, bomba, llave.",
                actions: [
                    { label: "↩ Volver a ayuda", action: "menu", value: "4" }
                ]
            };
        }
    };

    // Genera un nodo del tipo "lista de productos" a partir de fragmentos
    // que se buscan en el catálogo real (así los precios y datos son reales).
    function productListNode(sectionTitle, fragments, backKey) {
        const catalog = getCatalog();
        const found = [];
        fragments.forEach(fr => {
            const p = catalog.find(x => normalize(x.nombre).includes(normalize(fr)));
            if (p) found.push(p);
        });
        menuState.lastProductList = found;
        return {
            title: sectionTitle,
            text: found.length
                ? "Selecciona un producto para ver detalles o añadirlo al carrito:"
                : "No encontramos productos disponibles en este grupo por el momento.",
            products: found,
            actions: [
                { label: "↩ Volver",                    action: "menu", value: backKey },
                { label: "↩ Menú principal",            action: "menu", value: "root" }
            ]
        };
    }

    // Detecta si el texto del usuario es un comando de menú y devuelve
    // la respuesta correspondiente. Devuelve null si no es un comando.
    function menuResponse(text) {
        const raw = String(text || "").trim();
        const q = normalize(raw);

        // Comandos rápidos / globales
        if (["menu", "menu principal", "inicio", "volver al menu", "volver al menu principal", "empezar", "start"].includes(q)) {
            menuState.currentPath = "root";
            return menuTree.root();
        }
        if (["atras", "volver", "regresar", "back", "anterior", "volver atras"].includes(q)) {
            const prev = menuState.history.pop() || "root";
            menuState.currentPath = prev;
            const node = menuTree[prev];
            return node ? node() : menuTree.root();
        }
        if (["asesor", "hablar con asesor", "hablar con un asesor"].includes(q)) {
            menuState.currentPath = "4.1";
            return menuTree["4.1"]();
        }
        if (["carrito", "ver carrito", "mi carrito"].includes(q)) {
            menuState.currentPath = "3";
            return menuTree["3"]();
        }

        // Números tipo "1", "2.3", "1.1.1", "3.2"
        if (/^\d+(\.\d+){0,2}$/.test(raw)) {
            // Si estamos dentro de una lista de productos, un número simple selecciona uno
            if (menuState.lastProductList && menuState.lastProductList.length && /^\d+$/.test(raw)) {
                const idx = parseInt(raw, 10) - 1;
                const product = menuState.lastProductList[idx];
                if (product) {
                    return {
                        title: product.nombre,
                        text: `Precio: ${money(product.precio)}\nCategoría: ${categoryLabel(product.categoria)}`,
                        products: [product],
                        actions: [
                            { label: "Añadir al carrito", action: "add-cart", value: String(product.id) },
                            { label: "Ver en la página",  action: "route",    value: "productos" },
                            { label: "↩ Volver",          action: "menu",     value: menuState.currentPath || "root" }
                        ]
                    };
                }
            }

            // Si es una ruta del árbol, navegar
            if (menuTree[raw]) {
                if (menuState.currentPath && menuState.currentPath !== raw) {
                    menuState.history.push(menuState.currentPath);
                }
                menuState.currentPath = raw;
                return menuTree[raw]();
            }
        }

        return null;   // no es un comando de menú → dejar a processQuery()
    }


    async function submitQuery(text, messages) {
        addUserMessage(messages, text);
        state.isBusy = true;
        const typing = showTyping(messages);
        const delay = Math.min(720, 280 + text.length * 7);
        await new Promise(resolve => setTimeout(resolve, delay));
        typing.remove();
        // 1º intento: comandos del menú por número o palabra clave
        const menuHit = menuResponse(text);
        const response = menuHit || processQuery(text);
        addBotMessage(messages, response);
        state.isBusy = false;
    }

    function processQuery(text) {
        const q = normalize(text);

        if (state.awaiting === "product") {
            state.awaiting = null;
            return productSearchResponse(text);
        }
        if (state.awaiting === "recommend") {
            state.awaiting = null;
            return recommendationResponse(text);
        }
        if (state.awaiting === "order") {
            state.awaiting = null;
            return orderResponse(text);
        }

        if (/^(hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches|hey)\b/.test(q)) {
            return {
                title: "Hola",
                text: "Estoy listo para ayudarte con cualquier consulta sobre la tienda. Puedes buscar una herramienta, pedir una recomendación o revisar tu compra.",
                actions: [
                    { label: "Buscar producto", icon: "magnifying-glass", action: "mode", value: "product" },
                    { label: "Ver opciones", icon: "grip", action: "query", value: "¿Qué cosas puedes hacer?" }
                ]
            };
        }

        if (/gracias|muchas gracias|perfecto|excelente/.test(q)) {
            return { text: "¡Con gusto! Estoy aquí para ayudarte a completar tu compra o resolver otra consulta de la tienda." };
        }

        if (/que puedes hacer|como me ayudas|opciones|menu de ayuda/.test(q)) {
            return {
                title: "Puedo ayudarte con:",
                text: "Consultas rápidas y acciones dentro de la tienda virtual.",
                list: pageIsAdmin
                    ? ["Navegar por módulos administrativos", "Explicar la función de cada panel", "Orientar sobre inventario, ventas y usuarios"]
                    : ["Buscar productos y precios", "Recomendar herramientas según el trabajo", "Comparar opciones por presupuesto", "Revisar carrito y pedidos", "Informar pagos, envíos, horarios y contacto"],
                actions: quickActions().slice(0, 4).map(a => ({ ...a }))
            };
        }

        if (pageIsAdmin && /panel|administrador|inventario|ventas|usuarios|gestionar/.test(q)) {
            return adminResponse(q);
        }

        if (/categoria|categorias|tipos de herramienta|que venden|catalogo/.test(q) && !/precio/.test(q)) {
            return {
                title: "Categorías disponibles",
                text: "El catálogo está organizado para que encuentres rápidamente lo que necesitas.",
                list: Object.values(store.categories || {}),
                actions: [
                    { label: "Manuales", icon: "hammer", action: "category", value: "manuales" },
                    { label: "Eléctricas", icon: "plug", action: "category", value: "electricas" },
                    { label: "Inalámbricas", icon: "battery-full", action: "category", value: "inalambricas" }
                ]
            };
        }

        if (/carrito|mi compra|cuanto llevo|subtotal|total de compra/.test(q)) return cartResponse();
        if (/forma.*pago|metodo.*pago|pagar|tarjeta|yape|plin/.test(q)) return paymentResponse();
        if (/envio|delivery|entrega|despacho|reparto|envio gratis/.test(q)) return shippingResponse();
        if (/horario|atienden|abren|cierran/.test(q)) return { title: "Horario de atención", text: store.hours || "Lunes a sábado, de 8:00 a. m. a 7:00 p. m.", actions: contactActions() };
        if (/ubicacion|direccion|donde estan|como llegar|local/.test(q)) return { title: "Ubicación", text: `${store.address}. Puedes revisar el mapa y los datos completos en la página de contacto.`, actions: [{ label: "Ver contacto", icon: "location-dot", action: "route", value: "contacto" }] };
        if (/telefono|whatsapp|correo|contacto|asesor humano|persona real/.test(q)) return contactResponse();
        if (/pedido|orden|seguimiento|rastrear|codigo/.test(q)) {
            const possibleCode = text.match(/[A-Z]{2,}-?\d{3,}|\d{5,}/i)?.[0];
            if (possibleCode) return orderResponse(possibleCode);
            state.awaiting = "order";
            return { text: "Escribe el código de tu pedido para buscarlo. También puedes revisar la confirmación que recibiste al finalizar la compra." };
        }
        if (/garantia|devolucion|cambio|reclamo/.test(q)) {
            return {
                title: "Cambios, garantías y reclamos",
                text: "La evaluación depende del producto y del comprobante de compra. Para darte una respuesta correcta, contacta al equipo indicando el producto, fecha de compra y motivo de la solicitud.",
                actions: contactActions()
            };
        }
        if (/cuenta|registrar|registro|iniciar sesion|login|contrasena/.test(q)) {
            return {
                title: "Cuenta de cliente",
                text: "En la página de inicio puedes registrarte o iniciar sesión desde el botón superior. Tu cuenta permite identificarte durante el proceso de compra.",
                actions: [{ label: "Ir al inicio", icon: "house", action: "route", value: "inicio" }]
            };
        }

        if (/recomienda|recomendacion|que necesito|sirve para|herramienta para|quiero hacer|voy a/.test(q)) return recommendationResponse(text);
        if (/barato|economico|menor precio|mas barato/.test(q)) return priceExtremeResponse("cheap", text);
        if (/caro|mayor precio|mas potente|profesional/.test(q)) return priceExtremeResponse("expensive", text);
        if (/precio|cuesta|costo|tienen|busco|necesito|producto|taladro|martillo|sierra|bomba|lijadora|soldadura|careta|broca|llave|compresora|pulidora|pistola|rotomartillo|aspiradora/.test(q)) return productSearchResponse(text);

        return {
            text: "Puedo responder consultas relacionadas con la tienda virtual. Cuéntame qué producto buscas o el trabajo que deseas realizar y te orientaré con opciones del catálogo.",
            actions: [
                { label: "Buscar producto", icon: "magnifying-glass", action: "mode", value: "product" },
                { label: "Hablar con asesor", icon: "headset", action: "whatsapp", value: "" }
            ]
        };
    }

    function productSearchResponse(text) {
        const products = searchProducts(text, 5);
        const budget = budgetFromText(text);
        let filtered = products;
        if (budget != null) filtered = products.filter(item => item.precio <= budget);
        if (!filtered.length && budget != null) {
            filtered = getCatalog().filter(item => item.precio <= budget).sort((a, b) => b.precio - a.precio).slice(0, 5);
        }
        state.lastProducts = filtered;
        if (!filtered.length) {
            return {
                title: "No encontré una coincidencia exacta",
                text: "Prueba escribiendo el tipo de herramienta o el trabajo que necesitas realizar. También puedes revisar el catálogo completo.",
                actions: [
                    { label: "Ver catálogo", icon: "store", action: "route", value: "productos" },
                    { label: "Consultar por WhatsApp", icon: "headset", action: "whatsapp", value: "" }
                ]
            };
        }
        return {
            title: filtered.length === 1 ? "Encontré esta opción" : `Encontré ${filtered.length} opciones`,
            text: budget != null ? `Estas alternativas se ajustan a un presupuesto máximo de ${money(budget)}.` : "Revisa las opciones y añade la que prefieras al carrito.",
            products: filtered,
            actions: [{ label: "Ver catálogo completo", icon: "arrow-right", action: "route", value: "productos" }]
        };
    }

    function recommendationResponse(text) {
        const q = normalize(text);
        const budget = budgetFromText(text);
        let query = text;
        if (/concreto|pared|cemento|demoler/.test(q)) query = "rotomartillo taladro percutor demoledor concreto";
        else if (/soldar|soldadura/.test(q)) query = "careta soldadura soporte magnetico";
        else if (/pintar|pintura/.test(q)) query = "pistola pulverizadora pintura";
        else if (/madera|carpinteria/.test(q)) query = "sierra disco madera ingleteadora";
        else if (/agua|pozo|cisterna|tanque/.test(q)) query = "bomba agua centrifuga periferica sumergible";
        else if (/auto|carro|llanta|mecanica/.test(q)) query = "llave impacto compresora ratchet";
        else if (/metal|fierro/.test(q)) query = "broca metal pulidora taladro magnetico";
        else if (/casa|hogar|kit|basico/.test(q)) query = "martillo destornillador set herramientas llave";

        let options = searchProducts(query, 6);
        if (budget != null) options = options.filter(item => item.precio <= budget);
        options = options.slice(0, 4);
        state.lastProducts = options;

        if (!options.length) {
            state.awaiting = "recommend";
            return {
                title: "Te ayudo a elegir",
                text: "Indícame qué trabajo realizarás, sobre qué material y tu presupuesto aproximado. Por ejemplo: “perforar concreto con hasta S/ 500”."
            };
        }
        return {
            title: "Recomendación según tu proyecto",
            text: "Estas opciones coinciden con el trabajo descrito. Antes de comprar, verifica potencia, medida y compatibilidad con el material.",
            products: options,
            actions: [
                { label: "Afinar recomendación", icon: "sliders", action: "mode", value: "recommend" },
                { label: "Consultar a un asesor", icon: "headset", action: "whatsapp", value: "" }
            ]
        };
    }

    function priceExtremeResponse(type, text) {
        const catalog = getCatalog();
        const category = /inalambr/.test(normalize(text)) ? "inalambricas" : /electric/.test(normalize(text)) ? "electricas" : /manual/.test(normalize(text)) ? "manuales" : null;
        const filtered = category ? catalog.filter(item => item.categoria === category) : catalog;
        const sorted = [...filtered].sort((a, b) => type === "cheap" ? a.precio - b.precio : b.precio - a.precio).slice(0, 4);
        state.lastProducts = sorted;
        return {
            title: type === "cheap" ? "Opciones de menor precio" : "Opciones de mayor desempeño y precio",
            text: category ? `Resultados dentro de ${categoryLabel(category).toLowerCase()}.` : "Resultados del catálogo disponible.",
            products: sorted
        };
    }

    function cartResponse() {
        const summary = cartSummary();
        if (!summary.cart.length) {
            return {
                title: "Tu carrito está vacío",
                text: "Busca un producto o visita el catálogo para comenzar tu compra.",
                actions: [
                    { label: "Buscar producto", icon: "magnifying-glass", action: "mode", value: "product" },
                    { label: "Ver catálogo", icon: "store", action: "route", value: "productos" }
                ]
            };
        }
        return {
            title: `Tienes ${summary.quantity} ${summary.quantity === 1 ? "producto" : "productos"}`,
            text: `El total actual de tu carrito es ${money(summary.total)}.${summary.total >= Number(store.freeShippingMinimum || 99) ? " Tu pedido califica para envío gratis." : ` Te faltan ${money(Number(store.freeShippingMinimum || 99) - summary.total)} para el envío gratis.`}`,
            list: summary.cart.slice(0, 4).map(item => `${Number(item.cantidad || 0)} × ${item.nombre}`),
            actions: [
                { label: "Ir a pagar", icon: "credit-card", action: "route", value: "pago" },
                { label: "Seguir comprando", icon: "store", action: "route", value: "productos" }
            ]
        };
    }

    function paymentResponse() {
        return {
            title: "Formas de pago",
            text: "Puedes seleccionar el método durante el proceso de pago.",
            list: store.paymentMethods || ["Tarjeta", "Yape", "Plin", "WhatsApp"],
            actions: [
                { label: "Ir al pago", icon: "credit-card", action: "route", value: "pago" },
                { label: "Consultar", icon: "headset", action: "whatsapp", value: "" }
            ]
        };
    }

    function shippingResponse() {
        const minimum = Number(store.freeShippingMinimum || 99);
        return {
            title: "Envíos y entregas",
            text: `Los pedidos desde ${money(minimum)} califican para envío gratis según las condiciones mostradas en la tienda. Para montos menores, el sistema considera un envío referencial de ${money(store.shippingFee || 10)}. La disponibilidad y cobertura final se confirman al coordinar el pedido.`,
            actions: [
                { label: "Revisar mi carrito", icon: "cart-shopping", action: "query", value: "¿Qué tengo en mi carrito?" },
                { label: "Coordinar entrega", icon: "truck-fast", action: "whatsapp", value: "" }
            ]
        };
    }

    function contactActions() {
        return [
            { label: "WhatsApp", icon: "comments", action: "whatsapp", value: "" },
            { label: "Página de contacto", icon: "address-card", action: "route", value: "contacto" }
        ];
    }

    function contactResponse() {
        return {
            title: "Atención al cliente",
            text: `WhatsApp: ${store.phone || "969 518 850"}\nCorreo: ${store.email || "estructurasydiseniosgroup@ferreteria.com"}\n${store.hours || "Lunes a sábado, de 8:00 a. m. a 7:00 p. m."}`,
            actions: contactActions()
        };
    }

    function orderResponse(codeText) {
        const code = normalize(codeText).replace(/\s+/g, "");
        const orders = readJson(ORDER_KEY, []);
        const order = orders.find(item => normalize(item.codigo || item.code || item.id).replace(/\s+/g, "") === code);
        if (!order) {
            return {
                title: "Pedido no encontrado en este dispositivo",
                text: "Verifica el código ingresado. Si realizaste el pedido desde otro equipo o por WhatsApp, contacta al asesor para confirmar el estado.",
                actions: contactActions()
            };
        }
        return {
            title: `Pedido ${order.codigo || order.code || order.id}`,
            text: `Estado: ${order.estado || "Registrado"}. Total: ${money(order.total || 0)}.`,
            actions: contactActions()
        };
    }

    function adminResponse(q) {
        if (/inventario|stock/.test(q)) return { title: "Gestión de inventario", text: "Revisa existencias, productos con stock bajo, categorías y valor estimado del inventario.", actions: [{ label: "Abrir inventario", icon: "boxes-stacked", action: "route", value: "inventario" }] };
        if (/venta|pedido|ingreso/.test(q)) return { title: "Análisis de ventas", text: "Consulta indicadores de ingresos, pedidos, ticket promedio y productos con mayor movimiento.", actions: [{ label: "Abrir ventas", icon: "chart-line", action: "route", value: "ventas" }] };
        if (/usuario|cliente/.test(q)) return { title: "Control de usuarios", text: "Administra la información de usuarios registrados y sus roles dentro del sistema.", actions: [{ label: "Abrir usuarios", icon: "users", action: "route", value: "usuarios" }] };
        return {
            title: "Panel administrador",
            text: "El sistema incluye módulos de inventario, ventas, usuarios y gestión de productos. Selecciona uno para continuar.",
            actions: quickActions().slice(0, 4).map(a => ({ ...a }))
        };
    }

    function handleAssistantAction(event, messages) {
        const button = event.target.closest("[data-ai-action]");
        if (!button) return;
        const action = button.dataset.aiAction;
        const value = button.dataset.aiValue || "";

        if (action === "query") {
            submitQuery(value, messages);
        } else if (action === "menu") {
            // Navegación por el árbol de menús
            submitQuery(value, messages);
        } else if (action === "cart") {
            // Abrir el panel del carrito si existe
            if (typeof window.abrirCarrito === "function") {
                window.abrirCarrito();
            } else {
                addBotMessage(messages, { text: "Tu carrito está disponible en el ícono del header." });
            }
        } else if (action === "add-cart") {
            const product = getCatalog().find(item => Number(item.id) === Number(value));
            if (product) {
                addProductToCart(product);
                addBotMessage(messages, { text: `✓ ${product.nombre} añadido al carrito.` });
            }
        } else if (action === "mode") {
            state.awaiting = value;
            const prompts = {
                product: "Escribe el nombre del producto o herramienta que buscas.",
                recommend: "Cuéntame qué trabajo realizarás, el material y tu presupuesto aproximado.",
                order: "Escribe el código de tu pedido para buscarlo."
            };
            addBotMessage(messages, { text: prompts[value] || "Escribe tu consulta." });
            document.querySelector(".edg-ai-form input")?.focus();
        } else if (action === "route") {
            if (routes[value]) location.href = routes[value];
        } else if (action === "category") {
            location.href = `${routes.productos}?cat=${encodeURIComponent(value)}`;
        } else if (action === "whatsapp") {
            const customMsg = value || "Hola, necesito ayuda con una consulta de la tienda virtual Estructuras & Diseños Group.";
            const message = encodeURIComponent(customMsg);
            window.open(`https://wa.me/${String(store.phoneLink || "+51969518850").replace(/\D/g, "")}?text=${message}`, "_blank", "noopener");
        } else if (action === "add") {
            const product = getCatalog().find(item => Number(item.id) === Number(value));
            if (product) addProductToCart(product);
        }
    }

    function setupVoiceInput(button, input, messages) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            button.hidden = true;
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = "es-PE";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        button.addEventListener("click", () => {
            try {
                recognition.start();
                button.classList.add("edg-ai-mic-listening");
            } catch (_) { /* ya estaba escuchando */ }
        });
        recognition.addEventListener("result", event => {
            const transcript = event.results?.[0]?.[0]?.transcript || "";
            input.value = transcript;
            if (transcript) submitQuery(transcript, messages);
        });
        recognition.addEventListener("end", () => button.classList.remove("edg-ai-mic-listening"));
        recognition.addEventListener("error", () => button.classList.remove("edg-ai-mic-listening"));
    }

    function scrollMessages(container) {
        requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
    }

    function announce(message) {
        const messages = document.querySelector(".edg-ai-messages");
        if (messages) addBotMessage(messages, { text: message, actions: [{ label: "Revisar carrito", icon: "cart-shopping", action: "query", value: "¿Qué tengo en mi carrito?" }] });
        const badge = document.querySelector(".cart-badge");
        if (badge) badge.style.display = "flex";
    }

    document.addEventListener("DOMContentLoaded", createAssistant);
})();
