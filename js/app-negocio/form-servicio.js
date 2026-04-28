document.addEventListener('DOMContentLoaded', () => {
    const appNegocio = document.getElementById('app-negocio');
    if (!appNegocio) return;

    const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');

    // Logica de Login
    const formLogin = document.getElementById('form-login-negocio');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-login-negocio');
            const errorMsg = document.getElementById('login-error-msg');
            btn.disabled = true;
            btn.textContent = 'Verificando...';
            errorMsg.style.display = 'none';

            try {
                const response = await fetch(`${baseApiUrl}login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: document.getElementById('login-username').value,
                        password: document.getElementById('login-password').value
                    })
                });

                if (response.ok) {
                    window.location.reload(); // Recarga para que PHP muestre el dashboard y pase un nonce nuevo
                } else {
                    const data = await response.json();
                    errorMsg.textContent = data.message || 'Error de autenticación.';
                    errorMsg.style.display = 'block';
                }
            } catch (err) {
                console.error('Error de red:', err);
                errorMsg.textContent = 'Error de red. Intente nuevamente.';
                errorMsg.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Ingresar';
            }
        });
    }

    // Logica de Logout
    const btnLogout = document.getElementById('btn-logout-negocio');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            btnLogout.disabled = true;
            btnLogout.textContent = 'Cerrando sesión...';
            try {
                await fetch(`${baseApiUrl}logout`, { method: 'POST' });
                window.location.reload();
            } catch (err) {
                console.error('Error cerrando sesión:', err);
                btnLogout.disabled = false;
                btnLogout.textContent = 'Cerrar sesión';
            }
        });
    }

    // Logica Formulario Servicio
    const formServicio = document.getElementById('form-crear-servicio');
    if (formServicio) {
        formServicio.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Obtener valores del form
        const titulo = document.getElementById('servicio-titulo').value;
        const contenido = document.getElementById('servicio-contenido').value;
        const precio = document.getElementById('servicio-precio').value;
        const duracion = document.getElementById('servicio-duracion').value;
        const capacidad = document.getElementById('servicio-capacidad').value;
        const sesiones = document.getElementById('servicio-sesiones').value;

        // Validar basic
        if (!titulo) {
            alert('El título es requerido');
            return;
        }

        // Preparar payload
        const payload = {
            titulo: titulo,
            contenido: contenido,
            precio: precio,
            duracion: duracion,
            capacidad: capacidad,
            sesiones: sesiones
        };

        const submitBtn = document.getElementById('btn-submit-servicio');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Guardando...';
        submitBtn.disabled = true;

        try {
            const response = await fetch(`${baseApiUrl}servicio`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': appConfig.nonce
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 403) {
                alert('La sesión expiró o no tienes permisos. Volvé a iniciar sesión.');
                window.location.reload();
                return;
            }

            if (response.ok) {
                const data = await response.json();

                // Mostrar confirmacion
                alert(data.message || 'Servicio creado exitosamente');

                // Limpiar form
                formServicio.reset();
            } else {
                const err = await response.json();
                alert(`Error: ${err.message || 'No se pudo crear el servicio'}`);
            }
        } catch (error) {
            console.error('Error al crear servicio:', error);
            alert('Error de red o de servidor. Revisa la consola.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
        });
    }
});
