/**
 * @fileoverview Módulo principal del panel de negocio Violett.
 * Inicializa el layout, los formularios de servicio, la navegación,
 * y orquesta la carga de todos los submódulos (horarios, paquetes, etc.).
 * @module app-negocio/form-servicio
 */

import { initAppLayout } from './AppLayout.js';
import { fetchAndRenderServicios } from './services-list.js';
import { initSchedules } from './schedules.js';

let editingServiceId = null;

/**
 * Abre el formulario en modo edición con los datos de un servicio existente.
 * @param {Object} serviceData - Datos del servicio a editar
 * @param {number} serviceData.id - ID del servicio
 * @param {string} serviceData.titulo - Nombre del servicio
 * @param {string} serviceData.contenido - Descripción
 * @param {number} serviceData.precio - Precio
 * @param {number} serviceData.duracion - Duración en minutos
 */
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

/**
 * Resetea el formulario de servicio al estado de creación.
 */
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

    // Inicializar toggle de Mercado Pago
    initMPToggle(); initSchedules();

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
                    window.location.reload();
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

// --- Mercado Pago Toggle ---
/**
 * Inicializa el toggle de Mercado Pago.
 * Escucha cambios en el checkbox y envía la configuración al servidor.
 */
function initMPToggle() {
    const checkbox = document.getElementById('mp-toggle-checkbox');
    const label = document.getElementById('mp-toggle-label');
    if (!checkbox || !label) return;

    checkbox.addEventListener('change', async () => {
        const enabled = checkbox.checked;
        const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');

        // Feedback visual inmediato
        label.textContent = enabled ? '💳 Activando...' : '🚫 Desactivando...';
        checkbox.disabled = true;

        try {
            const resp = await fetch(`${baseApiUrl}config/mp-toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': appConfig.nonce
                },
                credentials: 'same-origin',
                body: JSON.stringify({ enabled })
            });

            if (resp.ok) {
                const data = await resp.json();
                label.textContent = data.enabled ? '💳 Cobro MP Activo' : '🚫 Cobro MP Desactivado';
            } else {
                // Revert
                checkbox.checked = !enabled;
                label.textContent = !enabled ? '💳 Cobro MP Activo' : '🚫 Cobro MP Desactivado';
                alert('Error al cambiar la configuración de Mercado Pago.');
            }
        } catch (e) {
            console.error('Error toggling MP:', e);
            checkbox.checked = !enabled;
            label.textContent = !enabled ? '💳 Cobro MP Activo' : '🚫 Cobro MP Desactivado';
            alert('Error de red al intentar cambiar la configuración.');
        } finally {
            checkbox.disabled = false;
        }
    });
}
