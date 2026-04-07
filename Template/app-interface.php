<div id="reserva-app">
    <script src="https://accounts.google.com/gsi/client" async defer></script>

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
        <input type="date" id="fecha-reserva" min="<?php echo date('Y-m-d'); ?>" class="input-pro">

        <div id="horarios-container" style="display:none; margin-top: 20px;">
            <h3>Paso 4: Horarios disponibles</h3>
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
</div>


