<?php
// app-reservas/app-reservas.php

if (!defined('ABSPATH')) exit;

function mostrar_mi_app_reservas() {
    $archivo_path = plugin_dir_path(__FILE__) . 'template.php';

    if (file_exists($archivo_path)) {
        ob_start();
        include $archivo_path;
        return ob_get_clean();
    } else {
        return "Error: No se encuentra el archivo en: " . $archivo_path;
    }
}
add_shortcode('mi_app_reservas', 'mostrar_mi_app_reservas');
