/**
 * @fileoverview Módulo de configuración de paquetes de venta para el panel de negocio Violett.
 * Permite al dueño definir opciones de cantidad de sesiones y descuentos
 * que los clientes verán al comprar paquetes.
 * @module app-negocio/package-config
 */

// js/app-negocio/package-config.js

let packageOptions = [];
let modifyingIndex = null;

/**
 * Inicializa el formulario de configuración de paquetes de venta.
 */
export function initPackageConfig() {
    const container = document.getElementById('package-config-container');
    if (!container) return;

    console.log("Violett: Inicializando Configuración de Paquetes...");

    // Cargar opciones iniciales desde appConfig
    packageOptions = appConfig.packageOptions || [];
    renderPackageTable();

    // Event listeners
    const btnAdd = document.getElementById('btn-add-pkg-option');
    if (btnAdd) {
        btnAdd.addEventListener('click', handleAddOrUpdateOption);
    }

    const btnCancel = document.getElementById('btn-cancel-pkg-edit');
    if (btnCancel) {
        btnCancel.addEventListener('click', cancelPkgEdit);
    }

    const btnSave = document.getElementById('btn-save-package-config');
    if (btnSave) {
        btnSave.addEventListener('click', savePackageConfig);
    }
}

/**
 * Renderiza la tabla de paquetes configurados.
 */
function renderPackageTable() {
    const tbody = document.getElementById('tbody-package-config');
    if (!tbody) return;

    if (packageOptions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay paquetes configurados.</td></tr>';
        return;
    }

    // Ordenar por cantidad de sesiones
    packageOptions.sort((a, b) => a.sessions - b.sessions);

    tbody.innerHTML = '';
    packageOptions.forEach((opt, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${opt.sessions}</strong> ${opt.sessions === 1 ? 'sesión' : 'sesiones'}</td>
            <td>${opt.discount}%</td>
            <td>
                <button class="button btn-edit-pkg" data-index="${index}" style="padding: 2px 8px;">Modificar</button>
                <button class="button btn-delete-pkg" data-index="${index}" style="background: #dc3232; color: white; padding: 2px 8px;">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach events
    tbody.querySelectorAll('.btn-delete-pkg').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            if (confirm('¿Eliminar esta opción de paquete?')) {
                packageOptions.splice(index, 1);
                renderPackageTable();
            }
        });
    });

    tbody.querySelectorAll('.btn-edit-pkg').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            startPkgEdit(index);
        });
    });
}

/**
 * Inicia la edición de una opción de paquete.
 */
function startPkgEdit(index) {
    modifyingIndex = index;
    const opt = packageOptions[index];

    document.getElementById('new-pkg-sessions').value = opt.sessions;
    document.getElementById('new-pkg-discount').value = opt.discount;

    document.getElementById('btn-add-pkg-option').textContent = 'Actualizar Opción';
    document.getElementById('btn-cancel-pkg-edit').style.display = 'inline-block';
    
    // Scroll to inputs
    document.getElementById('new-pkg-sessions').focus();
}

/**
 * Cancela la edición y resetea los campos.
 */
function cancelPkgEdit() {
    modifyingIndex = null;
    document.getElementById('new-pkg-sessions').value = 1;
    document.getElementById('new-pkg-discount').value = 0;
    
    document.getElementById('btn-add-pkg-option').textContent = 'Añadir Opción';
    document.getElementById('btn-cancel-pkg-edit').style.display = 'none';
}

/**
 * Maneja tanto la creación como la actualización de una opción.
 */
function handleAddOrUpdateOption() {
    const sessionsInput = document.getElementById('new-pkg-sessions');
    const discountInput = document.getElementById('new-pkg-discount');

    const sessions = parseInt(sessionsInput.value);
    const discount = parseInt(discountInput.value);

    if (isNaN(sessions) || sessions < 1) {
        alert('Ingresa una cantidad de sesiones válida.');
        return;
    }

    if (isNaN(discount) || discount < 0 || discount > 100) {
        alert('El descuento debe estar entre 0 y 100.');
        return;
    }

    if (modifyingIndex !== null) {
        // Actualizar
        packageOptions[modifyingIndex] = { sessions, discount };
        cancelPkgEdit();
    } else {
        // Añadir (Evitar duplicados de sesiones si es nuevo)
        if (packageOptions.some(opt => opt.sessions === sessions)) {
            alert('Ya existe una opción para esa cantidad de sesiones.');
            return;
        }
        packageOptions.push({ sessions, discount });
        // Reset inputs
        sessionsInput.value = 1;
        discountInput.value = 0;
    }

    renderPackageTable();
}

/**
 * Guarda la configuración en la base de datos vía API.
 */
async function savePackageConfig() {
    const btn = document.getElementById('btn-save-package-config');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');

    try {
        const response = await fetch(`${baseApiUrl}config/packages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': appConfig.nonce
            },
            body: JSON.stringify(packageOptions)
        });

        if (response.ok) {
            alert('Configuración de paquetes guardada exitosamente.');
            // Actualizar appConfig para futuros renders
            appConfig.packageOptions = [...packageOptions];
        } else {
            const err = await response.json();
            alert('Error al guardar: ' + (err.message || response.statusText));
        }
    } catch (error) {
        console.error('Error saving package config:', error);
        alert('Error de red al intentar guardar.');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// Inicializar cuando el DOM esté listo si estamos en la sección adecuada
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-negocio')) {
        initPackageConfig();
    }
});
