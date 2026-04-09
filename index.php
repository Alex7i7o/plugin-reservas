<div id="reserva-app">
    <div id="login-section">
        <h3>Paso 1: Identifícate</h3>
        <div id="buttonDiv"></div> </div>

    <div id="service-section" style="display:none;">
        <h3>Paso 2: Elige un servicio</h3>
        <select id="select-servicios">
            <option value="">Cargando servicios...</option>
        </select>
    </div>

    <div id="calendar-section" style="display:none;">
        <h3>Paso 3: Elige tu horario</h3>
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