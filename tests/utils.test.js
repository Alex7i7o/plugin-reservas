import { calcularFin } from '../js/shared/utils.js';

describe('utils.js', () => {
    describe('calcularFin', () => {
        it('should correctly calculate end time in the same hour', () => {
            expect(calcularFin('10:00', 30)).toBe('10:30');
            expect(calcularFin('14:15', 30)).toBe('14:45');
        });

        it('should correctly calculate end time rolling over to the next hour', () => {
            expect(calcularFin('10:45', 30)).toBe('11:15');
            expect(calcularFin('23:45', 30)).toBe('24:15');
            expect(calcularFin('23:59', 1)).toBe('24:00');
        });

        it('should handle large durations (> 24h)', () => {
            expect(calcularFin('00:00', 1440)).toBe('24:00');
            expect(calcularFin('00:00', 1500)).toBe('25:00');
        });

        it('should handle negative durations', () => {
            expect(calcularFin('10:00', -30)).toBe('09:30');
            expect(calcularFin('00:30', -60)).toBe('-1:-30');
        });

        it('should handle zero duration', () => {
            expect(calcularFin('09:00', 0)).toBe('09:00');
        });

        it('should handle duration passed as string', () => {
            expect(calcularFin('08:30', '45')).toBe('09:15');
        });

        it('should correctly handle single digit hours and minutes padding', () => {
            expect(calcularFin('08:05', 4)).toBe('08:09');
            expect(calcularFin('09:55', 5)).toBe('10:00');
        });
    });
});
