import { agendarEnGoogle } from './calendario-service';

describe('agendarEnGoogle', () => {
    let consoleErrorMock;

    beforeEach(() => {
        // Mock console.error to prevent it from cluttering the test output
        // and to allow us to assert on it.
        consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Mock fetch just in case, though the early return should prevent it from being called
        global.fetch = jest.fn();
    });

    afterEach(() => {
        // Restore the original console.error
        consoleErrorMock.mockRestore();

        // Clear fetch mock
        if (global.fetch) {
           global.fetch.mockClear();
           delete global.fetch;
        }
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
});
