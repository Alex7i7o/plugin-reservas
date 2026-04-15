import { inicializarGoogleAuth, loginConGoogle } from '../shared/auth.js';

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
});

function verificarSesionYMostrarPerfil() {
    let intentos = 0;
    const intervalo = setInterval(() => {
        if (window.clienteEmail) {
            clearInterval(intervalo);
            document.getElementById('login-section-cliente').style.display = 'none';
            document.getElementById('perfil-section-cliente').style.display = 'block';
            cargarDatosPerfil();
        }
        intentos++;
        if (intentos > 10) { // Deja de chequear a los 5 segundos
            clearInterval(intervalo);
        }
    }, 500);
}

async function cargarDatosPerfil() {
    const lista = document.getElementById('mis-reservas-lista');
    const info = document.getElementById('perfil-info');

    if (!lista || !info) return;

    lista.innerHTML = '<p>Cargando reservas...</p>';

    if (window.clienteCreditos) {
        let htmlCreditos = '<p><strong>Mis Créditos (Wallet):</strong></p><ul>';
        let tieneCreditos = false;
        for (const [servicioId, creditos] of Object.entries(window.clienteCreditos)) {
            if (creditos > 0) {
                htmlCreditos += `<li>Servicio ID ${servicioId}: ${creditos} créditos</li>`;
                tieneCreditos = true;
            }
        }
        htmlCreditos += '</ul>';
        if (tieneCreditos) {
            info.innerHTML = htmlCreditos;
        } else {
            info.innerHTML = '<p>No tenés créditos disponibles.</p>';
        }
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
                        btn.onclick = () => cancelarReserva(r.id, r.token_cancelacion);
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
        } else {
            lista.innerHTML = '<p>No se pudieron cargar las reservas.</p>';
        }
    } catch (e) {
        console.error("Error al cargar reservas", e);
        lista.innerHTML = '<p>Error al cargar reservas.</p>';
    }
}

async function cancelarReserva(reservaId, tokenCancelacion) {
    if (!confirm('¿Estás seguro de que querés cancelar este turno?')) return;
    try {
        const resp = await fetch(`${appConfig.apiUrl}cancelar-reserva`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reserva_id: reservaId,
                email: window.clienteEmail,
                token: tokenCancelacion
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
