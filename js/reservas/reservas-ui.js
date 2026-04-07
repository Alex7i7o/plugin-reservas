/**
 * Controla la visibilidad de los pasos del formulario
 */
export function mostrarPaso(pasoId) {
    // Lista de todas nuestras secciones principales
    const secciones = [
        'login-section', 
        'service-section', 
        'calendar-section', 
        'horarios-container', 
        'confirmacion-section', 
        'exito-section'
    ];

    // Ocultamos todas menos la que queremos mostrar o mantenemos las previas
    // según la lógica de tu flujo.
    const seccion = document.getElementById(pasoId);
    if (seccion) {
        seccion.style.display = 'block';
        seccion.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Genera la grilla de botones de horarios
 */
export function renderizarHorarios(duracion, config, callbackSeleccion, ocupados = []) {
    const contenedor = document.getElementById('grid-horarios');
    if (!contenedor) return;
    
    contenedor.innerHTML = ''; 

    const parseMinutes = str => {
        const [h, m] = str.split(':');
        return parseInt(h, 10) * 60 + parseInt(m, 10);
    };

    let actual = parseMinutes(config.ap);
    let fin = parseMinutes(config.ci);
    let breakInicio = parseMinutes(config.br_i);
    let breakFin = parseMinutes(config.br_f);

    const ocupadosMinutos = ocupados.map(o => ({
        inicio: parseMinutes(o.inicio),
        fin: parseMinutes(o.fin)
    }));

    const fragment = document.createDocumentFragment();

    while (actual + duracion <= fin) {
        if (actual + duracion > breakInicio && actual < breakFin) {
            actual = breakFin;
            continue;
        }

        const turnoFin = actual + duracion;

        // Comprobar si hay solapamiento con algún evento ocupado
        const estaOcupado = ocupadosMinutos.some(ocupado => {
            return (actual < ocupado.fin) && (turnoFin > ocupado.inicio);
        });

        if (estaOcupado) {
            actual += duracion;
            continue;
        }

        const h = Math.floor(actual / 60).toString().padStart(2, '0');
        const m = (actual % 60).toString().padStart(2, '0');
        const tiempo = `${h}:${m}`;

        const btn = document.createElement('button');
        btn.innerText = tiempo;
        btn.className = 'btn-horario';
        btn.onclick = (e) => callbackSeleccion(tiempo, e);
        
        fragment.appendChild(btn);
        actual += duracion;
    }

    contenedor.appendChild(fragment);
}

/**
 * Muestra la pantalla de éxito final
 */
export function mostrarPantallaExito() {
    // 1. Ocultamos las secciones previas
    const login = document.getElementById('login-section');
    const service = document.getElementById('service-section');
    const confirm = document.getElementById('confirmacion-section');
    
    if (login) login.style.display = 'none';
    if (service) service.style.display = 'none';
    if (confirm) confirm.style.display = 'none';
    
    // 2. Mostramos el éxito
    const exitoSection = document.getElementById('exito-section');
    if (exitoSection) {
        exitoSection.style.display = 'block';

        // Clear existing content safely
        exitoSection.textContent = '';

        const h3 = document.createElement('h3');
        h3.textContent = '¡Reserva Realizada con éxito!';
        exitoSection.appendChild(h3);

        const p = document.createElement('p');
        p.textContent = 'Se envió un recordatorio a tu Google Calendar.';
        exitoSection.appendChild(p);

        const btn = document.createElement('button');
        btn.className = 'btn-exito';
        btn.textContent = 'Volver a reservar';
        btn.onclick = () => location.reload();
        exitoSection.appendChild(btn);

        exitoSection.scrollIntoView({ behavior: 'smooth' });
    }
}


export function llenarSelectServicios(servicios) {
    const select = document.getElementById('select-servicios');
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona un servicio</option>';
    
    servicios.forEach(srv => {
        const precio = srv.acf?.precio || '0';
        const duracion = srv.acf?.duracion || '30';

        const option = document.createElement('option');
        option.value = srv.id;
        option.dataset.duracion = duracion;
        option.textContent = `${srv.title.rendered} - $${precio}`;
        select.appendChild(option);
    });
}