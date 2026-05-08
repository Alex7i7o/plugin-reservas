/**
 * @fileoverview Módulo de gestión de paquetes/créditos para el panel de negocio Violett.
 * Permite visualizar, filtrar y asignar paquetes de sesiones a clientes.
 * Incluye búsqueda de usuarios, estadísticas y gestión de estados.
 * @module app-negocio/paquetes-admin
 */

// paquetes-admin.js — Gestión de paquetes/créditos desde app-negocio

let allPaquetesData = [];
let currentFilter = 'todos';

export async function fetchAndRenderPaquetes() {
    const container = document.getElementById('paquetes-table-container');
    if (!container) return;

    const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');

    try {
        const response = await fetch(`${baseApiUrl}paquetes/todos`, {
            method: 'GET',
            headers: { 'X-WP-Nonce': appConfig.nonce },
            credentials: 'same-origin'
        });

        if (!response.ok) throw new Error(`Error: ${response.status}`);

        allPaquetesData = await response.json();
        renderStats(allPaquetesData);
        renderPaquetesTable(filterPaquetes(allPaquetesData));

    } catch (error) {
        console.error('Error fetching paquetes:', error);
        container.innerHTML = '<p style="color:red;">Error al cargar los paquetes.</p>';
    }
}

function renderStats(paquetes) {
    const container = document.getElementById('paquetes-stats-container');
    if (!container) return;

    const activos = paquetes.filter(p => p.estado === 'activo').length;
    const agotados = paquetes.filter(p => p.estado === 'agotado').length;
    const vencidos = paquetes.filter(p => p.estado === 'vencido').length;
    const totalSesiones = paquetes.reduce((sum, p) => sum + (p.sesiones_restantes || 0), 0);

    container.innerHTML = `
        <div class="stat-card">
            <span class="stat-number">${paquetes.length}</span>
            <span class="stat-label">Total</span>
        </div>
        <div class="stat-card">
            <span class="stat-number" style="color: #27ae60;">${activos}</span>
            <span class="stat-label">Activos</span>
        </div>
        <div class="stat-card">
            <span class="stat-number" style="color: #ff8c00;">${agotados}</span>
            <span class="stat-label">Agotados</span>
        </div>
        <div class="stat-card">
            <span class="stat-number" style="color: #dc3232;">${vencidos}</span>
            <span class="stat-label">Vencidos</span>
        </div>
        <div class="stat-card">
            <span class="stat-number">${totalSesiones}</span>
            <span class="stat-label">Sesiones Pendientes</span>
        </div>
    `;
}

function filterPaquetes(paquetes) {
    if (currentFilter === 'todos') return paquetes;
    return paquetes.filter(p => p.estado === currentFilter);
}

function renderPaquetesTable(paquetes) {
    const container = document.getElementById('paquetes-table-container');
    if (!container) return;

    if (paquetes.length === 0) {
        container.innerHTML = '<p>No hay paquetes que coincidan con el filtro.</p>';
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="panel-table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Servicio</th>
                        <th>Sesiones</th>
                        <th>Compra</th>
                        <th>Vence</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
    `;

    paquetes.forEach(p => {
        const badgeClass = p.estado === 'activo' ? 'badge-activo'
            : p.estado === 'vencido' ? 'badge-vencido'
            : 'badge-agotado';

        html += `
            <tr>
                <td>
                    <strong>${escapeHTML(p.cliente_nombre)}</strong><br>
                    <small>${escapeHTML(p.cliente_email)}</small>
                </td>
                <td>${escapeHTML(p.servicio_nombre)}</td>
                <td><strong>${p.sesiones_restantes}</strong> / ${p.sesiones_totales}</td>
                <td>${p.fecha_compra || '-'}</td>
                <td>${p.fecha_vencimiento || '-'}</td>
                <td><span class="badge-estado ${badgeClass}">${p.estado}</span></td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// --- Búsqueda de usuarios ---

let searchTimeout = null;
let selectedUserId = null;

async function buscarUsuarios(query) {
    const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');
    const resultsContainer = document.getElementById('paq-user-results');
    if (!resultsContainer) return;

    if (query.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }

    try {
        const resp = await fetch(`${baseApiUrl}buscar-usuarios?q=${encodeURIComponent(query)}`, {
            headers: { 'X-WP-Nonce': appConfig.nonce },
            credentials: 'same-origin'
        });

        if (!resp.ok) return;

        const users = await resp.json();

        if (users.length === 0) {
            resultsContainer.innerHTML = '<div class="user-result-item"><span class="user-name">No se encontraron resultados</span></div>';
            resultsContainer.style.display = 'block';
            return;
        }

        let html = '';
        users.forEach(u => {
            html += `
                <div class="user-result-item" data-id="${u.id}" data-name="${escapeHTML(u.name)}" data-email="${escapeHTML(u.email)}">
                    <span class="user-name">${escapeHTML(u.name)}</span>
                    <span class="user-email">${escapeHTML(u.email)}</span>
                </div>
            `;
        });

        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';

        resultsContainer.querySelectorAll('.user-result-item[data-id]').forEach(item => {
            item.addEventListener('click', () => {
                selectedUserId = item.getAttribute('data-id');
                const name = item.getAttribute('data-name');
                const email = item.getAttribute('data-email');

                document.getElementById('paq-user-id').value = selectedUserId;
                document.getElementById('paq-buscar-cliente').value = '';
                resultsContainer.style.display = 'none';

                const selectedContainer = document.getElementById('paq-selected-user');
                if (selectedContainer) {
                    selectedContainer.innerHTML = `
                        <div class="selected-user-chip">
                            <strong>${escapeHTML(name)}</strong> (${escapeHTML(email)})
                            <button type="button" class="chip-remove" id="btn-remove-user">&times;</button>
                        </div>
                    `;
                    document.getElementById('btn-remove-user').addEventListener('click', () => {
                        selectedUserId = null;
                        document.getElementById('paq-user-id').value = '';
                        selectedContainer.innerHTML = '';
                    });
                }
            });
        });

    } catch (e) {
        console.error('Error buscando usuarios:', e);
    }
}

// --- Cargar servicios en el select ---

async function cargarServiciosParaPaquetes() {
    const select = document.getElementById('paq-servicio');
    if (!select) return;

    const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');

    try {
        const resp = await fetch(`${baseApiUrl}servicios/todos`, {
            headers: { 'X-WP-Nonce': appConfig.nonce },
            credentials: 'same-origin'
        });

        if (!resp.ok) return;

        const servicios = await resp.json();
        select.innerHTML = '<option value="">Seleccione un servicio</option>';
        servicios.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.titulo} - $${s.precio}`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Error cargando servicios:', e);
        select.innerHTML = '<option value="">Error cargando servicios</option>';
    }
}

// --- Submit: Asignar paquete ---

async function asignarPaquete(e) {
    e.preventDefault();

    const userId = document.getElementById('paq-user-id').value;
    const servicioId = document.getElementById('paq-servicio').value;
    const sesiones = document.getElementById('paq-sesiones').value;

    if (!userId) {
        alert('Seleccioná un cliente primero.');
        return;
    }
    if (!servicioId) {
        alert('Seleccioná un servicio.');
        return;
    }

    const btn = document.getElementById('btn-asignar-paquete');
    const originalText = btn.textContent;
    btn.textContent = 'Asignando...';
    btn.disabled = true;

    const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');

    try {
        const resp = await fetch(`${baseApiUrl}paquete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': appConfig.nonce
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                user_id: parseInt(userId),
                servicio_id: parseInt(servicioId),
                sesiones: parseInt(sesiones)
            })
        });

        if (resp.ok) {
            const data = await resp.json();
            alert(data.message || 'Paquete asignado exitosamente.');

            // Reset form
            document.getElementById('form-asignar-paquete').reset();
            selectedUserId = null;
            document.getElementById('paq-user-id').value = '';
            document.getElementById('paq-selected-user').innerHTML = '';

            // Refresh table
            fetchAndRenderPaquetes();
        } else {
            const err = await resp.json();
            alert('Error: ' + (err.message || 'No se pudo asignar el paquete.'));
        }
    } catch (error) {
        console.error('Error asignando paquete:', error);
        alert('Error de red al intentar asignar el paquete.');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// --- INIT ---

let paquetesInitialized = false;

function initPaquetes() {
    if (paquetesInitialized) {
        fetchAndRenderPaquetes(); // Just refresh data
        return;
    }

    paquetesInitialized = true;
    fetchAndRenderPaquetes();
    cargarServiciosParaPaquetes();

    // Search input
    const searchInput = document.getElementById('paq-buscar-cliente');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => buscarUsuarios(e.target.value), 300);
        });
    }

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        const resultsContainer = document.getElementById('paq-user-results');
        const searchContainer = document.querySelector('.user-search-container');
        if (resultsContainer && searchContainer && !searchContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });

    // Filter buttons
    const filtersContainer = document.getElementById('paquetes-filters');
    if (filtersContainer) {
        filtersContainer.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                filtersContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.getAttribute('data-filter');
                renderPaquetesTable(filterPaquetes(allPaquetesData));
            });
        });
    }

    // Form submit
    const form = document.getElementById('form-asignar-paquete');
    if (form) {
        form.addEventListener('submit', asignarPaquete);
    }
}

// --- UTILS ---

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- DOM Ready ---

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-negocio')) {
        const btnPaquetes = document.querySelector('.app-nav-btn[data-target="paquetes"]');
        if (btnPaquetes) {
            btnPaquetes.addEventListener('click', initPaquetes);
        }
    }
});
