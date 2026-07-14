// ============================================================
//  PRODUCTOS-LISTA.JS — Catálogo completo con categorías
//  Ahora consume la API del backend (/api/productos), por lo
//  que los IDs, SKUs, precios e imágenes salen de tu BD real.
//
//  Red de seguridad: si la API no responde (server apagado o
//  SQL caído), usa el listado local de respaldo para que el
//  catálogo nunca se vea vacío.
// ============================================================


// ── RESPALDO LOCAL (se usa SOLO si la API no responde) ─────
const PRODUCTOS_FALLBACK = [

    // ── HERRAMIENTAS MANUALES ─────────────────────────────
    { id: 1,  categoria: "manuales", nombre: "Extension Flexible para Destornillador 300MM Wiseup",       precio: 8.00,   imagen: "../img herramientas/Rectangle 32.png" },
    { id: 2,  categoria: "manuales", nombre: "Mini Martillo Tubular Antideslizante 250G 80OZ Wiseup",      precio: 15.00,  imagen: "../img herramientas/Rectangle 33.png" },
    { id: 3,  categoria: "manuales", nombre: "Hoja de Sierra Bimetalica 12\" 18101 Truper",                precio: 3.50,   imagen: "../img herramientas/Rectangle 34.png" },
    { id: 4,  categoria: "manuales", nombre: "Disco de Corte p/ Madera 7-1/4\" 24T 18300 Truper",         precio: 25.00,  imagen: "../img herramientas/Rectangle 35.png" },
    { id: 5,  categoria: "manuales", nombre: "Careta Automatica para Soldar RWH9111001 Rankor",            precio: 100.00, imagen: "../img herramientas/Rectangle 36.png" },
    { id: 6,  categoria: "manuales", nombre: "Cortador de Ceramicos 600MM RTC60001 Rankor",                precio: 130.00, imagen: "../img herramientas/Rectangle 37.png" },
    { id: 7,  categoria: "manuales", nombre: "Alicate de Corte Diagonal Dielectrico Wiseup",               precio: 15.00,  imagen: "../img herramientas/Rectangle 38.png" },
    { id: 8,  categoria: "manuales", nombre: "Juego 3 Pzas Cepillos de Alambre 10652 Truper",              precio: 20.00,  imagen: "../img herramientas/Rectangle 39.png" },
    { id: 9,  categoria: "manuales", nombre: "Broca Metal 4MM 14132 Truper",                               precio: 10.00,  imagen: "../img herramientas/Rectangle 17.png" },
    { id: 10, categoria: "manuales", nombre: "Pala (Lampa) Cuchara - 10000 Truper",                        precio: 50.00,  imagen: "../img herramientas/Rectangle 41.png" },
    { id: 11, categoria: "manuales", nombre: "Set de Soporte Magnetico para Soldadura de 7 Piezas",        precio: 70.00,  imagen: "../img herramientas/Rectangle 42.png" },
    { id: 12, categoria: "manuales", nombre: "Mazo Fibra de Vidrio 2LB Truper",                            precio: 35.00,  imagen: "../img herramientas/Rectangle 43.png" },

    // ── HERRAMIENTAS ELÉCTRICAS ───────────────────────────
    { id: 13, categoria: "electricas", nombre: "Lijadora Orbital 1/4 Hoja Profesional 220W 220V 103338 Truper",       precio: 120.00,  imagen: "../img herramientas/Rectangle 17 (1).png" },
    { id: 14, categoria: "electricas", nombre: "Bomba Centrifuga 750W 1HP 32M 120L/MIN 220VAC RCP75001 Rankor",       precio: 350.00,  imagen: "../img herramientas/Rectangle 19.png" },
    { id: 15, categoria: "electricas", nombre: "Bomba Periferica 370W 0.5HP 36M 34L/MIN 220VAC RPP37001 Rankor",      precio: 170.00,  imagen: "../img herramientas/Rectangle 19 (1).png" },
    { id: 16, categoria: "electricas", nombre: "Bomba Sumergible 1.5HP 1100W 415L/MIN 12M 220VAC RSSP110001 Rankor",  precio: 600.00,  imagen: "../img herramientas/Rectangle 20.png" },
    { id: 17, categoria: "electricas", nombre: "Compresora 2.5HP 50L 24.5KG 220VAC RAC15005001 Rankor",               precio: 380.00,  imagen: "../img herramientas/Rectangle 25.png" },
    { id: 18, categoria: "electricas", nombre: "Lijadora de Palma 260W 110X100MM 14500MIN RPS26001 Rankor",            precio: 180.00,  imagen: "../img herramientas/Rectangle 26.png" },
    { id: 19, categoria: "electricas", nombre: "Taladro Magnetico 1600W RMD160001 Rankor",                             precio: 1600.00, imagen: "../img herramientas/Rectangle 27.png" },
    { id: 20, categoria: "electricas", nombre: "Pulidora Angular 1400W 3500RPM 220VAC RAP140001 Rankor",               precio: 230.00,  imagen: "../img herramientas/Rectangle 17.png" },
    { id: 21, categoria: "electricas", nombre: "Sierra Ingleteadora Fija 1800W 10\" 220VAC RMS180001 Rankor",          precio: 550.00,  imagen: "../img herramientas/Rectangle 25 (1).png" },
    { id: 22, categoria: "electricas", nombre: "Pistola de Calor 1800W GHG180 Bosch",                                  precio: 150.00,  imagen: "../img herramientas/Rectangle 27 (1).png" },
    { id: 23, categoria: "electricas", nombre: "EMDL0851 Taladro Percutor 850W 13MM",                                  precio: 150.00,  imagen: "../img herramientas/Rectangle 28 (1).png" },
    { id: 24, categoria: "electricas", nombre: "EDBRM1501 Demoledor 1500W SDS Max",                                    precio: 250.00,  imagen: "../img herramientas/Rectangle 28.png" },

    // ── HERRAMIENTAS INALÁMBRICAS ─────────────────────────
    { id: 25, categoria: "inalambricas", nombre: "Rotomartillo 20V 2.5J SDS Plus 2BAT Rankor",                            precio: 450.00, imagen: "../img herramientas/Rectangle 18.png" },
    { id: 26, categoria: "inalambricas", nombre: "Lampara 20V 1BAT 2AH 800/1400/2000LM 500MT RLWL2001 Rankor",            precio: 250.00, imagen: "../img herramientas/Rectangle 18 (1).png" },
    { id: 27, categoria: "inalambricas", nombre: "Llave de Impacto 1500NM 3/4\" 2BAT 5AH 20V RLIW20203 Rankor",           precio: 870.00, imagen: "../img herramientas/Rectangle 19 (1).png" },
    { id: 28, categoria: "inalambricas", nombre: "Sierra Sable 20V 1BAT 4AH 2800RPM RLRS20003 Rankor",                    precio: 290.00, imagen: "../img herramientas/Rectangle 20 (1).png" },
    { id: 29, categoria: "inalambricas", nombre: "Cargador para Baterias de Litio 2AH-4AH 65W RLC20240001 Rankor",        precio: 50.00,  imagen: "../img herramientas/Rectangle 21.png" },
    { id: 30, categoria: "inalambricas", nombre: "Llave Ratchet 90NM 1BAT 2AH 20V RLR209001 Rankor",                     precio: 290.00, imagen: "../img herramientas/Rectangle 21 (1).png" },
    { id: 31, categoria: "inalambricas", nombre: "Sopladora Aspiradora 20V 2BAT 2AH RLAB2001 Rankor",                    precio: 220.00, imagen: "../img herramientas/Rectangle 22.png" },
    { id: 32, categoria: "inalambricas", nombre: "Pistola Pulverizadora 1BAT 2AH 20V 600ML/MIN RLSG2001 Rankor",         precio: 220.00, imagen: "../img herramientas/Rectangle 23.png" },
    { id: 33, categoria: "inalambricas", nombre: "Sierra Circular 5-1/2\" 20V 2BAT 4AH RLCS20002 Rankor",                precio: 390.00, imagen: "../img herramientas/Rectangle 24.png" },
    { id: 34, categoria: "inalambricas", nombre: "Ventosa de Vacio 4V 260KG 230MM RLVSC2001 Rankor",                     precio: 170.00, imagen: "../img herramientas/Rectangle 24 (1).png" },
    { id: 35, categoria: "inalambricas", nombre: "20V Conjunto de Herramientas Electricas Inalambricas Wosai",            precio: 450.00, imagen: "../img herramientas/Rectangle 27.png" },
    { id: 36, categoria: "inalambricas", nombre: "Aspiradora a Bateria VC 5-22",                                          precio: 250.00, imagen: "../img herramientas/Rectangle 25.png" }
];


// ── ESTADO ─────────────────────────────────────────────────
const PRODUCTOS_POR_PAGINA = 12;
let PRODUCTOS       = [];      // se llena desde la API (o fallback)
let paginaActual    = 1;
let categoriaActual = "todas";
let listaFiltrada   = [];


// ── MAPEO: producto de la API → formato interno ────────────
// La API devuelve: id_producto, sku, nombre, precio, imagen_url,
//                  destacado, categoria, categoria_slug, marca...
function mapProductoApi(p) {
    return {
        id:        p.id_producto,
        sku:       p.sku,
        categoria: p.categoria_slug,
        nombre:    p.nombre,
        precio:    Number(p.precio),
        imagen:    p.imagen_url || "../img/LOGO 1.png"
    };
}


// ── CARGA DESDE LA API (con respaldo local) ────────────────
async function cargarProductos() {
    try {
        const resp = await fetch("/api/productos");
        if (!resp.ok) throw new Error("HTTP " + resp.status);

        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error("La API no devolvió productos.");

        // Los productos con destacado=1 se muestran en el inicio;
        // el catálogo muestra el resto (igual que antes: 36 productos).
        PRODUCTOS = data.filter(p => !p.destacado).map(mapProductoApi);
        console.log(`✅ Catálogo cargado desde la BD: ${PRODUCTOS.length} productos.`);
    } catch (err) {
        console.warn("⚠️ No se pudo cargar el catálogo desde la API, usando respaldo local:", err.message);
        PRODUCTOS = [...PRODUCTOS_FALLBACK];
    }
}


// ── FILTRAR POR CATEGORÍA ──────────────────────────────────
function filtrarPorCategoria(cat) {
    categoriaActual = cat;
    paginaActual = 1;

    listaFiltrada = cat === "todas"
        ? [...PRODUCTOS]
        : PRODUCTOS.filter(p => p.categoria === cat);

    // Resetear selector de orden
    const sel = document.getElementById("selectOrden");
    if (sel) sel.value = "default";

    // Actualizar breadcrumb
    actualizarBreadcrumb(cat);

    // Actualizar botones activos del sidebar/nav
    document.querySelectorAll("[data-cat]").forEach(btn => {
        btn.classList.toggle("cat-activa", btn.dataset.cat === cat);
    });

    renderGrid();
}


// ── BREADCRUMB DINÁMICO ────────────────────────────────────
const NOMBRES_CAT = {
    "todas":        "Todos los productos",
    "manuales":     "Herramientas Manuales",
    "electricas":   "Herramientas Eléctricas",
    "inalambricas": "Herramientas Inalámbricas"
};

function actualizarBreadcrumb(cat) {
    const el = document.getElementById("breadcrumbCat");
    if (el) el.textContent = NOMBRES_CAT[cat] || "Productos";
}


// ── ORDENAMIENTO ───────────────────────────────────────────
function aplicarOrden(valor) {
    switch (valor) {
        case "precio-asc":  listaFiltrada.sort((a,b) => a.precio - b.precio); break;
        case "precio-desc": listaFiltrada.sort((a,b) => b.precio - a.precio); break;
        case "nombre-az":   listaFiltrada.sort((a,b) => a.nombre.localeCompare(b.nombre)); break;
        case "nombre-za":   listaFiltrada.sort((a,b) => b.nombre.localeCompare(a.nombre)); break;
        default:
            listaFiltrada = categoriaActual === "todas"
                ? [...PRODUCTOS]
                : PRODUCTOS.filter(p => p.categoria === categoriaActual);
    }
    paginaActual = 1;
    renderGrid();
}


// ── RENDER GRID ────────────────────────────────────────────
function renderGrid() {
    const grid = document.getElementById("productosGrid");
    if (!grid) return;

    const inicio = (paginaActual - 1) * PRODUCTOS_POR_PAGINA;
    const pagina = listaFiltrada.slice(inicio, inicio + PRODUCTOS_POR_PAGINA);

    grid.innerHTML = "";

    if (pagina.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:#888;grid-column:1/-1;padding:40px 0;">No hay productos en esta categoría.</p>';
        renderPaginacion();
        return;
    }

    pagina.forEach(function(p) {
        const card = document.createElement("div");
        card.classList.add("prod-card");
        card.innerHTML = `
            <div class="prod-img-wrap">
                <img src="${p.imagen}" alt="${p.nombre}" onerror="this.src='../img/LOGO 1.png'">
            </div>
            <div class="prod-info">
                <p class="prod-nombre">${p.nombre}</p>
                <p class="prod-precio">S/. ${p.precio.toFixed(2)}</p>
                <button class="prod-btn-carrito" data-id="${p.id}"${p.sku ? ` data-sku="${p.sku}"` : ""}>Añadir al carrito</button>
            </div>
        `;
        grid.appendChild(card);
    });

    renderPaginacion();
}


// ── RENDER PAGINACIÓN ──────────────────────────────────────
function renderPaginacion() {
    const total = Math.ceil(listaFiltrada.length / PRODUCTOS_POR_PAGINA);
    const texto = `Página ${paginaActual} de ${total || 1}`;

    ["paginaInfo", "paginaInfo2"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = texto;
    });

    ["btnPrev", "btnPrev2"].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = paginaActual === 1;
    });
    ["btnNext", "btnNext2"].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = paginaActual >= total;
    });
}


// ── EVENTOS ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async function () {

    // 1) Cargar productos (API o respaldo) ANTES de renderizar
    await cargarProductos();

    // Selector de orden
    const selector = document.getElementById("selectOrden");
    if (selector) selector.addEventListener("change", () => aplicarOrden(selector.value));

    // Botones paginación
    document.getElementById("btnPrev")  ?.addEventListener("click", () => { if (paginaActual > 1) { paginaActual--; renderGrid(); window.scrollTo(0,0); } });
    document.getElementById("btnNext")  ?.addEventListener("click", () => { const t = Math.ceil(listaFiltrada.length/PRODUCTOS_POR_PAGINA); if (paginaActual < t) { paginaActual++; renderGrid(); window.scrollTo(0,0); } });
    document.getElementById("btnPrev2") ?.addEventListener("click", () => document.getElementById("btnPrev").click());
    document.getElementById("btnNext2") ?.addEventListener("click", () => document.getElementById("btnNext").click());

    // Botones de categoría (sidebar y nav)
    document.querySelectorAll("[data-cat]").forEach(btn => {
        btn.addEventListener("click", function(e) {
            e.preventDefault();
            filtrarPorCategoria(this.dataset.cat);
            // Cerrar sidebar si está abierto
            const sidebar = document.getElementById("sidebar");
            const overlay = document.getElementById("sidebarOverlay");
            if (sidebar) sidebar.classList.remove("sidebar-open");
            if (overlay) overlay.classList.remove("overlay-visible");
            document.body.style.overflow = "";
            window.scrollTo(0,0);
        });
    });

    // Leer categoría de la URL al cargar (?cat=electricas)
    const params = new URLSearchParams(window.location.search);
    const catUrl = params.get("cat");
    if (catUrl && ["manuales","electricas","inalambricas"].includes(catUrl)) {
        filtrarPorCategoria(catUrl);
    } else {
        filtrarPorCategoria("todas");
    }
});
