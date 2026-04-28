<?php
// app-negocio/app-negocio.php

if (!defined('ABSPATH')) exit;

function mostrar_app_negocio() {
    $archivo_path = plugin_dir_path(__FILE__) . 'template.php';

    // Verificamos autorización
    $is_authorized = is_user_logged_in() && (current_user_can('manage_options') || current_user_can('editor'));

    // Manejar form submission para Carga Manual si estamos en el front-end y se envió el form
    // Solamente lo procesamos si está autorizado
    $mensaje = '';
    if ($is_authorized && isset($_POST['sr_turno_manual_nonce']) && wp_verify_nonce($_POST['sr_turno_manual_nonce'], 'sr_turno_manual_action')) {
        $cliente = sanitize_text_field($_POST['cliente']);
        $email = sanitize_email($_POST['email']);
        $fecha = sanitize_text_field($_POST['fecha']);
        $hora = sanitize_text_field($_POST['hora']);
        $hora_fin = sanitize_text_field($_POST['hora_fin']);
        $servicio = sanitize_text_field($_POST['servicio']);

        $post_id = wp_insert_post(array(
            'post_title'   => 'Reserva: ' . $email . ' - ' . $hora,
            'post_type'    => 'reserva',
            'post_status'  => 'publish', // Turno manual ya está aprobado/pagado
        ));

        if ($post_id) {
            update_field('cliente', $cliente, $post_id);
            update_field('email_cliente', $email, $post_id);
            update_field('fecha', $fecha, $post_id);
            update_field('hora', $hora, $post_id);
            update_field('hora_fin', $hora_fin, $post_id);
            update_field('servicio', $servicio, $post_id);

            $reserva_data = array(
                'cliente' => $cliente,
                'inicio' => $fecha . 'T' . $hora . ':00-03:00',
                'fin' => $fecha . 'T' . ($hora_fin ?: $hora) . ':00-03:00',
                'servicio' => $servicio
            );
            try {
                if (function_exists('insertar_en_calendario_negocio')) {
                    insertar_en_calendario_negocio($reserva_data);
                }
                $mensaje = '<div class="notice notice-success"><p>Turno manual cargado correctamente y agendado en Google Calendar.</p></div>';
            } catch (Exception $e) {
                $mensaje = '<div class="notice notice-warning"><p>Turno guardado en WP, pero falló al agendar en Google: ' . esc_html($e->getMessage()) . '</p></div>';
            }
        } else {
            $mensaje = '<div class="notice notice-error"><p>Error al crear el turno en WordPress.</p></div>';
        }
    }

    if (file_exists($archivo_path)) {
        ob_start();
        include $archivo_path;
        return ob_get_clean();
    } else {
        return "Error: No se encuentra el archivo en: " . $archivo_path;
    }
}
add_shortcode('app_negocio', 'mostrar_app_negocio');
