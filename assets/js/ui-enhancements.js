(function () {
    const PRODUCT_KEY = "admin_productos_edg";
    const USER_KEY = "usuarios_edg";
    const ORDER_KEY = "pedidos_edg";
    const CONTACT_KEY = "contactos_edg";

    function readJson(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function money(value) {
        return "S/ " + Number(value || 0).toFixed(2);
    }

    function toast(message) {
        let box = document.getElementById("systemToast");
        if (!box) {
            box = document.createElement("div");
            box.id = "systemToast";
            box.className = "system-toast";
            document.body.appendChild(box);
        }
        box.textContent = message;
        box.classList.add("system-toast-visible");
        clearTimeout(box._timer);
        box._timer = setTimeout(() => box.classList.remove("system-toast-visible"), 2600);
    }

    function products() {
        return readJson(PRODUCT_KEY, []);
    }

    function orders() {
        return readJson(ORDER_KEY, []);
    }

    function users() {
        return readJson(USER_KEY, []);
    }

    function updateText(selector, value) {
        document.querySelectorAll(selector).forEach(el => {
            el.textContent = value;
        });
    }

    function updateAdminStats() {
        const adminProducts = products();
        const totalValue = adminProducts.reduce((sum, item) => sum + Number(item.precio || 0) * Number(item.stock || 0), 0);
        const lowStock = adminProducts.filter(item => Number(item.stock || 0) <= 3).length;
        const categories = new Set(adminProducts.map(item => item.categoria).filter(Boolean)).size;
        const adminOrders = orders();
        const salesTotal = adminOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        const avgTicket = adminOrders.length ? salesTotal / adminOrders.length : 0;
        const clientUsers = users();
        const contacts = readJson(CONTACT_KEY, []);

        updateText("[data-stat='products']", adminProducts.length);
        updateText("[data-stat='low-stock']", lowStock);
        updateText("[data-stat='categories']", categories);
        updateText("[data-stat='stock-value']", money(totalValue));
        updateText("[data-stat='sales']", money(salesTotal));
        updateText("[data-stat='orders']", adminOrders.length);
        updateText("[data-stat='avg-ticket']", money(avgTicket));
        updateText("[data-stat='conversion']", adminOrders.length ? "100%" : "0%");
        updateText("[data-stat='users']", clientUsers.length);
        updateText("[data-stat='active-users']", clientUsers.length);
        updateText("[data-stat='admins']", clientUsers.filter(u => u.rol === "admin" || u.rol === "administrador").length);
        updateText("[data-stat='messages']", contacts.length);

        renderInventoryTable(adminProducts);
    }

    function inventoryStatus(stock) {
        const qty = Number(stock || 0);
        if (qty <= 0) return ['Sin stock', 'status-danger'];
        if (qty <= 3) return ['Critico', 'status-danger'];
        if (qty <= 6) return ['Bajo', 'status-warn'];
        return ['Disponible', 'status-ok'];
    }

    function renderInventoryTable(adminProducts) {
        const body = document.querySelector("[data-admin-inventory-body]");
        if (!body) return;
        body.innerHTML = "";
        if (!adminProducts.length) {
            body.innerHTML = "<tr><td colspan='6' class='admin-empty-state'>No hay productos cargados todavia. Agrega un producto desde el panel para iniciar el conteo.</td></tr>";
            return;
        }
        adminProducts.forEach(item => {
            const [label, statusClass] = inventoryStatus(item.stock);
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><img class="admin-product-thumb" src="${item.imagen || '../img/LOGO 1.png'}" alt="${item.nombre || 'Producto'}"></td>
                <td>${item.nombre || 'Producto sin nombre'}</td>
                <td>${item.categoria || 'Sin categoria'}</td>
                <td>${money(item.precio)}</td>
                <td>${Number(item.stock || 0)}</td>
                <td><span class="status ${statusClass}">${label}</span></td>
            `;
            body.appendChild(tr);
        });
    }

    function addProductFromForm(form) {
        const nombre = form.querySelector("#adminProductName")?.value.trim();
        const categoria = form.querySelector("#adminProductCategory")?.value;
        const precio = Number(form.querySelector("#adminProductPrice")?.value || 0);
        const stock = Number(form.querySelector("#adminProductStock")?.value || 0);
        const imagen = form.querySelector("#adminProductImage")?.value.trim() || "../img herramientas/Rectangle 32.png";

        if (!nombre || precio <= 0 || stock < 0) {
            toast("Completa nombre, precio y stock para contabilizar el producto.");
            return;
        }

        const adminProducts = products();
        adminProducts.push({
            id: Date.now(),
            nombre,
            categoria,
            precio,
            stock,
            imagen
        });
        writeJson(PRODUCT_KEY, adminProducts);
        form.reset();
        updateAdminStats();
        toast("Producto agregado. La data del panel ya fue actualizada.");
    }

    function exportInventory() {
        const adminProducts = products();
        const header = "Nombre,Categoria,Precio,Stock,Imagen\n";
        const rows = adminProducts.map(item => [
            item.nombre,
            item.categoria,
            item.precio,
            item.stock,
            item.imagen
        ].map(value => `"${String(value || "").replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "inventario_admin.csv";
        link.click();
        URL.revokeObjectURL(link.href);
        toast(adminProducts.length ? "Reporte exportado." : "Reporte exportado con data en cero.");
    }

    function wireAdminButtons() {
        document.addEventListener("click", function (event) {
            const button = event.target.closest("button, a");
            if (!button) return;
            const text = button.textContent.replace(/\s+/g, " ").trim().toLowerCase();

            if (button.matches("[data-action='add-product']")) {
                event.preventDefault();
                const form = button.closest("form");
                if (form) addProductFromForm(form);
                return;
            }

            if (text.includes("exportar reporte")) {
                event.preventDefault();
                exportInventory();
                return;
            }

            if (text.includes("guardar cambios")) {
                event.preventDefault();
                localStorage.setItem("admin_last_save", new Date().toISOString());
                toast("Cambios guardados localmente para esta version.");
                return;
            }

            if (text.includes("nuevo usuario")) {
                event.preventDefault();
                const currentUsers = users();
                currentUsers.push({
                    nombre: "Usuario demo " + (currentUsers.length + 1),
                    email: "usuario" + (currentUsers.length + 1) + "@demo.com",
                    rol: "cliente"
                });
                writeJson(USER_KEY, currentUsers);
                updateAdminStats();
                toast("Usuario demo creado y contabilizado.");
                return;
            }

            if (text.includes("este mes")) {
                event.preventDefault();
                toast("Filtro aplicado: este mes. La data inicia en cero hasta registrar pedidos.");
                return;
            }

            if (text.includes("editar precio")) {
                event.preventDefault();
                toast("Selecciona un producto cargado para editar precio o stock.");
                return;
            }

            if (text.includes("ocultar del catalogo") || text.includes("ocultar del catálogo")) {
                event.preventDefault();
                toast("Accion preparada: ocultar producto seleccionado del catalogo.");
                return;
            }

            if (text.includes("quitar producto")) {
                event.preventDefault();
                const adminProducts = products();
                if (!adminProducts.length) {
                    toast("No hay productos cargados para quitar.");
                    return;
                }
                adminProducts.pop();
                writeJson(PRODUCT_KEY, adminProducts);
                updateAdminStats();
                toast("Ultimo producto cargado quitado.");
                return;
            }
        });
    }

    function wirePlaceholderLinks() {
        document.addEventListener("click", function (event) {
            const cart = event.target.closest(".cart-button");
            if (!cart || document.getElementById("carritoPanel")) return;
            event.preventDefault();
            event.stopPropagation();
            toast("Tu carrito esta disponible en Inicio y Productos.");
        }, true);

        document.addEventListener("click", function (event) {
            const link = event.target.closest("a[href='#']");
            if (!link) return;
            const text = link.textContent.replace(/\s+/g, " ").trim().toLowerCase();
            if (text.includes("favoritos")) {
                event.preventDefault();
                toast("Tus favoritos se guardaran cuando marques productos del catalogo.");
            } else if (text.includes("terminos") || text.includes("términos")) {
                event.preventDefault();
                toast("Terminos registrados para la version academica del proyecto.");
            } else if (text.includes("crear cuenta") || text.includes("acceso") || text.includes("iniciar sesion") || text.includes("registrarse")) {
                event.preventDefault();
                toast("Usa el boton Registrarse del inicio para abrir el modal de cuenta.");
            }
        });
    }

    function wireSearch() {
        document.querySelectorAll(".sidebar-search input, .admin-filter input").forEach(input => {
            input.addEventListener("keydown", function (event) {
                if (event.key !== "Enter") return;
                event.preventDefault();
                const term = input.value.trim();
                if (!term) {
                    toast("Ingresa un texto para buscar.");
                    return;
                }
                if (input.closest(".sidebar-search")) {
                    const prefix = location.pathname.includes("/assets/pages/") ? "" : "assets/pages/";
                    location.href = prefix + "productos.html?q=" + encodeURIComponent(term);
                } else {
                    toast("Filtro aplicado: " + term);
                }
            });
        });
    }

    function createChat() {
        if (document.getElementById("advisorChat")) return;
        const chat = document.createElement("section");
        chat.id = "advisorChat";
        chat.className = "advisor-chat";
        chat.innerHTML = `
            <button class="advisor-chat-toggle" type="button" aria-label="Abrir chat de asesor">
                <i class="fa-solid fa-comments"></i>
                <span>Asesor</span>
            </button>
            <div class="advisor-chat-panel" aria-live="polite">
                <div class="advisor-chat-head">
                    <div>
                        <strong>Asesor ferretero</strong>
                        <span>Te ayudamos a encontrar productos</span>
                    </div>
                    <button type="button" class="advisor-chat-close" aria-label="Cerrar chat"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="advisor-chat-messages">
                    <p class="advisor-message advisor-bot">Hola, dime que herramienta o material buscas y te orientamos.</p>
                </div>
                <form class="advisor-chat-form">
                    <input type="text" placeholder="Escribe tu consulta..." aria-label="Mensaje para asesor">
                    <button type="submit" aria-label="Enviar mensaje"><i class="fa-solid fa-paper-plane"></i></button>
                </form>
            </div>
        `;
        document.body.appendChild(chat);

        const panel = chat.querySelector(".advisor-chat-panel");
        const messages = chat.querySelector(".advisor-chat-messages");
        const input = chat.querySelector("input");

        chat.querySelector(".advisor-chat-toggle").addEventListener("click", () => {
            panel.classList.toggle("advisor-chat-open");
            if (panel.classList.contains("advisor-chat-open")) input.focus();
        });
        chat.querySelector(".advisor-chat-close").addEventListener("click", () => {
            panel.classList.remove("advisor-chat-open");
        });
        chat.querySelector("form").addEventListener("submit", function (event) {
            event.preventDefault();
            const text = input.value.trim();
            if (!text) return;
            addChatMessage(messages, text, "user");
            input.value = "";
            setTimeout(() => addChatMessage(messages, advisorReply(text), "bot"), 350);
        });
    }

    function addChatMessage(container, text, type) {
        const p = document.createElement("p");
        p.className = "advisor-message advisor-" + type;
        p.textContent = text;
        container.appendChild(p);
        container.scrollTop = container.scrollHeight;
    }

    function advisorReply(text) {
        const value = text.toLowerCase();
        if (value.includes("taladro")) return "Para taladros revisa Herramientas electricas o inalambricas. Si es para concreto, busca percutor.";
        if (value.includes("pint") || value.includes("rodillo")) return "Para pintura puedes revisar rodillos y accesorios. Te recomiendo indicar superficie y metraje.";
        if (value.includes("sold")) return "Para soldadura revisa caretas, soportes magneticos y discos. Prioriza seguridad y potencia del equipo.";
        if (value.includes("precio") || value.includes("costo")) return "Puedes ver precios en el catalogo. Si agregas productos al carrito, el total se calcula automaticamente.";
        return "Gracias por tu consulta. Un asesor revisara tu necesidad; tambien puedes buscar el producto por categoria en el catalogo.";
    }

    document.addEventListener("DOMContentLoaded", function () {
        updateAdminStats();
        wireAdminButtons();
        wirePlaceholderLinks();
        wireSearch();
        // El minichat anterior fue sustituido por EDG IA (virtual-assistant.js).
    });
})();
