export async function obtenerServiciosDesdeWP() {
    try {
        const cachedServicios = sessionStorage.getItem('serviciosWP');
        if (cachedServicios) {
            return JSON.parse(cachedServicios);
        }

        const response = await fetch(`${appConfig.apiUrl}servicio`);
        if (!response.ok) throw new Error("Error al traer servicios");

        const data = await response.json();
        sessionStorage.setItem('serviciosWP', JSON.stringify(data));
        return data;
    } catch (error) {
        console.error("Error en servicios-service:", error);
        throw error;
    }
}