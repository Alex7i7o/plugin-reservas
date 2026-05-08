export function initAppLayout() {
    if (window.violettLayoutInitialized) return;
    window.violettLayoutInitialized = true;

    console.log("Violett: Inicializando Layout de Negocio...");
    const navButtons = document.querySelectorAll('.app-nav-btn, .menu-nav-btn');
    const floatingBtn = document.getElementById('btn-floating-menu');
    const overlay = document.getElementById('menu-overlay-negocio');

    if (floatingBtn && overlay) {
        floatingBtn.addEventListener('click', () => {
            console.log("Violett: Click en botón flotante");
            const isActive = overlay.classList.toggle('active');
            floatingBtn.classList.toggle('active', isActive);
            console.log("Violett: Estado del menú:", isActive);
        });

        // Cerrar overlay al hacer click fuera de la lista
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                floatingBtn.classList.remove('active');
            }
        });
    }

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = btn.getAttribute('data-target');
            if (sectionId) {
                showSection(sectionId);
                if (overlay) overlay.classList.remove('active');
                if (floatingBtn) floatingBtn.classList.remove('active');
            }
        });
    });

    const logoutMobile = document.getElementById('btn-logout-mobile');
    if (logoutMobile) {
        logoutMobile.addEventListener('click', () => {
            const logoutDesktop = document.getElementById('btn-logout-negocio');
            if (logoutDesktop) logoutDesktop.click();
        });
    }
}

export function showSection(sectionId) {
    const sections = document.querySelectorAll('.app-section');

    sections.forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });

    const navButtons = document.querySelectorAll('.app-nav-btn, .menu-nav-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-target') === sectionId) {
            btn.classList.add('active');
        }
    });

    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
        
        // Disparar carga de datos específica si es necesario
        if (sectionId === 'horarios' && window.cargarHorariosNegocio) {
            window.cargarHorariosNegocio();
        }
    }
}
