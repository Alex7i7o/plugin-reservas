/**
 * @fileoverview Módulo de carga manual de turnos para el panel de negocio Violett.
 * Permite al administrador crear y modificar turnos manualmente.
 * @module app-negocio/manual-booking
 */

let editingTurnoId = null;

/**
 * Inicializa el formulario de carga manual de turnos.
 * Construye el HTML, carga servicios y configura el manejo del submit.
 * @returns {Promise<void>}
 */
export async function initManualBooking() {
    const form = document.getElementById('form-carga-manual');
    if (!form) return;

    const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');

    // 1. Build the form HTML
    form.innerHTML = `
        <div class="form-group">
            <label for="manual-cliente">Nombre del Cliente</label>
            <input name="cliente" type="text" id="manual-cliente" class="input-pro" required>
        </div>

        <div class="form-group">
            <label for="manual-email">Email</label>
            <input name="email" type="email" id="manual-email" class="input-pro" required>
        </div>

        <div class="form-group">
            <label for="manual-servicio">Servicio</label>
            <select name="servicio" id="manual-servicio" class="input-pro" required>
                <option value="">Cargando servicios...</option>
            </select>
        </div>

        <div class="form-group">
            <label for="manual-fecha">Fecha</label>
            <input name="fecha" type="date" id="manual-fecha" class="input-pro" required>
        </div>

        <div class="form-group">
            <label for="manual-hora">Hora Inicio</label>
            <input name="hora" type="time" id="manual-hora" class="input-pro" required>
        </div>

        <div class="form-group">
            <label for="manual-hora-fin">Hora Fin</label>
            <input name="hora_fin" type="time" id="manual-hora-fin" class="input-pro">
        </div>

        <div class="form-actions" style="display: flex; gap: 10px;">
            <button type="submit" id="btn-submit-manual" class="button button-primary btn-reserva">Agendar Turno Manualmente</button>
            <button type="button" id="btn-cancel-edit-turno" class="button" style="display: none;">Cancelar Edición</button>
        </div>
    `;

    const btnCancel = document.getElementById('btn-cancel-edit-turno');
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            resetManualForm();
        });
    }

    // 2. Fetch Services and populate Select
    await populateServicesSelect();

    // 3. Handle Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('btn-submit-manual');
        const originalText = btn.textContent;
        const isEditing = editingTurnoId !== null;

        btn.textContent = isEditing ? 'Actualizando...' : 'Agendando...';
        btn.disabled = true;

        const payload = {
            cliente: document.getElementById('manual-cliente').value,
            email: document.getElementById('manual-email').value,
            servicio: document.getElementById('manual-servicio').value,
            fecha: document.getElementById('manual-fecha').value,
            hora: document.getElementById('manual-hora').value,
            hora_fin: document.getElementById('manual-hora-fin').value,
        };

        try {
            const url = isEditing ? `${baseApiUrl}turno/${editingTurnoId}` : `${baseApiUrl}turno-manual`;
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': appConfig.nonce
                },
                credentials: 'same-origin',
                body: JSON.stringify(payload)
            });

            if (response.ok || response.status === 207) {
                const result = await response.json();
                alert(result.message || (isEditing ? 'Turno actualizado.' : 'Turno manual creado.'));
                
                resetManualForm();

                // Re-fetch appointments
                const { fetchAndRenderAppointments } = await import('./appointments-table.js');
                if (typeof fetchAndRenderAppointments === 'function') {
                    fetchAndRenderAppointments();
                }

                // If editing, switch back to "Todos" or "Hoy"
                if (isEditing) {
                    const btnTodos = document.querySelector('.app-nav-btn[data-target="todos"]');
                    if (btnTodos) btnTodos.click();
                }

            } else {
                const err = await response.json();
                alert(`Error: ${err.message}`);
            }
        } catch (error) {
            console.error('Network error during manual booking:', error);
            alert('Error de red al intentar procesar.');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}

/**
 * Obtiene los servicios de la API y puebla el select del formulario.
 * @returns {Promise<void>}
 */
async function populateServicesSelect() {
    const select = document.getElementById('manual-servicio');
    if (!select) return;

    const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');

    try {
        const response = await fetch(`${baseApiUrl}servicios/todos`, {
            method: 'GET',
            headers: { 'X-WP-Nonce': appConfig.nonce },
            credentials: 'same-origin'
        });

        if (response.ok) {
            const servicios = await response.json();
            select.innerHTML = '<option value="">Seleccione un servicio</option>';
            servicios.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.titulo;
                opt.textContent = s.titulo;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error('Error fetching services', e);
        select.innerHTML = '<option value="">Error cargando servicios</option>';
    }
}

/**
 * Resetea el formulario al estado de "Carga Manual" (Creación).
 */
function resetManualForm() {
    const form = document.getElementById('form-carga-manual');
    if (form) form.reset();
    editingTurnoId = null;
    
    const btnSubmit = document.getElementById('btn-submit-manual');
    if (btnSubmit) btnSubmit.textContent = 'Agendar Turno Manualmente';
    
    const btnCancel = document.getElementById('btn-cancel-edit-turno');
    if (btnCancel) btnCancel.style.display = 'none';

    document.querySelector('#section-carga-manual h2').textContent = 'Carga Manual de Turno';
}

/**
 * Abre el formulario de carga manual en modo edición con los datos de un turno.
 * @param {Object} turnoData 
 */
export async function openEditTurnoForm(turnoData) {
    // 1. Switch to the tab
    const btnManual = document.querySelector('.app-nav-btn[data-target="carga-manual"]');
    if (btnManual) btnManual.click();

    // 2. Ensure initialized
    const form = document.getElementById('form-carga-manual');
    if (form && (form.innerHTML.trim() === '<!-- Será rellenado por JS -->' || form.innerHTML.trim() === '')) {
        await initManualBooking();
    }

    // 3. Fill the form
    editingTurnoId = turnoData.id;
    document.getElementById('manual-cliente').value = turnoData.cliente || '';
    document.getElementById('manual-email').value = turnoData.email || '';
    document.getElementById('manual-fecha').value = turnoData.fecha || '';
    document.getElementById('manual-hora').value = turnoData.hora || '';
    document.getElementById('manual-hora-fin').value = turnoData.hora_fin || '';
    
    // Select service (need to wait for populate if async, but it should be fast or already there)
    const selectSrv = document.getElementById('manual-servicio');
    if (selectSrv.options.length <= 1) {
        await populateServicesSelect();
    }
    selectSrv.value = turnoData.servicio || '';

    // 4. UI Feedback
    document.getElementById('btn-submit-manual').textContent = 'Actualizar Turno';
    document.getElementById('btn-cancel-edit-turno').style.display = 'inline-block';
    document.querySelector('#section-carga-manual h2').textContent = 'Modificar Turno #' + turnoData.id;

    // Scroll to top of section
    document.getElementById('section-carga-manual').scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-negocio')) {
        const btnManual = document.querySelector('.app-nav-btn[data-target="carga-manual"]');
        if (btnManual) {
            btnManual.addEventListener('click', () => {
                const form = document.getElementById('form-carga-manual');
                if (form && (form.innerHTML.trim() === '<!-- Será rellenado por JS -->' || form.innerHTML.trim() === '')) {
                    initManualBooking();
                }
            });
        }

        if (document.getElementById('section-carga-manual') && document.getElementById('section-carga-manual').classList.contains('active')) {
            initManualBooking();
        }
    }
});
