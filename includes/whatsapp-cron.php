<?php

if (!defined('ABSPATH')) exit;

// Programar los eventos al inicializar
add_action('init', 'sr_programar_cron_whatsapp');

function sr_programar_cron_whatsapp() {
    if (!wp_next_scheduled('sr_whatsapp_recordatorios')) {
        // Programar para las 09:00 AM hora local
        $time_0900 = strtotime('tomorrow 09:00:00');
        wp_schedule_event($time_0900, 'daily', 'sr_whatsapp_recordatorios');
    }
    
    if (!wp_next_scheduled('sr_whatsapp_recuperacion')) {
        // Programar para las 10:00 AM hora local
        $time_1000 = strtotime('tomorrow 10:00:00');
        wp_schedule_event($time_1000, 'daily', 'sr_whatsapp_recuperacion');
    }
}

// Limpiar cron al desactivar el plugin
register_deactivation_hook(plugin_dir_path(dirname(__FILE__)) . 'gestion-reservas.php', 'sr_desactivar_cron_whatsapp');
function sr_desactivar_cron_whatsapp() {
    $timestamp1 = wp_next_scheduled('sr_whatsapp_recordatorios');
    if ($timestamp1) wp_unschedule_event($timestamp1, 'sr_whatsapp_recordatorios');

    $timestamp2 = wp_next_scheduled('sr_whatsapp_recuperacion');
    if ($timestamp2) wp_unschedule_event($timestamp2, 'sr_whatsapp_recuperacion');
}


// ----------------------------------------------------
// TAREA A: Recordatorios (09:00 AM)
// ----------------------------------------------------
add_action('sr_whatsapp_recordatorios', 'sr_ejecutar_recordatorios');

function sr_ejecutar_recordatorios() {
    $activos = get_option('sr_recordatorios_activos');
    if (!$activos) return;

    // Buscar reservas para mañana
    $manana_inicio = date('Y-m-d 00:00:00', strtotime('+1 day'));
    $manana_fin = date('Y-m-d 23:59:59', strtotime('+1 day'));

    // Asumimos que los turnos se guardan como CPT 'reserva' 
    // y tienen un ACF o meta field con la fecha de inicio.
    // Habría que adaptar la meta_key según el campo ACF real de la fecha del turno.
    // Ejemplo ficticio con 'fecha_inicio'
    $args = array(
        'post_type' => 'reserva',
        'posts_per_page' => -1,
        'post_status' => 'publish',
        'meta_query' => array(
            array(
                'key' => 'fecha_inicio', // Asegurarse que coincida con el ACF
                'value' => array($manana_inicio, $manana_fin),
                'compare' => 'BETWEEN',
                'type' => 'DATETIME'
            )
        )
    );

    $reservas = get_posts($args);

    foreach ($reservas as $reserva) {
        $telefono = get_post_meta($reserva->ID, 'telefono_cliente', true); // Ajustar según ACF
        $nombre = get_post_meta($reserva->ID, 'nombre_cliente', true);
        $hora = date('H:i', strtotime(get_post_meta($reserva->ID, 'fecha_inicio', true)));

        if ($telefono) {
            $mensaje = "Hola $nombre, te recordamos que tienes un turno mañana a las $hora hs. ¡Te esperamos en Violett Estética!";
            sr_enviar_mensaje_whatsapp($telefono, $mensaje);
        }
    }
}


// ----------------------------------------------------
// TAREA B: Recuperación de Clientes (10:00 AM)
// ----------------------------------------------------
add_action('sr_whatsapp_recuperacion', 'sr_ejecutar_recuperacion');

function sr_ejecutar_recuperacion() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'sr_clientes_whatsapp';
    
    // Clientes que su última visita fue hace más de 30 días
    // y que no se les haya enviado un mensaje en los últimos 15 días (para no ser spam)
    $hace_30_dias = date('Y-m-d H:i:s', strtotime('-30 days'));
    $hace_15_dias = date('Y-m-d H:i:s', strtotime('-15 days'));

    $clientes = $wpdb->get_results($wpdb->prepare("
        SELECT * FROM $table_name 
        WHERE ultima_visita < %s 
        AND ultimo_mensaje_enviado < %s
    ", $hace_30_dias, $hace_15_dias));

    if (empty($clientes)) return;

    $gemini_api_key = get_option('sr_gemini_api_key');
    $prompt_recuperacion = get_option('sr_prompt_recuperacion', 'Genera un mensaje corto, amigable y persuasivo invitando al cliente a volver a la estética tras más de un mes de ausencia. Puedes ofrecerle consultar promociones vigentes. Usa un tono cálido y femenino.');

    if (!$gemini_api_key) return;

    foreach ($clientes as $cliente) {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $gemini_api_key;
        
        $historial = json_decode($cliente->historial_servicios, true);
        $servicios_str = is_array($historial) && count($historial) > 0 ? implode(', ', $historial) : 'No registra historial previo';

        $system_prompt = "
        $prompt_recuperacion
        Nombre del cliente: {$cliente->nombre}.
        Servicios pasados: {$servicios_str}.
        No ofrezcas precios fijos. Termina con una pregunta abierta.
        ";

        $body = array(
            'contents' => array(
                array(
                    'role' => 'user',
                    'parts' => array(
                        array('text' => $system_prompt)
                    )
                )
            )
        );

        $response = wp_remote_post($url, array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode($body),
            'timeout' => 15
        ));

        if (!is_wp_error($response)) {
            $body_res = json_decode(wp_remote_retrieve_body($response), true);
            if (isset($body_res['candidates'][0]['content']['parts'][0]['text'])) {
                $mensaje_generado = trim($body_res['candidates'][0]['content']['parts'][0]['text']);
                
                sr_enviar_mensaje_whatsapp($cliente->telefono, $mensaje_generado);
                
                // Actualizar último mensaje enviado para no saturar
                $wpdb->update($table_name, 
                    array('ultimo_mensaje_enviado' => current_time('mysql')), 
                    array('id' => $cliente->id)
                );
            }
        }
    }
}
