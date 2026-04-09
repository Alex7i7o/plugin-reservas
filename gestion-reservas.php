<?php
/*
Plugin Name: Sistema de Reservas
Description: CPT para Servicios y Reservas con campos personalizados.
Version: 1.0
Author: Alex Agüero
*/

if( function_exists('acf_add_options_page') ) {
    acf_add_options_page(array(
        'page_title'    => 'Ajustes de Reserva',
        'menu_title'    => 'Ajustes de Reserva',
        'menu_slug'     => 'ajustes-reserva',
        'capability'    => 'edit_posts',
        'redirect'      => false
    ));
}

// Evitar acceso directo
if (!defined('ABSPATH')) exit;

// Composer autoload
if (file_exists(plugin_dir_path(__FILE__) . 'vendor/autoload.php')) {
    require_once plugin_dir_path(__FILE__) . 'vendor/autoload.php';
}

// --- Opciones de Configuración de Google ---
function sr_registrar_ajustes() {
    register_setting('sr_config_reservas_group', 'sr_google_client_id');
    register_setting('sr_config_reservas_group', 'sr_service_account_email', 'sanitize_email');
    register_setting('sr_config_reservas_group', 'sr_service_account_private_key');
    register_setting('sr_config_reservas_group', 'sr_calendar_id');
    register_setting('sr_config_reservas_group', 'sr_mp_access_token');
}
add_action('admin_init', 'sr_registrar_ajustes');

function sr_agregar_menu_ajustes() {
    add_options_page(
        'Configuración de Reservas',
        'Configuración de Reservas',
        'manage_options',
        'sr-configuracion-reservas',
        'sr_renderizar_pagina_ajustes'
    );
}
add_action('admin_menu', 'sr_agregar_menu_ajustes');

function sr_renderizar_pagina_ajustes() {
    ?>
    <div class="wrap">
        <h1>Configuración de Reservas</h1>
        <form method="post" action="options.php">
            <?php settings_fields('sr_config_reservas_group'); ?>
            <?php do_settings_sections('sr_config_reservas_group'); ?>
            <table class="form-table">
                <tr valign="top">
                    <th scope="row">Google Client ID (Login)</th>
                    <td>
                        <input type="text" name="sr_google_client_id" value="<?php echo esc_attr(get_option('sr_google_client_id')); ?>" class="regular-text" />
                    </td>
                </tr>
                <tr valign="top">
                    <th scope="row">Email de la Service Account</th>
                    <td>
                        <input type="email" name="sr_service_account_email" value="<?php echo esc_attr(get_option('sr_service_account_email')); ?>" class="regular-text" />
                    </td>
                </tr>
                <tr valign="top">
                    <th scope="row">Private Key de la Service Account</th>
                    <td>
                        <textarea name="sr_service_account_private_key" rows="5" class="large-text code"><?php echo esc_textarea(get_option('sr_service_account_private_key')); ?></textarea>
                        <p class="description">El bloque completo del JSON, incluyendo -----BEGIN PRIVATE KEY----- y -----END PRIVATE KEY-----</p>
                    </td>
                </tr>
                <tr valign="top">
                    <th scope="row">ID del Calendario de Google</th>
                    <td>
                        <input type="text" name="sr_calendar_id" value="<?php echo esc_attr(get_option('sr_calendar_id')); ?>" class="regular-text" />
                        <p class="description">El email del calendario principal (ej. primary o email@gmail.com)</p>
                    </td>
                </tr>
                <tr valign="top">
                    <th scope="row">Mercado Pago Access Token</th>
                    <td>
                        <input type="text" name="sr_mp_access_token" value="<?php echo esc_attr(get_option('sr_mp_access_token')); ?>" class="regular-text" />
                        <p class="description">Access Token de Mercado Pago para procesar pagos de reservas</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}
// ------------------------------------------


// Aquí irá el código de los CPT
function crear_cpt_servicios() {
    $labels = array(
        'name' => 'Servicios',
        'singular_name' => 'Servicio',
        'menu_name' => 'Servicios Estética',
    );

    $args = array(
        'labels'             => $labels,
        'public'             => true, // Para que tu JS lo pueda leer
        'show_in_rest'       => true, // ¡CLAVE! Esto habilita la REST API para tu JS
        'menu_icon'          => 'dashicons-admin-tools',
        'supports'           => array('title', 'editor', 'thumbnail'),
        'has_archive'        => true,
    );
    register_post_type('servicio', $args);
}
add_action('init', 'crear_cpt_servicios');

function crear_cpt_reservas() {
    $labels = array(
        'name' => 'Reservas',
        'singular_name' => 'Reserva',
    );

    $args = array(
        'labels'             => $labels,
        'public'             => false, // Las reservas no deben ser públicas en Google
        'show_ui'            => true,  // Pero sí queremos verlas en el panel
        'show_in_rest'       => true,  // Tu JS necesita enviar datos aquí
        'menu_icon'          => 'dashicons-calendar-alt',
        'supports'           => array('title'), // Solo el título, lo demás son campos de ACF
    );
    register_post_type('reserva', $args);
}
add_action('init', 'crear_cpt_reservas');

// Permitir que la API acepte los campos de ACF al crear un post desde JS
add_filter( 'acf/rest/allow_update', '__return_true' );

// Función para que la reserva se guarde con el título automático (opcional pero ordenado)
add_filter('wp_insert_post_data', function($data, $postarr) {
    if($data['post_type'] == 'reserva' && empty($data['post_title'])) {
        $data['post_title'] = 'Nueva Reserva - ' . date('Y-m-d H:i');
    }
    return $data;
}, 10, 2);


// Creamos el "Shortcode" para mostrar la app
// 1. Corregimos el Shortcode y la ruta del archivo
function mostrar_mi_app_reservas() {
    // Definimos la ruta exacta al archivo
    $archivo_path = plugin_dir_path(__FILE__) . 'template/app-interface.php';

    if (file_exists($archivo_path)) {
        ob_start();
        include $archivo_path;
        return ob_get_clean();
    } else {
        return "Error: No se encuentra el archivo en: " . $archivo_path;
    }
}
add_shortcode('mi_app_reservas', 'mostrar_mi_app_reservas');



// Carga de modulos

function encolar_scripts_reservas() {
    // Encolamos el CSS compilado (que estará en la carpeta css/)
    wp_enqueue_style('reserva-estilos', plugins_url('/css/main.css', __FILE__), array(), '1.5');

    wp_enqueue_script(
    'reserva-main', 
    plugins_url('/js/main.js', __FILE__), 
    array(), // Sin dependencias de PHP, las dependencias son los 'import' en JS
    '2.0',   // Subimos versión por caché
    true
    );


    $id = 2; 
    $dias_map = ['monday' => 'lun', 'tuesday' => 'mar', 'wednesday' => 'mie', 'thursday' => 'jue', 'friday' => 'vie', 'saturday' => 'sab', 'sunday' => 'dom'];
    $config_semana = array();

    $all_fields = get_fields($id);
    if (is_array($all_fields)) {
        foreach ($dias_map as $eng => $esp) {
            $config_semana[$eng] = array(
                'ap' => isset($all_fields[$esp.'_ap']) ? $all_fields[$esp.'_ap'] : null,
                'ci' => isset($all_fields[$esp.'_ci']) ? $all_fields[$esp.'_ci'] : null,
                'br_i' => isset($all_fields[$esp.'_br_i']) ? $all_fields[$esp.'_br_i'] : null,
                'br_f' => isset($all_fields[$esp.'_br_f']) ? $all_fields[$esp.'_br_f'] : null,
                'activo' => isset($all_fields[$esp.'_status']) ? $all_fields[$esp.'_status'] : null
            );
        }
    } else {
        foreach ($dias_map as $eng => $esp) {
            $config_semana[$eng] = array(
                'ap' => get_field($esp.'_ap', $id),
                'ci' => get_field($esp.'_ci', $id),
                'br_i' => get_field($esp.'_br_i', $id),
                'br_f' => get_field($esp.'_br_f', $id),
                'activo' => get_field($esp.'_status', $id)
            );
        }
    }

    // 2. Localizamos los datos en 'reserva-main'
    $client_id = get_option('sr_google_client_id', '57411239751-805cvkqrq4i46f0n37abslrqfkbrtg42.apps.googleusercontent.com');
    if (empty($client_id)) $client_id = '57411239751-805cvkqrq4i46f0n37abslrqfkbrtg42.apps.googleusercontent.com';

    $calendar_id = get_option('sr_calendar_id', 'primary');
    if (empty($calendar_id)) $calendar_id = 'primary';

    wp_localize_script('reserva-main', 'appConfig', array(
        'apiUrl' => rest_url('wp/v2/'),
        'googleClientId' => $client_id,
        'calendarId' => $calendar_id,
        'nonce'  => wp_create_nonce('wp_rest'),
        'horariosSemana' => $config_semana
    ));
}
add_action('wp_enqueue_scripts', 'encolar_scripts_reservas');

// Este filtro ahora sí va a encontrar 'reserva-auth' y 'reserva-main'
add_filter('script_loader_tag', function($tag, $handle, $src) {
    // Si el nombre del script (handle) contiene 'reserva-', le ponemos type="module"
    if (strpos($handle, 'reserva-') !== false) {
        $tag = '<script type="module" src="' . esc_url($src) . '" id="' . esc_attr($handle) . '-js"></script>';
    }
    return $tag;
}, 10, 3);


// -------
// Calendar
// Ejemplo conceptual de la función en PHP
function insertar_en_calendario_negocio($reserva_data) {
    $client = new \Google\Client();
    $authConfig = array(
        'type'         => 'service_account',
        'client_email' => get_option('sr_service_account_email'),
        'private_key'  => get_option('sr_service_account_private_key'),
    );
    $client->setAuthConfig($authConfig);
    $client->addScope(\Google\Service\Calendar::CALENDAR_EVENTS);
    
    $service = new \Google\Service\Calendar($client);
    $event = new \Google\Service\Calendar\Event(array(
        'summary' => 'NUEVO TURNO: ' . $reserva_data['cliente'],
        'start' => array('dateTime' => $reserva_data['inicio']),
        'end' => array('dateTime' => $reserva_data['fin']),
    ));

    $calendarId = get_option('sr_calendar_id', 'primary');
    if (empty($calendarId)) $calendarId = 'primary';
    $service->events->insert($calendarId, $event);
}

// ------------------------------


// Guardar datos 

// 1. Registramos la ruta correctamente
add_action('rest_api_init', function () {
    register_rest_route('wp/v2', '/reserva', array( // Cambiamos a wp/v2 para coincidir con tu JS
        'methods' => 'POST',
        'callback' => 'guardar_reserva_callback',
        'permission_callback' => function ($request) {
            $nonce = $request->get_header('x_wp_nonce');
            return wp_verify_nonce($nonce, 'wp_rest') ? true : new WP_Error('rest_forbidden', 'Nonce inválido', array('status' => 401));
        },
    ));

    register_rest_route('wp/v2', '/disponibilidad', array(
        'methods' => 'GET',
        'callback' => 'consultar_disponibilidad_callback',
        'permission_callback' => '__return_true',
    ));

    register_rest_route('wp/v2', '/reserva/pago-confirmado', array(
        'methods' => 'POST',
        'callback' => 'webhook_pago_confirmado_callback',
        'permission_callback' => '__return_true',
    ));
});

function webhook_pago_confirmado_callback($request) {
    $mp_access_token = get_option('sr_mp_access_token');
    if (empty($mp_access_token)) {
        return new WP_Error('mp_error', 'Mercado Pago token not configured', array('status' => 500));
    }

    $topic = $request->get_param('topic') ?: $request->get_param('type');

    // El ID real del pago viene dentro de data.id en el webhook
    $data_param = $request->get_param('data');
    $id = null;
    if (is_array($data_param) && isset($data_param['id'])) {
        $id = $data_param['id'];
    } elseif ($request->get_param('data_id')) {
        $id = $request->get_param('data_id');
    }

    if ($topic !== 'payment' || empty($id)) {
        return new WP_REST_Response('Not a payment event or missing ID', 200);
    }

    \MercadoPago\MercadoPagoConfig::setAccessToken($mp_access_token);
    $payment_client = new \MercadoPago\Client\Payment\PaymentClient();

    try {
        $payment = $payment_client->get($id);

        if ($payment->status === 'approved') {
            $post_id = intval($payment->external_reference);

            if ($post_id && get_post_status($post_id) === 'pending') {
                // Publish the post
                wp_update_post(array(
                    'ID' => $post_id,
                    'post_status' => 'publish'
                ));

                // Fetch details to insert into Google Calendar
                $cliente = get_field('cliente', $post_id);
                $fecha = get_field('fecha', $post_id);
                $hora = get_field('hora', $post_id);
                $hora_fin = get_field('hora_fin', $post_id);
                $servicio = get_field('servicio', $post_id);

                $reserva_data = array(
                    'cliente' => $cliente,
                    'inicio' => $fecha . 'T' . $hora . ':00-03:00',
                    'fin' => $fecha . 'T' . ($hora_fin ?: $hora) . ':00-03:00',
                    'servicio' => $servicio
                );

                insertar_en_calendario_negocio($reserva_data);

                return new WP_REST_Response('Payment approved and event scheduled', 200);
            }
        }

        return new WP_REST_Response('Payment not approved or already processed', 200);
    } catch (Exception $e) {
        return new WP_Error('mp_error', 'Error reading payment: ' . $e->getMessage(), array('status' => 500));
    }
}

function consultar_disponibilidad_callback($request) {
    $fecha = sanitize_text_field($request->get_param('fecha'));

    if (empty($fecha)) {
        return new WP_Error('falta_fecha', 'Se requiere el parámetro fecha', array('status' => 400));
    }

    try {
        $client = new \Google\Client();
        $private_key = get_option('sr_service_account_private_key');
        $private_key = str_replace("\\n", "\n", $private_key);

        $authConfig = array(
            'type'         => 'service_account',
            'client_email' => get_option('sr_service_account_email'),
            'private_key'  => $private_key,
        );
        $client->setAuthConfig($authConfig);
        $client->addScope(\Google\Service\Calendar::CALENDAR_READONLY);

        $service = new \Google\Service\Calendar($client);
        $calendarId = get_option('sr_calendar_id', 'primary');
        if (empty($calendarId)) $calendarId = 'primary';

        $freebusyReq = new \Google\Service\Calendar\FreeBusyRequest();
        $freebusyReq->setTimeMin(date('c', strtotime($fecha . ' 00:00:00')));
        $freebusyReq->setTimeMax(date('c', strtotime($fecha . ' 23:59:59')));
        $freebusyReq->setTimeZone('America/Argentina/Buenos_Aires');

        $item = new \Google\Service\Calendar\FreeBusyRequestItem();
        $item->setId($calendarId);
        $freebusyReq->setItems(array($item));

        $freebusyRes = $service->freebusy->query($freebusyReq);
        $calendars = $freebusyRes->getCalendars();

        $ocupados = array();
        if (isset($calendars[$calendarId])) {
            $busy_periods = $calendars[$calendarId]->getBusy();
            if (!empty($busy_periods)) {
                foreach ($busy_periods as $period) {
                    $start = new \DateTime($period->getStart());
                    $start->setTimezone(new \DateTimeZone('America/Argentina/Buenos_Aires'));
                    $end = new \DateTime($period->getEnd());
                    $end->setTimezone(new \DateTimeZone('America/Argentina/Buenos_Aires'));

                    $ocupados[] = array(
                        'inicio' => $start->format('H:i'),
                        'fin' => $end->format('H:i')
                    );
                }
            }
        }

        return new WP_REST_Response($ocupados, 200);

    } catch (Exception $e) {
        wp_send_json_error( array( 'message' => $e->getMessage() ) );
    }
}

// 2. La función que procesa los datos
function guardar_reserva_callback($request) {
    $parametros = $request->get_json_params();
    
    // Sanitización de entradas
    $email      = isset($parametros['email']) ? sanitize_email($parametros['email']) : '';
    $hora       = isset($parametros['hora']) ? sanitize_text_field($parametros['hora']) : '';
    $hora_fin   = isset($parametros['horaFin']) ? sanitize_text_field($parametros['horaFin']) : '';
    $fecha      = isset($parametros['fecha']) ? sanitize_text_field($parametros['fecha']) : '';
    $servicio   = isset($parametros['servicio']) ? sanitize_text_field($parametros['servicio']) : '';
    $servicioId = isset($parametros['servicioId']) ? intval($parametros['servicioId']) : 0;
    $cliente    = isset($parametros['cliente']) ? sanitize_text_field($parametros['cliente']) : '';

    // IMPORTANTE: Asegurate de tener el CPT 'reserva' creado
    $post_id = wp_insert_post(array(
        'post_title'   => 'Reserva: ' . $email . ' - ' . $hora,
        'post_type'    => 'reserva', // Verifica que este slug sea el correcto en tu CPT
        'post_status'  => 'pending',
    ));

    if ($post_id) {
        // Guardamos los datos en ACF / Post meta. 
        update_field('cliente', $cliente, $post_id);
        update_field('email_cliente', $email, $post_id);
        update_field('fecha', $fecha, $post_id);
        update_field('hora', $hora, $post_id);
        update_field('hora_fin', $hora_fin, $post_id);
        update_field('servicio', $servicio, $post_id);
        update_field('cliente', $cliente, $post_id);

        // Obtener el precio del servicio para Mercado Pago
        $precio_servicio = get_post_meta($servicioId, 'precio', true);
        if (empty($precio_servicio)) {
            $precio_servicio = 1000; // Valor por defecto si no tiene
        }

        // Integración con Mercado Pago
        $mp_access_token = get_option('sr_mp_access_token');
        if (!empty($mp_access_token)) {
            \MercadoPago\MercadoPagoConfig::setAccessToken($mp_access_token);
            $client = new \MercadoPago\Client\Preference\PreferenceClient();

            $preference_data = array(
                "items" => array(
                    array(
                        "title" => "Reserva - " . $servicio,
                        "quantity" => 1,
                        "unit_price" => (float) $precio_servicio
                    )
                ),
                "external_reference" => (string) $post_id,
                "notification_url" => rest_url('wp/v2/reserva/pago-confirmado'),
                "back_urls" => array(
                    "success" => home_url(),
                    "failure" => home_url('?payment=failed'),
                    "pending" => home_url('?payment=failed')
                ),
                "auto_return" => "approved"
            );

            try {
                $preference = $client->create($preference_data);
                return new WP_REST_Response(array('message' => 'Reserva pendiente de pago', 'id' => $post_id, 'init_point' => $preference->init_point), 200);
            } catch (Exception $e) {
                return new WP_Error('mp_error', 'Error al crear la preferencia de Mercado Pago: ' . $e->getMessage(), array('status' => 500));
            }
        }
        
        return new WP_REST_Response(array('message' => 'Reserva guardada', 'id' => $post_id), 200);
    }

    return new WP_Error('error_guardado', 'No se pudo insertar el post', array('status' => 500));
}

