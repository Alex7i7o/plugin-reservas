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
export function renderizarHorarios(duracion, config, callbackSeleccion) {
    const contenedor = document.getElementById('grid-horarios');
    if (!contenedor) return;
    
    contenedor.innerHTML = ''; 

    let [hI, mI] = config.ap.split(':').map(Number);
    let [hF, mF] = config.ci.split(':').map(Number);
    let [hBi, mBi] = config.br_i.split(':').map(Number);
    let [hBf, mBf] = config.br_f.split(':').map(Number);

    let actual = hI * 60 + mI;
    let fin = hF * 60 + mF;
    let breakInicio = hBi * 60 + mBi;
    let breakFin = hBf * 60 + mBf;

    while (actual + duracion <= fin) {
        if (actual + duracion > breakInicio && actual < breakFin) {
            actual = breakFin;
            continue;
        }

        const h = Math.floor(actual / 60).toString().padStart(2, '0');
        const m = (actual % 60).toString().padStart(2, '0');
        const tiempo = `${h}:${m}`;

        const btn = document.createElement('button');
        btn.textContent = tiempo;
        btn.className = 'btn-horario';
        btn.onclick = (e) => callbackSeleccion(tiempo, e);
        
        contenedor.appendChild(btn);
        actual += duracion;
    }
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
        exitoSection.innerHTML = `
            <h3>¡Reserva Realizada con éxito!</h3>
            <p>Se envió un recordatorio a tu Google Calendar.</p>
            <button onclick="location.reload()" class="btn-exito">Volver a reservar</button>
        `;
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