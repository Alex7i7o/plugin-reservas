export async function fetchAndRenderAppointments() {
    const container = document.getElementById('appointments-table-container');
    if (!container) return;

    const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');

    try {
        const response = await fetch(`${baseApiUrl}turnos/todos`, {
            method: 'GET',
            headers: {
                'X-WP-Nonce': appConfig.nonce
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const turnos = await response.json();
        window.appointmentsData = turnos; // Store for filtering

        renderAppointmentsTable(turnos);

    } catch (error) {
        console.error('Error fetching turnos:', error);
        container.innerHTML = '<p style="color:red;">Error al cargar los turnos.</p>';
    }
}

function renderAppointmentsTable(turnos) {
    const container = document.getElementById('appointments-table-container');
    if (!container) return;

    if (turnos.length === 0) {
        container.innerHTML = '<p>No hay turnos que coincidan con la búsqueda.</p>';
        return;
    }

    let tableHtml = `
        <div class="table-responsive">
            <table class="panel-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Cliente</th>
                        <th>Servicio</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Sort turnos by date and time (descending)
    turnos.sort((a, b) => {
        const dateA = new Date(`${a.fecha}T${a.hora || '00:00'}`);
        const dateB = new Date(`${b.fecha}T${b.hora || '00:00'}`);
        return dateB - dateA;
    });

    turnos.forEach(t => {
        tableHtml += `
            <tr>
                <td>${t.fecha}</td>
                <td><strong>${t.hora}</strong></td>
                <td>${t.cliente}<br><small>${t.email}</small></td>
                <td>${t.servicio}</td>
                <td>
                    <button class="button btn-cancel-turno" data-id="${t.id}" style="background: #dc3232; color: white;">Cancelar Turno</button>
                </td>
            </tr>
        `;
    });

    tableHtml += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = tableHtml;

    // Attach event listeners
    document.querySelectorAll('.btn-cancel-turno').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm('¿Estás seguro de que deseas cancelar/borrar este turno?')) {
                await deleteTurno(id);
            }
        });
    });
}

async function deleteTurno(id) {
    const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');
    try {
        const response = await fetch(`${baseApiUrl}turno/${id}`, {
            method: 'DELETE',
            headers: {
                'X-WP-Nonce': appConfig.nonce
            },
            credentials: 'same-origin'
        });

        if (response.ok) {
            alert('Turno cancelado exitosamente.');
            fetchAndRenderAppointments(); // Re-render
        } else {
            const err = await response.json();
            alert(`Error al cancelar: ${err.message || response.statusText}`);
        }
    } catch (error) {
        console.error('Error deleting turno:', error);
        alert('Error de red al intentar cancelar el turno.');
    }
}

function applyFilters() {
    if (!window.appointmentsData) return;

    const query = document.getElementById('filter-cliente').value.toLowerCase();
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    const filtered = window.appointmentsData.filter(t => {
        let matchQuery = true;
        let matchDate = true;

        if (query) {
            matchQuery = (t.cliente && t.cliente.toLowerCase().includes(query)) ||
                         (t.email && t.email.toLowerCase().includes(query));
        }

        if (dateFrom && t.fecha < dateFrom) {
            matchDate = false;
        }

        if (dateTo && t.fecha > dateTo) {
            matchDate = false;
        }

        return matchQuery && matchDate;
    });

    renderAppointmentsTable(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-negocio')) {
        // Initial fetch when tab is shown
        const btnTodos = document.querySelector('.app-nav-btn[data-target="todos"]');
        if (btnTodos) {
            btnTodos.addEventListener('click', fetchAndRenderAppointments);
        }

        // Set up filters
        const filterCliente = document.getElementById('filter-cliente');
        const filterDateFrom = document.getElementById('filter-date-from');
        const filterDateTo = document.getElementById('filter-date-to');
        const btnFilterToday = document.getElementById('btn-filter-today');
        const btnFilterClear = document.getElementById('btn-filter-clear');

        if (filterCliente) filterCliente.addEventListener('input', applyFilters);
        if (filterDateFrom) filterDateFrom.addEventListener('change', applyFilters);
        if (filterDateTo) filterDateTo.addEventListener('change', applyFilters);

        if (btnFilterToday) {
            btnFilterToday.addEventListener('click', () => {
                const today = new Date();
                const offset = today.getTimezoneOffset()
                const localDate = new Date(today.getTime() - (offset*60*1000))
                const todayStr = localDate.toISOString().split('T')[0];
                if (filterDateFrom) filterDateFrom.value = todayStr;
                if (filterDateTo) filterDateTo.value = todayStr;
                applyFilters();
            });
        }

        if (btnFilterClear) {
            btnFilterClear.addEventListener('click', () => {
                if (filterCliente) filterCliente.value = '';
                if (filterDateFrom) filterDateFrom.value = '';
                if (filterDateTo) filterDateTo.value = '';
                applyFilters();
            });
        }
    }
});
