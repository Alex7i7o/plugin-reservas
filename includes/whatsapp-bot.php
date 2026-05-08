<?php

if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    // Endpoint para la verificación inicial de Meta (GET)
    register_rest_route('violett/v1', '/webhook/whatsapp', array(
        'methods' => 'GET',
        'callback' => 'sr_whatsapp_verify_webhook',
        'permission_callback' => '__return_true',
    ));

    // Endpoint para recibir mensajes de WhatsApp (POST)
    register_rest_route('violett/v1', '/webhook/whatsapp', array(
        'methods' => 'POST',
        'callback' => 'sr_whatsapp_receive_message',
        'permission_callback' => '__return_true',
    ));
});

function sr_whatsapp_verify_webhook($request) {
    // Token de verificación configurado (o un string fijo si prefieres)
    $verify_token = 'violett_wp_bot_2026'; // Esto debería coincidir con lo que pongas en el Dashboard de Meta
    
    $mode = $request->get_param('hub_mode');
    $token = $request->get_param('hub_verify_token');
    $challenge = $request->get_param('hub_challenge');

    if ($mode && $token) {
        if ($mode === 'subscribe' && $token === $verify_token) {
            return new WP_REST_Response((int)$challenge, 200);
        } else {
            return new WP_REST_Response('Forbidden', 403);
        }
    }
    return new WP_REST_Response('Bad Request', 400);
}

function sr_whatsapp_receive_message($request) {
    $payload = $request->get_json_params();

    // Validar estructura básica de Meta WhatsApp
    if (!isset($payload['object']) || $payload['object'] !== 'whatsapp_business_account') {
        return new WP_REST_Response('Not a WhatsApp Event', 404);
    }

    foreach ($payload['entry'] as $entry) {
        foreach ($entry['changes'] as $change) {
            $value = $change['value'];
            
            // Verificar si es un mensaje entrante (no de estado)
            if (isset($value['messages']) && !empty($value['messages'])) {
                $message = $value['messages'][0];
                $contact = $value['contacts'][0];
                
                $phone = $message['from'];
                $name = $contact['profile']['name'];
                
                if ($message['type'] === 'text') {
                    $text = $message['text']['body'];
                    sr_procesar_mensaje_whatsapp($phone, $name, $text);
                }
            }
        }
    }

    // Siempre retornar 200 OK rápido a Meta para que no reenvíen
    return new WP_REST_Response('EVENT_RECEIVED', 200);
}

function sr_procesar_mensaje_whatsapp($phone, $name, $text) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'sr_clientes_whatsapp';

    // 1. Buscar o Crear Cliente
    $cliente = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE telefono = %s", $phone));
    
    $now = current_time('mysql');
    if (!$cliente) {
        $wpdb->insert($table_name, array(
            'telefono' => $phone,
            'nombre' => $name,
            'ultima_visita' => $now, // Se actualizaría cuando asiste
            'ultimo_mensaje_enviado' => $now,
            'historial_servicios' => json_encode(array())
        ));
        $cliente = (object) array(
            'telefono' => $phone,
            'nombre' => $name,
            'historial_servicios' => '[]'
        );
    } else {
        $wpdb->update($table_name, 
            array('ultimo_mensaje_enviado' => $now), 
            array('telefono' => $phone)
        );
    }

    // 2. Obtener Contexto
    $prompt_personalidad = get_option('sr_prompt_personalidad', 'Eres una asistente virtual amigable de Violett Estética.');
    $historial = json_decode($cliente->historial_servicios, true);
    
    // Simplificación: En un entorno real, aquí se consultaría la disponibilidad real de turnos
    // desde hoy hasta X días adelante según los horarios de atención y CPT "reserva".
    $disponibilidad = "Lunes a Viernes de 09:00 a 18:00 (Sujeto a confirmación)."; 

    $system_prompt = "
    $prompt_personalidad
    El cliente se llama: $name.
    Su número de teléfono es: $phone.
    Servicios que se ha hecho antes: " . implode(', ', $historial) . ".
    Disponibilidad de la estética: $disponibilidad.
    Si el cliente desea confirmar un turno, responde incluyendo la frase '[CONFIRMAR_TURNO:fecha_y_hora:servicio]'. Por lo demás, compórtate naturalmente.
    ";

    // 3. Llamada a Gemini
    $gemini_api_key = get_option('sr_gemini_api_key');
    if (!$gemini_api_key) return;

    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $gemini_api_key;
    
    $body = array(
        'contents' => array(
            array(
                'role' => 'user',
                'parts' => array(
                    array('text' => "Instrucciones de sistema:\n" . $system_prompt . "\n\nMensaje del cliente:\n" . $text)
                )
            )
        )
    );

    $response = wp_remote_post($url, array(
        'headers' => array('Content-Type' => 'application/json'),
        'body' => json_encode($body),
        'timeout' => 15
    ));

    if (is_wp_error($response)) {
        sr_enviar_mensaje_whatsapp($phone, "Disculpa, en este momento tengo problemas de conexión. Por favor intenta más tarde.");
        return;
    }

    $body_res = json_decode(wp_remote_retrieve_body($response), true);
    if (isset($body_res['candidates'][0]['content']['parts'][0]['text'])) {
        $respuesta_gemini = $body_res['candidates'][0]['content']['parts'][0]['text'];
        
        // 4. Interpretar acciones (Ej: Confirmar turno)
        if (preg_match('/\[CONFIRMAR_TURNO:(.*?):(.*?)\]/', $respuesta_gemini, $matches)) {
            $fecha_hora = $matches[1];
            $servicio = $matches[2];
            // Aquí llamarías a una función para insertar el post type 'reserva'
            $respuesta_gemini = str_replace($matches[0], '', $respuesta_gemini);
            // $reserva_id = wp_insert_post(...)
        }

        // 5. Enviar respuesta por WhatsApp
        sr_enviar_mensaje_whatsapp($phone, trim($respuesta_gemini));
    }
}

function sr_enviar_mensaje_whatsapp($to, $text) {
    $token = get_option('sr_whatsapp_api_token');
    $phone_id = get_option('sr_whatsapp_phone_id');
    
    if (!$token || !$phone_id) return;

    $url = "https://graph.facebook.com/v19.0/{$phone_id}/messages";
    
    $body = array(
        'messaging_product' => 'whatsapp',
        'recipient_type' => 'individual',
        'to' => $to,
        'type' => 'text',
        'text' => array('preview_url' => false, 'body' => $text)
    );

    wp_remote_post($url, array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $token,
            'Content-Type' => 'application/json'
        ),
        'body' => json_encode($body)
    ));
}
