// ============================================================
//  AUTH.JS — Registro, Login y gestión de sesión
//  Ahora conectado al backend: los usuarios se guardan en la
//  BD (tabla Usuarios) y las sesiones en la tabla Sesiones.
//
//  Endpoints usados:
//    POST /api/usuarios/registro  { dni, nombre, apellido, email, password }
//    POST /api/usuarios/login     { email, password } → { token, usuario }
//    POST /api/usuarios/logout    (Bearer token)
//
//  En localStorage solo se guarda la sesión activa (token +
//  datos básicos del usuario), NO la lista de usuarios.
// ============================================================


// ── ELEMENTOS DEL DOM ──────────────────────────────────────
const authOverlay        = document.getElementById("authOverlay");
const authModal          = document.getElementById("authModal");
const panelLogin         = document.getElementById("panelLogin");
const panelRegister      = document.getElementById("panelRegister");
const panelSuccess       = document.getElementById("panelSuccess");

const btnAbrirAuth       = document.getElementById("btnAbrirAuth");
const authClose          = document.getElementById("authClose");

const goToRegister       = document.getElementById("goToRegister");
const goToLogin          = document.getElementById("goToLogin");
const btnGoLogin         = document.getElementById("btnGoLogin");

const btnLogin           = document.getElementById("btnLogin");
const btnRegister        = document.getElementById("btnRegister");

const loginEmail         = document.getElementById("loginEmail");
const loginPassword      = document.getElementById("loginPassword");
const loginError         = document.getElementById("loginError");

const regNombre          = document.getElementById("regNombre");
const regApellido        = document.getElementById("regApellido");   // nuevo campo
const regDni             = document.getElementById("regDni");        // nuevo campo
const regEmail           = document.getElementById("regEmail");
const regPassword        = document.getElementById("regPassword");
const regPasswordConfirm = document.getElementById("regPasswordConfirm");
const registerError      = document.getElementById("registerError");
const successEmail       = document.getElementById("successEmail");

// Sidebar elementos
const sidebarAvatar      = document.getElementById("sidebarAvatar");
const sidebarUserName    = document.getElementById("sidebarUserName");
const sidebarUserSub     = document.getElementById("sidebarUserSub");


// ── ABRIR / CERRAR MODAL ───────────────────────────────────
function abrirModal(panel) {
    [panelLogin, panelRegister, panelSuccess].forEach(p => p.classList.add("auth-panel-hidden"));
    panel.classList.remove("auth-panel-hidden");
    authOverlay.classList.add("auth-overlay-visible");
    authModal.classList.add("auth-modal-visible");
    document.body.style.overflow = "hidden";
}

function cerrarModal() {
    authOverlay.classList.remove("auth-overlay-visible");
    authModal.classList.remove("auth-modal-visible");
    document.body.style.overflow = "";
    limpiarFormularios();
}

function limpiarFormularios() {
    [loginEmail, loginPassword, regNombre, regApellido, regDni, regEmail,
     regPassword, regPasswordConfirm].forEach(el => { if (el) el.value = ""; });
    loginError.textContent    = "";
    registerError.textContent = "";
}


// ── SESIÓN (token + usuario, respaldados en la BD) ─────────
function guardarSesion(token, usuario) {
    localStorage.setItem("token_edg",  token);
    localStorage.setItem("sesion_edg", JSON.stringify(usuario));
}
function obtenerSesion() {
    return JSON.parse(localStorage.getItem("sesion_edg") || "null");
}
function obtenerToken() {
    return localStorage.getItem("token_edg") || null;
}
async function cerrarSesion() {
    const token = obtenerToken();
    // Avisar al backend para invalidar la sesión en la BD
    if (token) {
        try {
            await fetch("/api/usuarios/logout", {
                method:  "POST",
                headers: { "Authorization": "Bearer " + token }
            });
        } catch (err) {
            console.warn("⚠️ No se pudo cerrar sesión en el servidor:", err.message);
        }
    }
    localStorage.removeItem("token_edg");
    localStorage.removeItem("sesion_edg");
    actualizarUI();
}


// ── ACTUALIZAR UI SEGÚN SESIÓN ─────────────────────────────
function actualizarUI() {
    const sesion = obtenerSesion();

    // Referencias a los botones del header
    const btnIniciarSesion  = document.getElementById("btnIniciarSesion");
    const btnRegistrarse    = document.getElementById("btnAbrirAuth");
    const btnCerrarSesion   = document.getElementById("btnCerrarSesion");
    const userGreeting      = document.getElementById("userGreeting");
    const userGreetingName  = document.getElementById("userGreetingName");

    if (sesion) {
        // ── LOGUEADO: ocultar Iniciar/Registrarse, mostrar saludo + Cerrar sesión ──
        if (btnIniciarSesion) btnIniciarSesion.style.display = "none";
        if (btnRegistrarse)   btnRegistrarse.style.display   = "none";
        if (btnCerrarSesion)  btnCerrarSesion.style.display  = "";
        if (userGreeting)     userGreeting.style.display     = "";
        if (userGreetingName) userGreetingName.textContent   = sesion.nombre.split(" ")[0];

        if (btnCerrarSesion) {
            btnCerrarSesion.onclick = function(e) {
                e.preventDefault();
                if (confirm("¿Deseas cerrar sesión?")) cerrarSesion();
            };
        }
    } else {
        // ── INVITADO: mostrar Iniciar sesión + Registrarse ──
        if (btnIniciarSesion) btnIniciarSesion.style.display = "";
        if (btnRegistrarse)   btnRegistrarse.style.display   = "";
        if (btnCerrarSesion)  btnCerrarSesion.style.display  = "none";
        if (userGreeting)     userGreeting.style.display     = "none";

        if (btnIniciarSesion) {
            btnIniciarSesion.onclick = function(e) {
                e.preventDefault();
                abrirModal(panelLogin);
            };
        }
        if (btnRegistrarse) {
            btnRegistrarse.onclick = function(e) {
                e.preventDefault();
                abrirModal(panelRegister);
            };
        }
    }

    // --- Sidebar zona cliente ---
    if (sidebarUserName && sidebarUserSub) {
        if (sesion) {
            sidebarUserName.textContent = (sesion.nombre + " " + (sesion.apellido || "")).trim();
            sidebarUserSub.textContent  = sesion.email;
        } else {
            sidebarUserName.textContent = "Zona cliente";
            sidebarUserSub.textContent  = "Compra rápida y segura";
        }
    }

    // --- Zona Admin del sidebar: visible solo si el rol es admin ---
    document.querySelectorAll(".sidebar-admin-zone, [data-admin-zone]").forEach(zona => {
        zona.style.display = (sesion && sesion.rol === "admin") ? "" : "none";
    });

    // --- Avatar del sidebar: clic abre modal o muestra opción de cerrar sesión ---
    if (sidebarAvatar) {
        sidebarAvatar.onclick = function() {
            if (sesion) {
                if (confirm("¿Deseas cerrar sesión, " + sesion.nombre.split(" ")[0] + "?")) {
                    cerrarSesion();
                }
            } else {
                // Cerrar el sidebar y abrir el modal
                const sidebar = document.getElementById("sidebar");
                const overlay = document.getElementById("sidebarOverlay");
                if (sidebar) sidebar.classList.remove("sidebar-open");
                if (overlay) overlay.classList.remove("overlay-visible");
                document.body.style.overflow = "";
                setTimeout(() => abrirModal(panelLogin), 200);
            }
        };
    }
}


// ── REGISTRO (POST /api/usuarios/registro) ─────────────────
btnRegister.addEventListener("click", async function () {
    registerError.textContent = "";

    const nombre   = regNombre.value.trim();
    const apellido = regApellido ? regApellido.value.trim() : "";
    const dni      = regDni ? regDni.value.trim() : "";
    const email    = regEmail.value.trim();
    const pass     = regPassword.value;
    const passConf = regPasswordConfirm.value;

    // Validaciones en el navegador (el backend vuelve a validar)
    if (!nombre || !apellido || !dni || !email || !pass || !passConf) {
        registerError.textContent = "Completa todos los campos."; return;
    }
    if (!/^\d{8}$/.test(dni)) {
        registerError.textContent = "El DNI debe tener exactamente 8 dígitos."; return;
    }
    if (!email.includes("@") || !email.includes(".")) {
        registerError.textContent = "Ingresa un email válido."; return;
    }
    if (pass.length < 6) {
        registerError.textContent = "La contraseña debe tener al menos 6 caracteres."; return;
    }
    if (pass !== passConf) {
        registerError.textContent = "Las contraseñas no coinciden."; return;
    }

    btnRegister.disabled = true;
    btnRegister.textContent = "Creando cuenta...";

    try {
        const resp = await fetch("/api/usuarios/registro", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dni, nombre, apellido, email, password: pass })
        });
        const data = await resp.json();

        if (!resp.ok) {
            registerError.textContent = data.error || "No se pudo crear la cuenta.";
            return;
        }

        successEmail.textContent = email;
        abrirModal(panelSuccess);

    } catch (err) {
        registerError.textContent = "No hay conexión con el servidor. Inicia el backend (npm start) e inténtalo de nuevo.";
    } finally {
        btnRegister.disabled = false;
        btnRegister.textContent = "Crear cuenta";
    }
});


// ── LOGIN (POST /api/usuarios/login) ───────────────────────
btnLogin.addEventListener("click", async function () {
    loginError.textContent = "";

    const email = loginEmail.value.trim();
    const pass  = loginPassword.value;

    if (!email || !pass) {
        loginError.textContent = "Completa todos los campos."; return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = "Ingresando...";

    try {
        const resp = await fetch("/api/usuarios/login", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: pass })
        });
        const data = await resp.json();

        if (!resp.ok) {
            loginError.textContent = data.error || "Email o contraseña incorrectos.";
            return;
        }

        // data = { token, usuario: { id_usuario, nombre, apellido, email, rol } }
        guardarSesion(data.token, data.usuario);
        cerrarModal();
        actualizarUI();

        // Asociar el carrito de este navegador al usuario logueado
        if (typeof sincronizarCarritoAPI === "function") sincronizarCarritoAPI();

    } catch (err) {
        loginError.textContent = "No hay conexión con el servidor. Inicia el backend (npm start) e inténtalo de nuevo.";
    } finally {
        btnLogin.disabled = false;
        btnLogin.textContent = "Iniciar sesión";
    }
});


// ── NAVEGACIÓN ENTRE PANELES ───────────────────────────────
goToRegister.addEventListener("click", function(e) { e.preventDefault(); abrirModal(panelRegister); });
goToLogin.addEventListener("click",    function(e) { e.preventDefault(); abrirModal(panelLogin); });
btnGoLogin.addEventListener("click",   function()  { abrirModal(panelLogin); });


// ── CERRAR MODAL ───────────────────────────────────────────
authClose.addEventListener("click", cerrarModal);
authOverlay.addEventListener("click", cerrarModal);
document.addEventListener("keydown", function(e) { if (e.key === "Escape") cerrarModal(); });


// ── BOTONES SOCIALES (placeholder — conectar con OAuth) ────
[document.getElementById("btnLoginGoogle"),
 document.getElementById("btnRegGoogle")].forEach(btn => {
    if (btn) btn.addEventListener("click", () => alert("Integración con Google disponible próximamente."));
});
[document.getElementById("btnLoginFacebook"),
 document.getElementById("btnRegFacebook")].forEach(btn => {
    if (btn) btn.addEventListener("click", () => alert("Integración con Facebook disponible próximamente."));
});


// ── INIT ───────────────────────────────────────────────────
actualizarUI();
