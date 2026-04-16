import { agendarEnGoogle, consultarDisponibilidadNegocio } from './calendario-service';

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

describe('consultarDisponibilidadNegocio', () => {
    let consoleErrorMock;

    beforeEach(() => {
        consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
        global.fetch = jest.fn();
        global.appConfig = {
            apiUrl: 'https://example.com/wp-json/wp/v2/',
            nonce: 'dummy-nonce'
        };
    });

    afterEach(() => {
        consoleErrorMock.mockRestore();
        if (global.fetch) {
           global.fetch.mockClear();
           delete global.fetch;
        }
        delete global.appConfig;
    });

    it('debería retornar datos cuando la respuesta es exitosa', async () => {
        const mockData = ['09:00', '10:00'];
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockData
        });

        const result = await consultarDisponibilidadNegocio('2023-11-01');

        expect(global.fetch).toHaveBeenCalledWith(
            'https://example.com/wp-json/wp/v2/disponibilidad?fecha=2023-11-01',
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': 'dummy-nonce'
                }
            }
        );
        expect(result).toEqual(mockData);
        expect(consoleErrorMock).not.toHaveBeenCalled();
    });

    it('debería retornar un array vacío y loguear un error si la respuesta no es ok', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            statusText: 'Internal Server Error'
        });

        const result = await consultarDisponibilidadNegocio('2023-11-01');

        expect(result).toEqual([]);
        expect(consoleErrorMock).toHaveBeenCalledWith('Error al consultar disponibilidad:', 'Internal Server Error');
    });

    it('debería retornar un array vacío y loguear un error si ocurre un problema de red', async () => {
        const error = new Error('Network failure');
        global.fetch.mockRejectedValueOnce(error);

        const result = await consultarDisponibilidadNegocio('2023-11-01');

        expect(result).toEqual([]);
        expect(consoleErrorMock).toHaveBeenCalledWith('Error de red al consultar disponibilidad:', error);
    });
});
