// ============================================================
//  SERVER.JS — Estructuras & Diseños Group
//  Node.js + Express + SQL Server (mssql)
//  Separado por rutas: usuarios, productos, carrito,
//                      pedidos, contacto, ofertas, sesiones
// ============================================================

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const sql     = require('mssql');
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const path    = require('path');

const app  = express();
const PORT = Number(process.env.PORT || 3000);
app.disable('x-powered-by');

// ── CONFIG BD ───────────────────────────────────────────────
const dbConfig = {
    server:   process.env.DB_SERVER   || 'localhost',
    database: process.env.DB_NAME     || 'FerreteriaDB_Proyecto',
    user:     process.env.DB_USER     || '',
    password: process.env.DB_PASSWORD || '',
    options: {
        trustServerCertificate: true,
        encrypt: false
    },
    pool: {
        max: 10, min: 0, idleTimeoutMillis: 30000
    }
};

let pool;
async function getPool() {
    if (!pool) pool = await sql.connect(dbConfig);
    return pool;
}

// ── MIDDLEWARES ─────────────────────────────────────────────
const allowedOrigins = String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors(allowedOrigins.length ? {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origen no permitido por CORS.'));
    }
} : undefined));
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname)));   // sirve index.html y assets


// ============================================================
//  UTILIDADES
// ============================================================

// Generar código de pedido: EDG-YYYYMMDD-00001
async function generarCodigoPedido(db) {
    const hoy = new Date();
    const fecha = hoy.toISOString().slice(0,10).replace(/-/g,'');
    const r = await db.request()
        .input('hoy', sql.Date, hoy)
        .query(`SELECT COUNT(*)+1 AS n FROM Pedidos
                WHERE CAST(fecha_pedido AS DATE) = CAST(@hoy AS DATE)`);
    const n = r.recordset[0].n;
    return `EDG-${fecha}-${String(n).padStart(5,'0')}`;
}

// Normalizar rutas de imagen
function normalizarImagen(img) {
    if (!img) return '/assets/img/LOGO 1.png';
    let r = String(img).replace(/\\/g,'/').trim();
    if (/^(https?:|data:|blob:)/i.test(r)) return r;
    r = r.replace(/^\.\.\//,'assets/');
    r = r.replace(/^\.\//,'');
    if (!r.startsWith('/')) r = '/' + r;
    return r;
}

// Verificar token de sesión activa
async function verificarSesion(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ','');
    if (!token) return res.status(401).json({ error: 'Sin autorización.' });
    try {
        const db = await getPool();
        const r  = await db.request()
            .input('token', sql.NVarChar(255), token)
            .query(`SELECT s.id_usuario, u.rol, u.nombre, u.apellido
                    FROM Sesiones s
                    JOIN Usuarios u ON u.id_usuario = s.id_usuario
                    WHERE s.token = @token
                      AND s.activo = 1
                      AND s.fecha_expira > SYSDATETIME()`);
        if (!r.recordset.length) return res.status(401).json({ error: 'Sesión expirada.' });
        req.usuario = r.recordset[0];
        next();
    } catch(e) { res.status(500).json({ error: 'Error verificando sesión.', detail: e.message }); }
}

// Solo admin
function soloAdmin(req, res, next) {
    if (req.usuario?.rol !== 'admin')
        return res.status(403).json({ error: 'Acceso solo para administradores.' });
    next();
}


// ============================================================
//  HEALTH CHECK
// ============================================================
app.get('/api/health', async (req, res) => {
    try {
        await getPool();
        res.json({ ok: true, database: dbConfig.database });
    } catch(e) { res.status(500).json({ ok: false, error: e.message }); }
});


// ============================================================
//  USUARIOS — registro y login
// ============================================================

// POST /api/usuarios/registro
app.post('/api/usuarios/registro', async (req, res) => {
    try {
        const { dni, nombre, apellido, email, password, telefono, direccion } = req.body;

        if (!dni || !nombre || !apellido || !email || !password)
            return res.status(400).json({ error: 'Faltan campos obligatorios (dni, nombre, apellido, email, password).' });

        if (!/^\d{8}$/.test(dni))
            return res.status(400).json({ error: 'El DNI debe tener exactamente 8 dígitos.' });

        if (password.length < 6)
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

        const db    = await getPool();
        const exist = await db.request()
            .input('dni',   sql.Char(8),        dni)
            .input('email', sql.NVarChar(150),  email)
            .query(`SELECT id_usuario FROM Usuarios
                    WHERE dni=@dni OR email=@email`);

        if (exist.recordset.length)
            return res.status(409).json({ error: 'Ya existe una cuenta con ese DNI o email.' });

        const hash = await bcrypt.hash(password, 10);
        const r    = await db.request()
            .input('dni',      sql.Char(8),        dni)
            .input('nombre',   sql.NVarChar(100),  nombre)
            .input('apellido', sql.NVarChar(100),  apellido)
            .input('email',    sql.NVarChar(150),  email)
            .input('hash',     sql.NVarChar(255),  hash)
            .input('tel',      sql.NVarChar(20),   telefono  || null)
            .input('dir',      sql.NVarChar(200),  direccion || null)
            .query(`INSERT INTO Usuarios
                        (dni,nombre,apellido,email,password_hash,telefono,direccion,rol)
                    OUTPUT INSERTED.id_usuario, INSERTED.nombre,
                           INSERTED.apellido,   INSERTED.email,
                           INSERTED.rol
                    VALUES (@dni,@nombre,@apellido,@email,@hash,@tel,@dir,'cliente')`);

        res.status(201).json({ usuario: r.recordset[0] });

    } catch(e) { res.status(500).json({ error: 'Error al registrar.', detail: e.message }); }
});


// POST /api/usuarios/login
app.post('/api/usuarios/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });

        const db = await getPool();
        const r  = await db.request()
            .input('email', sql.NVarChar(150), email)
            .query('SELECT * FROM Usuarios WHERE email=@email AND activo=1');

        if (!r.recordset.length)
            return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

        const u  = r.recordset[0];
        const ok = await bcrypt.compare(password, u.password_hash);
        if (!ok) return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

        // Crear sesión (expira en 8 horas)
        const token   = crypto.randomBytes(48).toString('hex');
        const expira  = new Date(Date.now() + 8 * 60 * 60 * 1000);
        await db.request()
            .input('idU',    sql.Int,          u.id_usuario)
            .input('token',  sql.NVarChar(255), token)
            .input('expira', sql.DateTime2,     expira)
            .query('INSERT INTO Sesiones(id_usuario,token,fecha_expira) VALUES(@idU,@token,@expira)');

        res.json({
            token,
            usuario: {
                id_usuario: u.id_usuario,
                nombre:     u.nombre,
                apellido:   u.apellido,
                email:      u.email,
                rol:        u.rol
            }
        });
    } catch(e) { res.status(500).json({ error: 'Error al iniciar sesión.', detail: e.message }); }
});


// POST /api/usuarios/logout
app.post('/api/usuarios/logout', verificarSesion, async (req, res) => {
    try {
        const token = req.headers['authorization']?.replace('Bearer ','');
        const db    = await getPool();
        await db.request()
            .input('token', sql.NVarChar(255), token)
            .query('UPDATE Sesiones SET activo=0 WHERE token=@token');
        res.json({ ok: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});


// GET /api/usuarios/me  — datos del usuario logueado
app.get('/api/usuarios/me', verificarSesion, (req, res) => {
    res.json({ usuario: req.usuario });
});


// ============================================================
//  PRODUCTOS
// ============================================================

// GET /api/productos?categoria=manuales&destacado=1
app.get('/api/productos', async (req, res) => {
    try {
        const db        = await getPool();
        const { categoria, destacado } = req.query;

        let where = 'WHERE p.activo = 1';
        const request = db.request();

        if (categoria) {
            where += ' AND c.slug = @slug';
            request.input('slug', sql.NVarChar(80), categoria);
        }
        if (destacado === '1') {
            where += ' AND p.destacado = 1';
        }

        const r = await request.query(`
            SELECT
                p.id_producto, p.sku, p.nombre, p.descripcion,
                CAST(p.precio AS FLOAT)        AS precio,
                CAST(p.precio_oferta AS FLOAT) AS precio_oferta,
                p.stock, p.imagen_url, p.destacado,
                c.nombre  AS categoria,
                c.slug    AS categoria_slug,
                m.nombre  AS marca
            FROM Productos p
            JOIN Categorias c ON c.id_categoria = p.id_categoria
            LEFT JOIN Marcas m ON m.id_marca = p.id_marca
            ${where}
            ORDER BY p.destacado DESC, p.nombre
        `);

        const productos = r.recordset.map(p => ({
            ...p,
            imagen_url: normalizarImagen(p.imagen_url)
        }));

        res.json(productos);
    } catch(e) { res.status(500).json({ error: e.message }); }
});


// GET /api/productos/:sku  — un producto por SKU
app.get('/api/productos/:sku', async (req, res) => {
    try {
        const db = await getPool();
        const r  = await db.request()
            .input('sku', sql.NVarChar(20), req.params.sku)
            .query(`SELECT p.*,c.nombre AS categoria,c.slug,m.nombre AS marca
                    FROM Productos p
                    JOIN Categorias c ON c.id_categoria=p.id_categoria
                    LEFT JOIN Marcas m ON m.id_marca=p.id_marca
                    WHERE p.sku=@sku AND p.activo=1`);
        if (!r.recordset.length) return res.status(404).json({ error: 'Producto no encontrado.' });
        res.json({ ...r.recordset[0], imagen_url: normalizarImagen(r.recordset[0].imagen_url) });
    } catch(e) { res.status(500).json({ error: e.message }); }
});


// POST /api/productos  — crear/editar (solo admin)
app.post('/api/productos', verificarSesion, soloAdmin, async (req, res) => {
    try {
        const { sku,nombre,descripcion,precio,precio_oferta,stock,
                id_categoria,id_marca,imagen_url,destacado } = req.body;

        if (!sku || !nombre || precio == null || !id_categoria)
            return res.status(400).json({ error: 'Faltan campos: sku, nombre, precio, id_categoria.' });

        const db = await getPool();
        await db.request()
            .input('sku',    sql.NVarChar(20),   sku)
            .input('nombre', sql.NVarChar(200),  nombre)
            .input('desc',   sql.NVarChar(sql.MAX), descripcion||null)
            .input('precio', sql.Decimal(10,2),  precio)
            .input('oferta', sql.Decimal(10,2),  precio_oferta||null)
            .input('stock',  sql.Int,             stock||0)
            .input('cat',    sql.Int,             id_categoria)
            .input('marca',  sql.Int,             id_marca||null)
            .input('img',    sql.NVarChar(200),   imagen_url||null)
            .input('dest',   sql.Bit,             destacado?1:0)
            .query(`
                IF EXISTS (SELECT 1 FROM Productos WHERE sku=@sku)
                    UPDATE Productos SET nombre=@nombre,descripcion=@desc,precio=@precio,
                        precio_oferta=@oferta,stock=@stock,id_categoria=@cat,id_marca=@marca,
                        imagen_url=@img,destacado=@dest
                    WHERE sku=@sku
                ELSE
                    INSERT INTO Productos
                        (sku,nombre,descripcion,precio,precio_oferta,stock,
                         id_categoria,id_marca,imagen_url,destacado)
                    VALUES (@sku,@nombre,@desc,@precio,@oferta,@stock,
                            @cat,@marca,@img,@dest)
            `);

        res.status(201).json({ ok: true, sku });
    } catch(e) { res.status(500).json({ error: e.message }); }
});


// ============================================================
//  OFERTAS
// ============================================================

// GET /api/ofertas  — ofertas vigentes hoy (para el sidebar)
app.get('/api/ofertas', async (req, res) => {
    try {
        const db = await getPool();
        const r  = await db.request().query('SELECT * FROM v_ofertas_hoy');
        const data = r.recordset.map(o => ({
            ...o, imagen_url: normalizarImagen(o.imagen_url)
        }));
        res.json(data);
    } catch(e) { res.status(500).json({ error: e.message }); }
});


// ============================================================
//  CARRITO
// ============================================================

// POST /api/carrito  — guardar/actualizar carrito completo
app.post('/api/carrito', async (req, res) => {
    const transaction = new sql.Transaction(await getPool());
    try {
        const { sessionId, usuarioId, items } = req.body;
        if (!sessionId) return res.status(400).json({ error: 'Falta sessionId.' });

        await transaction.begin();

        // Buscar carrito existente
        let carritoId;
        const existe = await new sql.Request(transaction)
            .input('sid', sql.NVarChar(120), sessionId)
            .query('SELECT TOP 1 id_carrito FROM Carritos WHERE session_id=@sid ORDER BY id_carrito DESC');

        if (existe.recordset.length) {
            carritoId = existe.recordset[0].id_carrito;
            await new sql.Request(transaction)
                .input('cid', sql.Int, carritoId)
                .query(`DELETE FROM CarritoDetalle WHERE id_carrito=@cid;
                        UPDATE Carritos SET fecha_actualizacion=SYSDATETIME() WHERE id_carrito=@cid`);
        } else {
            const c = await new sql.Request(transaction)
                .input('sid', sql.NVarChar(120), sessionId)
                .input('uid', sql.Int,            usuarioId||null)
                .query('INSERT INTO Carritos(session_id,id_usuario) OUTPUT INSERTED.id_carrito VALUES(@sid,@uid)');
            carritoId = c.recordset[0].id_carrito;
        }

        for (const item of (items||[])) {
            // Traer SKU del producto si tiene id
            let sku = item.sku || '';
            if (!sku && item.id) {
                const p = await new sql.Request(transaction)
                    .input('pid', sql.Int, item.id)
                    .query('SELECT sku FROM Productos WHERE id_producto=@pid');
                if (p.recordset.length) sku = p.recordset[0].sku;
            }

            await new sql.Request(transaction)
                .input('cid',    sql.Int,           carritoId)
                .input('pid',    sql.Int,            item.id||null)
                .input('sku',    sql.NVarChar(20),   sku)
                .input('nombre', sql.NVarChar(200),  item.nombre)
                .input('precio', sql.Decimal(10,2),  item.precio)
                .input('img',    sql.NVarChar(200),  item.imagen||null)
                .input('cant',   sql.Int,            item.cantidad||1)
                .query(`INSERT INTO CarritoDetalle
                            (id_carrito,id_producto,sku_producto,nombre_producto,
                             precio_unitario,imagen_url,cantidad)
                        VALUES (@cid,@pid,@sku,@nombre,@precio,@img,@cant)`);
        }

        await transaction.commit();
        res.json({ ok: true, carritoId });

    } catch(e) {
        await transaction.rollback().catch(()=>{});
        res.status(500).json({ error: 'Error al guardar carrito.', detail: e.message });
    }
});


// GET /api/carrito/:sessionId
app.get('/api/carrito/:sessionId', async (req, res) => {
    try {
        const db = await getPool();
        const r  = await db.request()
            .input('sid', sql.NVarChar(120), req.params.sessionId)
            .query(`SELECT cd.*
                    FROM CarritoDetalle cd
                    JOIN Carritos c ON c.id_carrito=cd.id_carrito
                    WHERE c.session_id=@sid
                    ORDER BY cd.id_detalle`);
        res.json(r.recordset.map(i => ({ ...i, imagen_url: normalizarImagen(i.imagen_url) })));
    } catch(e) { res.status(500).json({ error: e.message }); }
});


// ============================================================
//  PEDIDOS
// ============================================================

// POST /api/pedidos  — registrar pedido y limpiar carrito
app.post('/api/pedidos', async (req, res) => {
    const transaction = new sql.Transaction(await getPool());
    try {
        const { sessionId, usuarioId, tipo, nombre, email,
                telefono, direccion, notas, carrito } = req.body;

        if (!nombre || !tipo || !Array.isArray(carrito) || !carrito.length)
            return res.status(400).json({ error: 'Pedido incompleto o carrito vacío.' });

        const subtotal = carrito.reduce((s,p) => s + Number(p.precio)*Number(p.cantidad), 0);
        const envio    = subtotal >= 99 ? 0 : 10;
        const total    = subtotal + envio;

        await transaction.begin();

        const db2   = await getPool();
        const codigo = await generarCodigoPedido(db2);

        const pedido = await new sql.Request(transaction)
            .input('codigo',     sql.NVarChar(20),  codigo)
            .input('uid',        sql.Int,            usuarioId||null)
            .input('nombre',     sql.NVarChar(120),  nombre)
            .input('email',      sql.NVarChar(150),  email||null)
            .input('telefono',   sql.NVarChar(20),   telefono||null)
            .input('tipo',       sql.NVarChar(20),   tipo)
            .input('subtotal',   sql.Decimal(10,2),  subtotal)
            .input('envio',      sql.Decimal(10,2),  envio)
            .input('total',      sql.Decimal(10,2),  total)
            .input('direccion',  sql.NVarChar(200),  direccion||null)
            .input('notas',      sql.NVarChar(sql.MAX), notas||null)
            .query(`INSERT INTO Pedidos
                        (codigo_pedido,id_usuario,cliente_nombre,cliente_email,
                         cliente_telefono,metodo_pago,subtotal,envio,total,
                         direccion_entrega,notas)
                    OUTPUT INSERTED.id_pedido
                    VALUES (@codigo,@uid,@nombre,@email,@telefono,@tipo,
                            @subtotal,@envio,@total,@direccion,@notas)`);

        const pedidoId = pedido.recordset[0].id_pedido;

        for (const item of carrito) {
            let sku = item.sku || '';
            if (!sku && item.id) {
                const p = await new sql.Request(transaction)
                    .input('pid', sql.Int, item.id)
                    .query('SELECT sku FROM Productos WHERE id_producto=@pid');
                if (p.recordset.length) sku = p.recordset[0].sku;
            }
            const sub = Number(item.precio) * Number(item.cantidad);
            await new sql.Request(transaction)
                .input('pid',    sql.Int,           pedidoId)
                .input('prid',   sql.Int,            item.id||null)
                .input('sku',    sql.NVarChar(20),   sku)
                .input('nombre', sql.NVarChar(200),  item.nombre)
                .input('precio', sql.Decimal(10,2),  item.precio)
                .input('cant',   sql.Int,            item.cantidad)
                .input('sub',    sql.Decimal(10,2),  sub)
                .query(`INSERT INTO PedidoDetalle
                            (id_pedido,id_producto,sku_producto,nombre_producto,
                             precio_unitario,cantidad,subtotal)
                        VALUES(@pid,@prid,@sku,@nombre,@precio,@cant,@sub)`);
        }

        // Limpiar carrito tras el pedido
        if (sessionId) {
            await new sql.Request(transaction)
                .input('sid', sql.NVarChar(120), sessionId)
                .query(`DELETE cd FROM CarritoDetalle cd
                        JOIN Carritos c ON c.id_carrito=cd.id_carrito
                        WHERE c.session_id=@sid`);
        }

        await transaction.commit();
        res.status(201).json({ ok: true, pedidoId, codigo_pedido: codigo, total });

    } catch(e) {
        await transaction.rollback().catch(()=>{});
        res.status(500).json({ error: 'Error al registrar pedido.', detail: e.message });
    }
});


// GET /api/pedidos  — todos (solo admin)
app.get('/api/pedidos', verificarSesion, soloAdmin, async (req, res) => {
    try {
        const db = await getPool();
        const r  = await db.request().query('SELECT * FROM v_pedidos_completo');
        res.json(r.recordset);
    } catch(e) { res.status(500).json({ error: e.message }); }
});


// GET /api/pedidos/:codigo  — detalle de un pedido
app.get('/api/pedidos/:codigo', verificarSesion, async (req, res) => {
    try {
        const db = await getPool();
        const r  = await db.request()
            .input('cod', sql.NVarChar(20), req.params.codigo)
            .query('SELECT * FROM v_detalle_pedido WHERE codigo_pedido=@cod');
        if (!r.recordset.length) return res.status(404).json({ error: 'Pedido no encontrado.' });
        res.json(r.recordset);
    } catch(e) { res.status(500).json({ error: e.message }); }
});


// PATCH /api/pedidos/:codigo/estado  — cambiar estado (solo admin)
app.patch('/api/pedidos/:codigo/estado', verificarSesion, soloAdmin, async (req, res) => {
    try {
        const { estado } = req.body;
        const estadosValidos = ['pendiente','confirmado','en_proceso','enviado','entregado','cancelado'];
        if (!estadosValidos.includes(estado))
            return res.status(400).json({ error: 'Estado no válido.' });

        const db = await getPool();
        await db.request()
            .input('cod',    sql.NVarChar(20), req.params.codigo)
            .input('estado', sql.NVarChar(20), estado)
            .query(`UPDATE Pedidos SET estado=@estado,
                    fecha_actualizacion=SYSDATETIME()
                    WHERE codigo_pedido=@cod`);
        res.json({ ok: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});


// ============================================================
//  CONTACTO
// ============================================================
app.post('/api/contacto', async (req, res) => {
    try {
        const { nombre, email, telefono, asunto, mensaje } = req.body;
        if (!nombre || !email || !asunto || !mensaje)
            return res.status(400).json({ error: 'Faltan campos obligatorios.' });

        const db = await getPool();
        const r  = await db.request()
            .input('nombre',   sql.NVarChar(100),      nombre)
            .input('email',    sql.NVarChar(150),       email)
            .input('telefono', sql.NVarChar(20),        telefono||null)
            .input('asunto',   sql.NVarChar(150),       asunto)
            .input('mensaje',  sql.NVarChar(sql.MAX),   mensaje)
            .query(`INSERT INTO MensajesContacto(nombre,email,telefono,asunto,mensaje)
                    OUTPUT INSERTED.id_mensaje
                    VALUES(@nombre,@email,@telefono,@asunto,@mensaje)`);

        res.status(201).json({ ok: true, id: r.recordset[0].id_mensaje });
    } catch(e) { res.status(500).json({ error: 'Error al guardar mensaje.', detail: e.message }); }
});

// GET /api/contacto  — mensajes pendientes (solo admin)
app.get('/api/contacto', verificarSesion, soloAdmin, async (req, res) => {
    try {
        const db = await getPool();
        const r  = await db.request().query('SELECT * FROM v_mensajes_pendientes');
        res.json(r.recordset);
    } catch(e) { res.status(500).json({ error: e.message }); }
});


// ============================================================
//  INICIO
// ============================================================
app.listen(PORT, () => {
    console.log(`\n✅ Servidor web listo: http://localhost:${PORT}`);
    console.log(`📦 Base de datos configurada: ${dbConfig.database}`);
    console.log(`\nEndpoints disponibles:`);
    console.log(`  GET  /api/health`);
    console.log(`  POST /api/usuarios/registro`);
    console.log(`  POST /api/usuarios/login`);
    console.log(`  GET  /api/productos?categoria=manuales&destacado=1`);
    console.log(`  GET  /api/ofertas`);
    console.log(`  POST /api/carrito`);
    console.log(`  POST /api/pedidos`);
    console.log(`  POST /api/contacto\n`);
});

// La interfaz permanece disponible aunque SQL Server todavía no esté iniciado.
getPool()
    .then(() => console.log(`✅ Conexión SQL Server activa: ${dbConfig.database}`))
    .catch(err => {
        console.warn(`⚠️  SQL Server no disponible: ${err.message}`);
        console.warn('La tienda visual y EDG IA seguirán funcionando. Revisa tu archivo .env para habilitar las API.\n');
    });
