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



// -------------------------


// // 2. Encolado de Scripts y Localización de Datos (Solución al Fatal Error)
// function encolar_scripts_reservas() {
//     wp_enqueue_script('mi-logica-reservas', plugins_url( '/js/main.js', __FILE__ ), array(), '1.0.1', true);

//     // Intentamos traer los datos de ACF
//     $apertura = get_field('apertura', '2'); 
//     $cierre   = get_field('cierre', '2');   // este esta en la url al edirla
//     $dias     = get_field('dias_laborales', '2'); // aparece como: post=2

//     // LOG DE DEBUG (Esto saldrá en tu consola para que veas qué llega)
//     // Si estos valores salen vacíos, es que ACF no los está encontrando
//     wp_localize_script('mi-logica-reservas', 'appConfig', array(
//         'apiUrl'         => rest_url('wp/v2/'), 
//         'nonce'          => wp_create_nonce('wp_rest'),
//         'googleClientId' => '57411239751-805cvkqrq4i46f0n37abslrqfkbrtg42.apps.googleusercontent.com',
//         'ajustes'        => array(
//             'apertura' => $apertura ?: '09:00', // Si falla ACF, vuelve al default
//             'cierre'   => $cierre ?: '18:00',
//             'dias'     => !empty($dias) ? $dias : array('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes')
//         )
//     ));
// }
// add_action('wp_enqueue_scripts', 'encolar_scripts_reservas');

// // 3. Opcional: Crear la página de opciones de ACF si no existe
// if( function_exists('acf_add_options_page') ) {
//     acf_add_options_page(array(
//         'page_title'    => 'Ajustes de Reserva',
//         'menu_title'    => 'Ajustes de Reserva',
//         'menu_slug'     => 'ajustes-reserva',
//         'capability'    => 'edit_posts',
//         'redirect'      => false
//     ));
// }


// ---------------------------------------------------------------------------------

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
    wp_localize_script('reserva-main', 'appConfig', array(
        'apiUrl' => rest_url('wp/v2/'),
        'googleClientId' => '57411239751-805cvkqrq4i46f0n37abslrqfkbrtg42.apps.googleusercontent.com',
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
    $client = new Google\Client();
    $client->setAuthConfig(path_to_credentials_json); // Tu archivo de credenciales
    $client->addScope(Google\Service\Calendar::CALENDAR_EVENTS);
    
    $service = new Google\Service\Calendar($client);
    $event = new Google\Service\Calendar\Event(array(
        'summary' => 'NUEVO TURNO: ' . $reserva_data['cliente'],
        'start' => array('dateTime' => $reserva_data['inicio']),
        'end' => array('dateTime' => $reserva_data['fin']),
    ));

    $calendarId = 'primary'; // O el mail de Lorena
    $service->events->insert($calendarId, $event);
}

// ------------------------------


// Guardar datos 

// 1. Registramos la ruta correctamente
add_action('rest_api_init', function () {
    register_rest_route('wp/v2', '/reservas', array( // Cambiamos a wp/v2 para coincidir con tu JS
        'methods' => 'POST',
        'callback' => 'guardar_reserva_callback',
        'permission_callback' => '__return_true', 
    ));
});

// 2. La función que procesa los datos
function guardar_reserva_callback($request) {
    $parametros = $request->get_json_params();
    
    // IMPORTANTE: Asegurate de tener el CPT 'reserva' creado
    $post_id = wp_insert_post(array(
        'post_title'   => 'Reserva: ' . $parametros['email'] . ' - ' . $parametros['hora'],
        'post_type'    => 'reserva', // Verifica que este slug sea el correcto en tu CPT
        'post_status'  => 'publish',
    ));

    if ($post_id) {
        // Guardamos los datos en ACF. 
        // Nota: El tercer parámetro es el post_id
        update_field('email_cliente', $parametros['email'], $post_id);
        update_field('fecha', $parametros['fecha'], $post_id);
        update_field('hora', $parametros['hora'], $post_id);
        update_field('servicio', $parametros['servicio'], $post_id);
        
        return new WP_REST_Response(array('message' => 'Reserva guardada', 'id' => $post_id), 200);
    }

    return new WP_Error('error_guardado', 'No se pudo insertar el post', array('status' => 500));
}

