export async function obtenerServiciosDesdeWP() {
    try {
        const response = await fetch(`${appConfig.apiUrl}servicio`);
        if (!response.ok) throw new Error("Error al traer servicios");
        return await response.json();
    } catch (error) {
        console.error("Error en servicios-service:", error);
        throw error;
    }
}