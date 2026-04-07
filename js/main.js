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

// 1. Inicio automático
inicializarGoogleAuth(appConfig);

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

document.getElementById('select-servicios').onchange = (e) => {
    const opcion = e.target.selectedOptions[0];
    if (opcion && opcion.value !== "") {
        window.servicioSeleccionado = opcion.text;
        window.duracionSeleccionada = opcion.dataset.duracion;
        
        // Usamos tu función de UI
        mostrarPaso('calendar-section');
        
        // Si ya hay fecha, refrescamos horarios
        const fechaInput = document.getElementById('fecha-reserva');
        if (fechaInput && fechaInput.value) {
            verificarDiaYGenerarHorarios(fechaInput.value);
        }
    }
};

// 2. Escuchar cuando el usuario elige una fecha
document.getElementById('fecha-reserva').addEventListener('change', (e) => {
    verificarDiaYGenerarHorarios(e.target.value);
});



// Variables globales para los datos seleccionados
window.servicioSeleccionado = "";
window.fechaSeleccionada = "";
window.horarioSeleccionado = "";

async function confirmarReservaFinal() {
    const select = document.getElementById('select-servicios');
    const duracionExtraida = select.selectedOptions[0].getAttribute('data-duracion') || "60"; 

    // Calculamos el fin usando el nuevo utilitario
    const horaFinCalculada = calcularFin(window.horarioSeleccionado, duracionExtraida);

    const datosReserva = {
        cliente: window.clienteNombre,
        email: window.clienteEmail,
        servicio: window.servicioSeleccionado,
        fecha: window.fechaSeleccionada,
        hora: window.horarioSeleccionado,
        horaFin: horaFinCalculada, // Agregamos el fin calculado
        duracion: duracionExtraida,
        accessToken: window.googleAccessToken // Usamos la variable global de auth.js
    };

    try {
        console.log("Iniciando proceso de guardado...");

        // 1. Guardar en WordPress usando el nuevo servicio
        const okWP = await guardarReservaEnWP(datosReserva);
        if (!okWP) throw new Error("Error al guardar en la base de datos de WordPress.");

        // 2. Agendar en Google usando el servicio de calendario
        const resultadoGoogle = await agendarEnGoogle(datosReserva);

        // 3. Respuesta final al usuario
        if (resultadoGoogle.ok) {
            mostrarPantallaExito();
        } else if (resultadoGoogle.error !== 'unauthorized') {
            alert("Reserva guardada, pero hubo un error al agendar en tu Google Calendar.");
        }

    } catch (error) {
        console.error("Fallo en el flujo de reserva:", error);
        alert(error.message || "Hubo un problema técnico. Revisá la consola.");
    }
}

// Escuchador para el botón final
document.getElementById('btn-confirmar-final').onclick = confirmarReservaFinal;

// -----------------



