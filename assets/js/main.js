const PRECIOS_PRODUCTOS = [
    { id: 1, nombre: "Sustratos Premium", precio: 60.00 },
    { id: 2, nombre: "Sustrato semihydro", precio: 80.00 },
    { id: 3, nombre: "Sustrato standar", precio: 30.00 },
    { id: 4, nombre: "Bio Estimulante", precio: 35.00 },
    { id: 5, nombre: "Botiquin plantil", precio: 240.00 },
    { id: 6, nombre: "Tutor", precio: 45.00 }
];
const NRO_PRODUCTOS = 6;
const MAX_CANTIDAD = 6; // Límite máximo de unidades/kg por producto


// ==============================================
// FUNCIONES DE UTILIDAD (Limpieza de Mensajes)
// ==============================================

// Función que limpia el resultado y el mensaje de error
function limpiarMensajes() {
    // Necesitas un elemento HTML con ID="msgError" para que funcione
    const msgErrorElement = document.getElementById("msgError");
    if (msgErrorElement) {
        msgErrorElement.textContent = "";
    }
    
    document.getElementById("msgTotal").textContent = "";
}


// ==============================================
// FUNCIÓN PRINCIPAL DE CÁLCULO
// ==============================================
function calcularCosto() {
    let costoTotal = 0;
    let hayCantidad = false;
    
    limpiarMensajes(); // Limpia mensajes al inicio

    for (let i = 1; i <= NRO_PRODUCTOS; i++) {
        const inputId = `cant${i}`;
        const cantidadInput = document.getElementById(inputId);
        
        if (!cantidadInput) {
            console.error(`Error de DOM: No se encontró el campo con ID: ${inputId}`);
            continue; 
        }

        let valorDeInput = cantidadInput.value.trim();
        let cantidad = Number(valorDeInput);
        
        // --- 1. VALIDACIÓN DE VALOR NO NUMÉRICO / NEGATIVO ---
        if (cantidad < 0 || isNaN(cantidad) || (valorDeInput !== "" && valorDeInput !== "0" && cantidad === 0)) {
            document.getElementById("msgError").textContent = "ERROR: Ingrese un número válido y positivo.";
            return; 
        }

        // --- 2. VALIDACIÓN DE LÍMITE (Máximo 6) ---
        if (cantidad > MAX_CANTIDAD) {
            // Mostrar mensaje de error en rojo en el web (sin usar alert)
            document.getElementById("msgError").textContent = "NO SE PUEDE AÑADIR MAS DE 6 PRODUCTOS POR CLIENTE.";
            return; 
        }

        if (cantidad > 0) {
            hayCantidad = true;
            
            const precioUnitario = PRECIOS_PRODUCTOS[i - 1].precio;
            costoTotal += cantidad * precioUnitario;
        }
    }

    // 3. MOSTRAR RESULTADO FINAL
    if (hayCantidad) {
        document.getElementById("msgTotal").textContent = `El monto total seria S/ ${costoTotal.toFixed(2)}`;
    } else {
        document.getElementById("msgTotal").textContent = `No ha seleccionado ningún producto.`;
    }
}


// ==============================================
// FUNCIÓN DE LIMPIEZA (Corrigiendo el ReferenceError)
// ==============================================
function limpiarCalculadora() {
    // 1. Limpiar todos los campos de cantidad
    for (let i = 1; i <= NRO_PRODUCTOS; i++) {
        document.getElementById(`cant${i}`).value = 0;
    }
    
    // 2. Limpiar ambos mensajes (Error y Total)
    limpiarMensajes(); 
}