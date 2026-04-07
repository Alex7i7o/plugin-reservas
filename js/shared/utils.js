export function calcularFin(horaInicio, duracionMinutos) {
    let [horas, minutos] = horaInicio.split(':').map(Number);
    let totalMinutos = horas * 60 + minutos + parseInt(duracionMinutos);
    return `${Math.floor(totalMinutos / 60).toString().padStart(2, '0')}:${(totalMinutos % 60).toString().padStart(2, '0')}`;
}