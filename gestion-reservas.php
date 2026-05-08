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

// Crear tabla de clientes de WhatsApp en la activación
function sr_crear_tabla_clientes_whatsapp() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'sr_clientes_whatsapp';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table_name (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        telefono varchar(50) NOT NULL,
        nombre varchar(100) DEFAULT '' NOT NULL,
        ultima_visita datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
        ultimo_mensaje_enviado datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
        historial_servicios text NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY telefono (telefono)
    ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}
register_activation_hook(__FILE__, 'sr_crear_tabla_clientes_whatsapp');

// Cargar lógica de WhatsApp
require_once plugin_dir_path(__FILE__) . 'includes/whatsapp-bot.php';
require_once plugin_dir_path(__FILE__) . 'includes/whatsapp-cron.php';

// --- Opciones de Configuración de Google ---
function sr_verificar_token_google($access_token) {
    $url = 'https://www.googleapis.com/oauth2/v3/userinfo';
    $response = wp_remote_get($url, array(
        'headers' => array('Authorization' => 'Bearer ' . $access_token)
    ));

    if (is_wp_error($response)) return false;

    $data = json_decode(wp_remote_retrieve_body($response), true);
    return isset($data['email']) ? $data : false;
}

function sr_registrar_ajustes() {
    register_setting('sr_config_reservas_group', 'sr_google_client_id');
    register_setting('sr_config_reservas_group', 'sr_service_account_email', 'sanitize_email');
    register_setting('sr_config_reservas_group', 'sr_service_account_private_key');
    register_setting('sr_config_reservas_group', 'sr_calendar_id');
    register_setting('sr_config_reservas_group', 'sr_mp_access_token');
    register_setting('sr_config_reservas_group', 'sr_mp_enabled');
    register_setting('sr_config_reservas_group', 'sr_discount_5');
    register_setting('sr_config_reservas_group', 'sr_discount_10');
    register_setting('sr_config_reservas_group', 'sr_package_config');
    
    // Configuraciones de WhatsApp y Gemini
    register_setting('sr_config_reservas_group', 'sr_gemini_api_key');
    register_setting('sr_config_reservas_group', 'sr_whatsapp_api_token');
    register_setting('sr_config_reservas_group', 'sr_whatsapp_phone_id');
    register_setting('sr_config_reservas_group', 'sr_prompt_personalidad');
    register_setting('sr_config_reservas_group', 'sr_prompt_recuperacion');
    register_setting('sr_config_reservas_group', 'sr_recordatorios_activos', array(
        'type' => 'boolean',
        'default' => false
    ));
}
add_action('admin_init', 'sr_registrar_ajustes');

/**
 * Filtro Global para Autenticación vía Token (X-Violett-Token)
 * Esto permite que las peticiones REST funcionen sin cookies/nonces nativos de WP.
 */
add_filter('rest_authentication_errors', function($result) {
    // Intentar obtener el token de varias formas (normalización de servidores)
    $token = null;
    if (isset($_SERVER['HTTP_X_VIOLETT_TOKEN'])) {
        $token = $_SERVER['HTTP_X_VIOLETT_TOKEN'];
    } elseif (isset($_GET['violett_token'])) {
        $token = $_GET['violett_token'];
    } elseif (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (isset($headers['X-Violett-Token'])) {
            $token = $headers['X-Violett-Token'];
        }
    }

    if (!empty($token)) {
        $users = get_users(array(
            'meta_key' => 'violett_api_token',
            'meta_value' => $token,
            'number' => 1,
            'fields' => 'ID'
        ));

        if (!empty($users)) {
            wp_set_current_user($users[0]);
            return true; // Autenticación exitosa via Token! Ignoramos errores de Nonce/Cookie previos.
        }
    }

    // Si no hay token válido, respetamos el resultado previo de WP (ej. error de nonce)
    return $result;
});

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
                        <input type="password" name="sr_mp_access_token" value="<?php echo esc_attr(get_option('sr_mp_access_token')); ?>" class="regular-text" />
                        <p class="description">Access Token de Mercado Pago para procesar pagos de reservas</p>
                    </td>
                </tr>
                <tr valign="top">
                    <th scope="row">Descuento Paquete 5 Sesiones (%)</th>
                    <td>
                        <input type="number" name="sr_discount_5" value="<?php echo esc_attr(get_option('sr_discount_5', '10')); ?>" class="small-text" /> %
                    </td>
                </tr>
                <tr valign="top">
                    <th scope="row">Descuento Paquete 10 Sesiones (%)</th>
                    <td>
                        <input type="number" name="sr_discount_10" value="<?php echo esc_attr(get_option('sr_discount_10', '20')); ?>" class="small-text" /> %
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

// CPT Paquete Cliente (Billetera de Créditos)
function crear_cpt_paquetes() {
    $labels = array(
        'name' => 'Paquetes Cliente',
        'singular_name' => 'Paquete Cliente',
        'menu_name' => 'Paquetes',
    );

    $args = array(
        'labels'             => $labels,
        'public'             => false,
        'show_ui'            => true,
        'show_in_rest'       => true,
        'menu_icon'          => 'dashicons-wallet',
        'supports'           => array('title'),
    );
    register_post_type('paquete_cliente', $args);
}
add_action('init', 'crear_cpt_paquetes');

// Registrar campos ACF para paquete_cliente (programáticamente)
function registrar_acf_paquete_cliente() {
    if (!function_exists('acf_add_local_field_group')) return;

    acf_add_local_field_group(array(
        'key' => 'group_paquete_cliente',
        'title' => 'Datos del Paquete',
        'fields' => array(
            array(
                'key' => 'field_paq_user_id',
                'label' => 'User ID Vinculado',
                'name' => 'user_id_vinculado',
                'type' => 'number',
                'required' => 1,
            ),
            array(
                'key' => 'field_paq_servicio_id',
                'label' => 'Servicio Vinculado',
                'name' => 'servicio_vinculado',
                'type' => 'post_object',
                'post_type' => array('servicio'),
                'return_format' => 'id',
                'required' => 1,
            ),
            array(
                'key' => 'field_paq_sesiones_totales',
                'label' => 'Sesiones Totales',
                'name' => 'sesiones_totales',
                'type' => 'number',
                'required' => 1,
                'default_value' => 1,
                'min' => 1,
            ),
            array(
                'key' => 'field_paq_sesiones_restantes',
                'label' => 'Sesiones Restantes',
                'name' => 'sesiones_restantes',
                'type' => 'number',
                'required' => 1,
                'default_value' => 1,
                'min' => 0,
            ),
            array(
                'key' => 'field_paq_fecha_compra',
                'label' => 'Fecha de Compra',
                'name' => 'fecha_compra',
                'type' => 'date_picker',
                'display_format' => 'Y-m-d',
                'return_format' => 'Y-m-d',
                'required' => 1,
            ),
            array(
                'key' => 'field_paq_estado',
                'label' => 'Estado',
                'name' => 'estado',
                'type' => 'select',
                'choices' => array(
                    'activo' => 'Activo',
                    'vencido' => 'Vencido',
                    'agotado' => 'Agotado',
                ),
                'default_value' => 'activo',
                'required' => 1,
            ),
        ),
        'location' => array(
            array(
                array(
                    'param' => 'post_type',
                    'operator' => '==',
                    'value' => 'paquete_cliente',
                ),
            ),
        ),
    ));
}
add_action('acf/init', 'registrar_acf_paquete_cliente');

// --- WP-Cron: Vencimiento automático de paquetes (30 días) ---
function sr_programar_cron_vencimiento() {
    if (!wp_next_scheduled('sr_verificar_vencimiento_paquetes')) {
        wp_schedule_event(time(), 'daily', 'sr_verificar_vencimiento_paquetes');
    }
}
add_action('wp', 'sr_programar_cron_vencimiento');

function sr_ejecutar_vencimiento_paquetes() {
    $hace_30_dias = date('Y-m-d', strtotime('-30 days'));

    $args = array(
        'post_type'      => 'paquete_cliente',
        'posts_per_page' => -1,
        'post_status'    => 'publish',
        'meta_query'     => array(
            'relation' => 'AND',
            array(
                'key'     => 'estado',
                'value'   => 'activo',
                'compare' => '='
            ),
            array(
                'key'     => 'fecha_compra',
                'value'   => $hace_30_dias,
                'compare' => '<',
                'type'    => 'DATE'
            ),
        ),
    );

    $paquetes = get_posts($args);
    foreach ($paquetes as $paquete) {
        update_field('estado', 'vencido', $paquete->ID);
    }
}
add_action('sr_verificar_vencimiento_paquetes', 'sr_ejecutar_vencimiento_paquetes');

// Limpiar cron al desactivar el plugin
function sr_desactivar_cron_vencimiento() {
    $timestamp = wp_next_scheduled('sr_verificar_vencimiento_paquetes');
    if ($timestamp) {
        wp_unschedule_event($timestamp, 'sr_verificar_vencimiento_paquetes');
    }
}
register_deactivation_hook(__FILE__, 'sr_desactivar_cron_vencimiento');

// Permitir que la API acepte los campos de ACF al crear un post desde JS
add_filter( 'acf/rest/allow_update', '__return_true' );

// Función para que la reserva se guarde con el título automático (opcional pero ordenado)
add_filter('wp_insert_post_data', function($data, $postarr) {
    if($data['post_type'] === 'reserva' && empty($data['post_title'])) {
        $data['post_title'] = 'Nueva Reserva - ' . date('Y-m-d H:i');
    }
    return $data;
}, 10, 2);


// Creamos el "Shortcode" para mostrar la app
// 1. Corregimos el Shortcode y la ruta del archivo



// Carga de modulos

function encolar_scripts_reservas() {
    // Encolamos el CSS compilado (que estará en la carpeta css/)
    wp_enqueue_style('reserva-estilos', plugins_url('/css/main.css', __FILE__), array(), '1.5');

    wp_enqueue_script(
        'app-cliente-main',
        plugins_url('/js/app-cliente/main.js', __FILE__),
        array('reserva-main'),
        '1.0',
        true
    );

    wp_enqueue_script(
        'app-negocio-form',
        plugins_url('/js/app-negocio/form-servicio.js', __FILE__),
        array('reserva-main'),
        '1.0',
        true
    );

    wp_enqueue_script(
        'app-negocio-services-list',
        plugins_url('/js/app-negocio/services-list.js', __FILE__),
        array('reserva-main', 'app-negocio-form'),
        '1.0',
        true
    );

    wp_enqueue_script(
        'app-negocio-appointments',
        plugins_url('/js/app-negocio/appointments-table.js', __FILE__),
        array('reserva-main'),
        '1.0',
        true
    );

    wp_enqueue_script(
        'app-negocio-manual-booking',
        plugins_url('/js/app-negocio/manual-booking.js', __FILE__),
        array('reserva-main', 'app-negocio-appointments'),
        '1.0',
        true
    );

    wp_enqueue_script(
        'app-negocio-package-config',
        plugins_url('/js/app-negocio/package-config.js', __FILE__),
        array('reserva-main'),
        '1.0',
        true
    );

    wp_enqueue_script(
        'app-negocio-theme-config',
        plugins_url('/js/app-negocio/theme-config.js', __FILE__),
        array('reserva-main'),
        '1.0',
        true
    );

    wp_enqueue_script(
        'app-negocio-whatsapp-config',
        plugins_url('/js/app-negocio/whatsapp-config.js', __FILE__),
        array('reserva-main'),
        '1.0',
        true
    );

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
        'violettApiUrl' => rest_url('violett/v1/'),
        'googleClientId' => $client_id,
        'calendarId' => $calendar_id,
        'nonce'  => wp_create_nonce('wp_rest'),
        'horariosSemana' => $config_semana,
        'mpEnabled' => get_option('sr_mp_enabled', '1') === '1',
        'discounts' => array(
            '5' => get_option('sr_discount_5', '10'),
            '10' => get_option('sr_discount_10', '20')
        ),
        'packageOptions' => get_option('sr_package_config', array(
            array('sessions' => 1, 'discount' => 0),
            array('sessions' => 5, 'discount' => (int)get_option('sr_discount_5', '10')),
            array('sessions' => 10, 'discount' => (int)get_option('sr_discount_10', '20'))
        )),
        'themeConfig' => get_option('sr_theme_config', array()),
        'whatsappConfig' => array(
            'gemini_api_key' => get_option('sr_gemini_api_key', ''),
            'whatsapp_api_token' => get_option('sr_whatsapp_api_token', ''),
            'whatsapp_phone_id' => get_option('sr_whatsapp_phone_id', ''),
            'prompt_personalidad' => get_option('sr_prompt_personalidad', 'Eres una asistente virtual amigable de Violett Estética.'),
            'prompt_recuperacion' => get_option('sr_prompt_recuperacion', 'Genera un mensaje corto, amigable y persuasivo invitando al cliente a volver a la estética tras más de un mes de ausencia. Puedes ofrecerle consultar promociones vigentes. Usa un tono cálido y femenino.'),
            'recordatorios_activos' => get_option('sr_recordatorios_activos', false)
        )
    ));
}
add_action('wp_enqueue_scripts', 'encolar_scripts_reservas');

// --- Inyectar CSS Custom Properties dinámicas desde la config del tema ---
add_action('wp_head', function() {
    $theme = get_option('sr_theme_config', array());
    if (empty($theme)) return;
    echo '<style id="violett-dynamic-theme">:root{';
    $map = array(
        'primary' => '--v-primary', 'primaryLight' => '--v-primary-light',
        'primaryDark' => '--v-primary-dark', 'accent' => '--v-accent',
        'highlight' => '--v-highlight', 'highlightHover' => '--v-highlight-hover',
    );
    foreach ($map as $key => $var) {
        if (!empty($theme[$key])) echo $var.':'.esc_attr($theme[$key]).';';
    }
    if (!empty($theme['fontPrimary'])) echo '--v-font-primary:'.esc_attr($theme['fontPrimary']).',sans-serif;';
    if (!empty($theme['fontSecondary'])) echo '--v-font-secondary:'.esc_attr($theme['fontSecondary']).',sans-serif;';
    // Calcular RGB para primary
    if (!empty($theme['primary'])) {
        $hex = ltrim($theme['primary'], '#');
        $r = hexdec(substr($hex,0,2)); $g = hexdec(substr($hex,2,2)); $b = hexdec(substr($hex,4,2));
        echo '--v-primary-rgb:'.$r.','.$g.','.$b.';';
    }
    if (!empty($theme['highlight'])) {
        $hex = ltrim($theme['highlight'], '#');
        $r = hexdec(substr($hex,0,2)); $g = hexdec(substr($hex,2,2)); $b = hexdec(substr($hex,4,2));
        echo '--v-highlight-rgb:'.$r.','.$g.','.$b.';';
    }
    echo '}</style>';
});

// Este filtro ahora sí va a encontrar 'reserva-auth', 'reserva-main' y 'app-cliente-main'
add_filter('script_loader_tag', function($tag, $handle, $src) {
    if (in_array($handle, array('reserva-main', 'app-cliente-main', 'app-negocio-form', 'app-negocio-services-list', 'app-negocio-appointments', 'app-negocio-manual-booking', 'app-negocio-paquetes', 'app-negocio-package-config', 'app-negocio-theme-config', 'app-negocio-whatsapp-config'))) {
        $tag = preg_replace('/type=(["\']).*?\1\s*/', '', $tag);
        $tag = str_replace('<script ', '<script type="module" ', $tag);
    }
    return $tag;
}, 10, 3);


// -------
// Calendar
// Ejemplo conceptual de la función en PHP
function insertar_en_calendario_negocio($reserva_data) {
    $client = new \Google\Client();
    $private_key = get_option('sr_service_account_private_key');
    $private_key = str_replace("\\n", "\n", $private_key);

    $authConfig = array(
        'type'         => 'service_account',
        'client_email' => get_option('sr_service_account_email'),
        'private_key'  => $private_key,
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
    $verificar_nonce = function ($request) {
        $nonce = $request->get_header('x_wp_nonce');
        return wp_verify_nonce($nonce, 'wp_rest') ? true : new WP_Error('rest_forbidden', 'Nonce inválido', array('status' => 401));
    };

    $verificar_auth = function ($request) {
        if (is_user_logged_in()) {
            return true;
        }
        return new WP_Error('rest_not_logged_in', 'Debes iniciar sesión.', array('status' => 401));
    };

    register_rest_route('wp/v2', '/auth-google', array(
        'methods' => 'POST',
        'callback' => 'auth_google_callback',
        'permission_callback' => '__return_true',
    ));

    // Endpoints de autenticación nativa para app-negocio
    register_rest_route('violett/v1', '/login', array(
        'methods' => 'POST',
        'callback' => 'violett_login_callback',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('violett/v1', '/logout', array(
        'methods' => 'POST',
        'callback' => function() {
            wp_logout();
            return new WP_REST_Response(array('message' => 'Sesión cerrada'), 200);
        },
        'permission_callback' => '__return_true'
    ));

    // Endpoint para guardar configuraciones de WhatsApp
    register_rest_route('violett/v1', '/config/whatsapp', array(
        'methods' => 'POST',
        'callback' => function($request) {
            $params = $request->get_json_params();

            if (isset($params['gemini_api_key'])) {
                update_option('sr_gemini_api_key', sanitize_text_field($params['gemini_api_key']));
            }
            if (isset($params['whatsapp_api_token'])) {
                update_option('sr_whatsapp_api_token', sanitize_text_field($params['whatsapp_api_token']));
            }
            if (isset($params['whatsapp_phone_id'])) {
                update_option('sr_whatsapp_phone_id', sanitize_text_field($params['whatsapp_phone_id']));
            }
            if (isset($params['prompt_personalidad'])) {
                update_option('sr_prompt_personalidad', sanitize_textarea_field($params['prompt_personalidad']));
            }
            if (isset($params['prompt_recuperacion'])) {
                update_option('sr_prompt_recuperacion', sanitize_textarea_field($params['prompt_recuperacion']));
            }
            if (isset($params['recordatorios_activos'])) {
                update_option('sr_recordatorios_activos', (bool) $params['recordatorios_activos']);
            }

            // Test de conexión simple (opcionalmente)
            $gemini_key = get_option('sr_gemini_api_key');
            $status_gemini = false;
            if ($gemini_key) {
                $response = wp_remote_get("https://generativelanguage.googleapis.com/v1beta/models?key=" . $gemini_key);
                if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) == 200) {
                    $status_gemini = true;
                }
            }

            return new WP_REST_Response(array(
                'message' => 'Configuración de WhatsApp actualizada exitosamente',
                'gemini_status' => $status_gemini ? 'Conectado' : 'Error/No configurado'
            ), 200);
        },
        'permission_callback' => function() {
            if (!is_user_logged_in()) {
                return new WP_Error('rest_not_logged_in', 'Debes iniciar sesión.', array('status' => 401));
            }
            return current_user_can('manage_options') || current_user_can('editor');
        }
    ));

    // Nuevo endpoint para crear servicios desde app-negocio
    register_rest_route('violett/v1', '/servicio', array(
        'methods' => 'POST',
        'callback' => 'crear_servicio_callback',
        'permission_callback' => function() {
            if (!is_user_logged_in()) {
                return new WP_Error('rest_not_logged_in', 'Debes iniciar sesión.', array('status' => 401));
            }
            return current_user_can('manage_options') || current_user_can('editor');
        }
    ));

    register_rest_route('wp/v2', '/reserva', array( // Cambiamos a wp/v2 para coincidir con tu JS
        'methods' => 'POST',
        'callback' => 'guardar_reserva_callback',
        'permission_callback' => $verificar_auth,
    ));

    register_rest_route('violett/v1', '/servicios/todos', array(
        'methods' => 'GET',
        'callback' => 'obtener_servicios_callback',
        'permission_callback' => function($request) use ($verificar_auth) {
            // First check if user is logged in or has a valid token
            $auth = $verificar_auth($request);
            if (is_wp_error($auth)) {
                return $auth;
            }
            // If they are authenticated (even as subscriber), they can see services
            return true;
        }
    ));

    // --- Endpoints de Configuración (MP Toggle) ---
    register_rest_route('violett/v1', '/config/mp-status', array(
        'methods' => 'GET',
        'callback' => function() {
            return new WP_REST_Response(array(
                'enabled' => get_option('sr_mp_enabled', '1') === '1'
            ), 200);
        },
        'permission_callback' => function() {
            if (!is_user_logged_in()) {
                return new WP_Error('rest_not_logged_in', 'Debes iniciar sesión.', array('status' => 401));
            }
            return current_user_can('manage_options') || current_user_can('editor');
        }
    ));

    register_rest_route('violett/v1', '/config/mp-toggle', array(
        'methods' => 'POST',
        'callback' => function($request) {
            $params = $request->get_json_params();
            $enabled = isset($params['enabled']) ? $params['enabled'] : true;
            update_option('sr_mp_enabled', $enabled ? '1' : '0');
            return new WP_REST_Response(array(
                'message' => $enabled ? 'Mercado Pago activado' : 'Mercado Pago desactivado',
                'enabled' => (bool) $enabled
            ), 200);
        },
        'permission_callback' => function() {
            if (!is_user_logged_in()) {
                return new WP_Error('rest_not_logged_in', 'Debes iniciar sesión.', array('status' => 401));
            }
            return current_user_can('manage_options') || current_user_can('editor');
        }
    ));

    register_rest_route('violett/v1', '/servicio/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'borrar_servicio_callback',
        'permission_callback' => function() {
            if (!is_user_logged_in()) {
                return new WP_Error('rest_not_logged_in', 'Debes iniciar sesión.', array('status' => 401));
            }
            return current_user_can('manage_options') || current_user_can('editor');
        }
    ));

    register_rest_route('violett/v1', '/servicio/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'actualizar_servicio_callback',
        'permission_callback' => function() {
            if (!is_user_logged_in()) {
                return new WP_Error('rest_not_logged_in', 'Debes iniciar sesión.', array('status' => 401));
            }
            return current_user_can('manage_options') || current_user_can('editor');
        }
    ));

    register_rest_route('violett/v1', '/turnos/todos', array(
        'methods' => 'GET',
        'callback' => 'obtener_turnos_callback',
        'permission_callback' => function() {
            if (!is_user_logged_in()) {
                return new WP_Error('rest_not_logged_in', 'Debes iniciar sesión.', array('status' => 401));
            }
            return current_user_can('manage_options') || current_user_can('editor');
        }
    ));
    register_rest_route('violett/v1', '/turno/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'borrar_turno_callback',
        'permission_callback' => function() {
            if (!is_user_logged_in()) {
                return new WP_Error('rest_not_logged_in', 'Debes iniciar sesión.', array('status' => 401));
            }
            return current_user_can('manage_options') || current_user_can('editor');
        }
    ));

    register_rest_route('violett/v1', '/turno/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'actualizar_turno_callback',
        'permission_callback' => function() {
            if (!is_user_logged_in()) {
                return new WP_Error('rest_not_logged_in', 'Debes iniciar sesión.', array('status' => 401));
            }
            return current_user_can('manage_options') || current_user_can('editor');
        }
    ));

    register_rest_route('violett/v1', '/turno-manual', array(
        'methods' => 'POST',
        'callback' => 'crear_turno_manual_callback',
        'permission_callback' => function() {
            if (!is_user_logged_in()) {
                return new WP_Error('rest_not_logged_in', 'Debes iniciar sesión.', array('status' => 401));
            }
            return current_user_can('manage_options') || current_user_can('editor');
        }
    ));

    register_rest_route('wp/v2', '/cancelar-reserva', array(
        'methods' => 'POST',
        'callback' => 'cancelar_reserva_callback',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('wp/v2', '/modificar-reserva', array(
        'methods' => 'POST',
        'callback' => 'modificar_reserva_callback',
        'permission_callback' => '__return_true'
    ));

    // --- Endpoints de Paquetes/Créditos ---
    register_rest_route('violett/v1', '/mis-paquetes', array(
        'methods' => 'GET',
        'callback' => 'obtener_mis_paquetes_callback',
        'permission_callback' => $verificar_auth,
    ));

    register_rest_route('violett/v1', '/comprar-paquete', array(
        'methods' => 'POST',
        'callback' => 'comprar_paquete_cliente_callback',
        'permission_callback' => $verificar_auth,
    ));

    register_rest_route('violett/v1', '/paquete', array(
        'methods' => 'POST',
        'callback' => 'crear_paquete_callback',
        'permission_callback' => function() {
            if (!is_user_logged_in()) {
                return new WP_Error('rest_not_logged_in', 'Debes iniciar sesión.', array('status' => 401));
            }
            return current_user_can('manage_options') || current_user_can('editor');
        }
    ));

    register_rest_route('violett/v1', '/paquete/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'actualizar_paquete_callback',
        'permission_callback' => function() {
            if (!is_user_logged_in()) {
                return new WP_Error('rest_not_logged_in', 'Debes iniciar sesión.', array('status' => 401));
            }
            return current_user_can('manage_options') || current_user_can('editor');
        }
    ));

    register_rest_route('violett/v1', '/paquetes/todos', array(
        'methods' => 'GET',
        'callback' => 'obtener_paquetes_todos_callback',
        'permission_callback' => function() {
            if (!is_user_logged_in()) {
                return new WP_Error('rest_not_logged_in', 'Debes iniciar sesión.', array('status' => 401));
            }
            return current_user_can('manage_options') || current_user_can('editor');
        }
    ));

    register_rest_route('violett/v1', '/buscar-usuarios', array(
        'methods' => 'GET',
        'callback' => 'buscar_usuarios_callback',
        'permission_callback' => function() {
            if (!is_user_logged_in()) {
                return new WP_Error('rest_not_logged_in', 'Debes iniciar sesión.', array('status' => 401));
            }
            return current_user_can('manage_options') || current_user_can('editor');
        }
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

    register_rest_route('wp/v2', '/mis-reservas', array(
        'methods' => 'GET',
        'callback' => 'mis_reservas_callback',
        'permission_callback' => $verificar_auth,
    ));

    register_rest_route('wp/v2', '/cancelar-reserva', array(
        'methods' => 'POST',
        'callback' => 'cancelar_reserva_callback',
        'permission_callback' => $verificar_auth,
    ));

    register_rest_route('violett/v1', '/negocio/horarios', array(
        'methods' => 'GET',
        'callback' => 'obtener_horarios_negocio_callback',
        'permission_callback' => function() {
            return current_user_can('manage_options');
        }
    ));

    register_rest_route('violett/v1', '/negocio/horarios', array(
        'methods' => 'POST',
        'callback' => 'actualizar_horarios_negocio_callback',
        'permission_callback' => function() {
            return current_user_can('manage_options');
        }
    ));

    register_rest_route('violett/v1', '/config/packages', array(
        'methods' => 'GET',
        'callback' => function() {
            $options = get_option('sr_package_config');
            if (empty($options)) {
                $options = array(
                    array('sessions' => 1, 'discount' => 0),
                    array('sessions' => 5, 'discount' => (int)get_option('sr_discount_5', '10')),
                    array('sessions' => 10, 'discount' => (int)get_option('sr_discount_10', '20'))
                );
            }
            return new WP_REST_Response($options, 200);
        },
        'permission_callback' => '__return_true'
    ));

    register_rest_route('violett/v1', '/config/packages', array(
        'methods' => 'POST',
        'callback' => function($request) {
            $params = $request->get_json_params();
            if (!is_array($params)) {
                return new WP_Error('invalid_data', 'Datos inválidos', array('status' => 400));
            }
            update_option('sr_package_config', $params);
            return new WP_REST_Response(array('message' => 'Configuración guardada', 'options' => $params), 200);
        },
        'permission_callback' => function() {
            return current_user_can('manage_options') || current_user_can('editor');
        }
    ));

    // --- Theme Config Endpoints ---
    register_rest_route('violett/v1', '/config/theme', array(
        'methods' => 'GET',
        'callback' => function() {
            return new WP_REST_Response(get_option('sr_theme_config', array()), 200);
        },
        'permission_callback' => '__return_true'
    ));

    register_rest_route('violett/v1', '/config/theme', array(
        'methods' => 'POST',
        'callback' => function($request) {
            $params = $request->get_json_params();
            if (!is_array($params)) {
                return new WP_Error('invalid_data', 'Datos inválidos', array('status' => 400));
            }
            update_option('sr_theme_config', $params);
            return new WP_REST_Response(array('message' => 'Tema guardado', 'config' => $params), 200);
        },
        'permission_callback' => function() {
            return current_user_can('manage_options') || current_user_can('editor');
        }
    ));
});

function mis_reservas_callback($request) {
    $user_id = get_current_user_id();
    if (!$user_id) {
        return new WP_Error('no_autorizado', 'Debes iniciar sesión', array('status' => 401));
    }

    $user = get_user_by('id', $user_id);
    if (!$user) {
        return new WP_Error('no_autorizado', 'Usuario no encontrado', array('status' => 401));
    }

    $email = $user->user_email;

    $args = array(
        'post_type' => 'reserva',
        'post_status' => array('publish', 'pending'), // Incluimos pendientes por si el pago no se procesó aún
        'posts_per_page' => -1,
        'meta_query' => array(
            array(
                'key' => 'email_cliente',
                'value' => $email,
                'compare' => '='
            )
        )
    );

    $query = new WP_Query($args);
    $reservas = array();

    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $post_id = get_the_ID();
            
            // Fallback para campos si ACF no está disponible
            $fecha = get_post_meta($post_id, 'fecha', true);
            $hora = get_post_meta($post_id, 'hora', true);
            $servicio_nombre = get_post_meta($post_id, 'servicio', true);

            if (!$fecha || !$hora) {
                // Si get_post_meta falla, intentamos get_fields
                $fields = function_exists('get_fields') ? get_fields($post_id) : array();
                $fecha = isset($fields['fecha']) ? $fields['fecha'] : $fecha;
                $hora = isset($fields['hora']) ? $fields['hora'] : $hora;
                $servicio_nombre = isset($fields['servicio']) ? $fields['servicio'] : $servicio_nombre;
            }

            // Convert to timestamp
            $datetime_str = $fecha . ' ' . $hora;
            $timestamp = strtotime($datetime_str);
            $now = current_time('timestamp');

            // Mostrar si es hoy o en el futuro (margen de 30 min por si ya empezó)
            if ($timestamp >= ($now - 1800)) {
                $token_cancelacion = get_post_meta($post_id, 'token_cancelacion', true);
                if (empty($token_cancelacion)) {
                    $token_cancelacion = wp_generate_password(20, false);
                    update_post_meta($post_id, 'token_cancelacion', $token_cancelacion);
                }

                $reservas[] = array(
                    'id' => $post_id,
                    'servicio' => $servicio_nombre,
                    'fecha' => $fecha,
                    'hora' => $hora,
                    'timestamp' => $timestamp,
                    'token_cancelacion' => $token_cancelacion,
                    'estado' => get_post_status($post_id)
                );
            }
        }
    }
    wp_reset_postdata();

    // Sort by timestamp asc
    usort($reservas, function($a, $b) {
        return $a['timestamp'] - $b['timestamp'];
    });

    return new WP_REST_Response($reservas, 200);
}

function cancelar_reserva_callback($request) {
    $parametros = $request->get_json_params();
    $reserva_id = isset($parametros['reserva_id']) ? intval($parametros['reserva_id']) : 0;
    $email = isset($parametros['email']) ? sanitize_email($parametros['email']) : '';
    $token = isset($parametros['token']) ? sanitize_text_field($parametros['token']) : '';

    if (!$reserva_id || empty($email) || empty($token)) {
        return new WP_Error('parametros_invalidos', 'Parámetros inválidos', array('status' => 400));
    }

    $token_guardado = get_post_meta($reserva_id, 'token_cancelacion', true);
    if (empty($token_guardado) || !hash_equals($token_guardado, $token)) {
        return new WP_Error('no_autorizado', 'Token de cancelación inválido', array('status' => 403));
    }

    $email_guardado = get_field('email_cliente', $reserva_id);
    if ($email_guardado !== $email) {
        return new WP_Error('no_autorizado', 'No autorizado', array('status' => 403));
    }

    $fecha = get_post_meta($reserva_id, 'fecha', true);
    $hora = get_post_meta($reserva_id, 'hora', true);

    if (!$fecha || !$hora) {
        $fecha = get_field('fecha', $reserva_id);
        $hora = get_field('hora', $reserva_id);
    }

    $timestamp = strtotime($fecha . ' ' . $hora);
    $now = current_time('timestamp');

    // Validar regla de 24 horas (margen de error de 5 min por si acaso)
    if (($timestamp - $now) < (24 * 3600 - 300)) {
        return new WP_Error('muy_tarde', 'Solo con 24hs de anticipacion se puede modificar o cancelar un turno', array('status' => 400));
    }

    // --- Devolución de Créditos ---
    $paquete_id = get_post_meta($reserva_id, 'paquete_id_usado', true);
    if ($paquete_id) {
        $restantes = intval(get_field('sesiones_restantes', $paquete_id));
        update_field('sesiones_restantes', $restantes + 1, $paquete_id);
        update_field('estado', 'activo', $paquete_id); // Lo reactivamos por si estaba agotado
    }

    // Cancel in WP
    wp_update_post(array(
        'ID' => $reserva_id,
        'post_status' => 'trash' // Or you can add a 'cancelled' status
    ));

    // Nota: Ideally we would also remove from Google Calendar here.
    // For simplicity, we just trash the post, which frees up the slot in WP availability checks.
    // Full Google Calendar sync would require storing the Google Event ID in post meta.

    return new WP_REST_Response(array('message' => 'Reserva cancelada'), 200);
}

function modificar_reserva_callback($request) {
    $parametros = $request->get_json_params();
    $reserva_id = isset($parametros['reserva_id']) ? intval($parametros['reserva_id']) : 0;
    $email = isset($parametros['email']) ? sanitize_email($parametros['email']) : '';
    $token = isset($parametros['token']) ? sanitize_text_field($parametros['token']) : '';
    $nueva_fecha = isset($parametros['nueva_fecha']) ? sanitize_text_field($parametros['nueva_fecha']) : '';
    $nueva_hora = isset($parametros['nueva_hora']) ? sanitize_text_field($parametros['nueva_hora']) : '';
    $nueva_hora_fin = isset($parametros['nueva_hora_fin']) ? sanitize_text_field($parametros['nueva_hora_fin']) : '';

    if (!$reserva_id || empty($email) || empty($token) || empty($nueva_fecha) || empty($nueva_hora)) {
        return new WP_Error('parametros_invalidos', 'Parámetros inválidos', array('status' => 400));
    }

    $token_guardado = get_post_meta($reserva_id, 'token_cancelacion', true);
    if (empty($token_guardado) || !hash_equals($token_guardado, $token)) {
        return new WP_Error('no_autorizado', 'Token de cancelación inválido', array('status' => 403));
    }

    $email_guardado = get_field('email_cliente', $reserva_id);
    if ($email_guardado !== $email) {
        return new WP_Error('no_autorizado', 'No autorizado', array('status' => 403));
    }

    $fecha_actual = get_post_meta($reserva_id, 'fecha', true);
    $hora_actual = get_post_meta($reserva_id, 'hora', true);

    if (!$fecha_actual || !$hora_actual) {
        $fecha_actual = get_field('fecha', $reserva_id);
        $hora_actual = get_field('hora', $reserva_id);
    }

    $timestamp = strtotime($fecha_actual . ' ' . $hora_actual);
    $now = current_time('timestamp');

    // Validar regla de 24 horas
    if (($timestamp - $now) < (24 * 3600 - 300)) {
        return new WP_Error('muy_tarde', 'Solo con 24hs de anticipacion se puede modificar o cancelar un turno', array('status' => 400));
    }

    // Actualizar campos ACF
    update_field('fecha', $nueva_fecha, $reserva_id);
    update_field('hora', $nueva_hora, $reserva_id);
    if (!empty($nueva_hora_fin)) {
        update_field('hora_fin', $nueva_hora_fin, $reserva_id);
    }

    // Opcional: Insertar en el calendario un nuevo evento (quedará huérfano el viejo)
    $cliente = get_field('cliente', $reserva_id);
    $servicio = get_field('servicio', $reserva_id);
    $reserva_data = array(
        'cliente' => $cliente,
        'inicio' => $nueva_fecha . 'T' . $nueva_hora . ':00-03:00',
        'fin' => $nueva_fecha . 'T' . ($nueva_hora_fin ?: $nueva_hora) . ':00-03:00',
        'servicio' => $servicio
    );
    try {
        insertar_en_calendario_negocio($reserva_data);
    } catch (Exception $e) {}

    return new WP_REST_Response(array('message' => 'Reserva modificada exitosamente'), 200);
}

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

                $tipo = get_post_type($post_id);

                if ($tipo === 'reserva') {
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

                } else if ($tipo === 'paquete_cliente') {
                    // Activar el paquete
                    update_field('estado', 'activo', $post_id);
                    return new WP_REST_Response('Payment approved and package activated', 200);
                }

                return new WP_REST_Response('Payment approved but type unknown', 200);
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
                $timezone = new \DateTimeZone('America/Argentina/Buenos_Aires');
                foreach ($busy_periods as $period) {
                    $start = new \DateTime($period->getStart());
                    $start->setTimezone($timezone);
                    $end = new \DateTime($period->getEnd());
                    $end->setTimezone($timezone);

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
    $user_id = get_current_user_id();
    if (!$user_id) {
        return new WP_Error('no_autorizado', 'Debes iniciar sesión', array('status' => 401));
    }

    $user = get_user_by('id', $user_id);
    if (!$user) {
        return new WP_Error('no_autorizado', 'Usuario no encontrado', array('status' => 401));
    }

    $email = $user->user_email;

    $parametros = $request->get_json_params();
    
    // Sanitización de entradas
    $hora       = isset($parametros['hora']) ? sanitize_text_field($parametros['hora']) : '';
    $hora_fin   = isset($parametros['horaFin']) ? sanitize_text_field($parametros['horaFin']) : '';
    $fecha      = isset($parametros['fecha']) ? sanitize_text_field($parametros['fecha']) : '';
    $servicio   = isset($parametros['servicio']) ? sanitize_text_field($parametros['servicio']) : '';
    $servicioId = isset($parametros['servicioId']) ? intval($parametros['servicioId']) : 0;
    $cliente    = isset($parametros['cliente']) ? sanitize_text_field($parametros['cliente']) : '';

    $usar_credito = isset($parametros['usar_credito']) ? $parametros['usar_credito'] : false;
    $paquete_id_usado = null;

    if ($usar_credito && $user) {
        // Buscar paquete activo del usuario para este servicio (CPT paquete_cliente)
        $paquetes = get_posts(array(
            'post_type'      => 'paquete_cliente',
            'posts_per_page' => 1,
            'post_status'    => 'publish',
            'meta_query'     => array(
                'relation' => 'AND',
                array('key' => 'user_id_vinculado', 'value' => $user->ID, 'compare' => '=', 'type' => 'NUMERIC'),
                array('key' => 'servicio_vinculado', 'value' => $servicioId, 'compare' => '=', 'type' => 'NUMERIC'),
                array('key' => 'estado', 'value' => 'activo', 'compare' => '='),
                array('key' => 'sesiones_restantes', 'value' => 0, 'compare' => '>', 'type' => 'NUMERIC'),
            ),
            'orderby'  => 'meta_value',
            'meta_key' => 'fecha_compra',
            'order'    => 'ASC', // Usar el paquete más viejo primero
        ));

        if (!empty($paquetes)) {
            $paq = $paquetes[0];
            // Verificar vencimiento (30 días)
            $fecha_compra = get_field('fecha_compra', $paq->ID);
            $vencimiento = strtotime($fecha_compra . ' +30 days');
            if (time() > $vencimiento) {
                update_field('estado', 'vencido', $paq->ID);
                return new WP_Error('paquete_vencido', 'Tu paquete de créditos ha vencido.', array('status' => 400));
            }

            $restantes = intval(get_field('sesiones_restantes', $paq->ID));
            update_field('sesiones_restantes', $restantes - 1, $paq->ID);
            if ($restantes - 1 <= 0) {
                update_field('estado', 'agotado', $paq->ID);
            }
            $paquete_id_usado = $paq->ID;
            $post_status = 'publish'; // Aprobado automáticamente
        } else {
            return new WP_Error('sin_creditos', 'No tienes créditos activos para este servicio.', array('status' => 400));
        }
    } else {
        $post_status = 'pending';
    }

    // IMPORTANTE: Asegurate de tener el CPT 'reserva' creado
    $post_id = wp_insert_post(array(
        'post_title'   => 'Reserva: ' . $email . ' - ' . $hora,
        'post_type'    => 'reserva', // Verifica que este slug sea el correcto en tu CPT
        'post_status'  => $post_status,
    ));

    if ($post_id) {
        // Guardamos los datos en ACF / Post meta. 
        update_field('cliente', $cliente, $post_id);
        update_field('email_cliente', $email, $post_id);
        update_post_meta($post_id, 'paquete_id_usado', $paquete_id_usado);

        $token_cancelacion = wp_generate_password(20, false);
        update_post_meta($post_id, 'token_cancelacion', $token_cancelacion);
        update_field('fecha', $fecha, $post_id);
        update_field('hora', $hora, $post_id);
        update_field('hora_fin', $hora_fin, $post_id);
        update_field('servicio', $servicio, $post_id);
        update_field('cliente', $cliente, $post_id);

        if ($post_status === 'publish') {
            // Reserva pagada con crédito, insertar en calendar
            $reserva_data = array(
                'cliente' => $cliente,
                'inicio' => $fecha . 'T' . $hora . ':00-03:00',
                'fin' => $fecha . 'T' . ($hora_fin ?: $hora) . ':00-03:00',
                'servicio' => $servicio
            );
            try {
                insertar_en_calendario_negocio($reserva_data);
            } catch (\Exception $e) {
                // El error de calendario no debe bloquear la reserva con crédito
                error_log("Error Calendar (Wallet): " . $e->getMessage());
            }
            return new WP_REST_Response(array('message' => 'Reserva guardada con créditos', 'id' => $post_id, 'method' => 'wallet'), 200);
        }

        // Verificar si Mercado Pago está habilitado
        $mp_enabled = get_option('sr_mp_enabled', '1');

        if ($mp_enabled !== '1') {
            // MP desactivado: publicar directamente sin cobrar
            wp_update_post(array(
                'ID' => $post_id,
                'post_status' => 'publish'
            ));

            $reserva_data = array(
                'cliente' => $cliente,
                'inicio' => $fecha . 'T' . $hora . ':00-03:00',
                'fin' => $fecha . 'T' . ($hora_fin ?: $hora) . ':00-03:00',
                'servicio' => $servicio
            );
            try {
                insertar_en_calendario_negocio($reserva_data);
            } catch (Exception $e) {
                // Calendar fail is non-blocking
            }
            return new WP_REST_Response(array('message' => 'Reserva confirmada (sin cobro)', 'id' => $post_id, 'method' => 'free'), 200);
        }

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



// Endpoint para crear servicios desde app-negocio
function crear_servicio_callback($request) {
    $parametros = $request->get_json_params();

    $titulo    = isset($parametros['titulo']) ? sanitize_text_field($parametros['titulo']) : '';
    $contenido = isset($parametros['contenido']) ? wp_kses_post($parametros['contenido']) : '';
    $precio    = isset($parametros['precio']) ? intval($parametros['precio']) : 0;
    $duracion  = isset($parametros['duracion']) ? intval($parametros['duracion']) : 60;
    $capacidad = isset($parametros['capacidad']) ? intval($parametros['capacidad']) : 1;
    $sesiones  = isset($parametros['sesiones']) ? intval($parametros['sesiones']) : 1;

    if (empty($titulo)) {
        return new WP_Error('falta_titulo', 'El título del servicio es requerido.', array('status' => 400));
    }

    $post_id = wp_insert_post(array(
        'post_title'   => $titulo,
        'post_content' => $contenido,
        'post_type'    => 'servicio',
        'post_status'  => 'publish'
    ));

    if (is_wp_error($post_id)) {
        return new WP_Error('error_guardado', 'No se pudo crear el servicio.', array('status' => 500));
    }

    // Guardar en ACF
    update_field('precio', $precio, $post_id);
    update_field('duracion', $duracion, $post_id);
    update_field('capacidad', $capacidad, $post_id);
    update_field('sesiones', $sesiones, $post_id);

    return new WP_REST_Response(array(
        'message' => 'Servicio creado exitosamente',
        'id'      => $post_id
    ), 200);
}

// Función para autenticar/crear usuario
function auth_google_callback($request) {
    $parametros = $request->get_json_params();
    $token = isset($parametros['token']) ? sanitize_text_field($parametros['token']) : '';

    if (empty($token)) {
        return new WP_Error('falta_token', 'Se requiere el parámetro token', array('status' => 400));
    }

    try {
        $client = new \Google\Client();
        $client_id = get_option('sr_google_client_id');
        if (empty($client_id)) {
            $client_id = '57411239751-805cvkqrq4i46f0n37abslrqfkbrtg42.apps.googleusercontent.com'; 
        }
        $client->setClientId($client_id);

        // Intentamos verificar como Access Token (flujo OAuth2)
        // ya que el frontend usa initTokenClient que devuelve Access Tokens, no ID Tokens (JWT)
        $client->setAccessToken($token);
        $oauth2 = new \Google\Service\Oauth2($client);
        $userInfo = $oauth2->userinfo->get();

        if (!$userInfo || empty($userInfo->email)) {
             return new WP_Error('token_invalido', 'No se pudo obtener información del usuario con el token provisto.', array('status' => 401));
        }

        $email = sanitize_email($userInfo->email);
        $nombre = sanitize_text_field($userInfo->name);
    } catch (\Exception $e) {
        return new WP_Error('token_invalido', 'Error al verificar el token de Google (Access Token): ' . $e->getMessage(), array('status' => 401));
    }

    if (empty($email)) {
        return new WP_Error('falta_email', 'No se pudo obtener el email del token', array('status' => 400));
    }

    $user = get_user_by('email', $email);
    if (!$user) {
        $user_id = wp_insert_user(array(
            'user_login' => $email,
            'user_email' => $email,
            'first_name' => $nombre,
            'user_pass'  => wp_generate_password(),
            'role'       => 'subscriber'
        ));
        if (is_wp_error($user_id)) {
            return $user_id;
        }
        $user = get_user_by('id', $user_id);
    } else {
        $user_id = $user->ID;
    }

    // Autenticar al usuario en WordPress (Handshake de Sesión)
    wp_clear_auth_cookie();
    wp_set_current_user($user_id);
    wp_set_auth_cookie($user_id, true);
    do_action('wp_login', $user->user_login, $user);

    // Generar un nuevo Nonce válido para el usuario autenticado
    $nonce = wp_create_nonce('wp_rest');

    // Obtener créditos desde CPT paquete_cliente
    $paquetes = get_posts(array(
        'post_type'      => 'paquete_cliente',
        'posts_per_page' => -1,
        'post_status'    => 'publish',
        'meta_query'     => array(
            'relation' => 'AND',
            array('key' => 'user_id_vinculado', 'value' => $user_id, 'compare' => '=', 'type' => 'NUMERIC'),
            array('key' => 'estado', 'value' => 'activo', 'compare' => '='),
        ),
    ));

    $creditos = array();
    foreach ($paquetes as $paq) {
        $srv_id = get_field('servicio_vinculado', $paq->ID);
        $restantes = intval(get_field('sesiones_restantes', $paq->ID));
        if ($restantes > 0) {
            if (isset($creditos[$srv_id])) {
                $creditos[$srv_id] += $restantes;
            } else {
                $creditos[$srv_id] = $restantes;
            }
        }
    }

    // Generate Custom Violett Token for robust API auth
    $violett_token = get_user_meta($user_id, 'violett_api_token', true);
    if (empty($violett_token)) {
        $violett_token = wp_generate_password(32, false);
        update_user_meta($user_id, 'violett_api_token', $violett_token);
    }

    return new WP_REST_Response(array(
        'user_id' => $user_id,
        'email' => $user->user_email,
        'nombre' => $user->first_name,
        'creditos' => $creditos,
        'nonce' => $nonce,
        'violett_token' => $violett_token
    ), 200);
}

// Endpoint nativo de login
function violett_login_callback($request) {
    $parametros = $request->get_json_params();
    $username = isset($parametros['username']) ? sanitize_text_field($parametros['username']) : '';
    $password = isset($parametros['password']) ? sanitize_text_field($parametros['password']) : '';

    if (empty($username) || empty($password)) {
        return new WP_Error('falta_credenciales', 'Usuario y contraseña son requeridos.', array('status' => 400));
    }

    $creds = array(
        'user_login'    => $username,
        'user_password' => $password,
        'remember'      => true
    );

    $user = wp_signon($creds, false);

    if (is_wp_error($user)) {
        return new WP_Error('credenciales_invalidas', 'Usuario o contraseña incorrectos.', array('status' => 401));
    }

    // Verificar rol
    if (!in_array('administrator', (array)$user->roles) && !in_array('editor', (array)$user->roles) && !current_user_can('manage_options')) {
        wp_logout();
        return new WP_Error('sin_permisos', 'No tienes permisos para acceder a este panel.', array('status' => 403));
    }

    return new WP_REST_Response(array(
        'message' => 'Login exitoso',
        'user_id' => $user->ID,
        'roles' => $user->roles
    ), 200);
}

// Carga de Módulos (Shortcodes y Lógica)
require_once plugin_dir_path(__FILE__) . 'app-cliente/app-cliente.php';
require_once plugin_dir_path(__FILE__) . 'app-negocio/app-negocio.php';
require_once plugin_dir_path(__FILE__) . 'app-reservas/app-reservas.php';


function obtener_servicios_callback($request) {
    $args = array(
        'post_type'      => 'servicio',
        'posts_per_page' => -1,
        'post_status'    => 'publish'
    );
    $posts = get_posts($args);
    $servicios = array();
    foreach ($posts as $post) {
        $fields = function_exists('get_fields') ? get_fields($post->ID) : array();
        $servicios[] = array(
            'id' => $post->ID,
            'titulo' => $post->post_title,
            'contenido' => $post->post_content,
            'precio' => isset($fields['precio']) ? $fields['precio'] : get_post_meta($post->ID, 'precio', true),
            'duracion' => isset($fields['duracion']) ? $fields['duracion'] : get_post_meta($post->ID, 'duracion', true),
            'capacidad' => isset($fields['capacidad']) ? $fields['capacidad'] : get_post_meta($post->ID, 'capacidad', true),
            'sesiones' => isset($fields['sesiones']) ? $fields['sesiones'] : get_post_meta($post->ID, 'sesiones', true)
        );
    }
    return new WP_REST_Response($servicios, 200);
}

function borrar_servicio_callback($request) {
    $id = $request->get_param('id');
    if (!$id) {
        return new WP_Error('no_id', 'ID de servicio no proporcionado.', array('status' => 400));
    }
    $result = wp_delete_post($id, true);
    if ($result) {
        return new WP_REST_Response(array('message' => 'Servicio borrado exitosamente.'), 200);
    } else {
        return new WP_Error('delete_failed', 'No se pudo borrar el servicio.', array('status' => 500));
    }
}

function actualizar_servicio_callback($request) {
    $id = $request->get_param('id');
    $parametros = $request->get_json_params();

    if (!$id) {
        return new WP_Error('no_id', 'ID de servicio no proporcionado.', array('status' => 400));
    }

    $post = get_post($id);
    if (!$post || $post->post_type !== 'servicio') {
        return new WP_Error('no_servicio', 'Servicio no encontrado.', array('status' => 404));
    }

    $titulo    = isset($parametros['titulo']) ? sanitize_text_field($parametros['titulo']) : $post->post_title;
    $contenido = isset($parametros['contenido']) ? wp_kses_post($parametros['contenido']) : $post->post_content;

    wp_update_post(array(
        'ID'           => $id,
        'post_title'   => $titulo,
        'post_content' => $contenido
    ));

    if (isset($parametros['precio'])) update_field('precio', intval($parametros['precio']), $id);
    if (isset($parametros['duracion'])) update_field('duracion', intval($parametros['duracion']), $id);
    if (isset($parametros['capacidad'])) update_field('capacidad', intval($parametros['capacidad']), $id);
    if (isset($parametros['sesiones'])) update_field('sesiones', intval($parametros['sesiones']), $id);

    return new WP_REST_Response(array('message' => 'Servicio actualizado exitosamente.'), 200);
}

function obtener_turnos_callback($request) {
    $args = array(
        'post_type'      => 'reserva',
        'posts_per_page' => -1,
        'post_status'    => 'publish' // We will assume turnos manuales are publish or we should query any status
    );
    $posts = get_posts($args);
    $turnos = array();
    foreach ($posts as $post) {
        $fields = function_exists('get_fields') ? get_fields($post->ID) : array();
        $turnos[] = array(
            'id' => $post->ID,
            'cliente' => isset($fields['cliente']) ? $fields['cliente'] : get_post_meta($post->ID, 'cliente', true),
            'email' => isset($fields['email_cliente']) ? $fields['email_cliente'] : get_post_meta($post->ID, 'email_cliente', true),
            'fecha' => isset($fields['fecha']) ? $fields['fecha'] : get_post_meta($post->ID, 'fecha', true),
            'hora' => isset($fields['hora']) ? $fields['hora'] : get_post_meta($post->ID, 'hora', true),
            'hora_fin' => isset($fields['hora_fin']) ? $fields['hora_fin'] : get_post_meta($post->ID, 'hora_fin', true),
            'servicio' => isset($fields['servicio']) ? $fields['servicio'] : get_post_meta($post->ID, 'servicio', true)
        );
    }
    return new WP_REST_Response($turnos, 200);
}

function borrar_turno_callback($request) {
    $id = $request->get_param('id');
    if (!$id) {
        return new WP_Error('no_id', 'ID de turno no proporcionado.', array('status' => 400));
    }
    $result = wp_delete_post($id, true);
    if ($result) {
        return new WP_REST_Response(array('message' => 'Turno cancelado exitosamente.'), 200);
    } else {
        return new WP_Error('delete_failed', 'No se pudo cancelar el turno.', array('status' => 500));
    }
}

/**
 * Actualiza un turno existente (Uso exclusivo del panel de negocio).
 */
function actualizar_turno_callback($request) {
    $id = $request->get_param('id');
    $parametros = $request->get_json_params();

    if (!$id) {
        return new WP_Error('no_id', 'ID de turno no proporcionado.', array('status' => 400));
    }

    $cliente  = isset($parametros['cliente']) ? sanitize_text_field($parametros['cliente']) : '';
    $email    = isset($parametros['email']) ? sanitize_email($parametros['email']) : '';
    $fecha    = isset($parametros['fecha']) ? sanitize_text_field($parametros['fecha']) : '';
    $hora     = isset($parametros['hora']) ? sanitize_text_field($parametros['hora']) : '';
    $hora_fin = isset($parametros['hora_fin']) ? sanitize_text_field($parametros['hora_fin']) : '';
    $servicio = isset($parametros['servicio']) ? sanitize_text_field($parametros['servicio']) : '';

    if (empty($cliente) || empty($fecha) || empty($hora) || empty($servicio)) {
        return new WP_Error('missing_data', 'Faltan datos requeridos.', array('status' => 400));
    }

    // Actualizar título y campos ACF
    wp_update_post(array(
        'ID'         => $id,
        'post_title' => 'Reserva: ' . $email . ' - ' . $hora,
    ));

    update_field('cliente', $cliente, $id);
    update_field('email_cliente', $email, $id);
    update_field('fecha', $fecha, $id);
    update_field('hora', $hora, $id);
    update_field('hora_fin', $hora_fin, $id);
    update_field('servicio', $servicio, $id);

    // Opcional: Sync con Google Calendar
    $reserva_data = array(
        'cliente'  => $cliente,
        'inicio'   => $fecha . 'T' . $hora . ':00-03:00',
        'fin'      => $fecha . 'T' . ($hora_fin ?: $hora) . ':00-03:00',
        'servicio' => $servicio
    );
    try {
        if (function_exists('insertar_en_calendario_negocio')) {
            insertar_en_calendario_negocio($reserva_data);
        }
    } catch (Exception $e) {
        return new WP_REST_Response(array('message' => 'Turno actualizado en WP, pero falló sync con Google: ' . $e->getMessage()), 207);
    }

    return new WP_REST_Response(array('message' => 'Turno actualizado exitosamente.'), 200);
}

function crear_turno_manual_callback($request) {
    $parametros = $request->get_json_params();

    $cliente = isset($parametros['cliente']) ? sanitize_text_field($parametros['cliente']) : '';
    $email = isset($parametros['email']) ? sanitize_email($parametros['email']) : '';
    $fecha = isset($parametros['fecha']) ? sanitize_text_field($parametros['fecha']) : '';
    $hora = isset($parametros['hora']) ? sanitize_text_field($parametros['hora']) : '';
    $hora_fin = isset($parametros['hora_fin']) ? sanitize_text_field($parametros['hora_fin']) : '';
    $servicio = isset($parametros['servicio']) ? sanitize_text_field($parametros['servicio']) : '';

    if (empty($cliente) || empty($fecha) || empty($hora) || empty($servicio)) {
        return new WP_Error('missing_data', 'Faltan datos requeridos.', array('status' => 400));
    }

    $post_id = wp_insert_post(array(
        'post_title'   => 'Reserva: ' . $email . ' - ' . $hora,
        'post_type'    => 'reserva',
        'post_status'  => 'publish',
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
            return new WP_REST_Response(array('message' => 'Turno manual cargado correctamente y agendado en Google Calendar.'), 200);
        } catch (Exception $e) {
            return new WP_REST_Response(array('message' => 'Turno guardado en WP, pero falló al agendar en Google: ' . esc_html($e->getMessage())), 207); // 207 Multi-Status
        }
    } else {
        return new WP_Error('insert_failed', 'Error al crear el turno en WordPress.', array('status' => 500));
    }
}

// --- Callbacks de Paquetes/Créditos ---

function obtener_mis_paquetes_callback($request) {
    $user_id = get_current_user_id();
    if (!$user_id) {
        return new WP_Error('no_autorizado', 'Debes iniciar sesión', array('status' => 401));
    }

    $args = array(
        'post_type'      => 'paquete_cliente',
        'posts_per_page' => -1,
        'post_status'    => 'publish',
        'meta_query'     => array(
            array(
                'key'   => 'user_id_vinculado',
                'value' => $user_id,
                'compare' => '=',
            ),
        ),
    );

    $posts = get_posts($args);
    $paquetes = array();

    foreach ($posts as $post) {
        $fields = function_exists('get_fields') ? get_fields($post->ID) : array();
        $servicio_id = isset($fields['servicio_vinculado']) ? $fields['servicio_vinculado'] : 0;
        $servicio_nombre = '';
        if ($servicio_id) {
            $srv = get_post($servicio_id);
            $servicio_nombre = $srv ? $srv->post_title : 'Servicio #' . $servicio_id;
        }

        $fecha_compra = isset($fields['fecha_compra']) ? $fields['fecha_compra'] : '';
        $fecha_vencimiento = $fecha_compra ? date('Y-m-d', strtotime($fecha_compra . ' +30 days')) : '';

        $paquetes[] = array(
            'id'                  => $post->ID,
            'servicio_id'         => $servicio_id,
            'servicio_nombre'     => $servicio_nombre,
            'sesiones_totales'    => isset($fields['sesiones_totales']) ? intval($fields['sesiones_totales']) : 0,
            'sesiones_restantes'  => isset($fields['sesiones_restantes']) ? intval($fields['sesiones_restantes']) : 0,
            'fecha_compra'        => $fecha_compra,
            'fecha_vencimiento'   => $fecha_vencimiento,
            'estado'              => isset($fields['estado']) ? $fields['estado'] : 'activo',
        );
    }

    return new WP_REST_Response($paquetes, 200);
}

function crear_paquete_callback($request) {
    $parametros = $request->get_json_params();

    $user_id     = isset($parametros['user_id']) ? intval($parametros['user_id']) : 0;
    $servicio_id = isset($parametros['servicio_id']) ? intval($parametros['servicio_id']) : 0;
    $sesiones    = isset($parametros['sesiones']) ? intval($parametros['sesiones']) : 1;

    if (!$user_id || !$servicio_id || $sesiones < 1) {
        return new WP_Error('datos_invalidos', 'Faltan datos requeridos (user_id, servicio_id, sesiones).', array('status' => 400));
    }

    $user = get_user_by('id', $user_id);
    if (!$user) {
        return new WP_Error('usuario_no_encontrado', 'Usuario no encontrado.', array('status' => 404));
    }

    $servicio = get_post($servicio_id);
    if (!$servicio || $servicio->post_type !== 'servicio') {
        return new WP_Error('servicio_no_encontrado', 'Servicio no encontrado.', array('status' => 404));
    }

    $post_id = wp_insert_post(array(
        'post_title'  => 'Paquete: ' . $user->display_name . ' - ' . $servicio->post_title,
        'post_type'   => 'paquete_cliente',
        'post_status' => 'publish',
    ));

    if (is_wp_error($post_id)) {
        return new WP_Error('error_guardado', 'No se pudo crear el paquete.', array('status' => 500));
    }

    update_field('user_id_vinculado', $user_id, $post_id);
    update_field('servicio_vinculado', $servicio_id, $post_id);
    update_field('sesiones_totales', $sesiones, $post_id);
    update_field('sesiones_restantes', $sesiones, $post_id);
    update_field('fecha_compra', date('Y-m-d'), $post_id);
    update_field('estado', 'activo', $post_id);

    return new WP_REST_Response(array(
        'message' => 'Paquete creado exitosamente.',
        'id'      => $post_id,
    ), 200);
}

function comprar_paquete_cliente_callback($request) {
    $user_id = get_current_user_id();
    if (!$user_id) {
        return new WP_Error('no_autorizado', 'Debes iniciar sesión', array('status' => 401));
    }

    $parametros = $request->get_json_params();
    $servicio_id = isset($parametros['servicio_id']) ? intval($parametros['servicio_id']) : 0;
    $sesiones    = isset($parametros['sesiones']) ? intval($parametros['sesiones']) : 0;

    if (!$servicio_id || $sesiones < 1) {
        return new WP_Error('datos_invalidos', 'Faltan datos requeridos.', array('status' => 400));
    }

    $servicio = get_post($servicio_id);
    if (!$servicio || $servicio->post_type !== 'servicio') {
        return new WP_Error('servicio_no_encontrado', 'Servicio no encontrado.', array('status' => 404));
    }

    $user = get_user_by('id', $user_id);

    $mp_enabled = get_option('sr_mp_enabled', '1') === '1';
    $post_status = $mp_enabled ? 'pending' : 'publish';

    $post_id = wp_insert_post(array(
        'post_title'  => 'Paquete (Web): ' . $user->display_name . ' - ' . $servicio->post_title,
        'post_type'   => 'paquete_cliente',
        'post_status' => $post_status,
    ));

    if (is_wp_error($post_id)) {
        return new WP_Error('error_guardado', 'No se pudo crear el paquete.', array('status' => 500));
    }

    update_field('user_id_vinculado', $user_id, $post_id);
    update_field('servicio_vinculado', $servicio_id, $post_id);
    update_field('sesiones_totales', $sesiones, $post_id);
    update_field('sesiones_restantes', $sesiones, $post_id);
    update_field('fecha_compra', date('Y-m-d'), $post_id);
    update_field('estado', $mp_enabled ? 'pendiente' : 'activo', $post_id);

    if (!$mp_enabled) {
        return new WP_REST_Response(array('message' => 'Paquete activado (sin cobro)', 'id' => $post_id, 'method' => 'free'), 200);
    }

    // Mercado Pago
    $precio_servicio = get_post_meta($servicio_id, 'precio', true);
    if (empty($precio_servicio)) $precio_servicio = 1000;
    
    // Multiplicamos el precio por la cantidad de sesiones (Precio base del paquete)
    $precio_total = floatval($precio_servicio) * $sesiones;

    $mp_access_token = get_option('sr_mp_access_token');
    if (!empty($mp_access_token)) {
        \MercadoPago\MercadoPagoConfig::setAccessToken($mp_access_token);
        $client = new \MercadoPago\Client\Preference\PreferenceClient();

        $preference_data = array(
            "items" => array(
                array(
                    "title" => "Paquete de " . $sesiones . " sesiones - " . $servicio->post_title,
                    "quantity" => 1,
                    "unit_price" => $precio_total
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
            return new WP_REST_Response(array('message' => 'Paquete pendiente de pago', 'id' => $post_id, 'init_point' => $preference->init_point), 200);
        } catch (Exception $e) {
            return new WP_Error('mp_error', 'Error MP: ' . $e->getMessage(), array('status' => 500));
        }
    }

    return new WP_REST_Response(array('message' => 'Paquete guardado pero MP no configurado', 'id' => $post_id), 200);
}

function actualizar_paquete_callback($request) {
    $id = $request->get_param('id');
    $parametros = $request->get_json_params();

    if (!$id) {
        return new WP_Error('no_id', 'ID de paquete no proporcionado.', array('status' => 400));
    }

    $post = get_post($id);
    if (!$post || $post->post_type !== 'paquete_cliente') {
        return new WP_Error('no_paquete', 'Paquete no encontrado.', array('status' => 404));
    }

    if (isset($parametros['sesiones_restantes'])) {
        update_field('sesiones_restantes', intval($parametros['sesiones_restantes']), $id);
    }
    if (isset($parametros['sesiones_totales'])) {
        update_field('sesiones_totales', intval($parametros['sesiones_totales']), $id);
    }
    if (isset($parametros['estado'])) {
        update_field('estado', sanitize_text_field($parametros['estado']), $id);
    }

    return new WP_REST_Response(array('message' => 'Paquete actualizado exitosamente.'), 200);
}

function obtener_paquetes_todos_callback($request) {
    $args = array(
        'post_type'      => 'paquete_cliente',
        'posts_per_page' => -1,
        'post_status'    => 'publish',
    );
    $posts = get_posts($args);
    $paquetes = array();

    foreach ($posts as $post) {
        $fields = function_exists('get_fields') ? get_fields($post->ID) : array();
        $user_id = isset($fields['user_id_vinculado']) ? intval($fields['user_id_vinculado']) : 0;
        $user = get_user_by('id', $user_id);

        $servicio_id = isset($fields['servicio_vinculado']) ? $fields['servicio_vinculado'] : 0;
        $servicio_nombre = '';
        if ($servicio_id) {
            $srv = get_post($servicio_id);
            $servicio_nombre = $srv ? $srv->post_title : 'Servicio #' . $servicio_id;
        }

        $fecha_compra = isset($fields['fecha_compra']) ? $fields['fecha_compra'] : '';
        $fecha_vencimiento = $fecha_compra ? date('Y-m-d', strtotime($fecha_compra . ' +30 days')) : '';

        $paquetes[] = array(
            'id'                  => $post->ID,
            'user_id'             => $user_id,
            'cliente_nombre'      => $user ? $user->display_name : 'Usuario #' . $user_id,
            'cliente_email'       => $user ? $user->user_email : '',
            'servicio_id'         => $servicio_id,
            'servicio_nombre'     => $servicio_nombre,
            'sesiones_totales'    => isset($fields['sesiones_totales']) ? intval($fields['sesiones_totales']) : 0,
            'sesiones_restantes'  => isset($fields['sesiones_restantes']) ? intval($fields['sesiones_restantes']) : 0,
            'fecha_compra'        => $fecha_compra,
            'fecha_vencimiento'   => $fecha_vencimiento,
            'estado'              => isset($fields['estado']) ? $fields['estado'] : 'activo',
        );
    }

    return new WP_REST_Response($paquetes, 200);
}

function buscar_usuarios_callback($request) {
    $query = sanitize_text_field($request->get_param('q'));
    if (empty($query) || strlen($query) < 2) {
        return new WP_REST_Response(array(), 200);
    }

    $user_query = new WP_User_Query(array(
        'search'         => '*' . $query . '*',
        'search_columns' => array('user_login', 'user_email', 'display_name'),
        'number'         => 10,
    ));

    $results = array();
    foreach ($user_query->get_results() as $user) {
        $results[] = array(
            'id'    => $user->ID,
            'name'  => $user->display_name,
            'email' => $user->user_email,
        );
    }

    return new WP_REST_Response($results, 200);
}

function obtener_horarios_negocio_callback($request) {
    $id = 2; // ID de configuración del negocio
    $dias = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
    $data = array();

    foreach ($dias as $dia) {
        $data[$dia] = array(
            'status' => get_field($dia . '_status', $id),
            'ap' => get_field($dia . '_ap', $id),
            'ci' => get_field($dia . '_ci', $id),
            'br_i' => get_field($dia . '_br_i', $id),
            'br_f' => get_field($dia . '_br_f', $id),
        );
    }

    return new WP_REST_Response($data, 200);
}

function actualizar_horarios_negocio_callback($request) {
    $id = 2;
    $parametros = $request->get_json_params();
    $dia = isset($parametros['dia']) ? sanitize_text_field($parametros['dia']) : '';
    $datos = isset($parametros['datos']) ? $parametros['datos'] : array();

    if (empty($dia) || empty($datos)) {
        return new WP_Error('faltan_datos', 'Falta día o datos.', array('status' => 400));
    }

    $valid_dias = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
    if (!in_array($dia, $valid_dias)) {
        return new WP_Error('dia_invalido', 'Día inválido.', array('status' => 400));
    }

    if (isset($datos['status']) !== null) update_field($dia . '_status', $datos['status'], $id);
    if (isset($datos['ap'])) update_field($dia . '_ap', $datos['ap'], $id);
    if (isset($datos['ci'])) update_field($dia . '_ci', $datos['ci'], $id);
    if (isset($datos['br_i'])) update_field($dia . '_br_i', $datos['br_i'], $id);
    if (isset($datos['br_f'])) update_field($dia . '_br_f', $datos['br_f'], $id);

    return new WP_REST_Response(array('message' => 'Horarios actualizados para ' . $dia), 200);
}
