<?php
// app-negocio/template.php
if (!defined('ABSPATH')) exit;

$hoy = date('Y-m-d');

// Obtener los servicios para el select
$servicios = get_posts(array(
    'post_type' => 'servicio',
    'posts_per_page' => -1,
    'post_status' => 'publish'
));

// Obtener reservas de hoy
$args = array(
    'post_type' => 'reserva',
    'post_status' => 'publish',
    'posts_per_page' => -1,
    'meta_query' => array(
        array(
            'key' => 'fecha',
            'value' => $hoy,
            'compare' => '='
        )
    )
);
$query_hoy = new WP_Query($args);
$reservas_hoy = array();
if ($query_hoy->have_posts()) {
    while ($query_hoy->have_posts()) {
        $query_hoy->the_post();
        $fields = get_fields();
        $reservas_hoy[] = array(
            'id'       => get_the_ID(),
            'cliente'  => isset($fields['cliente']) ? $fields['cliente'] : '',
            'email'    => isset($fields['email_cliente']) ? $fields['email_cliente'] : '',
            'fecha'    => isset($fields['fecha']) ? $fields['fecha'] : '',
            'hora'     => isset($fields['hora']) ? $fields['hora'] : '',
            'hora_fin' => isset($fields['hora_fin']) ? $fields['hora_fin'] : '',
            'servicio' => isset($fields['servicio']) ? $fields['servicio'] : ''
        );
    }
}
wp_reset_postdata();

usort($reservas_hoy, function($a, $b) {
    return strcmp($a['hora'], $b['hora']);
});

?>
<div id="app-negocio" class="wrap app-container">
    <?php if (!empty($mensaje)) echo $mensaje; ?>

    <!-- Sección de Login (Mostrada solo si NO hay sesión) -->
    <div id="login-negocio-section" style="<?php echo $is_authorized ? 'display: none;' : ''; ?>">
        <div class="login-card" style="max-width: 400px; margin: 2rem auto; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="text-align: center; margin-bottom: 1.5rem;">Acceso al Panel</h2>
            <form id="form-login-negocio">
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label for="login-username" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Usuario o Email</label>
                    <input type="text" id="login-username" class="input-pro" required style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label for="login-password" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Contraseña</label>
                    <input type="password" id="login-password" class="input-pro" required style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <button type="submit" id="btn-login-negocio" class="button button-primary btn-reserva" style="width: 100%; padding: 0.75rem; font-size: 1rem; border: none; border-radius: 4px; background: #007cba; color: white; cursor: pointer;">Ingresar</button>
                <div id="login-error-msg" style="color: red; margin-top: 1rem; text-align: center; display: none;"></div>
            </form>
        </div>
    </div>

    <!-- Sección del Dashboard (Mostrada solo si SÍ hay sesión y autorización) -->
    <?php if ($is_authorized): ?>
    <div id="dashboard-negocio-section" class="app-dashboard">

        <nav class="app-nav">
            <ul>
                <li><button class="app-nav-btn active" data-target="hoy">Hoy</button></li>
                <li><button class="app-nav-btn" data-target="todos">Todos los Turnos</button></li>
                <li><button class="app-nav-btn" data-target="carga-manual">Carga Manual</button></li>
                <li><button class="app-nav-btn" data-target="servicios">Servicios</button></li>
                <li><button class="app-nav-btn" data-target="paquetes">Paquetes</button></li>
                <li><button class="app-nav-btn" data-target="horarios">Horarios</button></li>
                <li><button class="app-nav-btn" data-target="diseno">Diseño</button></li>
                <li><button class="app-nav-btn" data-target="bot-wpp">Bot WhatsApp</button></li>
                <li><button id="btn-logout-negocio" class="btn-logout">Cerrar sesión</button></li>
            </ul>
        </nav>

        <div id="main-view" class="app-main-view">

            <div id="section-hoy" class="app-section active">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
                    <h1>Panel del Día - <?php echo esc_html($hoy); ?></h1>
                    <div class="mp-toggle-container" id="mp-toggle-container">
                        <label class="toggle-switch" title="Activar/Desactivar cobro con Mercado Pago">
                            <input type="checkbox" id="mp-toggle-checkbox" <?php echo get_option('sr_mp_enabled', '1') === '1' ? 'checked' : ''; ?>>
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="mp-toggle-label" id="mp-toggle-label">
                            <?php echo get_option('sr_mp_enabled', '1') === '1' ? '💳 Cobro MP Activo' : '🚫 Cobro MP Desactivado'; ?>
                        </span>
                    </div>
                </div>

                <div class="panel-card">
                    <h2>Turnos para Hoy</h2>
                    <table class="panel-table">
                        <thead>
                            <tr>
                                <th>Hora</th>
                                <th>Cliente</th>
                                <th>Servicio</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($reservas_hoy)): ?>
                                <tr><td colspan="4">No hay turnos agendados para hoy.</td></tr>
                            <?php else: ?>
                                <?php foreach ($reservas_hoy as $reserva): ?>
                                    <?php 
                                        $now = current_time('timestamp');
                                        $timestamp = strtotime($reserva['fecha'] . ' ' . $reserva['hora']);
                                        $can_modify = $timestamp > $now;
                                    ?>
                                    <tr>
                                        <td><strong><?php echo esc_html($reserva['hora']); ?></strong></td>
                                        <td><?php echo esc_html($reserva['cliente']); ?></td>
                                        <td><?php echo esc_html($reserva['servicio']); ?></td>
                                        <td>
                                            <button class="button btn-edit-turno" data-turno='<?php echo json_encode($reserva); ?>' <?php echo $can_modify ? '' : 'disabled'; ?>>Modificar</button>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="section-todos" class="app-section" style="display: none;">
                <div class="panel-card">
                    <h2>Todos los Turnos</h2>
                    <div class="table-filters" style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                        <input type="text" id="filter-cliente" class="input-pro" placeholder="Buscar por cliente..." style="flex: 1; min-width: 200px;">
                        <input type="date" id="filter-date-from" class="input-pro" placeholder="Desde" style="width: auto;">
                        <input type="date" id="filter-date-to" class="input-pro" placeholder="Hasta" style="width: auto;">
                        <button id="btn-filter-today" class="button button-primary" style="padding: 0.5rem 1rem;">Hoy</button>
                        <button id="btn-filter-clear" class="button" style="padding: 0.5rem 1rem;">Limpiar</button>
                    </div>
                    <div id="appointments-table-container">
                        <p>Cargando turnos...</p>
                    </div>
                </div>
            </div>

            <div id="section-carga-manual" class="app-section" style="display: none;">
                <div class="panel-card">
                    <h2>Carga Manual de Turno</h2>
                    <form id="form-carga-manual" class="form-manual">
                        <!-- Será rellenado por JS -->
                    </form>
                </div>
            </div>

            <div id="section-servicios" class="app-section" style="display: none;">
                <div class="panel-card">
                    <h2>Gestión de Servicios</h2>
                    <div id="servicios-table-container" style="margin-bottom: 2rem;">
                        <p>Cargando servicios...</p>
                    </div>
                    <hr>
                    <h2 id="servicio-form-title">Crear Nuevo Servicio</h2>
                    <button type="button" id="btn-cancelar-edicion" class="button" style="display:none; margin-bottom: 1rem;">Cancelar Edición</button>
                    <form id="form-crear-servicio" class="form-crear-servicio">
                        <div class="form-group">
                            <label for="servicio-titulo">Nombre del Servicio</label>
                            <input type="text" id="servicio-titulo" class="input-pro" required>
                        </div>

                        <div class="form-group">
                            <label for="servicio-contenido">Descripción</label>
                            <textarea id="servicio-contenido" class="input-pro" rows="3"></textarea>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="servicio-precio">Precio ($)</label>
                                <input type="number" id="servicio-precio" class="input-pro" required min="0" step="100">
                            </div>

                            <div class="form-group">
                                <label for="servicio-duracion">Duración (Minutos)</label>
                                <input type="number" id="servicio-duracion" class="input-pro" required min="15" step="15" value="60">
                            </div>
                        </div>

                        <div class="form-row" style="display: none;">
                            <div class="form-group">
                                <label for="servicio-capacidad">Capacidad</label>
                                <input type="number" id="servicio-capacidad" class="input-pro" required min="1" value="1">
                            </div>

                            <div class="form-group">
                                <label for="servicio-sesiones">Sesiones Totales</label>
                                <input type="number" id="servicio-sesiones" class="input-pro" required min="1" value="1">
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="submit" id="btn-submit-servicio" class="btn-crear-servicio">Guardar Servicio</button>
                        </div>
                    </form>

                    <hr style="margin: 2rem 0;">
                    <h2>Configuración de Paquetes de Venta</h2>
                    <p style="color: #666; margin-bottom: 1rem;">Definí las opciones de cantidad de sesiones y descuentos que verán los clientes.</p>

                    <div id="package-config-container">
                        <table class="panel-table" id="table-package-config">
                            <thead>
                                <tr>
                                    <th>Sesiones</th>
                                    <th>Descuento (%)</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-package-config">
                                <!-- JS lo llena -->
                            </tbody>
                        </table>

                        <div style="margin-top: 1.5rem; background: #f9f9f9; padding: 1.25rem; border-radius: 0.5rem; border: 1px dashed #ddd;">
                            <h3>Añadir Nueva Opción</h3>
                            <div class="form-row" style="margin-top: 1rem;">
                                <div class="form-group">
                                    <label>Cantidad de Sesiones</label>
                                    <input type="number" id="new-pkg-sessions" class="input-pro" min="1" value="1">
                                </div>
                                <div class="form-group">
                                    <label>Descuento (%)</label>
                                    <input type="number" id="new-pkg-discount" class="input-pro" min="0" max="100" value="0">
                                </div>
                            </div>
                            <div style="display: flex; gap: 10px; margin-top: 0.5rem;">
                                <button type="button" id="btn-add-pkg-option" class="button button-primary">Añadir Opción</button>
                                <button type="button" id="btn-cancel-pkg-edit" class="button" style="display: none;">Cancelar</button>
                            </div>
                        </div>

                        <div style="margin-top: 2rem; text-align: right;">
                            <button type="button" id="btn-save-package-config" class="button button-primary btn-reserva">Guardar Configuración de Paquetes</button>
                        </div>
                    </div>
                </div>
            </div>

            <div id="section-paquetes" class="app-section" style="display: none;">
                <div class="panel-card paquetes-admin">
                    <h2>Gestión de Paquetes / Créditos</h2>
                    <div id="paquetes-stats-container" class="paquetes-stats">
                        <!-- JS lo llena -->
                    </div>
                    <div class="paquetes-filters" id="paquetes-filters">
                        <button class="filter-btn active" data-filter="todos">Todos</button>
                        <button class="filter-btn" data-filter="activo">Activos</button>
                        <button class="filter-btn" data-filter="agotado">Agotados</button>
                        <button class="filter-btn" data-filter="vencido">Vencidos</button>
                    </div>
                    <div id="paquetes-table-container" style="margin-bottom: 2rem;">
                        <p>Cargando paquetes...</p>
                    </div>
                    <hr>
                    <h2>Asignar Nuevo Paquete</h2>
                    <form id="form-asignar-paquete" class="form-asignar-paquete">
                        <div class="form-group">
                            <label for="paq-buscar-cliente">Buscar Cliente (nombre o email)</label>
                            <div class="user-search-container">
                                <input type="text" id="paq-buscar-cliente" class="input-pro" placeholder="Escribí para buscar..." autocomplete="off">
                                <div id="paq-user-results" class="user-search-results" style="display: none;"></div>
                            </div>
                            <input type="hidden" id="paq-user-id">
                            <div id="paq-selected-user"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="paq-servicio">Servicio</label>
                                <select id="paq-servicio" class="input-pro" required>
                                    <option value="">Cargando servicios...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="paq-sesiones">Cantidad de Sesiones</label>
                                <input type="number" id="paq-sesiones" class="input-pro" required min="1" value="4">
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="submit" id="btn-asignar-paquete" class="btn-asignar-paquete">Asignar Paquete</button>
                        </div>
                    </form>
                </div>
            </div>

            <div id="section-horarios" class="app-section" style="display: none;">
                <div class="panel-card">
                    <h1>Configuración de Horarios</h1>
                    <p style="margin-bottom: 2rem; color: #666;">Configurá los días y horarios de atención de tu negocio.</p>
                    <div id="horarios-grid-container" class="schedule-container">
                        <p>Cargando horarios...</p>
                    </div>
                </div>
            </div>

            <div id="section-diseno" class="app-section" style="display: none;">
                <div class="panel-card">
                    <h1>Diseño y Personalización</h1>
                    <p style="margin-bottom: 2rem; color: #666;">Personalizá los colores y tipografías de tu sitio. Los cambios se aplican en tiempo real.</p>

                    <h2>Colores</h2>
                    <div class="form-row" style="margin-bottom: 1rem;">
                        <div class="form-group">
                            <label for="theme-primary">Color Principal</label>
                            <input type="color" id="theme-primary" class="input-pro" value="#4b3669" style="height: 3rem; cursor: pointer;">
                        </div>
                        <div class="form-group">
                            <label for="theme-primary-light">Principal Claro</label>
                            <input type="color" id="theme-primary-light" class="input-pro" value="#624b85" style="height: 3rem; cursor: pointer;">
                        </div>
                    </div>
                    <div class="form-row" style="margin-bottom: 1rem;">
                        <div class="form-group">
                            <label for="theme-accent">Color Acento (Dorado)</label>
                            <input type="color" id="theme-accent" class="input-pro" value="#c8a35b" style="height: 3rem; cursor: pointer;">
                        </div>
                        <div class="form-group">
                            <label for="theme-highlight">Color Destacado (Botones)</label>
                            <input type="color" id="theme-highlight" class="input-pro" value="#ff8c00" style="height: 3rem; cursor: pointer;">
                        </div>
                    </div>

                    <hr style="margin: 2rem 0;">
                    <h2>Tipografía</h2>
                    <div class="form-row" style="margin-bottom: 1rem;">
                        <div class="form-group">
                            <label for="theme-font-primary">Fuente Principal (Títulos)</label>
                            <select id="theme-font-primary" class="input-pro">
                                <option value="Raleway">Raleway</option>
                                <option value="Inter">Inter</option>
                                <option value="Outfit">Outfit</option>
                                <option value="Poppins">Poppins</option>
                                <option value="Montserrat">Montserrat</option>
                                <option value="Playfair Display">Playfair Display</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="theme-font-secondary">Fuente Secundaria (Cuerpo)</label>
                            <select id="theme-font-secondary" class="input-pro">
                                <option value="Segoe UI">Segoe UI (Sistema)</option>
                                <option value="Inter">Inter</option>
                                <option value="Raleway">Raleway</option>
                                <option value="Roboto">Roboto</option>
                                <option value="Open Sans">Open Sans</option>
                            </select>
                        </div>
                    </div>

                    <hr style="margin: 2rem 0;">
                    <h2>Vista Previa</h2>
                    <div id="theme-preview" style="padding: 1.5rem; border-radius: 0.5rem; border: 1px solid #eee; margin-bottom: 1.5rem;">
                        <h3 style="margin-top: 0;">Así se ve tu tema</h3>
                        <p>Este texto usa la fuente secundaria. Los colores de arriba se aplican en vivo.</p>
                        <button class="button button-primary btn-reserva" style="pointer-events: none;">Botón de Ejemplo</button>
                    </div>

                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button type="button" id="btn-save-theme" class="button button-primary btn-reserva">Guardar Tema</button>
                        <button type="button" id="btn-reset-theme" class="button" style="background: #f0f0f0; color: #333; border: 1px solid #ddd;">Restaurar Valores por Defecto</button>
                    </div>
                </div>
            </div>

            <div id="section-bot-wpp" class="app-section" style="display: none;">
                <div class="panel-card wpp-config-card">
                    <header class="section-header">
                        <h1>Configuración del Bot de WhatsApp</h1>
                        <p>Habilitá el asistente inteligente con Gemini para automatizar tu agenda y recordatorios.</p>
                    </header>

                    <form id="form-whatsapp-config" class="wpp-config-form">
                        <section class="config-group">
                            <h2><i class="dashicons dashicons-key"></i> Credenciales de API</h2>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="wpp-gemini-key">Gemini API Key</label>
                                    <input type="password" id="wpp-gemini-key" class="input-pro" placeholder="AIzaSy...">
                                </div>
                                <div class="form-group">
                                    <label for="wpp-api-token">WhatsApp API Token (Meta)</label>
                                    <input type="password" id="wpp-api-token" class="input-pro" placeholder="EAA...">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="wpp-phone-id">WhatsApp Phone Number ID</label>
                                <input type="text" id="wpp-phone-id" class="input-pro" placeholder="Ej: 102345678901234">
                            </div>
                        </section>

                        <section class="config-group">
                            <h2><i class="dashicons dashicons-clock"></i> Automatización</h2>
                            
                            <div class="bot-toggle-wrapper">
                                <div class="mp-toggle-container">
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="wpp-recordatorios-activos">
                                        <span class="toggle-slider"></span>
                                    </label>
                                    <span class="mp-toggle-label">Activar Recordatorios y Recuperación (Cron)</span>
                                </div>
                                <p class="help-text">Si está activo, enviará recordatorios a las 09:00 (turnos de mañana) y mensajes de recuperación a las 10:00.</p>
                            </div>
                        </section>

                        <section class="config-group">
                            <h2><i class="dashicons dashicons-admin-comments"></i> Entrenamiento del Asistente</h2>
                            
                            <div class="form-group">
                                <label for="wpp-prompt-personalidad">Personalidad y Respuestas Generales</label>
                                <textarea id="wpp-prompt-personalidad" class="input-pro" rows="5" placeholder="Ej: Eres una asistente amable..."></textarea>
                                <p class="help-text">Cómo se comporta el bot en conversaciones normales.</p>
                            </div>

                            <div class="form-group">
                                <label for="wpp-prompt-recuperacion">Prompt de Recuperación (Ventas/Upselling)</label>
                                <textarea id="wpp-prompt-recuperacion" class="input-pro" rows="5" placeholder="Ej: Invita al cliente a volver..."></textarea>
                                <p class="help-text">Mensaje usado para atraer clientes que no vienen hace >30 días.</p>
                            </div>
                        </section>

                        <div class="form-actions-sticky">
                            <button type="submit" id="btn-save-wpp-config" class="button button-primary btn-reserva btn-large">
                                <span class="dashicons dashicons-saved"></span> Guardar y Probar Conexión
                            </button>
                            <div id="wpp-config-status" class="status-msg" style="display: none;"></div>
                        </div>
                    </form>
                </div>
            </div>

        </div>

        <!-- Botón Flotante Mobile (Div para evitar estilos globales de botones) -->
        <div id="btn-floating-menu" class="btn-floating-menu">
            <span></span>
            <span></span>
            <span></span>
        </div>

        <div id="menu-overlay-negocio" class="menu-overlay-negocio">
            <ul>
                <li><button class="menu-nav-btn" data-target="hoy">Hoy</button></li>
                <li><button class="menu-nav-btn" data-target="todos">Todos los Turnos</button></li>
                <li><button class="menu-nav-btn" data-target="carga-manual">Carga Manual</button></li>
                <li><button class="menu-nav-btn" data-target="servicios">Servicios</button></li>
                <li><button class="menu-nav-btn" data-target="paquetes">Paquetes</button></li>
                <li><button class="menu-nav-btn" data-target="horarios">Horarios</button></li>
                <li><button class="menu-nav-btn" data-target="diseno">Diseño</button></li>
                <li><button class="menu-nav-btn" data-target="bot-wpp">Bot WhatsApp</button></li>
                <li><button id="btn-logout-mobile" style="color: #ff4d4d;">Cerrar Sesión</button></li>
            </ul>
        </div>

    </div>
    <?php endif; ?>
</div>
