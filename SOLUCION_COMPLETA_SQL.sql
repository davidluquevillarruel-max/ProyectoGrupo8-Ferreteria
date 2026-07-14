/*
================================================================
  ESTRUCTURAS & DISEÑOS GROUP — Base de datos completa
  SQL Server (compatible con SQL Server Management Studio
  y con el driver mssql de Node.js)
  
  INSTRUCCIONES:
  1. Abre SQL Server Management Studio o el Query Editor
  2. Conecta a tu servidor
  3. Ejecuta TODO este script de una vez
================================================================
*/

USE master;
GO

-- Crear base de datos si no existe
IF DB_ID('FerreteriaDB_Proyecto') IS NULL
    CREATE DATABASE FerreteriaDB_Proyecto;
GO

USE FerreteriaDB_Proyecto;
GO

-- ============================================================
-- LIMPIAR TABLAS EXISTENTES (orden inverso por FK)
-- ============================================================
IF OBJECT_ID('PedidoDetalle',    'U') IS NOT NULL DROP TABLE PedidoDetalle;
IF OBJECT_ID('Pedidos',          'U') IS NOT NULL DROP TABLE Pedidos;
IF OBJECT_ID('CarritoDetalle',   'U') IS NOT NULL DROP TABLE CarritoDetalle;
IF OBJECT_ID('Carritos',         'U') IS NOT NULL DROP TABLE Carritos;
IF OBJECT_ID('Ofertas',          'U') IS NOT NULL DROP TABLE Ofertas;
IF OBJECT_ID('Productos',        'U') IS NOT NULL DROP TABLE Productos;
IF OBJECT_ID('Categorias',       'U') IS NOT NULL DROP TABLE Categorias;
IF OBJECT_ID('Marcas',           'U') IS NOT NULL DROP TABLE Marcas;
IF OBJECT_ID('Sesiones',         'U') IS NOT NULL DROP TABLE Sesiones;
IF OBJECT_ID('MensajesContacto', 'U') IS NOT NULL DROP TABLE MensajesContacto;
IF OBJECT_ID('Usuarios',         'U') IS NOT NULL DROP TABLE Usuarios;
GO

-- ============================================================
-- 1. CATEGORIAS
-- ============================================================
CREATE TABLE Categorias (
    id_categoria  INT            IDENTITY(1,1) PRIMARY KEY,
    nombre        NVARCHAR(80)   NOT NULL,
    slug          NVARCHAR(80)   NOT NULL,       -- manuales / electricas / inalambricas
    icono         NVARCHAR(60)   NULL,
    orden         INT            NOT NULL DEFAULT 0,
    CONSTRAINT UQ_Cat_slug   UNIQUE (slug),
    CONSTRAINT UQ_Cat_nombre UNIQUE (nombre)
);
GO

-- ============================================================
-- 2. MARCAS
-- ============================================================
CREATE TABLE Marcas (
    id_marca  INT           IDENTITY(1,1) PRIMARY KEY,
    nombre    NVARCHAR(80)  NOT NULL,
    logo_url  NVARCHAR(200) NULL,
    activo    BIT           NOT NULL DEFAULT 1,
    CONSTRAINT UQ_Marca_nombre UNIQUE (nombre)
);
GO

-- ============================================================
-- 3. USUARIOS  — agente único por DNI
-- ============================================================
CREATE TABLE Usuarios (
    id_usuario      INT            IDENTITY(1,1) PRIMARY KEY,
    dni             CHAR(8)        NOT NULL,
    nombre          NVARCHAR(100)  NOT NULL,
    apellido        NVARCHAR(100)  NOT NULL,
    email           NVARCHAR(150)  NOT NULL,
    password_hash   NVARCHAR(255)  NOT NULL,
    telefono        NVARCHAR(20)   NULL,
    direccion       NVARCHAR(200)  NULL,
    rol             NVARCHAR(20)   NOT NULL DEFAULT 'cliente',   -- cliente | admin
    activo          BIT            NOT NULL DEFAULT 1,
    fecha_registro  DATETIME2      NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_Usuario_dni   UNIQUE (dni),
    CONSTRAINT UQ_Usuario_email UNIQUE (email),
    CONSTRAINT CK_Usuario_rol   CHECK  (rol IN ('cliente','admin'))
);
GO

-- ============================================================
-- 4. SESIONES  — tokens de login (reemplaza localStorage)
-- ============================================================
CREATE TABLE Sesiones (
    id_sesion     INT            IDENTITY(1,1) PRIMARY KEY,
    id_usuario    INT            NOT NULL,
    token         NVARCHAR(255)  NOT NULL,
    fecha_inicio  DATETIME2      NOT NULL DEFAULT SYSDATETIME(),
    fecha_expira  DATETIME2      NOT NULL,
    activo        BIT            NOT NULL DEFAULT 1,
    CONSTRAINT UQ_Sesion_token UNIQUE (token),
    CONSTRAINT FK_Sesion_Usuario FOREIGN KEY (id_usuario)
        REFERENCES Usuarios (id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE
);
GO

-- ============================================================
-- 5. PRODUCTOS  — agente único por SKU
-- ============================================================
CREATE TABLE Productos (
    id_producto    INT             IDENTITY(1,1) PRIMARY KEY,
    sku            NVARCHAR(20)    NOT NULL,
    nombre         NVARCHAR(200)   NOT NULL,
    descripcion    NVARCHAR(MAX)   NULL,
    precio         DECIMAL(10,2)   NOT NULL,
    precio_oferta  DECIMAL(10,2)   NULL,
    stock          INT             NOT NULL DEFAULT 0,
    id_categoria   INT             NOT NULL,
    id_marca       INT             NULL,
    imagen_url     NVARCHAR(200)   NULL,
    destacado      BIT             NOT NULL DEFAULT 0,
    activo         BIT             NOT NULL DEFAULT 1,
    fecha_creacion DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_Producto_sku UNIQUE (sku),
    CONSTRAINT FK_Prod_Categoria FOREIGN KEY (id_categoria)
        REFERENCES Categorias (id_categoria)
        ON UPDATE CASCADE ON DELETE NO ACTION,
    CONSTRAINT FK_Prod_Marca FOREIGN KEY (id_marca)
        REFERENCES Marcas (id_marca)
        ON UPDATE CASCADE ON DELETE SET NULL
);
GO

-- ============================================================
-- 6. OFERTAS  — para "Ofertas del día" del sidebar
-- ============================================================
CREATE TABLE Ofertas (
    id_oferta     INT           IDENTITY(1,1) PRIMARY KEY,
    id_producto   INT           NOT NULL,
    precio_oferta DECIMAL(10,2) NOT NULL,
    descuento_pct INT           NOT NULL DEFAULT 0,
    fecha_inicio  DATE          NOT NULL,
    fecha_fin     DATE          NOT NULL,
    activo        BIT           NOT NULL DEFAULT 1,
    CONSTRAINT FK_Oferta_Producto FOREIGN KEY (id_producto)
        REFERENCES Productos (id_producto)
        ON DELETE CASCADE
);
GO

-- ============================================================
-- 7. CARRITOS  — persistencia del carrito en BD
-- ============================================================
CREATE TABLE Carritos (
    id_carrito          INT            IDENTITY(1,1) PRIMARY KEY,
    session_id          NVARCHAR(120)  NOT NULL,
    id_usuario          INT            NULL,
    fecha_actualizacion DATETIME2      NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Carrito_Usuario FOREIGN KEY (id_usuario)
        REFERENCES Usuarios (id_usuario)
        ON DELETE SET NULL
);
GO

CREATE TABLE CarritoDetalle (
    id_detalle      INT            IDENTITY(1,1) PRIMARY KEY,
    id_carrito      INT            NOT NULL,
    id_producto     INT            NULL,
    sku_producto    NVARCHAR(20)   NOT NULL,
    nombre_producto NVARCHAR(200)  NOT NULL,
    precio_unitario DECIMAL(10,2)  NOT NULL,
    imagen_url      NVARCHAR(200)  NULL,
    cantidad        INT            NOT NULL DEFAULT 1,
    CONSTRAINT FK_CarDet_Carrito  FOREIGN KEY (id_carrito)
        REFERENCES Carritos (id_carrito)
        ON DELETE CASCADE,
    CONSTRAINT FK_CarDet_Producto FOREIGN KEY (id_producto)
        REFERENCES Productos (id_producto)
        ON DELETE SET NULL
);
GO

-- ============================================================
-- 8. PEDIDOS  — código autogenerado EDG-YYYYMMDD-00001
-- ============================================================
CREATE TABLE Pedidos (
    id_pedido           INT            IDENTITY(1,1) PRIMARY KEY,
    codigo_pedido       NVARCHAR(20)   NOT NULL,           -- generado en server.js
    id_usuario          INT            NULL,
    cliente_nombre      NVARCHAR(120)  NOT NULL,
    cliente_email       NVARCHAR(150)  NULL,
    cliente_telefono    NVARCHAR(20)   NULL,
    metodo_pago         NVARCHAR(20)   NOT NULL,           -- tarjeta|yape|plin|whatsapp|efectivo
    subtotal            DECIMAL(10,2)  NOT NULL DEFAULT 0,
    descuento           DECIMAL(10,2)  NOT NULL DEFAULT 0,
    envio               DECIMAL(10,2)  NOT NULL DEFAULT 0,
    total               DECIMAL(10,2)  NOT NULL DEFAULT 0,
    estado              NVARCHAR(20)   NOT NULL DEFAULT 'pendiente',
    direccion_entrega   NVARCHAR(200)  NULL,
    notas               NVARCHAR(MAX)  NULL,
    fecha_pedido        DATETIME2      NOT NULL DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2      NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_Pedido_codigo UNIQUE (codigo_pedido),
    CONSTRAINT FK_Pedido_Usuario FOREIGN KEY (id_usuario)
        REFERENCES Usuarios (id_usuario)
        ON DELETE SET NULL,
    CONSTRAINT CK_Pedido_estado CHECK (estado IN (
        'pendiente','confirmado','en_proceso','enviado','entregado','cancelado'
    ))
);
GO

-- ============================================================
-- 9. PEDIDO DETALLE  — snapshot al momento de comprar
-- ============================================================
CREATE TABLE PedidoDetalle (
    id_detalle      INT            IDENTITY(1,1) PRIMARY KEY,
    id_pedido       INT            NOT NULL,
    id_producto     INT            NULL,
    sku_producto    NVARCHAR(20)   NOT NULL,
    nombre_producto NVARCHAR(200)  NOT NULL,
    cantidad        INT            NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2)  NOT NULL,
    subtotal        DECIMAL(10,2)  NOT NULL,
    CONSTRAINT FK_PedDet_Pedido   FOREIGN KEY (id_pedido)
        REFERENCES Pedidos (id_pedido)
        ON DELETE CASCADE,
    CONSTRAINT FK_PedDet_Producto FOREIGN KEY (id_producto)
        REFERENCES Productos (id_producto)
        ON DELETE SET NULL
);
GO

-- ============================================================
-- 10. MENSAJES CONTACTO
-- ============================================================
CREATE TABLE MensajesContacto (
    id_mensaje  INT            IDENTITY(1,1) PRIMARY KEY,
    nombre      NVARCHAR(100)  NOT NULL,
    email       NVARCHAR(150)  NOT NULL,
    telefono    NVARCHAR(20)   NULL,
    asunto      NVARCHAR(150)  NOT NULL,
    mensaje     NVARCHAR(MAX)  NOT NULL,
    estado      NVARCHAR(20)   NOT NULL DEFAULT 'nuevo',   -- nuevo|leido|respondido
    fecha_envio DATETIME2      NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT CK_Msg_estado CHECK (estado IN ('nuevo','leido','respondido'))
);
GO

-- ============================================================
-- DATOS INICIALES — CATEGORIAS
-- ============================================================
INSERT INTO Categorias (nombre, slug, icono, orden) VALUES
('Herramientas Manuales',     'manuales',     'fa-hammer', 1),
('Herramientas Eléctricas',   'electricas',   'fa-bolt',   2),
('Herramientas Inalámbricas', 'inalambricas', 'fa-wifi',   3);
GO

-- ============================================================
-- DATOS INICIALES — MARCAS
-- ============================================================
INSERT INTO Marcas (nombre, logo_url) VALUES
('Wiseup',  NULL),
('Truper',  NULL),
('Rankor',  NULL),
('Bosch',   'assets/sgv/bosch-logo-simple.svg'),
('Philips', 'assets/sgv/philips.svg'),
('CAT',     'assets/sgv/cat-1.svg'),
('Stanley', NULL),
('Wosai',   NULL);
GO

-- ============================================================
-- DATOS INICIALES — PRODUCTOS (44 en total)
-- cat 1=Manuales  cat 2=Electricas  cat 3=Inalambricas
-- marca: 1=Wiseup 2=Truper 3=Rankor 4=Bosch 8=Wosai
-- ============================================================

-- Destacados del index (categoria "destacados" se guarda
-- como id_categoria=1 y destacado=1 — se filtran en /api/productos?destacado=1)
INSERT INTO Productos (sku,nombre,precio,id_categoria,id_marca,imagen_url,destacado,stock) VALUES
('EDG-DST-001','Martillo A1-T1',               18.00,1,2,'assets/img/martillo 2.png',      1,50),
('EDG-DST-002','Destornillador Rba-31',         10.00,1,1,'assets/img/martillo 2 (1).png', 1,50),
('EDG-DST-003','Martillo A1-T1 Pro',            18.00,1,2,'assets/img/martillo 2 (2).png', 1,50),
('EDG-DST-004','Set Herramientas',              18.00,1,NULL,'assets/img/martillo 2 (3).png',1,30),
('EDG-DST-005','Juego de Llaves',               18.00,1,NULL,'assets/img/martillo 2 (4).png',1,30),
('EDG-DST-006','Llave Ajustable',               18.00,1,NULL,'assets/img/martillo 2 (5).png',1,40),
('EDG-DST-007','Rodillo de Pintura',            18.00,1,NULL,'assets/img/martillo 2 (6).png',1,40),
('EDG-DST-008','Taladro Inalámbrico',           18.00,3,NULL,'assets/img/martillo 2 (7).png',1,20);

-- Herramientas Manuales
INSERT INTO Productos (sku,nombre,precio,id_categoria,id_marca,imagen_url,destacado,stock) VALUES
('EDG-MAN-001','Extension Flexible Destornillador 300MM Wiseup',  8.00, 1,1,'assets/img herramientas/Rectangle 32.png',  0,100),
('EDG-MAN-002','Mini Martillo Tubular 250G 80OZ Wiseup',          15.00,1,1,'assets/img herramientas/Rectangle 33.png',  0,80),
('EDG-MAN-003','Hoja Sierra Bimetalica 12in 18101 Truper',         3.50, 1,2,'assets/img herramientas/Rectangle 34.png',  0,200),
('EDG-MAN-004','Disco Corte Madera 7-1/4in 24T 18300 Truper',    25.00,1,2,'assets/img herramientas/Rectangle 35.png',  0,60),
('EDG-MAN-005','Careta Automatica Soldar RWH9111001 Rankor',      100.00,1,3,'assets/img herramientas/Rectangle 36.png', 0,25),
('EDG-MAN-006','Cortador Ceramicos 600MM RTC60001 Rankor',        130.00,1,3,'assets/img herramientas/Rectangle 37.png', 0,15),
('EDG-MAN-007','Alicate Corte Diagonal Dielectrico Wiseup',        15.00,1,1,'assets/img herramientas/Rectangle 38.png', 0,90),
('EDG-MAN-008','Juego 3 Pzas Cepillos Alambre 10652 Truper',      20.00,1,2,'assets/img herramientas/Rectangle 39.png', 0,70),
('EDG-MAN-009','Broca Metal 4MM 14132 Truper',                    10.00,1,2,'assets/img herramientas/Rectangle 17.png',  0,150),
('EDG-MAN-010','Pala Cuchara 10000 Truper',                       50.00,1,2,'assets/img herramientas/Rectangle 41.png',  0,30),
('EDG-MAN-011','Set Soporte Magnetico Soldadura 7 Piezas',        70.00,1,NULL,'assets/img herramientas/Rectangle 42.png',0,20),
('EDG-MAN-012','Mazo Fibra de Vidrio 2LB Truper',                 35.00,1,2,'assets/img herramientas/Rectangle 43.png',  0,45);

-- Herramientas Eléctricas
INSERT INTO Productos (sku,nombre,precio,id_categoria,id_marca,imagen_url,destacado,stock) VALUES
('EDG-ELE-001','Lijadora Orbital 1/4 Hoja 220W 103338 Truper',   120.00,2,2,'assets/img herramientas/Rectangle 17 (1).png',0,20),
('EDG-ELE-002','Bomba Centrifuga 750W 1HP RCP75001 Rankor',       350.00,2,3,'assets/img herramientas/Rectangle 19.png',     0,10),
('EDG-ELE-003','Bomba Periferica 370W 0.5HP RPP37001 Rankor',     170.00,2,3,'assets/img herramientas/Rectangle 19 (1).png', 0,12),
('EDG-ELE-004','Bomba Sumergible 1.5HP RSSP110001 Rankor',        600.00,2,3,'assets/img herramientas/Rectangle 20.png',     0,8),
('EDG-ELE-005','Compresora 2.5HP 50L RAC15005001 Rankor',         380.00,2,3,'assets/img herramientas/Rectangle 25.png',     0,6),
('EDG-ELE-006','Lijadora de Palma 260W RPS26001 Rankor',          180.00,2,3,'assets/img herramientas/Rectangle 26.png',     0,15),
('EDG-ELE-007','Taladro Magnetico 1600W RMD160001 Rankor',       1600.00,2,3,'assets/img herramientas/Rectangle 27.png',     0,4),
('EDG-ELE-008','Pulidora Angular 1400W RAP140001 Rankor',         230.00,2,3,'assets/img herramientas/Rectangle 17.png',     0,10),
('EDG-ELE-009','Sierra Ingleteadora 1800W 10in RMS180001 Rankor', 550.00,2,3,'assets/img herramientas/Rectangle 25 (1).png', 0,5),
('EDG-ELE-010','Pistola de Calor 1800W GHG180 Bosch',            150.00,2,4,'assets/img herramientas/Rectangle 27 (1).png', 0,18),
('EDG-ELE-011','Taladro Percutor 850W 13MM EMDL0851',            150.00,2,NULL,'assets/img herramientas/Rectangle 28 (1).png',0,22),
('EDG-ELE-012','Demoledor 1500W SDS Max EDBRM1501',              250.00,2,NULL,'assets/img herramientas/Rectangle 28.png',    0,7);

-- Herramientas Inalámbricas
INSERT INTO Productos (sku,nombre,precio,id_categoria,id_marca,imagen_url,destacado,stock) VALUES
('EDG-INA-001','Rotomartillo 20V 2.5J SDS Plus 2BAT Rankor',     450.00,3,3,'assets/img herramientas/Rectangle 18.png',     0,12),
('EDG-INA-002','Lampara 20V 1BAT 2AH RLWL2001 Rankor',           250.00,3,3,'assets/img herramientas/Rectangle 18 (1).png', 0,20),
('EDG-INA-003','Llave Impacto 1500NM 3/4in RLIW20203 Rankor',    870.00,3,3,'assets/img herramientas/Rectangle 19 (1).png', 0,6),
('EDG-INA-004','Sierra Sable 20V 4AH RLRS20003 Rankor',          290.00,3,3,'assets/img herramientas/Rectangle 20 (1).png', 0,8),
('EDG-INA-005','Cargador Baterias Litio 65W RLC20240001 Rankor',  50.00,3,3,'assets/img herramientas/Rectangle 21.png',     0,30),
('EDG-INA-006','Llave Ratchet 90NM RLR209001 Rankor',            290.00,3,3,'assets/img herramientas/Rectangle 21 (1).png', 0,10),
('EDG-INA-007','Sopladora Aspiradora 20V RLAB2001 Rankor',        220.00,3,3,'assets/img herramientas/Rectangle 22.png',     0,14),
('EDG-INA-008','Pistola Pulverizadora 20V RLSG2001 Rankor',       220.00,3,3,'assets/img herramientas/Rectangle 23.png',     0,16),
('EDG-INA-009','Sierra Circular 5-1/2in 20V RLCS20002 Rankor',   390.00,3,3,'assets/img herramientas/Rectangle 24.png',     0,9),
('EDG-INA-010','Ventosa de Vacio 4V 260KG RLVSC2001 Rankor',     170.00,3,3,'assets/img herramientas/Rectangle 24 (1).png', 0,11),
('EDG-INA-011','Conjunto Herramientas Inalambricas 20V Wosai',    450.00,3,8,'assets/img herramientas/Rectangle 27.png',     0,7),
('EDG-INA-012','Aspiradora a Bateria VC 5-22',                    250.00,3,NULL,'assets/img herramientas/Rectangle 25.png',  0,10);
GO

-- ============================================================
-- USUARIO ADMINISTRADOR INICIAL
-- password: Admin123! (cámbialo en producción con bcrypt)
-- ============================================================
INSERT INTO Usuarios (dni,nombre,apellido,email,password_hash,rol) VALUES
('00000001','Admin','EDG','admin@edgroup.com',
 '$2b$10$CAMBIA_ESTE_HASH_EJECUTANDO_bcrypt.hash_EN_NODE','admin');
GO

-- ============================================================
-- VISTAS ÚTILES
-- ============================================================

-- Productos con oferta vigente hoy
CREATE OR ALTER VIEW v_ofertas_hoy AS
SELECT
    p.sku, p.nombre,
    p.precio              AS precio_original,
    o.precio_oferta,
    o.descuento_pct,
    m.nombre              AS marca,
    c.nombre              AS categoria,
    p.imagen_url
FROM Ofertas o
JOIN Productos  p ON p.id_producto  = o.id_producto
JOIN Categorias c ON c.id_categoria = p.id_categoria
LEFT JOIN Marcas m ON m.id_marca    = p.id_marca
WHERE o.activo = 1
  AND CAST(SYSDATETIME() AS DATE) BETWEEN o.fecha_inicio AND o.fecha_fin;
GO

-- Pedidos completos con datos del cliente
CREATE OR ALTER VIEW v_pedidos_completo AS
SELECT
    p.codigo_pedido,
    p.cliente_nombre,
    u.dni,
    p.cliente_email,
    p.cliente_telefono,
    p.subtotal, p.descuento, p.envio, p.total,
    p.metodo_pago,
    p.estado,
    p.fecha_pedido
FROM Pedidos p
LEFT JOIN Usuarios u ON u.id_usuario = p.id_usuario;
GO

-- Detalle de pedidos con producto
CREATE OR ALTER VIEW v_detalle_pedido AS
SELECT
    p.codigo_pedido,
    d.sku_producto        AS sku,
    d.nombre_producto     AS producto,
    d.cantidad,
    d.precio_unitario,
    d.subtotal            AS subtotal_linea,
    p.total               AS total_pedido,
    p.estado
FROM PedidoDetalle d
JOIN Pedidos p ON p.id_pedido = d.id_pedido;
GO

-- Carrito activo con datos del producto
CREATE OR ALTER VIEW v_carrito_detalle AS
SELECT
    c.id_usuario,
    cd.id_carrito,
    p.sku,
    p.nombre,
    p.imagen_url,
    cd.cantidad,
    cd.precio_unitario,
    (cd.cantidad * cd.precio_unitario) AS subtotal
FROM CarritoDetalle cd
JOIN Carritos  c ON c.id_carrito  = cd.id_carrito
JOIN Productos p ON p.id_producto = cd.id_producto;
GO

-- Stock bajo (menos de 5 unidades)
CREATE OR ALTER VIEW v_stock_bajo AS
SELECT
    p.sku, p.nombre, p.stock,
    c.nombre AS categoria,
    m.nombre AS marca
FROM Productos p
JOIN Categorias c ON c.id_categoria = p.id_categoria
LEFT JOIN Marcas m ON m.id_marca = p.id_marca
WHERE p.stock < 5 AND p.activo = 1;
GO

-- Mensajes de contacto sin responder
CREATE OR ALTER VIEW v_mensajes_pendientes AS
SELECT
    id_mensaje, nombre, email, telefono,
    asunto,
    LEFT(mensaje, 80)  AS preview,
    fecha_envio
FROM MensajesContacto
WHERE estado = 'nuevo';
GO

SELECT 'Base FerreteriaDB_Proyecto creada correctamente con 10 tablas y 44 productos' AS Resultado;
GO
