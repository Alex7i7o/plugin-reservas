document.addEventListener('DOMContentLoaded', () => {
    cargarServicios();
});

// Función para traer los CPT "Servicios" desde la API
async function cargarServicios() {
    try {
        console.log("Intentando conectar a:", appConfig.apiUrl);
        const response = await fetch(`${appConfig.apiUrl}servicio`);
        const servicios = await response.json();
        
        console.log("Servicios recibidos:", servicios); // Esto aparecerá en la consola F12

        const select = document.getElementById('select-servicios');
        select.innerHTML = '<option value="">Selecciona un servicio</option>';
        
        servicios.forEach(srv => {
            // Verificamos que existan los datos de ACF antes de usarlos
            const precio = srv.acf?.precio || '0';
            const duracion = srv.acf?.duracion || '30';

            select.innerHTML += `
                <option value="${srv.id}" data-duracion="${duracion}">
                    ${srv.title.rendered} - $${precio}
                </option>`;
        });
        
        // document.getElementById('service-section').style.display = 'block';
    } catch (error) {
        console.error("Error detallado:", error);
        alert("No se pudieron cargar los servicios. Revisa la consola.");
    }
}

// Escuchamos cuando el usuario elige un servicio
document.getElementById('select-servicios').addEventListener('change', (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const duracion = selectedOption.getAttribute('data-duracion'); // Los datos de ACF que ya cargamos
    
    if (duracion) {
        generarHorariosDisponibles(duracion);
    }
});

function generarHorariosDisponibles(duracion) {
    const contenedor = document.getElementById('grid-horarios');
    contenedor.innerHTML = ''; // Limpiamos horarios anteriores
    
    // Configuración base (luego esto vendrá de WordPress)
    let horaInicio = 9; // 09:00 AM
    let horaFin = 18;   // 06:00 PM
    
    // Lógica para crear los botones
    for (let h = horaInicio; h < horaFin; h++) {
        const boton = document.createElement('button');
        boton.innerText = `${h}:00 hs`;
        boton.className = 'btn-horario'; // Para que luego le des estilo con CSS
        boton.onclick = () => seleccionarHorario(`${h}:00`);
        contenedor.appendChild(boton);
    }
    
    document.getElementById('calendar-section').style.display = 'block';
}

// Loging google 
// Al cargar la página, verificamos si ya hay una sesión guardada
window.onload = function () {
    const sesionGuardada = sessionStorage.getItem('userSesion');
    document.addEventListener('click', function(e) {
    if(e.target && e.target.id === 'btn-google-login'){
        if (tokenClient) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            console.error("El cliente de Google no se ha inicializado todavía.");
        }
    }
    });



    if (sesionGuardada) {
        const perfil = JSON.parse(sesionGuardada);
        window.clienteEmail = perfil.email;
        window.clienteNombre = perfil.name;
        window.googleAccessToken = perfil.token;
        
        mostrarSesionIniciada(perfil);
    }

    // Inicializar cliente de Google (lo que ya tenías)
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: appConfig.googleClientId,
        scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                obtenerPerfilUsuario(tokenResponse.access_token);
            }
        },
    });
};

async function obtenerPerfilUsuario(token) {
    const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const perfil = await resp.json();
    perfil.token = token; // Guardamos el token en el objeto

    // Guardar en el navegador para que no se borre al recargar
    sessionStorage.setItem('userSesion', JSON.stringify(perfil));
    
    window.clienteEmail = perfil.email;
    window.clienteNombre = perfil.name;
    window.googleAccessToken = token;

    mostrarSesionIniciada(perfil);
}

function mostrarSesionIniciada(perfil) {
    const loginSection = document.getElementById('login-section');
    // Mostramos info del usuario en lugar del botón
    loginSection.innerHTML = `
        <div class="user-ready">
            <img src="${perfil.picture}" style="border-radius:50%; width:40px;">
            <span>Listo, <strong>${perfil.given_name}</strong></span>
        </div>
    `;
    
    // REGLA: Ocultar paso 1 (opcionalmente) y MOSTRAR paso 2
    document.getElementById('service-section').style.display = 'block';
}


// -----------------------------

async function confirmarReserva(servicioId, fechaHora) {
    const datosReserva = {
        title: `Reserva: ${window.clienteNombre} - ${fechaHora}`,
        status: 'publish', // Para que aparezca directamente
        acf: {
            fecha: fechaHora.split(' ')[0], // Separa fecha de hora
            hora: fechaHora.split(' ')[1],
            email_cliente: window.clienteEmail,
            estado_pago: 'Pendiente'
        }
    };

    try {
        const response = await fetch(`${appConfig.apiUrl}reserva`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': appConfig.nonce // Seguridad que enviamos desde PHP
            },
            body: JSON.stringify(datosReserva)
        });

        if (response.ok) {
            alert("¡Reserva creada con éxito! Revisa tu panel de WordPress.");
        }
    } catch (error) {
        console.error("Error al guardar:", error);
    }
}

// -----------------------

// 1. Escuchar cuando el usuario cambia el servicio
document.getElementById('select-servicios').addEventListener('change', (e) => {
    const calendarSection = document.getElementById('calendar-section');
    
    if (e.target.value !== "") {
        calendarSection.style.display = 'block';
        // Si ya había una fecha elegida, refrescamos los horarios
        const fechaInput = document.getElementById('fecha-reserva');
        if (fechaInput.value) {
            verificarDiaYGenerarHorarios(fechaInput.value);
        }
    } else {
        calendarSection.style.display = 'none';
        document.getElementById('horarios-container').style.display = 'none';
    }
});

// 2. Escuchar cuando el usuario elige una fecha
document.getElementById('fecha-reserva').addEventListener('change', (e) => {
    verificarDiaYGenerarHorarios(e.target.value);
});



function verificarDiaYGenerarHorarios(fechaSeleccionada) {
    // 1. Convertimos la fecha para saber qué día de la semana es
    const dateObj = new Date(fechaSeleccionada + 'T00:00:00');
    const diaIngles = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dateObj).toLowerCase();
    const diaEspañol = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(dateObj).toLowerCase();
    
    // 2. Buscamos la configuración específica de ese día (ej: 'monday')
    const config = appConfig.horariosSemana[diaIngles];

    // 3. Verificamos si existe la configuración y si el 'status' es true (activo)
    if (config && config.activo) {
        const select = document.getElementById('select-servicios');
        const duracion = parseInt(select.selectedOptions[0].getAttribute('data-duracion')) || 60;
        
        // Llamamos a la nueva función que creamos con la lógica del Break
        generarHorariosConBreak(duracion, config);
        
        document.getElementById('horarios-container').style.display = 'block';
    } else {
        // Si config.activo es false, el negocio está cerrado
        alert("Lo sentimos, el negocio permanece cerrado el día " + diaEspañol);
        document.getElementById('horarios-container').style.display = 'none';
    }
}


// --------------------------

// Generar botones horarios

function generarHorariosConBreak(duracionMinutos, config) {
    const contenedor = document.getElementById('grid-horarios');
    contenedor.innerHTML = ''; 

    let [hI, mI] = config.ap.split(':').map(Number);
    let [hF, mF] = config.ci.split(':').map(Number);
    let [hBi, mBi] = config.br_i.split(':').map(Number);
    let [hBf, mBf] = config.br_f.split(':').map(Number);

    let actual = hI * 60 + mI;
    let fin = hF * 60 + mF;
    let breakInicio = hBi * 60 + mBi;
    let breakFin = hBf * 60 + mBf;

    while (actual + duracionMinutos <= fin) {
        // LÓGICA DEL BREAK: Si el turno choca con el descanso, saltamos al final del break
        if (actual + duracionMinutos > breakInicio && actual < breakFin) {
            actual = breakFin;
            continue; // Salta a la siguiente iteración del bucle
        }

        const h = Math.floor(actual / 60).toString().padStart(2, '0');
        const m = (actual % 60).toString().padStart(2, '0');
        const tiempo = `${h}:${m}`;

        const btn = document.createElement('button');
        btn.innerText = tiempo;
        btn.className = 'btn-horario';
        btn.onclick = (e) => seleccionarHorario(tiempo, e);
        
        contenedor.appendChild(btn);
        actual += duracionMinutos;
    }
}

// -----------------

// Seleccionador de Horarios 
function seleccionarHorario(hora, event) {
    // 1. Estética: Marcamos el botón seleccionado
    document.querySelectorAll('.btn-horario').forEach(b => b.classList.remove('selected'));
    event.target.classList.add('selected');

    // 2. Guardamos la elección en nuestras variables globales
    window.horarioSeleccionado = hora;
    window.fechaSeleccionada = document.getElementById('fecha-reserva').value;
    
    const select = document.getElementById('select-servicios');
    window.servicioSeleccionado = select.options[select.selectedIndex].text;

    // 3. ¡La clave! Cambiamos el display de 'none' a 'block'
    const confirmSection = document.getElementById('confirmacion-section');
    confirmSection.style.display = 'block';

    // 4. Mostramos el resumen para que el cliente esté seguro
    const resumenTexto = document.getElementById('resumen-texto');
    resumenTexto.innerHTML = `
        <strong>Servicio:</strong> ${window.servicioSeleccionado}<br>
        <strong>Día:</strong> ${window.fechaSeleccionada}<br>
        <strong>Hora:</strong> ${window.horarioSeleccionado} hs.
    `;

    // 5. Scroll suave hasta el botón para que el usuario lo vea (opcional)
    confirmSection.scrollIntoView({ behavior: 'smooth' });
}


// ------------------------------

// Boton reserva

// Variables globales para los datos seleccionados
window.servicioSeleccionado = "";
window.fechaSeleccionada = "";
window.horarioSeleccionado = "";

async function confirmarReservaFinal() {
    const select = document.getElementById('select-servicios');
    const duracionExtraida = select.selectedOptions[0].getAttribute('data-duracion') || "60"; 

    const datosReserva = {
        cliente: window.clienteNombre,
        email: window.clienteEmail,
        servicio: window.servicioSeleccionado,
        fecha: window.fechaSeleccionada,
        hora: window.horarioSeleccionado,
        duracion: duracionExtraida,
        accessToken: window.googleAccessToken
    };

    try {
        // 1. Guardar en WordPress
        const resWP = await fetch('http://localhost:10004/wp-json/wp/v2/reservas', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-WP-Nonce': appConfig.nonce 
            },
            body: JSON.stringify(datosReserva)
        });

        if (!resWP.ok) throw new Error("Error en WordPress");

        // 2. Agendar en Google
        console.log("Enviando a Google Calendar...");
        const googleOk = await agendarEnCalendarioCliente(datosReserva);
        
        // 3. SI TODO SALIÓ BIEN, MOSTRAR ÉXITO (Dentro del Try)
        if (googleOk) {
            // OCULTAR TODO
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('service-section').style.display = 'none';
            document.getElementById('confirmacion-section').style.display = 'none';
            
            // MOSTRAR SECCIÓN ÉXITO
            const exitoSection = document.getElementById('exito-section');
            if (exitoSection) {
                exitoSection.style.display = 'block';
                exitoSection.innerHTML = `
                    <h3>¡Reserva Realizada con éxito!</h3>
                    <p>Se envió un recordatorio a tu Google Calendar.</p>
                    <div style="margin-top:20px;">
                        <button onclick="location.reload()" class="button btn-exito">Volver a reservar</button>
                        <button onclick="window.location.href='/mi-panel'" class="button button-outline">Ver mis reservas</button>
                    </div>
                `;
                exitoSection.scrollIntoView({ behavior: 'smooth' });
            }
        }

    } catch (error) {
        console.error("Error en el proceso final:", error);
        alert("Hubo un problema. Revisá la consola.");
    }
}

async function agendarEnCalendarioCliente(datos) {
    const evento = {
        'summary': `Turno: ${datos.servicio}`,
        'location': 'Centro de Estética, Ramos Mejía', //
        'description': `Hola ${datos.cliente}, este es el recordatorio de tu turno reservado en nuestra web.`,
        'start': {
            'dateTime': `${datos.fecha}T${datos.hora}:00-03:00`, // GMT-3 Argentina
            'timeZone': 'America/Argentina/Buenos_Aires'
        },
        'end': {
            // Aquí podrías sumar la duración real del servicio. Por ahora sumamos 1 hora.
            'dateTime': `${datos.fecha}T${parseInt(datos.hora.split(':')[0]) + 1}:${datos.hora.split(':')[1]}:00-03:00`,
            'timeZone': 'America/Argentina/Buenos_Aires'
        },
        'reminders': {
            'useDefault': false,
            'overrides': [
                {'method': 'popup', 'minutes': 30} // Aviso 30 min antes
            ]
        }
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${datos.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(evento)
    });

    return response.ok;
}

// Escuchador para el botón final
document.getElementById('btn-confirmar-final').onclick = confirmarReservaFinal;

// -----------------

function calcularFin(horaInicio, duracionMinutos) {
    let [horas, minutos] = horaInicio.split(':').map(Number);
    let totalMinutos = horas * 60 + minutos + parseInt(duracionMinutos);
    
    let horasFin = Math.floor(totalMinutos / 60);
    let minutosFin = totalMinutos % 60;
    
    // Formateamos para que siempre tenga dos dígitos (ej: 09:05)
    return `${horasFin.toString().padStart(2, '0')}:${minutosFin.toString().padStart(2, '0')}`;
}

// ---------------------------------
//  Despues de guardar la reserva 
async function agendarEnCalendarioCliente(datosReserva) {
    const evento = {
        'summary': `Turno Estética: ${datosReserva.servicio}`,
        'location': 'Tu Dirección 123, Ramos Mejía', //
        'description': 'Reserva confirmada vía Web App.',
        'start': {
            'dateTime': `${datosReserva.fecha}T${datosReserva.hora}:00-03:00`, // -03:00 es Argentina
            'timeZone': 'America/Argentina/Buenos_Aires'
        },
        'end': {
            'dateTime': `${datosReserva.fecha}T${calcularFin(datosReserva.hora, datosReserva.duracion)}:00-03:00`,
            'timeZone': 'America/Argentina/Buenos_Aires'
        }
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${window.googleAccessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(evento)
    });

    if (response.ok) {
        console.log("Agendado con éxito");
        return true; // <--- Agregá esto
    } else {
        const errorData = await response.json();
        console.error("Error de Google:", errorData);
        return false; // <--- Agregá esto
    }
}
