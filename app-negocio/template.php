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
    <h1>Panel del Día - <?php echo esc_html($hoy); ?></h1>

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
    </div>
</div>
