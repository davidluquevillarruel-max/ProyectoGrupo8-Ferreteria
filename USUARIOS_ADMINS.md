# 🔑 Usuarios Administradores — Estructuras & Diseños Group

Cuentas con rol `admin`. Tienen acceso al panel de gestión, pueden crear productos, ver todos los pedidos, cambiar estados y leer mensajes de contacto.

> ⚠️ **No compartir este documento fuera del equipo.** Las contraseñas son de prueba pero deben tratarse como reales.

---

## 1. David Ramirez Torres

| Campo | Valor |
|-------|-------|
| **DNI** | `45123789` |
| **Email** | `david.ramirez@edgroup.com` |
| **Contraseña** | `Admin2026$` |
| **Teléfono** | 987654321 |
| **Dirección** | Av. Los Constructores 145, San Isidro, Lima |
| **Rol** | admin |

---

## 2. Carla Mendoza Vargas

| Campo | Valor |
|-------|-------|
| **DNI** | `42876543` |
| **Email** | `carla.mendoza@edgroup.com` |
| **Contraseña** | `Gestion#88` |
| **Teléfono** | 965432187 |
| **Dirección** | Jr. Comercio 302, Miraflores, Lima |
| **Rol** | admin |

---

## 3. Ricardo Salazar Quispe

| Campo | Valor |
|-------|-------|
| **DNI** | `40567891` |
| **Email** | `ricardo.salazar@edgroup.com` |
| **Contraseña** | `Ferre@Admin1` |
| **Teléfono** | 981234567 |
| **Dirección** | Av. Industrial 890, Ate, Lima |
| **Rol** | admin |

---

## Cómo iniciar sesión

1. Abre `http://localhost:3000` con el servidor corriendo (`npm start`).
2. Clic en **Registrarse** (arriba a la derecha).
3. Ingresa el **email** y la **contraseña** de la tabla.
4. Al entrar, la Zona Admin del sidebar se activa automáticamente.

## Notas

- Las contraseñas están hasheadas con **bcrypt cost=10** en la BD.
- Nunca guardes las contraseñas en texto plano dentro del código.
- Si necesitas resetear una: `UPDATE Usuarios SET password_hash='<nuevo_hash>' WHERE email='...'`.