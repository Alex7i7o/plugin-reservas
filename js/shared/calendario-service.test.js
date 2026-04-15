import { agendarEnGoogle } from './calendario-service';

describe('agendarEnGoogle', () => {
    let consoleErrorMock;

    beforeEach(() => {
        // Mock console.error to prevent it from cluttering the test output
        // and to allow us to assert on it.
        consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Mock fetch
        global.fetch = jest.fn();

        // Mock appConfig
        global.appConfig = {
            calendarId: 'mock-calendar-id'
        };
    });

    afterEach(() => {
        // Restore the original console.error
        consoleErrorMock.mockRestore();

        // Clear fetch mock
        if (global.fetch) {
           global.fetch.mockClear();
           delete global.fetch;
        }

        // Clean up appConfig
        delete global.appConfig;
    });

    it('debería retornar un error si falta la fecha', async () => {
        const datosReserva = {
            hora: '10:00',
            cliente: 'Juan Perez',
            servicio: 'Corte',
            accessToken: 'dummy-token'
        };

        const result = await agendarEnGoogle(datosReserva);

        expect(result).toEqual({ ok: false, error: 'datos_incompletos' });
        expect(consoleErrorMock).toHaveBeenCalledWith('Faltan datos para la reserva:', datosReserva);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('debería retornar un error si falta la hora', async () => {
        const datosReserva = {
            fecha: '2023-10-27',
            cliente: 'Juan Perez',
            servicio: 'Corte',
            accessToken: 'dummy-token'
        };

        const result = await agendarEnGoogle(datosReserva);

        expect(result).toEqual({ ok: false, error: 'datos_incompletos' });
        expect(consoleErrorMock).toHaveBeenCalledWith('Faltan datos para la reserva:', datosReserva);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('debería retornar un error si faltan tanto la fecha como la hora', async () => {
        const datosReserva = {
            cliente: 'Juan Perez',
            servicio: 'Corte',
            accessToken: 'dummy-token'
        };

        const result = await agendarEnGoogle(datosReserva);

        expect(result).toEqual({ ok: false, error: 'datos_incompletos' });
        expect(consoleErrorMock).toHaveBeenCalledWith('Faltan datos para la reserva:', datosReserva);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('debería manejar una respuesta de error de Google Calendar', async () => {
        const datosReserva = {
            fecha: '2023-10-27',
            hora: '10:00',
            cliente: 'Ana Garcia',
            servicio: 'Masaje',
            accessToken: 'valid-token'
        };

        const errorResponse = { error: { message: 'Bad Request' } };
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: jest.fn().mockResolvedValueOnce(errorResponse)
        });

        const result = await agendarEnGoogle(datosReserva);

        expect(result).toEqual({ ok: false, status: 400 });
        expect(consoleErrorMock).toHaveBeenCalledWith("Detalle del error de Google:", errorResponse);
    });

    it('debería utilizar "primary" como calendarId por defecto si appConfig.calendarId no está definido', async () => {
        delete global.appConfig.calendarId;

        const datosReserva = {
            fecha: '2023-10-27',
            hora: '10:00',
            cliente: 'Ana Garcia',
            servicio: 'Masaje',
            accessToken: 'valid-token'
        };

        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200
        });

        await agendarEnGoogle(datosReserva);

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('https://www.googleapis.com/calendar/v3/calendars/primary/events'),
            expect.any(Object)
        );
    });

    it('debería agendar exitosamente construyendo el payload correcto y llamando a fetch', async () => {
        const datosReserva = {
            fecha: '2023-10-27',
            hora: '10:00',
            horaFin: '11:00',
            cliente: 'Ana Garcia',
            servicio: 'Masaje',
            accessToken: 'valid-token'
        };

        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200
        });

        const result = await agendarEnGoogle(datosReserva);

        expect(result).toEqual({ ok: true, status: 200 });

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://www.googleapis.com/calendar/v3/calendars/mock-calendar-id/events',
            {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer valid-token',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    'summary': 'Turno: Masaje',
                    'description': 'Reserva para Ana Garcia',
                    'start': {
                        'dateTime': '2023-10-27T10:00:00-03:00',
                        'timeZone': 'America/Argentina/Buenos_Aires'
                    },
                    'end': {
                        'dateTime': '2023-10-27T11:00:00-03:00',
                        'timeZone': 'America/Argentina/Buenos_Aires'
                    }
                })
            }
        );
        expect(consoleErrorMock).not.toHaveBeenCalled();
    });
});
