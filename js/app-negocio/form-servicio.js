import { initAppLayout } from './AppLayout.js';
import { fetchAndRenderServicios } from './services-list.js';

let editingServiceId = null;

export function openEditForm(serviceData) {
    document.getElementById('servicio-form-title').textContent = 'Editar Servicio';
    document.getElementById('btn-submit-servicio').textContent = 'Actualizar Servicio';
    document.getElementById('btn-cancelar-edicion').style.display = 'inline-block';

    document.getElementById('servicio-titulo').value = serviceData.titulo || '';
    document.getElementById('servicio-contenido').value = serviceData.contenido || '';
    document.getElementById('servicio-precio').value = serviceData.precio || '';
    document.getElementById('servicio-duracion').value = serviceData.duracion || 60;
    document.getElementById('servicio-capacidad').value = serviceData.capacidad || 1;
    document.getElementById('servicio-sesiones').value = serviceData.sesiones || 1;

    editingServiceId = serviceData.id;

    // Scroll to form
    document.getElementById('form-crear-servicio').scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
    const form = document.getElementById('form-crear-servicio');
    if (form) form.reset();
    document.getElementById('servicio-form-title').textContent = 'Crear Nuevo Servicio';
    document.getElementById('btn-submit-servicio').textContent = 'Guardar Servicio';
    document.getElementById('btn-cancelar-edicion').style.display = 'none';
    editingServiceId = null;
}

document.addEventListener('DOMContentLoaded', () => {
    const appNegocio = document.getElementById('app-negocio');
    if (!appNegocio) return;

    // Inicializar Layout
    initAppLayout();

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

    const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
    if (btnCancelarEdicion) {
        btnCancelarEdicion.addEventListener('click', resetForm);
    }

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

        const isEditing = editingServiceId !== null;
        const url = isEditing ? `${baseApiUrl}servicio/${editingServiceId}` : `${baseApiUrl}servicio`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
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
                alert(data.message || (isEditing ? 'Servicio actualizado' : 'Servicio creado exitosamente'));

                // Limpiar form
                resetForm();

                // Refrescar lista si existe la funcion
                if (typeof fetchAndRenderServicios === 'function') {
                    fetchAndRenderServicios();
                }

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
