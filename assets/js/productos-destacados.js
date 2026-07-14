// ============================================================
//  PRODUCTOS DESTACADOS — Index principal
//  Ahora consume la API del backend (/api/productos?destacado=1),
//  por lo que los IDs, precios e imágenes salen de tu BD real.
//
//  Red de seguridad: si abres el HTML SIN el servidor Node
//  encendido (o SQL Server caído), usa el listado local de
//  respaldo para que el inicio nunca se vea vacío.
// ============================================================


// ── RESPALDO LOCAL (se usa SOLO si la API no responde) ─────
const PRODUCTOS_DESTACADOS_FALLBACK = [
    { id: 1, nombre: "Martillo A1-T1",        precio: 18.00, imagen: "assets/img/martillo 2.png",      alt: "Martillo A1-T1" },
    { id: 2, nombre: "Destornillador Rba-31",  precio: 10.00, imagen: "assets/img/martillo 2 (1).png",  alt: "Destornillador Rba-31" },
    { id: 3, nombre: "Martillo A1-T1",         precio: 18.00, imagen: "assets/img/martillo 2 (2).png",  alt: "Martillo A1-T1" },
    { id: 4, nombre: "Set Herramientas",       precio: 18.00, imagen: "assets/img/martillo 2 (3).png",  alt: "Set Herramientas" },
    { id: 5, nombre: "Juego de Llaves",        precio: 18.00, imagen: "assets/img/martillo 2 (4).png",  alt: "Juego de Llaves" },
    { id: 6, nombre: "Llave Ajustable",        precio: 18.00, imagen: "assets/img/martillo 2 (5).png",  alt: "Llave Ajustable" },
    { id: 7, nombre: "Rodillo de Pintura",     precio: 18.00, imagen: "assets/img/martillo 2 (6).png",  alt: "Rodillo de Pintura" },
    { id: 8, nombre: "Taladro Inalámbrico",    precio: 18.00, imagen: "assets/img/martillo 2 (7).png",  alt: "Taladro Inalámbrico" }
];


// ── RENDER (misma estructura y clases de siempre) ──────────
function renderProductos(productos) {
    const grid = document.getElementById("productsGrid");
    if (!grid) { console.error("No se encontró #productsGrid"); return; }

    grid.innerHTML = "";

    productos.forEach(function(p) {
        const card = document.createElement("div");
        card.classList.add("product-card");
        card.innerHTML = `
            <div class="product-img-wrap">
                <img src="${p.imagen}" alt="${p.alt || p.nombre}" onerror="this.src='assets/img/LOGO 1.png'">
            </div>
            <div class="product-info">
                <p class="product-name">${p.nombre}</p>
                <div class="product-footer">
                    <span class="product-price">S/. ${Number(p.precio).toFixed(2).replace(".", ",")}</span>
                    <button class="btn-cart" data-id="${p.id}">
                        <i class="fa-solid fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}


// ── MAPEO: producto de la API → formato que usa renderProductos() ──
// La API devuelve: id_producto, sku, nombre, precio, imagen_url, destacado, categoria...
function mapProductoApi(p) {
    return {
        id:     p.id_producto,
        nombre: p.nombre,
        precio: p.precio,
        imagen: p.imagen_url || "assets/img/LOGO 1.png",
        alt:    p.nombre
    };
}


// ── CARGA DESDE LA API (con respaldo local) ────────────────
async function cargarDestacados() {
    try {
        // Ruta relativa: funciona cuando la página la sirve el propio
        // servidor Node (http://localhost:3000). Si la sirve otra cosa
        // (Live Server, file://) y no hay backend, saltará al catch.
        const resp = await fetch("/api/productos?destacado=1");
        if (!resp.ok) throw new Error("HTTP " + resp.status);

        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error("La API no devolvió productos.");

        renderProductos(data.map(mapProductoApi));
        console.log(`✅ Destacados cargados desde la BD: ${data.length} productos.`);
    } catch (err) {
        console.warn("⚠️ No se pudo cargar destacados desde la API, usando respaldo local:", err.message);
        renderProductos(PRODUCTOS_DESTACADOS_FALLBACK);
    }
}


// El script carga al final del <body>, el DOM ya existe → llamada directa
cargarDestacados();
