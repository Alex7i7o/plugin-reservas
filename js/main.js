import { inicializarGoogleAuth, loginConGoogle } from './shared/auth.js';
import { agendarEnGoogle } from './shared/calendario-service.js';
import { guardarReservaEnWP } from './reservas/wordpress-service.js';
import { calcularFin, escapeHTML } from './shared/utils.js';
import { obtenerServiciosDesdeWP } from './reservas/servicios-service.js';
import { 
    mostrarPantallaExito, 
    llenarSelectServicios, 
    mostrarPaso 
} from './reservas/reservas-ui.js';
import { verificarDiaYGenerarHorarios } from './reservas/horarios-logic.js';

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
    document.getElementById('fecha-reserva').addEventListener('change', (e) => {
        verificarDiaYGenerarHorarios(e.target.value).catch(err => console.error("Error al generar horarios:", err));
    });
}





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

        // 2. Redirigir a Mercado Pago o mostrar éxito si se usó crédito
        if (wpResponse.method === 'wallet') {
            mostrarPantallaExito({
                servicio: window.servicioSeleccionado,
                fecha: window.fechaSeleccionada,
                hora: window.horarioSeleccionado
            });
            // Update local credits
            window.clienteCreditos[window.servicioId] -= 1;
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

// Escuchador para el botón final
document.getElementById('btn-confirmar-final').onclick = confirmarReservaFinal;

// -----------------




// ---- PERFIL Y MIS RESERVAS ----
document.addEventListener('DOMContentLoaded', () => {
    const btnMiPerfil = document.getElementById('btn-mi-perfil');
    if (btnMiPerfil) {
        btnMiPerfil.onclick = toggleMiPerfil;
    }
    const btnVolver = document.getElementById('btn-volver-reserva');
    if (btnVolver) {
        btnVolver.onclick = () => {
            document.getElementById('mi-perfil-section').style.display = 'none';
            document.getElementById('reserva-flow').style.display = 'block';
        };
    }
});

async function toggleMiPerfil() {
    const miPerfilSection = document.getElementById('mi-perfil-section');
    const reservaFlow = document.getElementById('reserva-flow');

    if (miPerfilSection.style.display === 'none') {
        miPerfilSection.style.display = 'block';
        reservaFlow.style.display = 'none';

        // Cargar datos
        cargarDatosPerfil();
    } else {
        miPerfilSection.style.display = 'none';
        reservaFlow.style.display = 'block';
    }
}

async function cargarDatosPerfil() {
    const lista = document.getElementById('mis-reservas-lista');
    const info = document.getElementById('perfil-info');

    lista.innerHTML = '<p>Cargando reservas...</p>';

    if (window.clienteCreditos) {
        let htmlCreditos = '<p><strong>Mis Créditos (Wallet):</strong></p><ul>';
        for (const [servicioId, creditos] of Object.entries(window.clienteCreditos)) {
            if (creditos > 0) {
                htmlCreditos += `<li>Servicio ID ${servicioId}: ${creditos} créditos</li>`;
            }
        }
        htmlCreditos += '</ul>';
        info.innerHTML = htmlCreditos;
    } else {
        info.innerHTML = '<p>No tenés créditos disponibles.</p>';
    }

    try {
        const resp = await fetch(`${appConfig.apiUrl}mis-reservas?email=${window.clienteEmail}`);
        if (resp.ok) {
            const reservas = await resp.json();
            if (reservas.length === 0) {
                lista.innerHTML = '<p>No tenés próximos turnos.</p>';
            } else {
                lista.innerHTML = '';
                reservas.forEach(r => {
                    const div = document.createElement('div');
                    div.style.border = '1px solid #ccc';
                    div.style.padding = '10px';
                    div.style.marginBottom = '10px';
                    div.style.borderRadius = '5px';

                    const p = document.createElement('p');
                    p.innerHTML = `<strong>${r.servicio}</strong> - ${r.fecha} a las ${r.hora}`;
                    div.appendChild(p);

                    // Verificar regla de 12 horas
                    const now = new Date().getTime() / 1000;
                    if ((r.timestamp - now) > 12 * 3600) {
                        const btn = document.createElement('button');
                        btn.textContent = 'Cancelar Turno';
                        btn.className = 'button button-outline';
                        btn.onclick = () => cancelarReserva(r.id);
                        div.appendChild(btn);
                    } else {
                        const span = document.createElement('span');
                        span.style.fontSize = '12px';
                        span.style.color = 'red';
                        span.textContent = ' (Faltan menos de 12hs, no se puede cancelar online)';
                        div.appendChild(span);
                    }

                    lista.appendChild(div);
                });
            }
        }
    } catch (e) {
        console.error("Error al cargar reservas", e);
        lista.innerHTML = '<p>Error al cargar reservas.</p>';
    }
}

async function cancelarReserva(reservaId) {
    if (!confirm('¿Estás seguro de que querés cancelar este turno?')) return;
    try {
        const resp = await fetch(`${appConfig.apiUrl}cancelar-reserva`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reserva_id: reservaId,
                email: window.clienteEmail
            })
        });

        if (resp.ok) {
            alert("Turno cancelado.");
            cargarDatosPerfil(); // recargar
        } else {
            const err = await resp.json();
            alert("Error: " + err.message);
        }
    } catch (e) {
        console.error(e);
        alert("Ocurrió un error.");
    }
}
// ------------------------------
