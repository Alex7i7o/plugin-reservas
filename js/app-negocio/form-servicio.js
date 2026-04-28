document.addEventListener('DOMContentLoaded', () => {
    const formServicio = document.getElementById('form-crear-servicio');
    if (!formServicio) return;

    formServicio.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Obtener valores del form
        const titulo = document.getElementById('servicio-titulo').value;
        const contenido = document.getElementById('servicio-contenido').value;
        const precio = document.getElementById('servicio-precio').value;
        const duracion = document.getElementById('servicio-duracion').value;
        const capacidad = document.getElementById('servicio-capacidad').value;
        const sesiones = document.getElementById('servicio-sesiones').value;

        // Validar basic
        if (!titulo) {
            alert('El título es requerido');
            return;
        }

        // Preparar payload
        const payload = {
            titulo: titulo,
            contenido: contenido,
            precio: precio,
            duracion: duracion,
            capacidad: capacidad,
            sesiones: sesiones
        };

        const submitBtn = document.getElementById('btn-submit-servicio');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Guardando...';
        submitBtn.disabled = true;

        try {
            // Usa el namespace localizado 'violett/v1'
            const baseApiUrl = appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');

            const response = await fetch(`${baseApiUrl}servicio`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': appConfig.nonce
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();

                // Mostrar confirmacion
                alert(data.message || 'Servicio creado exitosamente');

                // Limpiar form
                formServicio.reset();
            } else {
                const err = await response.json();
                alert(`Error: ${err.message || 'No se pudo crear el servicio'}`);
            }
        } catch (error) {
            console.error('Error al crear servicio:', error);
            alert('Error de red o de servidor. Revisa la consola.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
});
