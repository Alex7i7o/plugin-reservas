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
            console.log("Restaurando Nonce de sesión:", perfil.nonce);
            window.appConfig.nonce = perfil.nonce;
        }
        if (perfil.violett_token) {
            window.appConfig.violettToken = perfil.violett_token;
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
    console.log('Token enviado a WP:', token);
    const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const perfil = await resp.json();
    perfil.token = token;

    try {
        const wpResp = await fetch(window.appConfig.apiUrl + 'auth-google', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
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
                console.log("Sincronizando nuevo Nonce:", wpData.nonce);
                window.appConfig.nonce = wpData.nonce;
                perfil.nonce = wpData.nonce;
            }
            if (wpData.violett_token) {
                window.appConfig.violettToken = wpData.violett_token;
                perfil.violett_token = wpData.violett_token;
            }
        } else {
            const errorData = await wpResp.json();
            console.error("Error en auth-google:", errorData.message || wpResp.statusText);
        }
    } catch (e) {
        console.error("Error de red conectando con WP:", e);
    }

    sessionStorage.setItem('userSesion', JSON.stringify(perfil));
    
    // Pequeño delay de cortesía para estabilizar cookies de WP antes de disparar la UI
    console.log("Estabilizando sesión (300ms)...");
    await new Promise(resolve => setTimeout(resolve, 300));

    window.googleAccessToken = token;
    window.clienteEmail = perfil.email;
    window.clienteNombre = perfil.name;
    window.clienteCreditos = perfil.creditos || {};

    // Disparador de UI: Si existe la función en main.js, la llamamos inmediatamente
    if (typeof window.dispararUIViolett === 'function') {
        window.dispararUIViolett();
    }

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
        btnLogout.className = 'button';
        btnLogout.style.marginLeft = 'auto';
        btnLogout.style.background = '#fef2f2';
        btnLogout.style.color = '#ef4444';
        btnLogout.style.border = '1px solid #fee2e2';
        btnLogout.style.padding = '5px 12px';
        btnLogout.style.borderRadius = '20px';
        btnLogout.style.fontSize = '12px';
        btnLogout.style.fontWeight = '600';
        btnLogout.style.cursor = 'pointer';
        btnLogout.style.transition = 'all 0.2s';
        btnLogout.textContent = 'Cerrar Sesión';
        
        btnLogout.onmouseover = () => {
            btnLogout.style.background = '#fee2e2';
        };
        btnLogout.onmouseout = () => {
            btnLogout.style.background = '#fef2f2';
        };

        btnLogout.onclick = (e) => {
            e.preventDefault();
            if(confirm('¿Deseas cerrar sesión?')) {
                cerrarSesion();
            }
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