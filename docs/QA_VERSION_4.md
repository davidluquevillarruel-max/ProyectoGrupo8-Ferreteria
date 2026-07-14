# QA técnico — Versión 4.0

## Resultado

**Aprobado para entrega académica y demostración local.**

## Pruebas realizadas

| Prueba | Resultado |
|---|---|
| Sintaxis JavaScript en todos los archivos | Correcto |
| Estructura HTML en 9 páginas | Correcto |
| Codificación UTF-8 y textos en español | Correcto |
| Referencias locales de scripts, estilos, imágenes y video | Sin rutas faltantes |
| Productos destacados en inicio | 8 tarjetas renderizadas |
| Catálogo | 12 tarjetas por página |
| Creación de EDG IA | Correcto |
| Consulta “taladro para concreto con menos de S/ 500” | 4 opciones encontradas |
| Añadir producto al carrito desde EDG IA | Correcto |
| Instalación con `npm ci` | 0 vulnerabilidades reportadas |
| Inicio de servidor sin SQL Server | HTTP 200; interfaz disponible |
| Degradación controlada de base de datos | Advertencia sin bloquear la tienda |

## Observación

Las API de usuarios, productos, pedidos y contacto necesitan SQL Server y un archivo `.env` válido. La interfaz, el catálogo local, el carrito y EDG IA funcionan aunque la base de datos todavía no esté conectada.
