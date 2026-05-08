/**
 * @fileoverview Módulo de configuración de horarios para el panel de negocio Violett.
 * Permite configurar días laborales, horarios de apertura/cierre y breaks
 * para cada día de la semana. Los cambios se persisten vía REST API.
 * @module app-negocio/schedules
 */

/**
 * Inicializa la sección de horarios.
 * Expone la función de carga como global para que AppLayout pueda invocarla.
 * @returns {Promise<void>}
 */
export async function initSchedules() {
    const container = document.getElementById('horarios-grid-container');
    if (!container) return;

    // Exponer función global para que AppLayout pueda llamarla al cambiar de sección
    window.cargarHorariosNegocio = cargarHorarios;
    
    // Carga inicial
    cargarHorarios();
}

async function cargarHorarios() {
    const container = document.getElementById('horarios-grid-container');
    if (!container) return;

    container.innerHTML = '<p>Cargando horarios...</p>';

    try {
        const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');
        const resp = await fetch(`${baseApiUrl}negocio/horarios`, {
            headers: { 'X-WP-Nonce': appConfig.nonce },
            credentials: 'same-origin'
        });

        if (!resp.ok) throw new Error('No se pudieron cargar los horarios');

        const data = await resp.json();
        renderHorarios(data);

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="color:red;">Error al cargar horarios.</p>';
    }
}

function renderHorarios(data) {
    const container = document.getElementById('horarios-grid-container');
    const dias = {
        lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves',
        vie: 'Viernes', sab: 'Sábado', dom: 'Domingo'
    };

    let html = '';
    Object.keys(dias).forEach(dia => {
        const d = data[dia] || {};
        html += `
            <div class="day-card">
                <div class="day-header">
                    <h3>${dias[dia]}</h3>
                    <label class="toggle-switch">
                        <input type="checkbox" id="status-${dia}" ${d.status ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="day-grid">
                    <div class="form-group">
                        <label>Apertura</label>
                        <input type="time" id="ap-${dia}" value="${d.ap || '09:00'}" class="input-time">
                    </div>
                    <div class="form-group">
                        <label>Cierre</label>
                        <input type="time" id="ci-${dia}" value="${d.ci || '18:00'}" class="input-time">
                    </div>
                    <div class="form-group">
                        <label>Inicio Break</label>
                        <input type="time" id="br_i-${dia}" value="${d.br_i || ''}" class="input-time">
                    </div>
                    <div class="form-group">
                        <label>Fin Break</label>
                        <input type="time" id="br_f-${dia}" value="${d.br_f || ''}" class="input-time">
                    </div>
                </div>
                <button class="btn-save-day" data-dia="${dia}">Guardar ${dias[dia]}</button>
            </div>
        `;
    });

    container.innerHTML = html;

    // Eventos de guardado
    container.querySelectorAll('.btn-save-day').forEach(btn => {
        btn.onclick = async () => {
            const dia = btn.getAttribute('data-dia');
            const datos = {
                status: document.getElementById(`status-${dia}`).checked,
                ap: document.getElementById(`ap-${dia}`).value,
                ci: document.getElementById(`ci-${dia}`).value,
                br_i: document.getElementById(`br_i-${dia}`).value,
                br_f: document.getElementById(`br_f-${dia}`).value,
            };

            btn.disabled = true;
            btn.textContent = 'Guardando...';

            const success = await guardarHorarioDia(dia, datos);
            
            if (success) {
                btn.textContent = '¡Guardado!';
                btn.classList.add('success');
                setTimeout(() => {
                    btn.disabled = false;
                    btn.textContent = `Guardar ${dias[dia]}`;
                    btn.classList.remove('success');
                }, 2000);
            } else {
                btn.disabled = false;
                btn.textContent = 'Error';
                setTimeout(() => {
                    btn.textContent = `Guardar ${dias[dia]}`;
                }, 2000);
            }
        };
    });
}

async function guardarHorarioDia(dia, datos) {
    try {
        const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');
        const resp = await fetch(`${baseApiUrl}negocio/horarios`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-WP-Nonce': appConfig.nonce 
            },
            credentials: 'same-origin',
            body: JSON.stringify({ dia, datos })
        });
        return resp.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}
