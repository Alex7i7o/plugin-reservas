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
            'cliente' => isset($fields['cliente']) ? $fields['cliente'] : '',
            'hora' => isset($fields['hora']) ? $fields['hora'] : '',
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
                <li><button id="btn-logout-negocio" class="btn-logout">Cerrar sesión</button></li>
            </ul>
        </nav>

        <div id="main-view" class="app-main-view">

            <div id="section-hoy" class="app-section active">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h1>Panel del Día - <?php echo esc_html($hoy); ?></h1>
                </div>

                <div class="panel-card">
                    <h2>Turnos para Hoy</h2>
                    <table class="panel-table">
                        <thead>
                            <tr>
                                <th>Hora</th>
                                <th>Cliente</th>
                                <th>Servicio</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($reservas_hoy)): ?>
                                <tr><td colspan="3">No hay turnos agendados para hoy.</td></tr>
                            <?php else: ?>
                                <?php foreach ($reservas_hoy as $reserva): ?>
                                    <tr>
                                        <td><strong><?php echo esc_html($reserva['hora']); ?></strong></td>
                                        <td><?php echo esc_html($reserva['cliente']); ?></td>
                                        <td><?php echo esc_html($reserva['servicio']); ?></td>
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

                        <div class="form-row">
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
                </div>
            </div>

        </div>
    </div>
    <?php endif; ?>
</div>
