import { inicializarGoogleAuth, loginConGoogle, cerrarSesion } from '../shared/auth.js';
import { consultarDisponibilidadNegocio } from '../shared/calendario-service.js';
import { calcularFin } from '../shared/utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const appCliente = document.getElementById('app-cliente');
    if (!appCliente) return;

    // Inicializar Google Auth
    inicializarGoogleAuth({});

    const btnLogin = document.getElementById('btn-google-login-cliente');
    if (btnLogin) {
        btnLogin.onclick = loginConGoogle;
    }

    // Esperar a que window.clienteEmail se pueble tras login o carga de sesión
    verificarSesionYMostrarPerfil();

    // Cerrar modal
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    if (btnCerrarModal) {
        btnCerrarModal.onclick = cerrarModalReserva;
    }

    const modalOverlay = document.getElementById('modal-reserva-rapida');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) cerrarModalReserva();
        });
    }
    const modalOverlayModificar = document.getElementById('modal-modificar-reserva');
    if (modalOverlayModificar) {
        modalOverlayModificar.addEventListener('click', (e) => {
            if (e.target === modalOverlayModificar) cerrarModalModificar();
        });
    }

    const btnCerrarModificar = document.getElementById('btn-cerrar-modal-modificar');
    if (btnCerrarModificar) {
        btnCerrarModificar.onclick = cerrarModalModificar;
    }
});

// Exponemos disparador global para re-renderizar la UI tras login
window.dispararUIViolett = () => {
    console.log("Disparando actualización de UI...");
    const loginSec = document.getElementById('login-section-cliente');
    const perfilSec = document.getElementById('perfil-section-cliente');
    
    if (loginSec) loginSec.style.display = 'none';
    if (perfilSec) perfilSec.style.display = 'block';
    
    renderPerfilHeader();
    cargarPaquetes();
    cargarMisReservas();
    cargarServiciosCompra();
    initComprarPaquete();
};

function verificarSesionYMostrarPerfil() {
    let intentos = 0;
    const intervalo = setInterval(() => {
        if (window.clienteEmail) {
            clearInterval(intervalo);
            window.dispararUIViolett();
        }
        intentos++;
        if (intentos > 30) { // Aumentamos a 15 segundos de margen
            clearInterval(intervalo);
        }
    }, 500);
}

function renderPerfilHeader() {
    const container = document.getElementById('perfil-header-container');
    if (!container) return;

    const sesion = sessionStorage.getItem('userSesion');
    const perfil = sesion ? JSON.parse(sesion) : {};
    const fotoUrl = perfil.picture || perfil.avatar || 'https://via.placeholder.com/50';

    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1.5rem; width: 100%;">
            <img src="${fotoUrl}" class="perfil-avatar" referrerpolicy="no-referrer" alt="Avatar" style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid #ff6b00;">
            <div class="perfil-info" style="flex: 1;">
                <h3 style="margin: 0; color: #4b3669; font-size: 1.4rem;">Hola, ${escapeHTML(perfil.name || window.clienteNombre || 'Cliente')}</h3>
                <p style="margin: 0; color: #777; font-size: 0.9rem;">${escapeHTML(window.clienteEmail || '')}</p>
            </div>
            <button id="btn-logout-header" class="button" style="background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; padding: 8px 16px; border-radius: 25px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                Cerrar Sesión
            </button>
        </div>
    `;

    const btnLogout = document.getElementById('btn-logout-header');
    if (btnLogout) {
        btnLogout.onclick = (e) => {
            e.preventDefault();
            if(confirm('¿Deseas cerrar sesión?')) {
                cerrarSesion();
            }
        };
    }
}

// --- BILLETERA DE CRÉDITOS ---

async function cargarPaquetes() {
    const container = document.getElementById('billetera-container');
    if (!container) return;

    container.innerHTML = '<p>Cargando paquetes...</p>';

    try {
        const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');
        const tokenParam = appConfig.violettToken ? `?violett_token=${appConfig.violettToken}` : '';
        const resp = await fetch(`${baseApiUrl}mis-paquetes${tokenParam}`, {
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': appConfig.nonce,
                'X-Violett-Token': appConfig.violettToken || ''
            }
        });

        if (resp.status === 401) {
            console.warn("Sesión expirada o token inválido. Re-autenticando...");
            document.getElementById('login-section-cliente').style.display = 'block';
            document.getElementById('perfil-section-cliente').style.display = 'none';
            return;
        }

        if (!resp.ok) {
            container.innerHTML = '<p>No se pudieron cargar los paquetes.</p>';
            return;
        }

        const paquetes = await resp.json();

        if (paquetes.length === 0) {
            container.innerHTML = `
                <div class="billetera-empty">
                    <div class="empty-icon">💳</div>
                    <p>No tenés paquetes de créditos activos.</p>
                </div>
            `;
            return;
        }

        // Ordenar: activos primero, luego agotados, luego vencidos
        const orden = { activo: 0, agotado: 1, vencido: 2 };
        paquetes.sort((a, b) => (orden[a.estado] || 99) - (orden[b.estado] || 99));

        let html = '<div class="billetera-grid">';
        paquetes.forEach(paq => {
            const porcentaje = paq.sesiones_totales > 0
                ? Math.round((paq.sesiones_restantes / paq.sesiones_totales) * 100)
                : 0;

            const estadoTexto = paq.estado === 'activo' ? 'Activo'
                : paq.estado === 'vencido' ? 'Vencido'
                : 'Agotado';

            const puedeReservar = paq.estado === 'activo' && paq.sesiones_restantes > 0;

            html += `
                <div class="paquete-card estado-${paq.estado}">
                    <div class="paquete-header">
                        <div class="paquete-servicio">${escapeHTML(paq.servicio_nombre)}</div>
                        <span class="paquete-badge">${estadoTexto}</span>
                    </div>
                    <div class="paquete-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${porcentaje}%"></div>
                        </div>
                        <div class="progress-text">
                            <span><strong>${paq.sesiones_restantes}</strong> restantes</span>
                            <span>de ${paq.sesiones_totales} totales</span>
                        </div>
                    </div>
                    <div class="paquete-fechas">
                        <span>
                            <small>Compra</small>
                            ${paq.fecha_compra || '-'}
                        </span>
                        <span>
                            <small>Vence</small>
                            ${paq.fecha_vencimiento || '-'}
                        </span>
                    </div>
                    ${puedeReservar ? `
                        <button class="btn-reservar-credito" 
                                data-servicio-id="${paq.servicio_id}"
                                data-servicio-nombre="${escapeHTML(paq.servicio_nombre)}"
                                data-paquete-id="${paq.id}">
                            ⚡ Reservar con este crédito
                        </button>
                    ` : ''}
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;

        // Attach event listeners a los botones de reservar
        container.querySelectorAll('.btn-reservar-credito').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const servicioId = e.target.getAttribute('data-servicio-id');
                const servicioNombre = e.target.getAttribute('data-servicio-nombre');
                abrirModalReservaRapida(servicioId, servicioNombre);
            });
        });

    } catch (e) {
        console.error('Error al cargar paquetes:', e);
        container.innerHTML = '<p>Error al cargar los paquetes.</p>';
    }
}

// --- RESERVA RÁPIDA CON CRÉDITOS ---

let reservaRapidaState = {};

function abrirModalReservaRapida(servicioId, servicioNombre) {
    const modal = document.getElementById('modal-reserva-rapida');
    const body = document.getElementById('modal-body');
    if (!modal || !body) return;

    reservaRapidaState = { servicioId, servicioNombre };

    body.innerHTML = `
        <p style="margin-bottom: 1rem;">Reservar una sesión de <strong>${escapeHTML(servicioNombre)}</strong></p>
        <div class="form-group">
            <label for="modal-fecha">Elegí una fecha</label>
            <input type="date" id="modal-fecha" class="input-pro" min="${getTodayString()}">
        </div>
        <div id="modal-horarios-container" style="display: none;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #4b3669;">Elegí un horario</label>
            <div id="modal-loading" class="loading-horarios" style="display: none;">
                <div class="spinner"></div>
                Cargando horarios...
            </div>
            <div id="modal-empty" class="empty-horarios" style="display: none;">
                No hay turnos disponibles para este día.
            </div>
            <div id="modal-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(6.25rem, 1fr)); gap: 0.625rem;"></div>
        </div>
        <div id="modal-confirmacion" style="display: none; margin-top: 1.5rem;">
            <p id="modal-resumen" style="margin-bottom: 1rem;"></p>
            <button id="btn-confirmar-credito" class="btn-reservar-credito" style="background: #4b3669; border-color: #4b3669;">
                ✅ Confirmar Reserva
            </button>
        </div>
    `;

    modal.classList.add('active');

    const fechaInput = document.getElementById('modal-fecha');
    if (fechaInput) {
        fechaInput.addEventListener('change', (e) => {
            if (e.target.value) {
                cargarHorariosModal(e.target.value);
            }
        });
    }
}

function cerrarModalReserva() {
    const modal = document.getElementById('modal-reserva-rapida');
    if (modal) modal.classList.remove('active');
    reservaRapidaState = {};
}

async function cargarHorariosModal(fecha) {
    const grid = document.getElementById('modal-grid');
    const loading = document.getElementById('modal-loading');
    const empty = document.getElementById('modal-empty');
    const container = document.getElementById('modal-horarios-container');
    const confirmacion = document.getElementById('modal-confirmacion');

    if (!grid || !container) return;

    container.style.display = 'block';
    grid.style.display = 'none';
    if (empty) empty.style.display = 'none';
    if (loading) loading.style.display = 'flex';
    if (confirmacion) confirmacion.style.display = 'none';

    // Verificar día de la semana
    const dateObj = new Date(fecha + 'T00:00:00');
    const diaIngles = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dateObj).toLowerCase();
    const config = appConfig.horariosSemana[diaIngles];

    if (!config || !config.activo) {
        if (loading) loading.style.display = 'none';
        if (empty) {
            empty.textContent = 'El negocio no atiende este día.';
            empty.style.display = 'block';
        }
        return;
    }

    try {
        const ocupados = await consultarDisponibilidadNegocio(fecha);
        if (loading) loading.style.display = 'none';

        // Generar slots — asumimos duración estándar de 60min si no conocemos la del servicio
        const duracion = 60; // Default para reserva rápida
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

        grid.innerHTML = '';
        let haySlots = false;

        while (actual + duracion <= fin) {
            if (actual + duracion > breakInicio && actual < breakFin) {
                actual = breakFin;
                continue;
            }

            const turnoFin = actual + duracion;
            const estaOcupado = ocupadosMinutos.some(o => actual < o.fin && turnoFin > o.inicio);

            if (estaOcupado) {
                actual += duracion;
                continue;
            }

            const h = Math.floor(actual / 60).toString().padStart(2, '0');
            const m = (actual % 60).toString().padStart(2, '0');
            const tiempo = `${h}:${m}`;

            const btn = document.createElement('button');
            btn.textContent = tiempo;
            btn.className = 'btn-horario';
            btn.onclick = (e) => seleccionarHorarioModal(tiempo, fecha, e);
            grid.appendChild(btn);
            haySlots = true;

            actual += duracion;
        }

        if (haySlots) {
            grid.style.display = 'grid';
        } else {
            if (empty) {
                empty.textContent = 'No hay turnos disponibles para este día.';
                empty.style.display = 'block';
            }
        }

    } catch (error) {
        console.error('Error al cargar horarios:', error);
        if (loading) loading.style.display = 'none';
        if (empty) {
            empty.textContent = 'Error al cargar horarios. Intentá de nuevo.';
            empty.style.display = 'block';
        }
    }
}

function seleccionarHorarioModal(hora, fecha, event) {
    // Marcar seleccionado
    document.querySelectorAll('#modal-grid .btn-horario').forEach(b => b.classList.remove('selected'));
    event.target.classList.add('selected');

    reservaRapidaState.hora = hora;
    reservaRapidaState.fecha = fecha;

    const confirmacion = document.getElementById('modal-confirmacion');
    const resumen = document.getElementById('modal-resumen');

    if (confirmacion && resumen) {
        resumen.innerHTML = `
            <strong>Servicio:</strong> ${escapeHTML(reservaRapidaState.servicioNombre)}<br>
            <strong>Fecha:</strong> ${fecha}<br>
            <strong>Hora:</strong> ${hora} hs
        `;
        confirmacion.style.display = 'block';

        const btnConfirmar = document.getElementById('btn-confirmar-credito');
        if (btnConfirmar) {
            btnConfirmar.onclick = confirmarReservaConCredito;
        }
    }
}

async function confirmarReservaConCredito() {
    const btn = document.getElementById('btn-confirmar-credito');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Reservando...';
    }

    const horaFin = calcularFin(reservaRapidaState.hora, '60');

    const payload = {
        cliente: window.clienteNombre,
        email: window.clienteEmail,
        servicio: reservaRapidaState.servicioNombre,
        servicioId: reservaRapidaState.servicioId,
        fecha: reservaRapidaState.fecha,
        hora: reservaRapidaState.hora,
        horaFin: horaFin,
        duracion: '60',
        usar_credito: true,
        accessToken: window.googleAccessToken
    };

    try {
        const tokenParam = appConfig.violettToken ? `?violett_token=${appConfig.violettToken}` : '';
        const resp = await fetch(appConfig.apiUrl + 'reserva' + tokenParam, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': appConfig.nonce,
                'X-Violett-Token': appConfig.violettToken || ''
            },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if (resp.ok) {
            alert('¡Reserva realizada con éxito! Se descontó 1 crédito.');
            cerrarModalReserva();
            // Recargar datos
            cargarPaquetes();
            cargarMisReservas();
        } else {
            alert('Error: ' + (data.message || 'No se pudo realizar la reserva.'));
        }
    } catch (error) {
        console.error('Error al confirmar reserva con crédito:', error);
        alert('Error de red al intentar reservar.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '✅ Confirmar Reserva';
        }
    }
}

// --- MIS RESERVAS ---

async function cargarMisReservas() {
    const lista = document.getElementById('mis-reservas-lista');
    if (!lista) return;

    lista.innerHTML = '<p>Cargando reservas...</p>';

    try {
        const tokenParam = appConfig.violettToken ? `?violett_token=${appConfig.violettToken}` : '';
        const resp = await fetch(`${appConfig.apiUrl}mis-reservas${tokenParam}`, {
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': appConfig.nonce,
                'X-Violett-Token': appConfig.violettToken || ''
            }
        });

        if (resp.status === 401) {
            document.getElementById('login-section-cliente').style.display = 'block';
            document.getElementById('perfil-section-cliente').style.display = 'none';
            return;
        }

        if (!resp.ok) {
            lista.innerHTML = '<p>No se pudieron cargar las reservas.</p>';
            return;
        }

        const reservas = await resp.json();

        if (reservas.length === 0) {
            lista.innerHTML = `
                <div class="billetera-empty">
                    <div class="empty-icon">📅</div>
                    <p>No tenés próximos turnos agendados.</p>
                </div>
            `;
            return;
        }

        let html = '';
        reservas.forEach(r => {
            const now = new Date().getTime() / 1000;
            const puedeModificar = (r.timestamp - now) > 24 * 3600;

            const dateParts = r.fecha.split('-');
            const fechaFormateada = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : r.fecha;

            html += `
                <div class="turno-card" style="border-left: 5px solid ${puedeModificar ? '#4b3669' : '#ccc'}; padding: 1rem; background: #fff; margin-bottom: 1rem; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div class="turno-info">
                        <strong style="font-size: 1.1rem; color: #4b3669;">${escapeHTML(r.servicio)}</strong><br>
                        <span style="color: #666; font-size: 0.9rem;">📅 ${fechaFormateada} a las ${r.hora} hs</span>
                    </div>
                    <div class="turno-actions" style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;">
                        <button class="btn-modificar-turno button" data-id="${r.id}" data-token="${r.token_cancelacion}" data-puede="${puedeModificar}" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; background: #f0f0f0; color: #333; border-radius: 4px;">Modificar</button>
                        <button class="btn-cancelar-turno button" data-id="${r.id}" data-token="${r.token_cancelacion}" data-puede="${puedeModificar}" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; background: #dc3232; color: white; border-radius: 4px; border: none;">Cancelar</button>
                    </div>
                </div>
            `;
        });

        lista.innerHTML = html;

        // Attach events
        lista.querySelectorAll('.btn-cancelar-turno').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const puede = e.target.getAttribute('data-puede') === 'true';
                if (!puede) {
                    alert('Solo con 24hs de anticipacion se puede modificar o cancelar un turno');
                    return;
                }
                const id = e.target.getAttribute('data-id');
                const token = e.target.getAttribute('data-token');
                await cancelarReserva(id, token);
            });
        });

        lista.querySelectorAll('.btn-modificar-turno').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const puede = e.target.getAttribute('data-puede') === 'true';
                if (!puede) {
                    alert('Solo con 24hs de anticipacion se puede modificar o cancelar un turno');
                    return;
                }
                const id = e.target.getAttribute('data-id');
                const token = e.target.getAttribute('data-token');
                modificarReservaUI(id, token);
            });
        });

    } catch (e) {
        console.error('Error al cargar reservas:', e);
        lista.innerHTML = '<p>Error al cargar reservas.</p>';
    }
}

let modificarState = {};

function modificarReservaUI(reservaId, token) {
    const modal = document.getElementById('modal-modificar-reserva');
    if (!modal) return;
    
    modificarState = { reservaId, token };
    modal.classList.add('active');

    flatpickr("#input-modificar-fecha", {
        minDate: "today",
        dateFormat: "Y-m-d",
        onChange: (selectedDates, dateStr) => {
            if (dateStr) {
                cargarHorariosModificar(dateStr);
            }
        }
    });
}

function cerrarModalModificar() {
    const modal = document.getElementById('modal-modificar-reserva');
    if (modal) modal.classList.remove('active');
    modificarState = {};
}

async function cargarHorariosModificar(fecha) {
    const grid = document.getElementById('modificar-grid');
    const container = document.getElementById('modificar-horarios-container');
    const confirmBtn = document.getElementById('modificar-confirmacion');
    
    if (!grid || !container) return;
    
    container.style.display = 'block';
    grid.innerHTML = '<p>Cargando horarios...</p>';
    confirmBtn.style.display = 'none';

    try {
        const ocupados = await consultarDisponibilidadNegocio(fecha);
        // Usamos lógica simplificada igual que en reserva rápida
        const duracion = 60; 
        const dateObj = new Date(fecha + 'T00:00:00');
        const diaIngles = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dateObj).toLowerCase();
        const config = appConfig.horariosSemana[diaIngles];

        if (!config || !config.activo) {
            grid.innerHTML = '<p>Día no laboral.</p>';
            return;
        }

        const parseMin = s => { const [h,m] = s.split(':'); return parseInt(h)*60 + parseInt(m); };
        let actual = parseMin(config.ap);
        let fin = parseMin(config.ci);
        const ocupMin = ocupados.map(o => ({ inicio: parseMin(o.inicio), fin: parseMin(o.fin) }));

        grid.innerHTML = '';
        while (actual + duracion <= fin) {
            const tFin = actual + duracion;
            const ocupado = ocupMin.some(o => actual < o.fin && tFin > o.inicio);
            if (!ocupado) {
                const h = Math.floor(actual/60).toString().padStart(2,'0');
                const m = (actual%60).toString().padStart(2,'0');
                const tiempo = `${h}:${m}`;
                const btn = document.createElement('button');
                btn.textContent = tiempo;
                btn.className = 'btn-horario';
                btn.onclick = (e) => {
                    document.querySelectorAll('#modificar-grid .btn-horario').forEach(b => b.classList.remove('selected'));
                    e.target.classList.add('selected');
                    modificarState.nuevaFecha = fecha;
                    modificarState.nuevaHora = tiempo;
                    confirmBtn.style.display = 'block';
                };
                grid.appendChild(btn);
            }
            actual += duracion;
        }

        document.getElementById('btn-guardar-modificacion').onclick = () => {
            modificarReserva(modificarState.reservaId, modificarState.token, modificarState.nuevaFecha, modificarState.nuevaHora);
            cerrarModalModificar();
        };

    } catch (e) {
        grid.innerHTML = '<p>Error al cargar.</p>';
    }
}

async function modificarReserva(reservaId, tokenCancelacion, nuevaFecha, nuevaHora) {
    try {
        const email = window.clienteEmail;
        const tokenParam = appConfig.violettToken ? `?violett_token=${appConfig.violettToken}` : '';
        const resp = await fetch(`${appConfig.apiUrl}modificar-reserva${tokenParam}`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': appConfig.nonce,
                'X-Violett-Token': appConfig.violettToken || ''
            },
            body: JSON.stringify({
                reserva_id: reservaId,
                token: tokenCancelacion,
                email: email,
                nueva_fecha: nuevaFecha,
                nueva_hora: nuevaHora
            })
        });

        if (resp.ok) {
            alert('Turno modificado con éxito.');
            cargarMisReservas();
        } else {
            const err = await resp.json();
            alert('Error: ' + (err.message || 'No se pudo modificar.'));
        }
    } catch (e) {
        console.error(e);
        alert('Ocurrió un error al modificar.');
    }
}

async function cancelarReserva(reservaId, tokenCancelacion) {
    if (!confirm('¿Estás seguro de que querés cancelar este turno?')) return;
    try {
        const tokenParam = appConfig.violettToken ? `?violett_token=${appConfig.violettToken}` : '';
        const resp = await fetch(`${appConfig.apiUrl}cancelar-reserva${tokenParam}`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': appConfig.nonce,
                'X-Violett-Token': appConfig.violettToken || ''
            },
            body: JSON.stringify({
                reserva_id: reservaId,
                email: window.clienteEmail,
                token: tokenCancelacion
            })
        });

        if (resp.ok) {
            alert('Turno cancelado.');
            cargarMisReservas();
        } else {
            const err = await resp.json();
            alert('Error: ' + (err.message || 'No se pudo cancelar.'));
        }
    } catch (e) {
        console.error(e);
        alert('Ocurrió un error.');
    }
}

// --- COMPRAR PAQUETES ---

async function cargarServiciosCompra() {
    const select = document.getElementById('select-comprar-servicio');
    if (!select) return;

    try {
        const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');
        const tokenParam = appConfig.violettToken ? `?violett_token=${appConfig.violettToken}` : '';
        const resp = await fetch(`${baseApiUrl}servicios/todos${tokenParam}`, {
            credentials: 'same-origin',
            headers: { 
                'X-WP-Nonce': appConfig.nonce,
                'X-Violett-Token': appConfig.violettToken || ''
            }
        });
        if (resp.ok) {
            const servicios = await resp.json();
            select.innerHTML = '<option value="">Elegí un servicio...</option>';
            servicios.forEach(s => {
                const precio = s.precio || 0;
                select.innerHTML += `<option value="${s.id}" data-precio="${precio}">${s.titulo} ($${precio})</option>`;
            });
            poblarSesionesDinamicas();
            actualizarPrecioPaquete();
        }
    } catch (e) {
        console.error('Error cargando servicios:', e);
        select.innerHTML = '<option value="">Error al cargar</option>';
    }
}

function poblarSesionesDinamicas() {
    const selectSesiones = document.getElementById('select-comprar-sesiones');
    if (!selectSesiones) return;

    const options = appConfig.packageOptions || [];
    if (options.length === 0) {
        selectSesiones.innerHTML = '<option value="1">1 Sesión</option>';
        return;
    }

    // Ordenar por cantidad de sesiones
    options.sort((a, b) => a.sessions - b.sessions);

    selectSesiones.innerHTML = '';
    options.forEach(opt => {
        const text = opt.sessions === 1 ? '1 Sesión' : `${opt.sessions} Sesiones`;
        selectSesiones.innerHTML += `<option value="${opt.sessions}" data-discount="${opt.discount}">${text}</option>`;
    });
}

function actualizarPrecioPaquete() {
    const selectServicio = document.getElementById('select-comprar-servicio');
    const selectSesiones = document.getElementById('select-comprar-sesiones');
    const displayPrecio = document.getElementById('comprar-paquete-precio');
    
    if (!selectServicio || !selectSesiones || !displayPrecio) return;

    const sesiones = parseInt(selectSesiones.value);
    const selectedOption = selectServicio.options[selectServicio.selectedIndex];
    const precioBase = selectedOption ? parseFloat(selectedOption.getAttribute('data-precio')) : 0;

    if (!precioBase) {
        displayPrecio.textContent = 'Total: $0';
        return;
    }

    let descuento = 0;
    const selectedSessionOption = selectSesiones.options[selectSesiones.selectedIndex];
    if (selectedSessionOption) {
        descuento = parseFloat(selectedSessionOption.getAttribute('data-discount')) || 0;
    }

    const subtotal = precioBase * sesiones;
    const total = subtotal * (1 - (descuento / 100));

    displayPrecio.innerHTML = `
        <div style="display: flex; flex-direction: column;">
            <span style="font-size: 1.2rem;">Total: $${Math.round(total)}</span>
            ${descuento > 0 ? `<small style="color: #27ae60; font-size: 0.8rem;">¡${descuento}% OFF aplicado!</small>` : ''}
        </div>
    `;
}

function initComprarPaquete() {
    const btn = document.getElementById('btn-comprar-paquete');
    const selectServicio = document.getElementById('select-comprar-servicio');
    const selectSesiones = document.getElementById('select-comprar-sesiones');

    if (selectServicio) selectServicio.addEventListener('change', actualizarPrecioPaquete);
    if (selectSesiones) selectSesiones.addEventListener('change', actualizarPrecioPaquete);

    if (!btn) return;

    btn.addEventListener('click', async () => {
        const selectServicio = document.getElementById('select-comprar-servicio');
        const selectSesiones = document.getElementById('select-comprar-sesiones');
        const msj = document.getElementById('comprar-paquete-mensaje');

        const servicio_id = selectServicio.value;
        const sesiones = selectSesiones.value;

        if (!servicio_id) {
            alert('Por favor elegí un servicio.');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Procesando...';
        msj.style.display = 'none';

        try {
            const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');
            const tokenParam = appConfig.violettToken ? `?violett_token=${appConfig.violettToken}` : '';
            const resp = await fetch(`${baseApiUrl}comprar-paquete${tokenParam}`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': appConfig.nonce,
                    'X-Violett-Token': appConfig.violettToken || ''
                },
                credentials: 'same-origin',
                body: JSON.stringify({ servicio_id, sesiones })
            });

            const data = await resp.json();

            if (resp.ok) {
                if (data.init_point) {
                    // Redirigir a Mercado Pago
                    window.location.href = data.init_point;
                } else if (data.method === 'free') {
                    // Paquete activo sin MP
                    msj.textContent = '¡Paquete agregado exitosamente a tu billetera!';
                    msj.style.display = 'block';
                    msj.style.color = '#4b3669';
                    // Recargar paquetes
                    cargarPaquetes();
                } else {
                    msj.textContent = data.message || 'Paquete guardado.';
                    msj.style.display = 'block';
                    cargarPaquetes();
                }
            } else {
                msj.textContent = data.message || 'Error al comprar paquete.';
                msj.style.display = 'block';
                msj.style.color = '#dc3232';
            }
        } catch (e) {
            console.error('Error en compra:', e);
            msj.textContent = 'Error de red. Intenta nuevamente.';
            msj.style.display = 'block';
            msj.style.color = '#dc3232';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Comprar';
        }
    });
}

// --- UTILS ---

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getTodayString() {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

export { cargarPaquetes, cargarMisReservas, cancelarReserva, cargarServiciosCompra, initComprarPaquete };
