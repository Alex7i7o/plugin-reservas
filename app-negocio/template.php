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
    <div id="dashboard-negocio-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h1>Panel del Día - <?php echo esc_html($hoy); ?></h1>
            <button id="btn-logout-negocio" class="button" style="padding: 0.5rem 1rem; background: #dc3232; color: white; border: none; border-radius: 4px; cursor: pointer;">Cerrar sesión</button>
        </div>

    <div class="panel-layout">
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

        <div class="panel-card">
            <h2>Carga Manual de Turno</h2>
            <form method="post" action="" class="form-manual">
                <?php wp_nonce_field('sr_turno_manual_action', 'sr_turno_manual_nonce'); ?>

                <div class="form-group">
                    <label for="cliente">Nombre del Cliente</label>
                    <input name="cliente" type="text" id="cliente" class="input-pro" required>
                </div>

                <div class="form-group">
                    <label for="email">Email</label>
                    <input name="email" type="email" id="email" class="input-pro" required>
                </div>

                <div class="form-group">
                    <label for="servicio">Servicio</label>
                    <select name="servicio" id="servicio" class="input-pro" required>
                        <option value="">Seleccione un servicio</option>
                        <?php foreach ($servicios as $srv): ?>
                            <option value="<?php echo esc_attr($srv->post_title); ?>"><?php echo esc_html($srv->post_title); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="form-group">
                    <label for="fecha">Fecha</label>
                    <input name="fecha" type="date" id="fecha" class="input-pro" required>
                </div>

                <div class="form-group">
                    <label for="hora">Hora Inicio</label>
                    <input name="hora" type="time" id="hora" class="input-pro" required>
                </div>

                <div class="form-group">
                    <label for="hora_fin">Hora Fin</label>
                    <input name="hora_fin" type="time" id="hora_fin" class="input-pro">
                </div>

                <div class="form-actions">
                    <button type="submit" name="submit" id="submit" class="button button-primary btn-reserva">Agendar Turno Manualmente</button>
                </div>
            </form>
        </div>

        <div class="panel-card">
            <h2>Crear Nuevo Servicio</h2>
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
    <?php endif; ?>
</div>
