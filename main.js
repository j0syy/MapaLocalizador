// ---------- Datos (simulados; x e y son PORCENTAJES del plano) ----------
let equiposDB = [
    { id: 1, nombre: "DESKTOP-SAT-01", usuario: "Juan Martinez", ip: "192.168.1.10", area: "Tecnología", piso: "alta", x: 25.5, y: 40.2 },
    { id: 2, nombre: "DESKTOP-SAT-02", usuario: "María García",  ip: "192.168.1.11", area: "Auditoria",  piso: "baja", x: 30,   y: 45 },
    { id: 3, nombre: "DESKTOP-SAT-03", usuario: "Carlos López",  ip: "192.168.1.12", area: "CERYS",      piso: "baja", x: 60,   y: 55 }
];

let pisoActual = "baja";
let modoEdicion = false;
let modalBs = null;
let equipoSeleccionadoId = null;

// ---------- Utilidades ----------
function escapeHTML(texto) {
    const d = document.createElement("div");
    d.textContent = texto;
    return d.innerHTML;
}

function limitar(valor, min, max) {
    return Math.min(max, Math.max(min, valor));
}

function guardarDB() {
    localStorage.setItem("equiposDB", JSON.stringify(equiposDB));
}

function cargarDB() {
    const guardado = localStorage.getItem("equiposDB");
    if (guardado) equiposDB = JSON.parse(guardado);
}

// ---------- Inicio ----------
document.addEventListener("DOMContentLoaded", () => {
    modalBs = new bootstrap.Modal(document.getElementById("modalEquipo"));
    cargarDB();
    renderEquipos();

    document.getElementById("btnPlantaBaja").addEventListener("click", () => cambiarPlanta("baja"));
    document.getElementById("btnPlantaAlta").addEventListener("click", () => cambiarPlanta("alta"));
    document.getElementById("btnModoEdicion").addEventListener("click", toggleModoEdicion);
    document.getElementById("btnCerrarPanel").addEventListener("click", cerrarPanel);

    // Búsqueda
    document.getElementById("searchInput").addEventListener("input", (e) => {
        ejecutarBusqueda(e.target.value.trim());
    });

    // Click en zona vacía del mapa:
    //  - modo normal: cierra la tarjeta
    //  - modo edición: abre el formulario para registrar un equipo nuevo
    document.getElementById("mapContainer").addEventListener("click", (e) => {
        if (!modoEdicion) {
            cerrarPanel();
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        abrirModalAlta(x, y);
    });

    // Guardar equipo nuevo
    document.getElementById("formEquipo").addEventListener("submit", (e) => {
        e.preventDefault();

        const nuevoEquipo = {
            id: Date.now(),
            nombre: document.getElementById("eqId").value.trim(),
            usuario: document.getElementById("eqUsuario").value.trim(),
            ip: document.getElementById("eqIP").value.trim(),
            area: document.getElementById("eqArea").value.trim(),
            piso: pisoActual,
            x: parseFloat(document.getElementById("eqX").value),
            y: parseFloat(document.getElementById("eqY").value)
        };

        equiposDB.push(nuevoEquipo);
        guardarDB();
        modalBs.hide();
        e.target.reset();
        renderEquipos();
        seleccionarEquipo(nuevoEquipo);
    });
});

// ---------- Cambio de planta ----------
function cambiarPlanta(piso) {
    pisoActual = piso;
    cerrarPanel();

    const esBaja = piso === "baja";
    document.getElementById("imgPlano").src = esBaja ? "PlantaBaja.svg" : "PlantaAlta.svg";

    const btnBaja = document.getElementById("btnPlantaBaja");
    const btnAlta = document.getElementById("btnPlantaAlta");

    btnBaja.classList.toggle("btn-dark", esBaja);
    btnBaja.classList.toggle("active", esBaja);
    btnBaja.classList.toggle("btn-outline-dark", !esBaja);

    btnAlta.classList.toggle("btn-dark", !esBaja);
    btnAlta.classList.toggle("active", !esBaja);
    btnAlta.classList.toggle("btn-outline-dark", esBaja);

    renderEquipos();
}

// ---------- Render de puntos ----------
function renderEquipos() {
    const layer = document.getElementById("layerPuntos");
    layer.innerHTML = "";

    equiposDB
        .filter(eq => eq.piso === pisoActual)
        .forEach(eq => {
            const punto = document.createElement("div");
            punto.className = "dot-equipo";
            punto.dataset.id = eq.id;
            punto.style.left = `${eq.x}%`;
            punto.style.top = `${eq.y}%`;
            punto.title = `${eq.nombre} - ${eq.usuario} - ${eq.ip} - ${eq.area}`;

            if (eq.id === equipoSeleccionadoId) punto.classList.add("selected");

            punto.addEventListener("click", (e) => {
                e.stopPropagation(); // evita cerrar la tarjeta o abrir el modal de alta
                seleccionarEquipo(eq);
            });

            activarArrastre(punto, eq, layer);
            layer.appendChild(punto);
        });
}

// ---------- Arrastrar puntos (solo en modo edición) ----------
function activarArrastre(punto, eq, layer) {
    let arrastrando = false;
    let movido = false;
    let inicio = null;

    punto.addEventListener("pointerdown", (e) => {
        if (!modoEdicion) return;
        arrastrando = true;
        movido = false;
        inicio = { x: e.clientX, y: e.clientY };
        punto.setPointerCapture(e.pointerId);
    });

    punto.addEventListener("pointermove", (e) => {
        if (!arrastrando) return;

        // Umbral de 4px para no confundir un clic con un arrastre
        if (!movido && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) < 4) return;

        movido = true;
        punto.classList.add("arrastrando");

        const rect = layer.getBoundingClientRect();
        eq.x = limitar(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
        eq.y = limitar(((e.clientY - rect.top) / rect.height) * 100, 0, 100);

        punto.style.left = `${eq.x}%`;
        punto.style.top = `${eq.y}%`;
    });

    const terminar = (e) => {
        if (!arrastrando) return;
        arrastrando = false;
        punto.classList.remove("arrastrando");
        if (punto.hasPointerCapture(e.pointerId)) punto.releasePointerCapture(e.pointerId);
        if (movido) guardarDB(); // se guarda al soltar
    };

    punto.addEventListener("pointerup", terminar);
    punto.addEventListener("pointercancel", terminar);
}

// ---------- Tarjeta de detalles ----------
function seleccionarEquipo(eq) {
    equipoSeleccionadoId = eq.id;

    document.querySelectorAll(".dot-equipo").forEach(d => {
        d.classList.toggle("selected", Number(d.dataset.id) === eq.id);
    });

    document.getElementById("detallesContenido").innerHTML = `
        <div class="badge bg-primary mb-2">${escapeHTML(eq.area)}</div>
        <h5 class="fw-bold text-dark mb-1">${escapeHTML(eq.nombre)}</h5>
        <p class="text-muted small mb-3">${eq.piso === "baja" ? "Planta Baja" : "Planta Alta"}</p>

        <div class="bg-light p-3 rounded-3 border mb-2">
            <small class="text-muted d-block">Usuario</small>
            <strong class="text-dark fs-6">${escapeHTML(eq.usuario)}</strong>
        </div>

        <div class="bg-light p-3 rounded-3 border">
            <small class="text-muted d-block">IP</small>
            <strong class="text-dark fs-6">${escapeHTML(eq.ip)}</strong>
        </div>

        ${modoEdicion ? `
            <button type="button" id="btnEliminar" class="btn btn-outline-danger w-100 rounded-pill mt-3">
                <i class="bi bi-trash"></i> Eliminar equipo
            </button>
        ` : ""}
    `;

    const btnEliminar = document.getElementById("btnEliminar");
    if (btnEliminar) {
        btnEliminar.addEventListener("click", () => eliminarEquipo(eq.id));
    }

    document.getElementById("panelEquipo").classList.remove("d-none");
}

function cerrarPanel() {
    equipoSeleccionadoId = null;
    document.getElementById("panelEquipo").classList.add("d-none");
    document.querySelectorAll(".dot-equipo").forEach(d => d.classList.remove("selected"));
}

function eliminarEquipo(id) {
    const eq = equiposDB.find(e => e.id === id);
    if (!eq) return;

    if (!confirm(`¿Eliminar el equipo ${eq.nombre}?`)) return;

    equiposDB = equiposDB.filter(e => e.id !== id);
    guardarDB();
    cerrarPanel();
    renderEquipos();
}

// ---------- Búsqueda ----------
function ejecutarBusqueda(criterio) {
    if (!criterio) return;

    const termino = criterio.toLowerCase();
    const coincide = equiposDB.find(eq =>
        eq.usuario.toLowerCase().includes(termino) ||
        eq.ip.toLowerCase().includes(termino) ||
        eq.area.toLowerCase().includes(termino) ||
        eq.nombre.toLowerCase().includes(termino)
    );

    if (coincide) {
        if (coincide.piso !== pisoActual) cambiarPlanta(coincide.piso);
        seleccionarEquipo(coincide);
    } else {
        cerrarPanel();
        document.getElementById("detallesContenido").innerHTML =
            '<p class="text-muted mb-0">Equipo no encontrado.</p>';
        document.getElementById("panelEquipo").classList.remove("d-none");
    }
}

// ---------- Modo edición ----------
function toggleModoEdicion() {
    modoEdicion = !modoEdicion;
    const btn = document.getElementById("btnModoEdicion");

    document.body.classList.toggle("modo-edicion-activa", modoEdicion);
    btn.classList.toggle("btn-primary", modoEdicion);
    btn.classList.toggle("btn-outline-primary", !modoEdicion);
    document.getElementById("lblModo").textContent = modoEdicion ? "ON" : "OFF";

    // Refrescar la tarjeta abierta para mostrar u ocultar el botón de eliminar
    const eqActual = equiposDB.find(e => e.id === equipoSeleccionadoId);
    if (eqActual) seleccionarEquipo(eqActual);
}

function abrirModalAlta(x, y) {
    document.getElementById("eqX").value = x;
    document.getElementById("eqY").value = y;
    modalBs.show();
}