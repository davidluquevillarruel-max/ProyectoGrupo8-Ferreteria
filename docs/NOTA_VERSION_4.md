# Nota de versión 4.0 — EDG IA y renovación integral

## Asistente virtual

Se sustituyó el minichat basado en cuatro palabras clave por **EDG IA**, un asistente especializado en la tienda que funciona en todas las páginas.

Funciones incorporadas:

- Búsqueda inteligente dentro de 44 registros del catálogo.
- Filtros por categoría, intención de uso y presupuesto.
- Recomendaciones contextualizadas para diferentes trabajos.
- Productos interactivos dentro del chat y adición directa al carrito.
- Consulta de carrito, pagos, envío gratis, horarios, dirección y canales de atención.
- Búsqueda local de códigos de pedido.
- Accesos rápidos y navegación adaptada para clientes y administradores.
- Dictado por voz cuando el navegador lo soporta.
- Diseño responsive, indicador en línea, animación de escritura y accesibilidad por teclado.

## Diseño y experiencia

- Nueva paleta verde, naranja y superficies neutras.
- Contenedores más amplios y consistentes.
- Encabezado, navegación, botones, tarjetas, formularios y footer modernizados.
- Nueva sección de compra asistida en el inicio.
- Mejores estados hover, focus y reducción de movimiento.
- Adaptación específica para pantallas móviles.

## Calidad y correcciones

- Corrección de textos con mojibake y codificación UTF-8.
- Creación de favicon y recursos visuales faltantes.
- Unificación de dirección y actualización del año del copyright.
- Eliminación de credenciales expuestas del archivo entregable.
- Inclusión de `.env.example` y `.gitignore`.
- CORS configurable y reducción del límite de carga JSON.
- Inicio del servidor desacoplado de la disponibilidad inmediata de SQL Server.

## Archivos nuevos

- `assets/js/store-data.js`
- `assets/js/virtual-assistant.js`
- `.env.example`
- `.gitignore`
- `docs/NOTA_VERSION_4.md`

## Validación

Se ejecutaron pruebas automáticas de DOM para confirmar:

- 8 productos destacados en el inicio.
- 12 productos por página en el catálogo.
- Creación del asistente en inicio y catálogo.
- Respuesta de búsqueda para herramientas de concreto con presupuesto.
- Adición correcta de un producto al carrito.
- Ausencia de errores JavaScript durante la prueba.
