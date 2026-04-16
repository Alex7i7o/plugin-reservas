// js/auth.js

// Definimos la variable en el scope del módulo (no global)
let tokenClient;

export function inicializarGoogleAuth(config, retryCount = 0) {
    if (typeof google === 'undefined') {
        if (retryCount >= 10) {
            console.error("Error: No se pudo cargar la librería de Google después de 10 intentos.");
            return;
        }
        console.error("La librería de Google no ha cargado aún. Reintentando...");
        setTimeout(() => inicializarGoogleAuth(config, retryCount + 1), 500); // Reintenta en medio segundo
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
        if (perfil.nonce) {
            appConfig.nonce = perfil.nonce;
        }
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
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': appConfig.nonce
            },
            body: JSON.stringify({
                token: token
            })
        });

        if (wpResp.ok) {
            const wpData = await wpResp.json();
            perfil.wpUserId = wpData.user_id;
            perfil.creditos = wpData.creditos;
            if (wpData.nonce) {
                appConfig.nonce = wpData.nonce;
                perfil.nonce = wpData.nonce;
            }
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
    const loginSectionCliente = document.getElementById('login-section-cliente');

    // Si no existe ninguna de las dos secciones de login, salimos
    if (!loginSection && !loginSectionCliente) return;

    const fotoUrl = perfil.picture || perfil.avatar || 'https://via.placeholder.com/40';

    // Función auxiliar para crear la UI del usuario
    const crearUIUsuario = () => {
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

        return container;
    };

    if (loginSection) {
        // Clear existing content safely
        loginSection.textContent = '';
        loginSection.appendChild(crearUIUsuario());

        const serviceSection = document.getElementById('service-section');
        if (serviceSection) {
            serviceSection.style.display = 'block';
        }

        const btnMiPerfil = document.getElementById('btn-mi-perfil');
        if (btnMiPerfil) {
            btnMiPerfil.style.display = 'inline-block';
        }
    }

    if (loginSectionCliente) {
        // Clear existing content safely
        loginSectionCliente.textContent = '';
        loginSectionCliente.appendChild(crearUIUsuario());

        const perfilSectionCliente = document.getElementById('perfil-section-cliente');
        if (perfilSectionCliente) {
            perfilSectionCliente.style.display = 'block';
        }
    }
}

export function cerrarSesion() {
    // 1. Revocar el token en Google (Seguridad)
    if (window.accessToken) {
        google.accounts.oauth2.revoke(window.accessToken, () => {
        });
    }

    sessionStorage.clear();

    // 3. Limpiar variable en memoria
    window.accessToken = null;

    // 4. Recargar para que el HTML vuelva a su estado original
    setTimeout(() => {
        window.location.reload();
    }, 500);
}