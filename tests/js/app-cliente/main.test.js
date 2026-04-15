/**
 * @jest-environment jsdom
 */

import { cargarDatosPerfil, cancelarReserva } from '../../../js/app-cliente/main.js';

describe('App Cliente Main', () => {
    let originalConfirm;
    let originalAlert;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="mis-reservas-lista"></div>
            <div id="perfil-info"></div>
        `;

        global.appConfig = {
            apiUrl: 'http://localhost/wp-json/reserva/v1/'
        };

        window.clienteEmail = 'test@example.com';
        delete window.clienteCreditos;

        global.fetch = jest.fn();

        originalConfirm = window.confirm;
        originalAlert = window.alert;
        window.confirm = jest.fn();
        window.alert = jest.fn();

        // Mock console.error to keep test output clean
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        window.confirm = originalConfirm;
        window.alert = originalAlert;
    });

    describe('cargarDatosPerfil', () => {
        it('debe retornar temprano si faltan los elementos del DOM', async () => {
            document.body.innerHTML = '';
            await cargarDatosPerfil();
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('debe renderizar la información de los créditos (wallet) si el usuario tiene', async () => {
            window.clienteCreditos = {
                '1': 5,
                '2': 0
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

            await cargarDatosPerfil();

            const info = document.getElementById('perfil-info');
            expect(info.innerHTML).toContain('Mis Créditos (Wallet):');
            expect(info.innerHTML).toContain('Servicio ID 1: 5 créditos');
            expect(info.innerHTML).not.toContain('Servicio ID 2: 0 créditos');
        });

        it('debe renderizar el mensaje de "No tenés créditos" si el usuario no tiene', async () => {
            window.clienteCreditos = {
                '1': 0
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

            await cargarDatosPerfil();

            const info = document.getElementById('perfil-info');
            expect(info.innerHTML).toContain('No tenés créditos disponibles.');
        });

        it('debe mostrar "No tenés próximos turnos." si el array de reservas es vacío', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

            await cargarDatosPerfil();

            const lista = document.getElementById('mis-reservas-lista');
            expect(lista.innerHTML).toContain('No tenés próximos turnos.');
        });

        it('debe renderizar el botón de cancelar si faltan más de 12hs', async () => {
            const nowSeconds = new Date().getTime() / 1000;
            // Reservation timestamp is in 24 hours
            const futureTimestamp = nowSeconds + (24 * 3600);

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    {
                        id: 1,
                        servicio: 'Pilates',
                        fecha: '2023-12-01',
                        hora: '10:00',
                        timestamp: futureTimestamp,
                        token_cancelacion: 'token123'
                    }
                ]
            });

            await cargarDatosPerfil();

            const lista = document.getElementById('mis-reservas-lista');
            expect(lista.innerHTML).toContain('Pilates');
            expect(lista.innerHTML).toContain('Cancelar Turno');
            expect(lista.innerHTML).not.toContain('Faltan menos de 12hs');
        });

        it('debe mostrar el texto de advertencia si faltan menos de 12hs para la reserva', async () => {
            const nowSeconds = new Date().getTime() / 1000;
            // Reservation timestamp is in 6 hours
            const futureTimestamp = nowSeconds + (6 * 3600);

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    {
                        id: 2,
                        servicio: 'Masaje',
                        fecha: '2023-12-01',
                        hora: '10:00',
                        timestamp: futureTimestamp,
                        token_cancelacion: 'token456'
                    }
                ]
            });

            await cargarDatosPerfil();

            const lista = document.getElementById('mis-reservas-lista');
            expect(lista.innerHTML).toContain('Masaje');
            expect(lista.innerHTML).not.toContain('Cancelar Turno');
            expect(lista.innerHTML).toContain('Faltan menos de 12hs');
        });

        it('debe manejar respuestas no OK de fetch', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false
            });

            await cargarDatosPerfil();

            const lista = document.getElementById('mis-reservas-lista');
            expect(lista.innerHTML).toContain('No se pudieron cargar las reservas.');
        });

        it('debe manejar errores de excepción de fetch', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            await cargarDatosPerfil();

            const lista = document.getElementById('mis-reservas-lista');
            expect(lista.innerHTML).toContain('Error al cargar reservas.');
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('cancelarReserva', () => {
        it('debe abortar si el usuario cancela el confirm dialog', async () => {
            window.confirm.mockReturnValueOnce(false);

            await cancelarReserva(1, 'token123');

            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('debe realizar el fetch y alertar éxito cuando la confirmación es true y fetch es ok', async () => {
            window.confirm.mockReturnValueOnce(true);
            global.fetch.mockResolvedValueOnce({
                ok: true
            });
            // We need to mock the next fetch that happens inside cargarDatosPerfil
            // since it gets called after successful cancellation.
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

            await cancelarReserva(1, 'token123');

            expect(global.fetch).toHaveBeenCalledWith(`${global.appConfig.apiUrl}cancelar-reserva`, expect.any(Object));
            expect(window.alert).toHaveBeenCalledWith("Turno cancelado.");
        });

        it('debe realizar el fetch y alertar error cuando fetch devuelve ok: false', async () => {
            window.confirm.mockReturnValueOnce(true);
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ message: "Token inválido" })
            });

            await cancelarReserva(1, 'token123');

            expect(window.alert).toHaveBeenCalledWith("Error: Token inválido");
        });

        it('debe manejar excepciones en el proceso de cancelación', async () => {
            window.confirm.mockReturnValueOnce(true);
            global.fetch.mockRejectedValueOnce(new Error("Network error"));

            await cancelarReserva(1, 'token123');

            expect(window.alert).toHaveBeenCalledWith("Ocurrió un error.");
            expect(console.error).toHaveBeenCalled();
        });
    });
});
