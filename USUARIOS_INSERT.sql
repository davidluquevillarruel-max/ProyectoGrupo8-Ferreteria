-- ═══════════════════════════════════════════════════════════════════
-- INSERT USUARIOS  |  Estructuras & Diseños Group
-- 3 administradores + 15 clientes
-- Passwords hasheadas con bcrypt cost=10 (compatibles con server.js)
-- 
-- INSTRUCCIONES:
-- 1. Abre SSMS.
-- 2. Conéctate a tu servidor DESKTOP-ERVF8UO.
-- 3. Abre este archivo (Ctrl+O) y presiona Execute (F5).
-- 4. Al final verás la lista de usuarios recién insertados.
-- 
-- Este script es IDEMPOTENTE: puedes correrlo varias veces sin duplicar
-- filas. Si un DNI o email ya existe, esa fila simplemente se omite.
-- ═══════════════════════════════════════════════════════════════════
USE FerreteriaDB_Proyecto;
GO

INSERT INTO Usuarios (dni, nombre, apellido, email, password_hash, telefono, direccion, rol)
SELECT dni, nombre, apellido, email, password_hash, telefono, direccion, rol
FROM (VALUES
    ('45123789', N'David', N'Ramirez Torres', N'david.ramirez@edgroup.com', N'$2b$10$8j4yi1JW9KyZs.ME4JLqUOhG03/dbQ1JL8Ps5zfpbLjqnA4p0suje', N'987654321', N'Av. Los Constructores 145, San Isidro, Lima', N'admin'),
    ('42876543', N'Carla', N'Mendoza Vargas', N'carla.mendoza@edgroup.com', N'$2b$10$R/6ApE2zY5BrA6acuZQeCe7phTzBKxHvP/ulKqPF4B9C9H123KlWC', N'965432187', N'Jr. Comercio 302, Miraflores, Lima', N'admin'),
    ('40567891', N'Ricardo', N'Salazar Quispe', N'ricardo.salazar@edgroup.com', N'$2b$10$w8nrJJ5NWTNsPn2/qjPQHeOjxkk0./uDH2mh/5zC34ZrhFpn3h7Um', N'981234567', N'Av. Industrial 890, Ate, Lima', N'admin'),
    ('70123456', N'James', N'Correa Silva', N'james.correa@gmail.com', N'$2b$10$kPNfDAvfzXfXib/Q0jCa3.kw8aEq3i.Lbz4.N/qJM5YE.VQCwAIZ6', N'962345678', N'Av. Cesar Vallejo 20, Chorrillos, Lima', N'cliente'),
    ('71234567', N'Maria', N'Torres Huaman', N'maria.torres@hotmail.com', N'$2b$10$D1faPbMF/XYJX7ejsEms8eM0RckF6.HfuuhXvgOEw1NPEYKyIfuaW', N'978912345', N'Jr. Los Pinos 456, San Juan de Miraflores, Lima', N'cliente'),
    ('72345678', N'Luis', N'Perez Gutierrez', N'luis.perez@yahoo.com', N'$2b$10$EusP0P/7PHefTrhKXyaIB.g6OmnA7YCaIDBzrXWG8ys9pFppwtWFe', N'955443322', N'Av. Grau 1250, Barranco, Lima', N'cliente'),
    ('73456789', N'Ana', N'Ramos Delgado', N'ana.ramos@gmail.com', N'$2b$10$1yEdyTza9jn3iNMLcxvW/um2kKd/C2IjXRLcJdrCBPUHhwAl75ma2', N'934567812', N'Calle Las Flores 78, Surco, Lima', N'cliente'),
    ('74567890', N'Jorge', N'Vargas Castillo', N'jorge.vargas@outlook.com', N'$2b$10$LTyQJQQRdz63/PrZJjJ1XuEJR/rBAUlGUM28z3J5c46leUIBiO9/e', N'946781234', N'Av. Universitaria 900, San Miguel, Lima', N'cliente'),
    ('75678901', N'Sofia', N'Chavez Rojas', N'sofia.chavez@gmail.com', N'$2b$10$M3vGNVa4nIgBlOoqh0K7Iusfj3XYzTLYELuEBsiAFvET0qDtplbuG', N'912345098', N'Jr. Ayacucho 234, La Victoria, Lima', N'cliente'),
    ('76789012', N'Miguel', N'Aguilar Flores', N'miguel.aguilar@hotmail.com', N'$2b$10$YRZVkc6SDoAqoyrnkV760eKc5c1ftPzjUnfYCjUdDQksnKJXJemg6', N'923678415', N'Av. Colonial 1500, Callao', N'cliente'),
    ('77890123', N'Rosa', N'Diaz Cabrera', N'rosa.diaz@gmail.com', N'$2b$10$L9Ww8dRzheigOUURHUHmIupBrhCzZUDTqRnVyOEo3AzXqDDAixEZ2', N'998123456', N'Calle Los Olivos 112, Los Olivos, Lima', N'cliente'),
    ('78901234', N'Carlos', N'Fernandez Solis', N'carlos.fernandez@yahoo.com', N'$2b$10$aEOflVFdOSrxeXXsWqR1V.RnBwkiQAFDf.Xlux96kL.LPIQYP/UbW', N'976543210', N'Av. La Marina 3200, San Miguel, Lima', N'cliente'),
    ('79012345', N'Patricia', N'Herrera Ortiz', N'patricia.herrera@gmail.com', N'$2b$10$DvOMgLMNoaLENNb7SoWC6.YZ4QlsFZUs5LfcQQMetjm3EnaDuDAIS', N'914785236', N'Jr. Amazonas 567, Cercado de Lima', N'cliente'),
    ('70234567', N'Daniel', N'Guzman Ponce', N'daniel.guzman@outlook.com', N'$2b$10$7yOZVwN0/LP.Bd.eR746vOo.9qgRqoHuZpCX1j2Q23O8gplLQCBOi', N'961472583', N'Av. Javier Prado Este 4200, La Molina, Lima', N'cliente'),
    ('71345678', N'Lucia', N'Rivera Campos', N'lucia.rivera@gmail.com', N'$2b$10$yWWRgq4/zoGSBBjdObW/rOg8ED2o7HZf9xXgw0U3OIMPda9j7H6Qm', N'988762541', N'Calle Bolivar 89, Pueblo Libre, Lima', N'cliente'),
    ('72456789', N'Roberto', N'Espinoza Mora', N'roberto.espinoza@hotmail.com', N'$2b$10$aP4bsTCUWRfKEltiWnlxhesckgdgZWJBuZG7lS73W1fQ4ffouBoPO', N'935214789', N'Av. Brasil 2100, Jesus Maria, Lima', N'cliente'),
    ('73567890', N'Elena', N'Cordova Nunez', N'elena.cordova@gmail.com', N'$2b$10$0s2WYmaqV21xOjcFH2E6qutvBKmfiL9v9bUsBG52qB6lnGKwhLYd6', N'952147863', N'Jr. Junin 345, Rimac, Lima', N'cliente'),
    ('74678901', N'Fernando', N'Palacios Ruiz', N'fernando.palacios@yahoo.com', N'$2b$10$QP9bU4jZBr5y8xLOTOaOqe31HgH0B2sPhk4tAjhPxOWFmOeZUVI1W', N'926584137', N'Av. Los Heroes 780, San Juan de Lurigancho, Lima', N'cliente')
) AS N(dni, nombre, apellido, email, password_hash, telefono, direccion, rol)
WHERE NOT EXISTS (
    SELECT 1 FROM Usuarios U WHERE U.dni = N.dni OR U.email = N.email
);
GO

-- Verificación: lista de usuarios
SELECT id_usuario, dni, nombre + ' ' + apellido AS nombre_completo,
       email, rol, fecha_registro
FROM Usuarios
ORDER BY rol DESC, id_usuario;
GO