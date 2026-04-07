// js/auth.js

// Definimos la variable en el scope del módulo (no global)
let tokenClient;

export function inicializarGoogleAuth(config) {
    // 1. Verificamos si hay sesión previa
    const sesionGuardada = sessionStorage.getItem('userSesion');
    if (sesionGuardada) {
        const perfil = JSON.parse(sesionGuardada);
        // Seteamos las variables globales necesarias
        window.googleAccessToken = perfil.token;
        window.clienteEmail = perfil.email;
        window.clienteNombre = perfil.name;
        mostrarSesionIniciada(perfil);
    }

    // 2. Configuramos el cliente de Google
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: config.googleClientId,
        scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: (response) => {
            if (response.access_token) {
                window.accessToken = response.access_token;
        
                // Programar cierre automático (response.expires_in suele ser 3600 seg)
                const tiempoMilisegundos = (response.expires_in - 60) * 1000; // 1 min antes por las dudas
                setTimeout(() => {
                    console.log("El token va a expirar pronto...");
                    cerrarSesion();
                }, tiempoMilisegundos);

                obtenerPerfilUsuario(response.access_token);
            }
        }
    });
}

export function loginConGoogle() {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }
}

async function obtenerPerfilUsuario(token) {
    const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const perfil = await resp.json();
    perfil.token = token;

    sessionStorage.setItem('userSesion', JSON.stringify(perfil));
    
    window.googleAccessToken = token;
    window.clienteEmail = perfil.email;
    window.clienteNombre = perfil.name;

    mostrarSesionIniciada(perfil);
}


export function mostrarSesionIniciada(perfil) {
    const loginSection = document.getElementById('login-section');
    if (!loginSection) return;

    const fotoUrl = perfil.picture || perfil.avatar || 'https://via.placeholder.com/40';

    loginSection.innerHTML = `
    <div class="user-ready" style="display: flex; align-items: center; gap: 10px;">
        <img src="${fotoUrl}" referrerpolicy="no-referrer" style="border-radius:50%; width:40px; border: 2px solid #ff6b00;">
        <span>Listo, <strong>${perfil.name}</strong></span>
        <button id="btn-logout" style="background:none; border:none; color:#ff6b00; cursor:pointer; text-decoration:underline; font-size:12px;">
            (Cerrar Sesión)
        </button>
    </div>
    `;

    document.getElementById('btn-logout').onclick = (e) => {
        e.preventDefault();
        cerrarSesion();
    };
    
    const serviceSection = document.getElementById('service-section');
    if (serviceSection) {
        serviceSection.style.display = 'block';
    }
}


export function cerrarSesion() {
    console.log("Cerrando sesión y limpiando persistencia...");

    // 1. Revocar el token en Google (Seguridad)
    if (window.accessToken) {
        google.accounts.oauth2.revoke(window.accessToken, () => {
            console.log('Token revocado en Google.');
        });
    }

    // 2. BORRAR el storage (Esto es lo que te faltaba)
    sessionStorage.removeItem('userSesion'); 
    // Si querés borrar TODO lo de la sesión: sessionStorage.clear();

    // 3. Limpiar variable en memoria
    window.accessToken = null;

    // 4. Recargar para que el HTML vuelva a su estado original
    setTimeout(() => {
        window.location.reload();
    }, 500);
}