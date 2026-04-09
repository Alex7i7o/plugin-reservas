<div id="reserva-app">
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <link href="https://cdn.jsdelivr.net/npm/tom-select@2.2.2/dist/css/tom-select.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/tom-select@2.2.2/dist/js/tom-select.complete.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>

    <div id="top-bar" style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
        <button id="btn-mi-perfil" class="button button-outline" style="display:none;">Mi Perfil / Mis Reservas</button>
    </div>

    <div id="mi-perfil-section" style="display:none;">
        <h3>Mi Perfil</h3>
        <div id="perfil-info"></div>
        <h4>Mis Próximos Turnos</h4>
        <div id="mis-reservas-lista">
            <p>Cargando reservas...</p>
        </div>
        <button id="btn-volver-reserva" class="button button-primary btn-inicio" style="margin-top:20px;">Volver a Reservar</button>
    </div>

    <div id="reserva-flow">
        <div id="login-section">
            <h3>Paso 1: Identifícate para reservar</h3>
            <p>Necesitamos tu permiso para agendar el turno en tu Google Calendar.</p>
            <button id="btn-google-login" class="button button-primary btn-inicio">
                Iniciar Sesión con Google
            </button>
        </div>

    <div id="service-section" style="display:none; margin-top: 20px;">
        <h3>Paso 2: Elige un servicio</h3>
        <select id="select-servicios" class="input-pro">
            <option value="">Cargando servicios...</option>
        </select>
    </div>

    <div id="calendar-section" style="display:none; margin-top: 20px;">
        <h3>Paso 3: Elige el día</h3>
        <input type="text" id="fecha-reserva" placeholder="Selecciona una fecha" class="input-pro">

        <div id="horarios-container" style="display:none; margin-top: 20px;">
            <h3>Paso 4: Horarios disponibles</h3>
            <div id="loading-horarios" class="loading-horarios" style="display:none;">
                <div class="spinner"></div>
                Cargando horarios disponibles...
            </div>
            <div id="empty-horarios" class="empty-horarios" style="display:none;">
                No hay turnos disponibles para este día.
            </div>
            <div id="grid-horarios"></div>
        </div>
    </div>

    <div id="confirmacion-section" style="display:none;">
        <h4>Resumen de tu turno</h4>
        <p id="resumen-texto"></p>
        <button id="btn-confirmar-final" class="button button-primary btn-reserva">
            Confirmar y Agendar en mi Calendario
        </button>
    </div>

        <div id="exito-section" style="display:none; text-align:center; padding: 40px;"></div>
    </div> <!-- end reserva-flow -->
</div>


