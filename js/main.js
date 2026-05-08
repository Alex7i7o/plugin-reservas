import { inicializarGoogleAuth, loginConGoogle } from './shared/auth.js';
import { agendarEnGoogle } from './shared/calendario-service.js';
import { guardarReservaEnWP } from './reservas/wordpress-service.js';
import { calcularFin } from './shared/utils.js';
import { obtenerServiciosDesdeWP } from './reservas/servicios-service.js';
import { 
    mostrarPantallaExito, 
    llenarSelectServicios, 
    mostrarPaso 
} from './reservas/reservas-ui.js';
import { verificarDiaYGenerarHorarios } from './reservas/horarios-logic.js';

document.addEventListener('DOMContentLoaded', () => {
    const reservaApp = document.getElementById('reserva-app');
    if (!reservaApp) return;

    // 1. Inicio automático
    inicializarGoogleAuth(appConfig);

    // Verificar si venimos de un pago fallido/cancelado
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    if (paymentStatus === 'failed') {
        alert("El pago fue rechazado o cancelado. Por favor, intentá nuevamente.");
        // Limpiamos la URL para no mostrar el error en recargas
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. Carga de servicios al arrancar
    obtenerServiciosDesdeWP()
        .then(servicios => llenarSelectServicios(servicios))
        .catch(err => console.error("Fallo carga inicial:", err));

    // 3. Eventos
    const btnLogin = document.getElementById('btn-google-login');

    // Solo asignamos el evento si el botón realmente está en la página
    if (btnLogin) {
        btnLogin.onclick = loginConGoogle;
    } else {
        console.log("El botón de login no está en esta pantalla, saltando asignación.");
    }

    const selectServicios = document.getElementById('select-servicios');
    if (selectServicios) {
        selectServicios.addEventListener('change', (e) => {
            // Handle Tom Select which doesn't directly trigger selectedOptions on the event target reliably in some versions,
            // or just use the native select element directly.
            const selectElement = e.target;
            const opcion = selectElement.options[selectElement.selectedIndex];

            if (opcion && opcion.value !== "") {
                window.servicioSeleccionado = opcion.text;
                window.servicioId = opcion.value;
                window.duracionSeleccionada = opcion.dataset.duracion;

                // Usamos tu función de UI
                mostrarPaso('calendar-section');

                // Si ya hay fecha, refrescamos horarios
                const fechaInput = document.getElementById('fecha-reserva');
                if (fechaInput && fechaInput.value) {
                    verificarDiaYGenerarHorarios(fechaInput.value).catch(err => console.error("Error al generar horarios:", err));
                }
            }
        });
    }

    // Initialize Flatpickr for the date input
    const fechaReservaInput = document.getElementById('fecha-reserva');
    if (fechaReservaInput) {
        if (typeof flatpickr !== 'undefined') {
            flatpickr("#fecha-reserva", {
                minDate: "today",
                disable: [
                    function(date) {
                        // Return true to disable Sundays (0 = Sunday)
                        return (date.getDay() === 0);
                    }
                ],
                onChange: function(selectedDates, dateStr, instance) {
                    if (dateStr) {
                        verificarDiaYGenerarHorarios(dateStr).catch(err => console.error("Error al generar horarios:", err));
                    }
                }
            });
        } else {
            // Fallback if flatpickr doesn't load
            fechaReservaInput.addEventListener('change', (e) => {
                verificarDiaYGenerarHorarios(e.target.value).catch(err => console.error("Error al generar horarios:", err));
            });
        }
    } else {
        console.log("El input de fecha no está en esta pantalla, saltando inicialización de flatpickr.");
    }

    // Escuchador para el botón final
    const btnConfirmarFinal = document.getElementById('btn-confirmar-final');
    if (btnConfirmarFinal) {
        btnConfirmarFinal.onclick = confirmarReservaFinal;
    } else {
        console.log("El botón de confirmación final no está en esta pantalla, saltando asignación.");
    }
});

// Variables globales para los datos seleccionados
window.servicioSeleccionado = "";
window.servicioId = "";
window.fechaSeleccionada = "";
window.horarioSeleccionado = "";

async function confirmarReservaFinal() {
    const select = document.getElementById('select-servicios');
    const opcion = select.options[select.selectedIndex];
    const duracionExtraida = (opcion ? opcion.getAttribute('data-duracion') : "60") || "60";

    // Calculamos el fin usando el nuevo utilitario
    const horaFinCalculada = calcularFin(window.horarioSeleccionado, duracionExtraida);

    const datosReserva = {
        cliente: window.clienteNombre,
        email: window.clienteEmail,
        servicio: window.servicioSeleccionado,
        servicioId: window.servicioId,
        fecha: window.fechaSeleccionada,
        hora: window.horarioSeleccionado,
        horaFin: horaFinCalculada, // Agregamos el fin calculado
        duracion: duracionExtraida,
        accessToken: window.googleAccessToken // Usamos la variable global de auth.js
    };

    // Check credits
    if (window.clienteCreditos && window.clienteCreditos[window.servicioId] && window.clienteCreditos[window.servicioId] > 0) {
        if (confirm(`Tenés ${window.clienteCreditos[window.servicioId]} créditos para este servicio. ¿Querés usar 1 crédito para reservar sin pagar ahora?`)) {
            datosReserva.usar_credito = true;
        }
    }

    try {
        console.log("Iniciando proceso de guardado...");

        // 1. Guardar en WordPress usando el nuevo servicio
        const wpResponse = await guardarReservaEnWP(datosReserva);
        if (!wpResponse || !wpResponse.ok) throw new Error("Error al guardar en la base de datos de WordPress.");

        // 2. Redirigir a Mercado Pago o mostrar éxito si se usó crédito / MP desactivado
        if (wpResponse.method === 'wallet' || wpResponse.method === 'free') {
            mostrarPantallaExito({
                servicio: window.servicioSeleccionado,
                fecha: window.fechaSeleccionada,
                hora: window.horarioSeleccionado
            });
            // Update local credits if used
            if (wpResponse.method === 'wallet' && window.clienteCreditos && window.clienteCreditos[window.servicioId]) {
                window.clienteCreditos[window.servicioId] -= 1;
            }
        } else if (wpResponse.init_point) {
            window.location.href = wpResponse.init_point;
        } else {
            alert("Reserva guardada, pero hubo un error al generar el pago.");
        }

    } catch (error) {
        console.error("Fallo en el flujo de reserva:", error);
        alert(error.message || "Hubo un problema técnico. Revisá la consola.");
    }
}

// Exported for testing
export { confirmarReservaFinal };
