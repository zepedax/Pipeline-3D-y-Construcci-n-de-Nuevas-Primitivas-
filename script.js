const canvas = document.getElementById('canvas3d');
const ctx = canvas.getContext('2d');

const CENTRO_X = canvas.width / 2;
const CENTRO_Y = canvas.height / 2;
const distanciaCamara = 500;

// Base de datos de las figuras geométricas requeridas
const modelos3D = {
    cubo: {
        vertices: [
            { x: -80, y: -80, z: -80 }, { x: 80, y: -80, z: -80 },
            { x: 80, y: 80, z: -80 },   { x: -80, y: 80, z: -80 },
            { x: -80, y: -80, z: 80 },  { x: 80, y: -80, z: 80 },
            { x: 80, y: 80, z: 80 },    { x: -80, y: 80, z: 80 }
        ],
        aristas: [
            [0,1], [1,2], [2,3], [3,0], [4,5], [5,6], 
            [6,7], [7,4], [0,4], [1,5], [2,6], [3,7]
        ]
    },
    piramide: { // Opción A: 5 vértices, 8 aristas
        vertices: [
            { x: -90, y: -90, z: -90 }, { x:  90, y: -90, z: -90 },
            { x:  90, y: -90, z:  90 }, { x: -90, y: -90, z:  90 },
            { x:   0, y:  90, z:   0 }  // Cúspide
        ],
        aristas: [
            [0,1], [1,2], [2,3], [3,0], // Base
            [0,4], [1,4], [2,4], [3,4]  // Lados
        ]
    },
    prisma: { // Opción B: 6 vértices, 9 aristas
        vertices: [
            { x:    0, y:  90, z: -70 }, // 0: Top izq
            { x:  -80, y: -60, z: -70 }, // 1: Top der
            { x:   80, y: -60, z: -70 }, // 2: Top centro
            { x:    0, y:  90, z:  70 }, // 3: Base izq
            { x:  -80, y: -60, z:  70 }, // 4: Base der
            { x:   80, y: -60, z:  70 }  // 5: Base centro
        ],
        aristas: [
            [0,1], [1,2], [2,0], // Triángulo frontal
            [3,4], [4,5], [5,3], // Triángulo trasero
            [0,3], [1,4], [2,5]  // Conexiones longitudinales
        ]
    },
    octaedro: { // Opción C: 6 vértices, 12 aristas
        vertices: [
            { x:    0, y:  110, z:    0 }, // 0: Pico superior
            { x:    0, y: -110, z:    0 }, // 1: Pico inferior
            { x:  -90, y:    0, z:    0 }, // 2: Izquierda
            { x:   90, y:    0, z:    0 }, // 3: Derecha
            { x:    0, y:    0, z:  -90 }, // 4: Atrás
            { x:    0, y:    0, z:   90 }  // 5: Frente
        ],
        aristas: [
            [0,2], [0,3], [0,4], [0,5], // Conectados al pico superior
            [1,2], [1,3], [1,4], [1,5], // Conectados al pico inferior
            [2,4], [4,3], [3,5], [5,2]  // Anillo ecuatorial
        ]
    }
};

// Referencias de interfaz
const selectorFigura = document.getElementById('selectorFigura');
const inputRotX = document.getElementById('rotX');
const inputRotY = document.getElementById('rotY');
const inputRotZ = document.getElementById('rotZ');
const inputEscala = document.getElementById('escala');
const inputTransZ = document.getElementById('transZ');

const valRotX = document.getElementById('valRotX');
const valRotY = document.getElementById('valRotY');
const valRotZ = document.getElementById('valRotZ');
const valEscala = document.getElementById('valEscala');
const valTransZ = document.getElementById('valTransZ');

const btnAutoRotacion = document.getElementById('btnAutoRotacion');

let figuraActual = 'cubo';
let autoRotando = false;
let anguloYAnimacion = 0;
let animationId = null;

function transformarVertice3D(v, rx, ry, rz, escala, transZ) {
    let x = v.x * escala;
    let y = v.y * escala;
    let z = v.z * escala;

    // Rotación X
    let radX = rx * Math.PI / 180;
    let y1 = y * Math.cos(radX) - z * Math.sin(radX);
    let z1 = y * Math.sin(radX) + z * Math.cos(radX);
    let x1 = x;

    // Rotación Y
    let radY = ry * Math.PI / 180;
    let x2 = x1 * Math.cos(radY) + z1 * Math.sin(radY);
    let z2 = -x1 * Math.sin(radY) + z1 * Math.cos(radY);
    let y2 = y1;

    // Rotación Z
    let radZ = rz * Math.PI / 180;
    let x3 = x2 * Math.cos(radZ) - y2 * Math.sin(radZ);
    let y3 = x2 * Math.sin(radZ) + y2 * Math.cos(radZ);
    let z3 = z2 + transZ;

    return { x: x3, y: y3, z: z3 };
}

function proyectar3Da2D(v3d) {
    const factorProyeccion = distanciaCamara / (distanciaCamara + v3d.z);
    const x2d = CENTRO_X + (v3d.x * factorProyeccion);
    const y2d = CENTRO_Y - (v3d.y * factorProyeccion); // Inversión del eje Y
    return { x: x2d, y: y2d, escalaProj: factorProyeccion };
}

function renderizar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let rx = parseFloat(inputRotX.value);
    let ry = autoRotando ? anguloYAnimacion : parseFloat(inputRotY.value);
    let rz = parseFloat(inputRotZ.value);
    let escala = parseFloat(inputEscala.value);
    let transZ = parseFloat(inputTransZ.value);

    valRotX.textContent = rx;
    valRotY.textContent = Math.round(ry);
    valRotZ.textContent = rz;
    valEscala.textContent = escala;
    valTransZ.textContent = transZ;

    if (autoRotando) {
        inputRotY.value = Math.round(ry) % 360;
    }

    const modelo = modelos3D[figuraActual];
    let verticesTransformados = modelo.vertices.map(v => 
        transformarVertice3D(v, rx, ry, rz, escala, transZ)
    );
    let verticesProyectados = verticesTransformados.map(v => proyectar3Da2D(v));

    // Dibujar aristas con grosor dinámico
    ctx.strokeStyle = '#38f885';
    modelo.aristas.forEach(arista => {
        let p1 = verticesProyectados[arista[0]];
        let p2 = verticesProyectados[arista[1]];
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineWidth = Math.max(1, 3 * p1.escalaProj);
        ctx.stroke();
    });

    // Dibujar vértices estilizados
    verticesProyectados.forEach((p, index) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#facc15';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
    });
}

function loopAnimacion() {
    if (autoRotando) {
        anguloYAnimacion = (anguloYAnimacion + 1.5) % 360;
        renderizar();
        animationId = requestAnimationFrame(loopAnimacion);
    }
}

// Event Listeners
selectorFigura.addEventListener('change', (e) => {
    figuraActual = e.target.value;
    renderizar();
});

[inputRotX, inputRotY, inputRotZ, inputEscala, inputTransZ].forEach(input => {
    input.addEventListener('input', () => {
        if (!autoRotando) renderizar();
    });
});

btnAutoRotacion.addEventListener('click', () => {
    autoRotando = !autoRotando;
    if (autoRotando) {
        btnAutoRotacion.textContent = "Detener Auto-Rotación";
        btnAutoRotacion.classList.add('btn-active');
        anguloYAnimacion = parseFloat(inputRotY.value);
        loopAnimacion();
    } else {
        btnAutoRotacion.textContent = "Iniciar Auto-Rotación (Y)";
        btnAutoRotacion.classList.remove('btn-active');
        cancelAnimationFrame(animationId);
    }
});

renderizar();