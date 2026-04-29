import { calcularFin } from './utils.js';

describe('calcularFin', () => {
    test('Happy Path: should add minutes to a time correctly', () => {
        expect(calcularFin('10:00', 30)).toBe('10:30');
    });

    test('Hour Wrap: should handle additions that cross hour boundaries', () => {
        expect(calcularFin('10:45', 30)).toBe('11:15');
    });

    test('Multi-hour addition: should handle durations longer than 60 minutes', () => {
        expect(calcularFin('09:00', 120)).toBe('11:00');
    });

    test('Midnight Wrap: should handle crossing midnight (current behavior)', () => {
        expect(calcularFin('23:30', 60)).toBe('24:30');
        expect(calcularFin('23:59', 1)).toBe('24:00');
    });

    test('Large Duration: should handle durations longer than 24 hours', () => {
        expect(calcularFin('00:00', 1440)).toBe('24:00');
        expect(calcularFin('00:00', 1500)).toBe('25:00');
    });

    test('Negative Duration: should handle negative durations correctly', () => {
        expect(calcularFin('10:00', -30)).toBe('09:30');
        expect(calcularFin('00:30', -60)).toBe('-1:-30');
    });

    test('Zero Duration: should return the same time if duration is 0', () => {
        expect(calcularFin('10:00', 0)).toBe('10:00');
    });

    test('String duration: should handle duration as a string', () => {
        expect(calcularFin('10:00', '30')).toBe('10:30');
    });
});
