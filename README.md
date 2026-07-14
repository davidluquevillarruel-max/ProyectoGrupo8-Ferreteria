# Estructuras & Diseños Group — Tienda virtual con EDG IA

Proyecto web de ferretería desarrollado con **HTML5, CSS3, JavaScript, Node.js, Express y SQL Server**. La versión 4 incorpora una renovación visual integral y un asistente virtual inteligente disponible en todas las pantallas.

## Novedades principales

- **EDG IA**, asistente virtual flotante con icono de nube.
- Búsqueda de productos por nombre, categoría, uso o presupuesto.
- Recomendaciones para concreto, soldadura, pintura, madera, metal, agua, mecánica y trabajos del hogar.
- Consulta de precios, categorías, carrito, métodos de pago, envíos, horarios, contacto y estado de pedidos.
- Acciones directas desde el chat: añadir al carrito, abrir catálogo, ir al pago, contactar por WhatsApp y navegar por el panel administrador.
- Interfaz responsive para escritorio, tablet y móvil.
- Paleta visual unificada, tarjetas modernas, sombras, estados de foco y accesibilidad mejorada.
- Nueva sección de compra asistida con IA en la página de inicio.
- Corrección de textos con caracteres dañados y rutas de imágenes faltantes.
- Configuración segura mediante `.env` y servidor disponible aunque SQL Server aún no esté conectado.

## Estructura principal

```text
ProyectoGrupo8_Ferreteria_IA/
├── index.html
├── server.js
├── package.json
├── productos_seed.json
├── SOLUCION_COMPLETA_SQL.sql
├── .env.example
├── assets/
│   ├── CSS/styles.css
│   ├── img/
│   ├── img herramientas/
│   ├── js/
│   │   ├── store-data.js
│   │   ├── virtual-assistant.js
│   │   ├── carrito.js
│   │   ├── auth.js
│   │   └── ui-enhancements.js
│   └── pages/
└── docs/
    └── NOTA_VERSION_4.md
```

## Ejecutar solo la interfaz

Puedes abrir `index.html` directamente, aunque para evitar restricciones del navegador se recomienda usar el servidor Node.js.

## Ejecutar con Node.js

1. Instala las dependencias:

```bash
npm install
```

2. Copia `.env.example` como `.env` y completa los datos de SQL Server:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Inicia el servidor:

```bash
npm start
```

4. Abre:

```text
http://localhost:3000
```

La tienda visual y EDG IA se muestran incluso si SQL Server no está encendido. Las operaciones de API que dependen de la base de datos requerirán una conexión válida.

## Base de datos

Ejecuta `SOLUCION_COMPLETA_SQL.sql` en SQL Server Management Studio y configura en `.env`:

```env
PORT=3000
DB_SERVER=localhost
DB_NAME=FerreteriaDB_Proyecto
DB_USER=sa
DB_PASSWORD=TU_CLAVE_SEGURA
CORS_ORIGIN=http://localhost:3000
```

No subas el archivo `.env` a repositorios. Ya está incluido en `.gitignore`.

## EDG IA

El asistente actual utiliza un **motor inteligente local especializado en la tienda**, por lo que funciona sin API externa ni clave de pago. Su conocimiento central está en:

- `assets/js/store-data.js`: datos de tienda y catálogo.
- `assets/js/virtual-assistant.js`: detección de intención, búsqueda, recomendaciones y acciones.

Para conectarlo posteriormente con un modelo generativo, se puede reemplazar o ampliar la función `processQuery()` con una llamada a un endpoint seguro del backend. La clave de cualquier proveedor debe permanecer en el servidor y nunca dentro del JavaScript del navegador.

## Páginas incluidas

- Inicio y productos destacados.
- Catálogo con categorías, ordenamiento y paginación.
- Carrito y flujo de pago.
- Registro e inicio de sesión.
- Contacto y página institucional.
- Panel administrador de inventario, ventas, usuarios y productos.

## Validaciones realizadas

- Sintaxis de todos los archivos JavaScript.
- Carga del asistente en las nueve páginas.
- Búsqueda de productos y recomendaciones.
- Adición de productos al carrito desde EDG IA.
- Renderizado de productos destacados y catálogo paginado.
- Revisión de referencias locales a scripts, estilos, imágenes y video.
- Verificación de estructura HTML y codificación UTF-8.
