// js/auth.js

// Definimos la variable en el scope del módulo (no global)
let tokenClient;

export function inicializarGoogleAuth(config) {
    if (typeof google === 'undefined') {
        console.error("La librería de Google no ha cargado aún. Reintentando...");
        setTimeout(() => inicializarGoogleAuth(config), 500); // Reintenta en medio segundo
        return;
    }
    // 1. Verificamos si hay sesión previa
    const sesionGuardada = sessionStorage.getItem('userSesion');
    if (sesionGuardada) {
        const perfil = JSON.parse(sesionGuardada);
        // Seteamos las variables globales necesarias
        window.googleAccessToken = perfil.token;
        window.clienteEmail = perfil.email;
        window.clienteNombre = perfil.name;
        window.clienteCreditos = perfil.creditos || {};
        mostrarSesionIniciada(perfil);
    }

    // 2. Configuramos el cliente de Google
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: appConfig.googleClientId,
        scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: (response) => {
            if (response.access_token) {
                window.accessToken = response.access_token;
        
                // Programar cierre automático (response.expires_in suele ser 3600 seg)
                const tiempoMilisegundos = (response.expires_in - 60) * 1000; // 1 min antes por las dudas
                setTimeout(() => {
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

    try {
        const wpResp = await fetch(appConfig.apiUrl + 'auth-google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': appConfig.nonce
            },
            body: JSON.stringify({
                email: perfil.email,
                name: perfil.name
            })
        });

        if (wpResp.ok) {
            const wpData = await wpResp.json();
            perfil.wpUserId = wpData.user_id;
            perfil.creditos = wpData.creditos;
        } else {
            console.error("No se pudo autenticar en WP");
        }
    } catch (e) {
        console.error("Error conectando con WP para auth:", e);
    }

    sessionStorage.setItem('userSesion', JSON.stringify(perfil));
    
    window.googleAccessToken = token;
    window.clienteEmail = perfil.email;
    window.clienteNombre = perfil.name;
    window.clienteCreditos = perfil.creditos || {};

    mostrarSesionIniciada(perfil);
}


export function mostrarSesionIniciada(perfil) {
    const loginSection = document.getElementById('login-section');
    if (!loginSection) return;

    const fotoUrl = perfil.picture || perfil.avatar || 'https://via.placeholder.com/40';

    // Clear existing content safely
    loginSection.textContent = '';

    const container = document.createElement('div');
    container.className = 'user-ready';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '10px';

    const img = document.createElement('img');
    img.src = fotoUrl;
    img.referrerPolicy = 'no-referrer';
    img.style.borderRadius = '50%';
    img.style.width = '40px';
    img.style.border = '2px solid #ff6b00';
    container.appendChild(img);

    const span = document.createElement('span');
    span.textContent = 'Listo, ';
    const strong = document.createElement('strong');
    strong.textContent = perfil.name;
    span.appendChild(strong);
    container.appendChild(span);

    const btnLogout = document.createElement('button');
    btnLogout.id = 'btn-logout';
    btnLogout.style.background = 'none';
    btnLogout.style.border = 'none';
    btnLogout.style.color = '#ff6b00';
    btnLogout.style.cursor = 'pointer';
    btnLogout.style.textDecoration = 'underline';
    btnLogout.style.fontSize = '12px';
    btnLogout.textContent = '(Cerrar Sesión)';
    btnLogout.onclick = (e) => {
        e.preventDefault();
        cerrarSesion();
    };
    container.appendChild(btnLogout);

    loginSection.appendChild(container);

    const serviceSection = document.getElementById('service-section');
    if (serviceSection) {
        serviceSection.style.display = 'block';
    }

    const btnMiPerfil = document.getElementById('btn-mi-perfil');
    if (btnMiPerfil) {
        btnMiPerfil.style.display = 'inline-block';
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

    // 2. Borrar el storage
    sessionStorage.clear();

    // 3. Limpiar variable en memoria
    window.accessToken = null;

    // 4. Recargar para que el HTML vuelva a su estado original
    setTimeout(() => {
        window.location.reload();
    }, 500);
}