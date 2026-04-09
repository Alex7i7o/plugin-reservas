<?php
// app-cliente/app-cliente.php

if (!defined('ABSPATH')) exit;

function mostrar_app_cliente() {
    $archivo_path = plugin_dir_path(__FILE__) . 'template.php';

    if (file_exists($archivo_path)) {
        ob_start();
        include $archivo_path;
        return ob_get_clean();
    } else {
        return "Error: No se encuentra el archivo en: " . $archivo_path;
    }
}
add_shortcode('app_cliente', 'mostrar_app_cliente');
