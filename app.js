/*
=========================================================
TRADING ANALYST PRO MR
APP DE DIAGNÓSTICO DE CONEXIÓN
=========================================================
*/

const botonConectar =
  document.getElementById("botonConectar");

const botonDesconectar =
  document.getElementById("botonDesconectar");

const botonEncenderMotor =
  document.getElementById("botonEncenderMotor");

const botonPrediccion =
  document.getElementById("botonPrediccion");

const selectorMercado =
  document.getElementById("selectorMercado");

const estadoConexion =
  document.getElementById("estadoConexion");

const textoEstadoConexion =
  document.getElementById("textoEstadoConexion");

const precioActual =
  document.getElementById("precioActual");

const contadorTicks =
  document.getElementById("contadorTicks");

const ultimoDigito =
  document.getElementById("ultimoDigito");

const horaActualizacion =
  document.getElementById("horaActualizacion");

const estadoDatos =
  document.getElementById("estadoDatos");

const estadoMemoria =
  document.getElementById("estadoMemoria");

const nombreMercado =
  document.getElementById("nombreMercado");

const listaUltimosDigitos =
  document.getElementById("listaUltimosDigitos");

const registroActividad =
  document.getElementById("registroActividad");

const mensajeControl =
  document.getElementById("mensajeControl");


const URL_DERIV =
  "wss://ws.derivws.com/websockets/v3?app_id=1089";


const NOMBRES_MERCADOS = {
  "1HZ10V": "Volatility 10 (1s) Index",
  "1HZ25V": "Volatility 25 (1s) Index",
  "1HZ50V": "Volatility 50 (1s) Index",
  "1HZ75V": "Volatility 75 (1s) Index",
  "1HZ100V": "Volatility 100 (1s) Index",
  "R_10": "Volatility 10 Index",
  "R_25": "Volatility 25 Index",
  "R_50": "Volatility 50 Index",
  "R_75": "Volatility 75 Index",
  "R_100": "Volatility 100 Index"
};


let socket = null;
let idSuscripcion = null;
let cantidadTicks = 0;
let digitos = [];


/* =====================================================
UTILIDADES
===================================================== */

function establecerTexto(elemento, texto) {
  if (elemento) {
    elemento.textContent = String(texto);
  }
}


function registrar(mensaje, tipo = "") {
  if (!registroActividad) {
    return;
  }

  const linea =
    document.createElement("p");

  linea.textContent =
    `[${new Date().toLocaleTimeString("es-SV")}] ${mensaje}`;

  if (tipo) {
    linea.className = tipo;
  }

  registroActividad.prepend(linea);
}


function cambiarEstado(estado, texto) {
  establecerTexto(
    textoEstadoConexion,
    texto
  );

  if (estadoConexion) {
    estadoConexion.className =
      `status-pill ${estado}`;
  }

  if (botonConectar) {
    botonConectar.disabled =
      estado === "connecting" ||
      estado === "live";
  }

  if (botonDesconectar) {
    botonDesconectar.disabled =
      estado !== "live";
  }

  if (botonEncenderMotor) {
    botonEncenderMotor.disabled =
      estado !== "live";
  }
}


function obtenerUltimoDigito(
  precio,
  decimales
) {
  const texto =
    Number(precio).toFixed(decimales);

  const coincidencia =
    texto.match(/(\d)(?!.*\d)/);

  return coincidencia
    ? Number(coincidencia[1])
    : null;
}


function mostrarDigitos() {
  if (!listaUltimosDigitos) {
    return;
  }

  listaUltimosDigitos.innerHTML = "";

  digitos.slice(-20).forEach(
    (digito, indice, lista) => {
      const elemento =
        document.createElement("span");

      elemento.className =
        "digit";

      if (
        indice ===
        lista.length - 1
      ) {
        elemento.classList.add(
          "current"
        );
      }

      elemento.textContent =
        String(digito);

      listaUltimosDigitos.appendChild(
        elemento
      );
    }
  );
}


/* =====================================================
CONEXIÓN
===================================================== */

function conectar() {
  const simbolo =
    selectorMercado?.value ||
    "1HZ100V";

  if (
    socket &&
    (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    )
  ) {
    registrar(
      "Ya existe una conexión activa.",
      "warn"
    );

    return;
  }

  cambiarEstado(
    "connecting",
    "CONNECTING"
  );

  establecerTexto(
    mensajeControl,
    `Conectando con ${NOMBRES_MERCADOS[simbolo]}...`
  );

  registrar(
    `Intentando conectar con ${simbolo}.`
  );

  try {
    socket =
      new WebSocket(URL_DERIV);
  } catch (error) {
    cambiarEstado(
      "offline",
      "OFFLINE"
    );

    registrar(
      `No se pudo crear el WebSocket: ${error.message}`,
      "error"
    );

    return;
  }


  socket.onopen = () => {
    cambiarEstado(
      "live",
      "LIVE"
    );

    establecerTexto(
      mensajeControl,
      "Conectado. Recibiendo precios en tiempo real."
    );

    registrar(
      "WebSocket conectado correctamente.",
      "ok"
    );

    socket.send(
      JSON.stringify({
        ticks: simbolo,
        subscribe: 1
      })
    );
  };


  socket.onmessage = evento => {
    let datos;

    try {
      datos =
        JSON.parse(evento.data);
    } catch (error) {
      registrar(
        "No se pudo interpretar una respuesta.",
        "error"
      );

      return;
    }


    if (datos.error) {
      registrar(
        `Deriv: ${datos.error.message}`,
        "error"
      );

      return;
    }


    if (datos.subscription?.id) {
      idSuscripcion =
        datos.subscription.id;
    }


    if (!datos.tick) {
      return;
    }


    const precio =
      Number(datos.tick.quote);

    const decimales =
      Number.isInteger(
        Number(datos.tick.pip_size)
      )
        ? Number(datos.tick.pip_size)
        : 2;

    const digito =
      obtenerUltimoDigito(
        precio,
        decimales
      );


    cantidadTicks++;

    if (Number.isInteger(digito)) {
      digitos.push(digito);

      if (digitos.length > 100) {
        digitos.shift();
      }
    }


    establecerTexto(
      precioActual,
      precio.toFixed(decimales)
    );

    establecerTexto(
      contadorTicks,
      cantidadTicks
    );

    establecerTexto(
      ultimoDigito,
      Number.isInteger(digito)
        ? digito
        : "--"
    );

    establecerTexto(
      horaActualizacion,
      new Date(
        Number(datos.tick.epoch) * 1000
      ).toLocaleTimeString("es-SV")
    );

    establecerTexto(
      estadoDatos,
      "LIVE DATA"
    );

    establecerTexto(
      estadoMemoria,
      cantidadTicks
    );

    mostrarDigitos();
  };


  socket.onerror = () => {
    registrar(
      "El navegador informó un error de WebSocket.",
      "error"
    );
  };


  socket.onclose = evento => {
    cambiarEstado(
      "offline",
      "OFFLINE"
    );

    establecerTexto(
      mensajeControl,
      "La conexión fue cerrada."
    );

    registrar(
      `Conexión cerrada. Código ${evento.code}.`,
      "warn"
    );

    socket = null;
    idSuscripcion = null;
  };
}


function desconectar() {
  if (
    socket &&
    socket.readyState === WebSocket.OPEN &&
    idSuscripcion
  ) {
    socket.send(
      JSON.stringify({
        forget: idSuscripcion
      })
    );
  }

  if (socket) {
    socket.close(
      1000,
      "Cierre manual"
    );
  }

  socket = null;
  idSuscripcion = null;

  cambiarEstado(
    "offline",
    "OFFLINE"
  );

  establecerTexto(
    mensajeControl,
    "Herramienta desconectada."
  );
}


/* =====================================================
CAMBIO DE MERCADO
===================================================== */

function cambiarMercado() {
  const simbolo =
    selectorMercado?.value ||
    "1HZ100V";

  establecerTexto(
    nombreMercado,
    NOMBRES_MERCADOS[simbolo]
  );

  cantidadTicks = 0;
  digitos = [];

  establecerTexto(
    precioActual,
    "--"
  );

  establecerTexto(
    contadorTicks,
    "0"
  );

  establecerTexto(
    ultimoDigito,
    "--"
  );

  mostrarDigitos();

  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {
    desconectar();

    setTimeout(
      conectar,
      500
    );
  }
}


/* =====================================================
EVENTOS
===================================================== */

if (botonConectar) {
  botonConectar.addEventListener(
    "click",
    conectar
  );
}


if (botonDesconectar) {
  botonDesconectar.addEventListener(
    "click",
    desconectar
  );
}


if (selectorMercado) {
  selectorMercado.addEventListener(
    "change",
    cambiarMercado
  );
}


/* =====================================================
INICIO
===================================================== */

cambiarEstado(
  "offline",
  "OFFLINE"
);

cambiarMercado();

establecerTexto(
  mensajeControl,
  "Versión de diagnóstico lista. Pulse CONNECT."
);

if (botonPrediccion) {
  botonPrediccion.disabled = true;
}

registrar(
  "APP DE DIAGNÓSTICO INICIADA.",
  "ok"
);
