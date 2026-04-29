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

        <div class="form-actions">
            <button type="submit" id="btn-submit-manual" class="button button-primary btn-reserva">Agendar Turno Manualmente</button>
        </div>
    `;

    // 2. Fetch Services and populate Select
    try {
        const response = await fetch(`${baseApiUrl}servicios/todos`, {
            method: 'GET',
            headers: { 'X-WP-Nonce': appConfig.nonce },
            credentials: 'same-origin'
        });

        if (response.ok) {
            const servicios = await response.json();
            const select = document.getElementById('manual-servicio');
            select.innerHTML = '<option value="">Seleccione un servicio</option>';
            servicios.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.titulo; // Store title to save in DB, or ID depending on need
                opt.textContent = s.titulo;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error('Error fetching services for manual booking', e);
        document.getElementById('manual-servicio').innerHTML = '<option value="">Error cargando servicios</option>';
    }

    // 3. Handle Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('btn-submit-manual');
        const originalText = btn.textContent;
        btn.textContent = 'Agendando...';
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
            const response = await fetch(`${baseApiUrl}turno-manual`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': appConfig.nonce
                },
                credentials: 'same-origin',
                body: JSON.stringify(payload)
            });

            if (response.ok || response.status === 207) {
                const result = await response.json();
                alert(result.message || 'Turno manual creado.');
                form.reset();

                // Re-fetch appointments if the user switches tabs
                const { fetchAndRenderAppointments } = await import('./appointments-table.js');
                if (typeof fetchAndRenderAppointments === 'function') {
                    fetchAndRenderAppointments(); // Update background data
                }

            } else {
                const err = await response.json();
                alert(`Error al crear turno manual: ${err.message}`);
            }
        } catch (error) {
            console.error('Network error during manual booking:', error);
            alert('Error de red al intentar agendar.');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-negocio')) {
        const btnManual = document.querySelector('.app-nav-btn[data-target="carga-manual"]');
        if (btnManual) {
            btnManual.addEventListener('click', () => {
                // Initialize if it hasn't been initialized
                const form = document.getElementById('form-carga-manual');
                if (form && form.innerHTML.trim() === '<!-- Será rellenado por JS -->') {
                    initManualBooking();
                } else if (form && form.innerHTML.trim() === '') {
                    initManualBooking();
                }
            });
        }

        // Also init if we start on this tab
        if (document.getElementById('section-carga-manual') && document.getElementById('section-carga-manual').classList.contains('active')) {
            initManualBooking();
        }
    }
});
