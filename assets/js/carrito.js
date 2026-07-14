// ============================================================
//  CARRITO.JS — Sistema de carrito de compras
//  El carrito se guarda en localStorage (respuesta instantánea)
//  y se SINCRONIZA con la BD vía /api/carrito, atado a un
//  sessionId único por navegador y al usuario logueado (si hay).
//
//  Así: cada visitante tiene SU propio carrito, y si el usuario
//  inicia sesión, su carrito queda asociado a su cuenta en la BD.
// ============================================================

// ── SESSION ID (identificador único de este navegador) ─────
function obtenerSessionId() {
    let sid = localStorage.getItem("session_edg");
    if (!sid) {
        sid = "edg-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
        localStorage.setItem("session_edg", sid);
    }
    return sid;
}

// Usuario logueado (lo guarda auth.js). Devuelve id o null.
function obtenerUsuarioIdActual() {
    try {
        const sesion = JSON.parse(localStorage.getItem("sesion_edg") || "null");
        return sesion?.id_usuario || null;
    } catch { return null; }
}


// ── DATOS ──────────────────────────────────────────────────
function obtenerCarrito() {
    return JSON.parse(localStorage.getItem("carrito_edg") || "[]");
}

function guardarCarrito(carrito) {
    localStorage.setItem("carrito_edg", JSON.stringify(carrito));
    sincronizarCarritoAPI();   // empuja el estado a la BD (en segundo plano)
}


// ── SINCRONIZACIÓN CON LA BD (no bloquea la interfaz) ──────
let _syncTimer = null;
function sincronizarCarritoAPI() {
    // Pequeño debounce: si el usuario hace varios clics seguidos,
    // solo se envía el estado final.
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(async () => {
        try {
            const items = obtenerCarrito().map(p => ({
                id:       p.id,
                nombre:   p.nombre,
                precio:   p.precio,
                imagen:   p.imagen,
                cantidad: p.cantidad
            }));
            await fetch("/api/carrito", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: obtenerSessionId(),
                    usuarioId: obtenerUsuarioIdActual(),
                    items
                })
            });
        } catch (err) {
            // Sin backend no pasa nada: el carrito sigue funcionando local.
            console.warn("⚠️ Carrito no sincronizado con la BD:", err.message);
        }
    }, 400);
}

// Restaurar carrito desde la BD si el navegador no tiene nada local
// (ej: se limpió el navegador pero el carrito quedó guardado en la BD).
async function restaurarCarritoDesdeAPI() {
    if (obtenerCarrito().length > 0) return;   // lo local manda
    try {
        const resp = await fetch("/api/carrito/" + encodeURIComponent(obtenerSessionId()));
        if (!resp.ok) return;
        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) return;

        const carrito = data.map(i => ({
            id:       i.id_producto,
            nombre:   i.nombre_producto,
            precio:   Number(i.precio_unitario),
            imagen:   i.imagen_url,
            cantidad: Number(i.cantidad) || 1
        }));
        localStorage.setItem("carrito_edg", JSON.stringify(carrito));
        actualizarBadge();
        renderCarritoPanel();
        console.log(`✅ Carrito restaurado desde la BD: ${carrito.length} items.`);
    } catch (err) {
        // Silencioso: sin backend simplemente no se restaura nada.
    }
}


// ── AGREGAR PRODUCTO ───────────────────────────────────────
function agregarAlCarrito(id, nombre, precio, imagen) {
    const carrito = obtenerCarrito();
    const existe  = carrito.find(p => p.id === id);

    if (existe) {
        existe.cantidad++;
    } else {
        carrito.push({ id, nombre, precio, imagen, cantidad: 1 });
    }

    guardarCarrito(carrito);
    actualizarBadge();
    mostrarFeedback();
    renderCarritoPanel();
}


// ── ELIMINAR PRODUCTO ──────────────────────────────────────
function eliminarDelCarrito(id) {
    let carrito = obtenerCarrito().filter(p => p.id !== id);
    guardarCarrito(carrito);
    actualizarBadge();
    renderCarritoPanel();
}


// ── CAMBIAR CANTIDAD ───────────────────────────────────────
function cambiarCantidad(id, delta) {
    const carrito = obtenerCarrito();
    const item    = carrito.find(p => p.id === id);
    if (!item) return;

    item.cantidad += delta;
    if (item.cantidad <= 0) {
        guardarCarrito(carrito.filter(p => p.id !== id));
    } else {
        guardarCarrito(carrito);
    }
    actualizarBadge();
    renderCarritoPanel();
}


// ── BADGE DEL HEADER ───────────────────────────────────────
function actualizarBadge() {
    const carrito = obtenerCarrito();
    const total   = carrito.reduce((sum, p) => sum + p.cantidad, 0);
    document.querySelectorAll(".cart-badge").forEach(el => {
        el.textContent = total;
        el.style.display = total > 0 ? "flex" : "none";
    });
}


// ── FEEDBACK VISUAL AL AGREGAR ─────────────────────────────
function mostrarFeedback() {
    let fb = document.getElementById("carritoFeedback");
    if (!fb) {
        fb = document.createElement("div");
        fb.id = "carritoFeedback";
        fb.className = "carrito-feedback";
        fb.innerHTML = '<i class="fa-solid fa-check"></i> Producto añadido';
        document.body.appendChild(fb);
    }
    fb.classList.add("carrito-feedback-visible");
    clearTimeout(fb._timer);
    fb._timer = setTimeout(() => fb.classList.remove("carrito-feedback-visible"), 2000);
}


// ── RENDER PANEL CARRITO ───────────────────────────────────
function renderCarritoPanel() {
    const panel   = document.getElementById("carritoPanel");
    const lista   = document.getElementById("carritoLista");
    const subEl   = document.getElementById("carritoSubtotal");
    const totalEl = document.getElementById("carritoTotal");
    if (!panel || !lista) return;

    const carrito = obtenerCarrito();

    if (carrito.length === 0) {
        lista.innerHTML = `
            <div class="carrito-vacio">
                <i class="fa-solid fa-cart-shopping"></i>
                <p>Tu carrito está vacío</p>
            </div>
        `;
        if (subEl)   subEl.textContent   = "S/ 0.00";
        if (totalEl) totalEl.textContent = "S/ 0.00";
        return;
    }

    lista.innerHTML = "";

    carrito.forEach(function(item) {
        const div = document.createElement("div");
        div.className = "carrito-item";
        div.innerHTML = `
            <img class="carrito-item-img" src="${item.imagen}" alt="${item.nombre}" onerror="this.src='assets/img/LOGO 1.png'">
            <div class="carrito-item-info">
                <p class="carrito-item-nombre">${item.nombre}</p>
                <p class="carrito-item-precio">S/ ${item.precio.toFixed(2)}</p>
                <div class="carrito-item-qty">
                    <button class="qty-btn" onclick="cambiarCantidad(${item.id}, -1)">−</button>
                    <span class="qty-num">${item.cantidad}</span>
                    <button class="qty-btn" onclick="cambiarCantidad(${item.id}, 1)">+</button>
                </div>
            </div>
            <button class="carrito-item-del" onclick="eliminarDelCarrito(${item.id})" title="Eliminar">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;
        lista.appendChild(div);
    });

    const subtotal = carrito.reduce((sum, p) => sum + p.precio * p.cantidad, 0);
    if (subEl)   subEl.textContent   = `S/ ${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `S/ ${subtotal.toFixed(2)}`;
}


// ── ABRIR / CERRAR PANEL ───────────────────────────────────
function abrirCarrito() {
    renderCarritoPanel();
    document.getElementById("carritoPanel").classList.add("carrito-open");
    document.getElementById("carritoOverlay").classList.add("carrito-overlay-visible");
    document.body.style.overflow = "hidden";
}

function cerrarCarrito() {
    document.getElementById("carritoPanel").classList.remove("carrito-open");
    document.getElementById("carritoOverlay").classList.remove("carrito-overlay-visible");
    document.body.style.overflow = "";
}


// ── INIT ───────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {

    // Badge inicial
    actualizarBadge();

    // Si no hay nada local, intentar restaurar desde la BD
    restaurarCarritoDesdeAPI();

    // Abrir carrito al clic en el ícono del header
    document.querySelectorAll(".cart-button").forEach(btn => {
        btn.addEventListener("click", function(e) {
            e.preventDefault();
            abrirCarrito();
        });
    });

    // Cerrar
    const overlay = document.getElementById("carritoOverlay");
    const btnCerrar = document.getElementById("carritoClose");
    if (overlay)   overlay.addEventListener("click", cerrarCarrito);
    if (btnCerrar) btnCerrar.addEventListener("click", cerrarCarrito);
    document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarCarrito(); });

    // Delegación de eventos para botones "Añadir al carrito" / "btn-cart"
    // Funciona en index.html (productos destacados) y en productos.html
    document.addEventListener("click", function(e) {
        const btn = e.target.closest(".btn-cart, .prod-btn-carrito");
        if (!btn) return;

        const id     = parseInt(btn.dataset.id);
        const card   = btn.closest(".product-card, .prod-card");
        if (!card) return;

        const nombre = card.querySelector(".product-name, .prod-nombre")?.textContent.trim() || "Producto";
        const precioText = card.querySelector(".product-price, .prod-precio")?.textContent.replace("S/. ","").replace(",",".") || "0";
        const precio = parseFloat(precioText);
        const imagen = card.querySelector("img")?.src || "";

        agregarAlCarrito(id, nombre, precio, imagen);
    });
});
