import { renderizarHorarios } from './reservas-ui.js';
import { consultarDisponibilidadNegocio } from '../shared/calendario-service.js';

export async function verificarDiaYGenerarHorarios(fechaSeleccionada) {

    // 1. Convertimos la fecha para saber qué día de la semana es
    const dateObj = new Date(fechaSeleccionada + 'T00:00:00');
    const diaIngles = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dateObj).toLowerCase();
    const diaEspañol = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(dateObj).toLowerCase();

    // 2. Buscamos la configuración específica de ese día (ej: 'monday')
    const config = appConfig.horariosSemana[diaIngles];

    // 3. Verificamos si existe la configuración y si el 'status' es true (activo)
    if (config && config.activo) {
        const select = document.getElementById('select-servicios');
        const opcion = select.options[select.selectedIndex];
        const duracion = parseInt(opcion ? opcion.getAttribute('data-duracion') : 60) || 60;

        const container = document.getElementById('horarios-container');
        const grid = document.getElementById('grid-horarios');
        const loading = document.getElementById('loading-horarios');
        const empty = document.getElementById('empty-horarios');

        if (container) container.style.display = 'block';
        if (grid) grid.style.display = 'none';
        if (empty) empty.style.display = 'none';
        if (loading) loading.style.display = 'flex';

        try {
            // Obtenemos los horarios ocupados
            const ocupados = await consultarDisponibilidadNegocio(fechaSeleccionada);

            // Llamamos a la nueva función
            const hayTurnos = renderizarHorarios(duracion, config, seleccionarHorario, ocupados);

            if (loading) loading.style.display = 'none';

            if (hayTurnos) {
                if (grid) grid.style.display = 'grid';
            } else {
                if (empty) {
                    empty.textContent = 'No hay turnos disponibles para este día.';
                    empty.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error al consultar disponibilidad:', error);
            if (loading) loading.style.display = 'none';
            if (empty) {
                empty.textContent = 'Hubo un error al cargar los horarios. Por favor, intente nuevamente.';
                empty.style.display = 'block';
            }
        }
    } else {
        // Si config.activo es false, el negocio está cerrado
        alert("Lo sentimos, el negocio permanece cerrado el día " + diaEspañol);
        document.getElementById('horarios-container').style.display = 'none';
    }
}

// Seleccionador de Horarios
export function seleccionarHorario(hora, event) {
    // 1. Estética: Marcamos el botón seleccionado
    document.querySelectorAll('.btn-horario').forEach(b => b.classList.remove('selected'));
    event.target.classList.add('selected');

    // 2. Guardamos la elección en nuestras variables globales
    window.horarioSeleccionado = hora;

    const fechaReserva = document.getElementById('fecha-reserva');
    if (fechaReserva) window.fechaSeleccionada = fechaReserva.value;

    const select = document.getElementById('select-servicios');
    if (select) window.servicioSeleccionado = select.options[select.selectedIndex].text;

    // 3. ¡La clave! Cambiamos el display de 'none' a 'block'
    const confirmSection = document.getElementById('confirmacion-section');
    if (confirmSection) confirmSection.style.display = 'block';

    // 4. Mostramos el resumen para que el cliente esté seguro
    const resumenTexto = document.getElementById('resumen-texto');
    if (resumenTexto) {
        resumenTexto.textContent = ''; // Limpiamos

        const crearLineaResumen = (etiqueta, valor) => {
            const strong = document.createElement('strong');
            strong.textContent = etiqueta + ':';
            resumenTexto.appendChild(strong);
            resumenTexto.appendChild(document.createTextNode(` ${valor}`));
            resumenTexto.appendChild(document.createElement('br'));
        };

        crearLineaResumen('Servicio', window.servicioSeleccionado);
        crearLineaResumen('Día', window.fechaSeleccionada);
        crearLineaResumen('Hora', `${window.horarioSeleccionado} hs.`);
    }

    // 5. Scroll suave hasta el botón para que el usuario lo vea (opcional)
    if (confirmSection) confirmSection.scrollIntoView({ behavior: 'smooth' });
}
