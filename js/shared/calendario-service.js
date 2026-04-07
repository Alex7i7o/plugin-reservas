/**
 * Envía el evento al calendario de Google del cliente (usuario logueado)
 */

export async function agendarEnGoogle(datosReserva) {
    // Validamos que lleguen los datos para evitar el 400
    if (!datosReserva.fecha || !datosReserva.hora) {
        console.error("Faltan datos para la reserva:", datosReserva);
        return { ok: false, error: 'datos_incompletos' };
    }

    const evento = {
        'summary': `Turno: ${datosReserva.servicio}`,
        'description': `Reserva para ${datosReserva.cliente}`,
        'start': {
            // El formato debe ser YYYY-MM-DDTHH:mm:ssZ o con el offset
            'dateTime': `${datosReserva.fecha}T${datosReserva.hora}:00-03:00`,
            'timeZone': 'America/Argentina/Buenos_Aires'
        },
        'end': {
            // Si no tenés horaFin, sumale 30 o 60 min a la de inicio
            'dateTime': `${datosReserva.fecha}T${datosReserva.horaFin || datosReserva.hora}:00-03:00`,
            'timeZone': 'America/Argentina/Buenos_Aires'
        }
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${datosReserva.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(evento)
    });

    // Si sigue dando 400, imprimimos la respuesta detallada de Google
    if (!response.ok) {
        const errorDetail = await response.json();
        console.error("Detalle del error de Google:", errorDetail);
    }

    return { ok: response.ok, status: response.status };
}

/**
 * TODO: Aquí agregaremos la lógica para consultar disponibilidad
 * con la Service Account de Lorena mañana.
 */
export async function consultarDisponibilidadNegocio(fecha) {
    // Próximo paso: Integración con Service Account
    console.log("Consultando disponibilidad para:", fecha);
}