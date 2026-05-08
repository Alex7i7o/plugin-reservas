<div id="app-cliente" class="wrap app-container">
    <script src="https://accounts.google.com/gsi/client" async defer></script>

    <!-- Sección de Login -->
    <div id="login-section-cliente">
        <div style="text-align: center; padding: 2rem;">
            <h2 class="seccion-titulo-cliente" style="border-left: none; text-align: center;">Mi Cuenta — Violett Estética</h2>
            <p style="color: #888; margin-bottom: 1.5rem;">Identificate para ver tu billetera de créditos y tus turnos.</p>
            <button id="btn-google-login-cliente" class="button button-primary btn-inicio">
                Iniciar Sesión con Google
            </button>
        </div>
    </div>

    <!-- Sección del Perfil (Mostrada después del Login) -->
    <div id="perfil-section-cliente" style="display:none;">

        <!-- Header del perfil -->
        <div id="perfil-header-container" class="perfil-header">
            <!-- JS lo llena -->
        </div>

        <!-- Mi Billetera de Créditos -->
        <h3 class="seccion-titulo-cliente">💳 Mi Billetera</h3>
        <div id="billetera-container">
            <p>Cargando tus paquetes...</p>
        </div>

        <!-- Comprar Paquetes -->
        <h3 class="seccion-titulo-cliente" style="margin-top: 2rem;">🛒 Comprar Paquetes</h3>
        <div id="comprar-paquetes-container" style="background: #ffffff; padding: 1.5rem; border-radius: 1rem; border: 1px solid #eee; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
            <p style="margin-top: 0; color: #555; margin-bottom: 1rem;">Elegí el servicio y la cantidad de sesiones para armar tu paquete.</p>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 0.5rem; color: #4b3669;">Servicio</label>
                    <select id="select-comprar-servicio" class="input-pro">
                        <option value="">Cargando servicios...</option>
                    </select>
                </div>
                <div style="flex: 1; min-width: 150px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 0.5rem; color: #4b3669;">Sesiones</label>
                    <select id="select-comprar-sesiones" class="input-pro">
                        <option value="">Cargando...</option>
                    </select>
                </div>
                <div id="comprar-paquete-precio" style="flex: 1; min-width: 150px; display: flex; align-items: flex-end; font-weight: bold; font-size: 1.2rem; color: #4b3669; padding-bottom: 0.5rem;">
                    Total: $0
                </div>
                <div style="display: flex; align-items: flex-end;">
                    <button id="btn-comprar-paquete" class="button button-primary btn-reserva" style="min-width: 150px;">Comprar</button>
                </div>
            </div>
            <div id="comprar-paquete-mensaje" style="margin-top: 1rem; display: none; color: #4b3669; font-weight: bold;"></div>
        </div>
        <!-- Mis Próximos Turnos -->
        <h3 class="seccion-titulo-cliente" style="margin-top: 2rem;">📅 Mis Próximos Turnos</h3>
        <div id="mis-reservas-lista">
            <p>Cargando reservas...</p>
        </div>
    </div>

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>

    <!-- Modal de Reserva Rápida con Créditos -->
    <div id="modal-reserva-rapida" class="modal-overlay">
        <div class="modal-content">
            <button class="modal-close" id="btn-cerrar-modal">&times;</button>
            <h3>Reservar con Crédito</h3>
            <div id="modal-body">
                <!-- JS lo llena con selector de fecha y horario -->
            </div>
        </div>
    </div>

    <!-- Modal de Modificar Reserva -->
    <div id="modal-modificar-reserva" class="modal-overlay">
        <div class="modal-content">
            <button class="modal-close" id="btn-cerrar-modal-modificar">&times;</button>
            <h3>Modificar Turno</h3>
            <div id="modal-modificar-body">
                <p style="margin-bottom: 1rem;">Elegí la nueva fecha y horario para tu turno.</p>
                <div class="form-group">
                    <label>Nueva Fecha</label>
                    <input type="text" id="input-modificar-fecha" class="input-pro" placeholder="Seleccioná fecha">
                </div>
                <div id="modificar-horarios-container" style="display:none; margin-top: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Elegí el nuevo horario</label>
                    <div id="modificar-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(6.25rem, 1fr)); gap: 0.625rem;"></div>
                </div>
                <div id="modificar-confirmacion" style="display:none; margin-top: 1.5rem;">
                    <button id="btn-guardar-modificacion" class="button button-primary btn-reserva" style="width: 100%;">
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
