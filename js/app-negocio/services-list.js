import { openEditForm } from './form-servicio.js';

export async function fetchAndRenderServicios() {
    const container = document.getElementById('servicios-table-container');
    if (!container) return;

    const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');

    try {
        const response = await fetch(`${baseApiUrl}servicios/todos`, {
            method: 'GET',
            headers: {
                'X-WP-Nonce': appConfig.nonce
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const servicios = await response.json();

        if (servicios.length === 0) {
            container.innerHTML = '<p>No hay servicios registrados.</p>';
            return;
        }

        let tableHtml = `
            <table class="panel-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Título</th>
                        <th>Precio</th>
                        <th>Duración</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        servicios.forEach(srv => {
            tableHtml += `
                <tr>
                    <td>${srv.id}</td>
                    <td><strong>${srv.titulo}</strong></td>
                    <td>$${srv.precio}</td>
                    <td>${srv.duracion} min</td>
                    <td>
                        <button class="button btn-edit-servicio" data-service='${JSON.stringify(srv)}' style="margin-right: 5px;">Editar</button>
                        <button class="button btn-delete-servicio" data-id="${srv.id}" style="background: #dc3232; color: white;">Borrar</button>
                    </td>
                </tr>
            `;
        });

        tableHtml += `
                </tbody>
            </table>
        `;

        container.innerHTML = tableHtml;

        // Attach event listeners
        document.querySelectorAll('.btn-delete-servicio').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('¿Estás seguro de que deseas borrar este servicio?')) {
                    await deleteServicio(id);
                }
            });
        });

        document.querySelectorAll('.btn-edit-servicio').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const serviceData = JSON.parse(e.target.getAttribute('data-service'));
                openEditForm(serviceData);
            });
        });

    } catch (error) {
        console.error('Error fetching servicios:', error);
        container.innerHTML = '<p style="color:red;">Error al cargar los servicios.</p>';
    }
}

async function deleteServicio(id) {
    const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');
    try {
        const response = await fetch(`${baseApiUrl}servicio/${id}`, {
            method: 'DELETE',
            headers: {
                'X-WP-Nonce': appConfig.nonce
            },
            credentials: 'same-origin'
        });

        if (response.ok) {
            alert('Servicio borrado exitosamente.');
            fetchAndRenderServicios(); // Re-render
        } else {
            const err = await response.json();
            alert(`Error al borrar: ${err.message || response.statusText}`);
        }
    } catch (error) {
        console.error('Error deleting servicio:', error);
        alert('Error de red al intentar borrar el servicio.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we are on the dashboard and authorized (which is true if main app exists)
    if (document.getElementById('app-negocio')) {
        // Initial fetch when tab is shown or immediately if it's the active one
        // The easiest way is to bind it to the nav button or just load it
        fetchAndRenderServicios();

        // Also listen to the nav button to refresh data if needed
        const btnServicios = document.querySelector('.app-nav-btn[data-target="servicios"]');
        if (btnServicios) {
            btnServicios.addEventListener('click', fetchAndRenderServicios);
        }
    }
});
