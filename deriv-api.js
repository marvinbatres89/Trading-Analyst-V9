
/*
=========================================================
TRADING ANALYST PRO MR
Archivo: deriv-api.js

Conexión pública con Deriv:
- No utiliza cuenta ni token.
- Recibe ticks en tiempo real.
- Permite cambiar de mercado.
- Reconecta automáticamente.
=========================================================
*/

const URL_DERIV =
  "wss://ws.derivws.com/websockets/v3?app_id=1089";

const TIEMPO_RECONEXION_INICIAL = 1500;
const TIEMPO_RECONEXION_MAXIMO = 15000;
const INTERVALO_PING = 30000;
const TIEMPO_MAXIMO_CONEXION = 12000;


/* =====================================================
CLASE PRINCIPAL
===================================================== */

class DerivAPI {

  constructor() {
    this.socket = null;

    this.simboloActual =
      "1HZ100V";

    this.idSuscripcion = null;

    this.numeroSolicitud = 0;

    this.cierreManual = false;
    this.intentosReconexion = 0;

    this.temporizadorReconexion = null;
    this.temporizadorConexion = null;
    this.temporizadorPing = null;

    this.estadoActual = "offline";

    this.eventos = {
      estado: [],
      tick: [],
      error: [],
      diagnostico: []
    };
  }


  /* ===================================================
  EVENTOS
  =================================================== */

  al(tipoEvento, funcion) {
    if (
      !this.eventos[tipoEvento] ||
      typeof funcion !== "function"
    ) {
      return false;
    }

    if (
      !this.eventos[tipoEvento].includes(funcion)
    ) {
      this.eventos[tipoEvento].push(funcion);
    }

    return true;
  }


  quitar(tipoEvento, funcion) {
    if (!this.eventos[tipoEvento]) {
      return false;
    }

    this.eventos[tipoEvento] =
      this.eventos[tipoEvento].filter(
        registrada => registrada !== funcion
      );

    return true;
  }


  emitir(tipoEvento, datos = {}) {
    const funciones =
      this.eventos[tipoEvento] || [];

    funciones.forEach(funcion => {
      try {
        funcion(datos);
      } catch (error) {
        console.error(
          `Error en evento ${tipoEvento}:`,
          error
        );
      }
    });
  }


  diagnostico(mensaje, tipo = "normal") {
    this.emitir("diagnostico", {
      mensaje,
      tipo,
      fecha: Date.now()
    });
  }


  /* ===================================================
  ESTADO
  =================================================== */

  cambiarEstado(estado, texto) {
    this.estadoActual = estado;

    this.emitir("estado", {
      estado,
      texto
    });
  }


  estaConectado() {
    return Boolean(
      this.socket &&
      this.socket.readyState === WebSocket.OPEN
    );
  }


  /* ===================================================
  CONECTAR
  =================================================== */

  conectar(simbolo = this.simboloActual) {
    this.simboloActual =
      simbolo || "1HZ100V";

    this.cierreManual = false;

    if (
      this.socket &&
      (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      )
    ) {
      this.diagnostico(
        "Ya existe una conexión activa o en proceso."
      );

      return true;
    }

    this.abrirConexion();

    return true;
  }


  abrirConexion() {
    this.limpiarTemporizadorConexion();
    this.limpiarPing();

    this.cambiarEstado(
      "connecting",
      "CONNECTING"
    );

    this.diagnostico(
      `Abriendo conexión para ${this.simboloActual}.`
    );

    try {
      this.socket =
        new WebSocket(URL_DERIV);
    } catch (error) {
      this.manejarErrorConexion(error);
      return;
    }


    this.temporizadorConexion =
      setTimeout(() => {
        if (!this.estaConectado()) {
          this.diagnostico(
            "La conexión superó el tiempo permitido.",
            "error"
          );

          try {
            this.socket?.close();
          } catch (error) {
            console.warn(error);
          }
        }
      }, TIEMPO_MAXIMO_CONEXION);


    this.socket.onopen = () => {
      this.limpiarTemporizadorConexion();

      this.intentosReconexion = 0;

      this.cambiarEstado(
        "live",
        "LIVE"
      );

      this.diagnostico(
        "Conexión pública con Deriv establecida.",
        "exito"
      );

      this.iniciarPing();
      this.suscribirseATicks();
    };


    this.socket.onmessage = evento => {
      this.procesarMensaje(evento);
    };


    this.socket.onerror = evento => {
      this.emitir("error", {
        mensaje:
          "No fue posible establecer comunicación con Deriv.",
        evento
      });

      this.diagnostico(
        "Error del WebSocket de Deriv.",
        "error"
      );
    };


    this.socket.onclose = evento => {
      this.limpiarTemporizadorConexion();
      this.limpiarPing();

      this.socket = null;
      this.idSuscripcion = null;

      this.cambiarEstado(
        "offline",
        "OFFLINE"
      );

      this.diagnostico(
        `Conexión cerrada. Código: ${evento.code}.`,
        this.cierreManual
          ? "advertencia"
          : "error"
      );

      if (!this.cierreManual) {
        this.programarReconexion();
      }
    };
  }


  /* ===================================================
  ENVIAR
  =================================================== */

  enviar(datos) {
    if (!this.estaConectado()) {
      this.diagnostico(
        "No se puede enviar porque el WebSocket no está conectado.",
        "advertencia"
      );

      return false;
    }

    try {
      this.socket.send(
        JSON.stringify(datos)
      );

      return true;
    } catch (error) {
      this.emitir("error", {
        mensaje:
          "No fue posible enviar la solicitud a Deriv.",
        error
      });

      return false;
    }
  }


  /* ===================================================
  SUSCRIPCIÓN A TICKS
  =================================================== */

  suscribirseATicks() {
    if (!this.estaConectado()) {
      return false;
    }

    this.numeroSolicitud++;

    const solicitud = {
      ticks: this.simboloActual,
      subscribe: 1,
      req_id: this.numeroSolicitud
    };

    const enviado =
      this.enviar(solicitud);

    if (enviado) {
      this.diagnostico(
        `Solicitando ticks de ${this.simboloActual}.`
      );
    }

    return enviado;
  }


  olvidarSuscripcion() {
    if (
      !this.estaConectado() ||
      !this.idSuscripcion
    ) {
      this.idSuscripcion = null;
      return false;
    }

    const idAnterior =
      this.idSuscripcion;

    this.idSuscripcion = null;

    return this.enviar({
      forget: idAnterior
    });
  }


  /* ===================================================
  CAMBIAR MERCADO
  =================================================== */

  cambiarSimbolo(nuevoSimbolo) {
    if (
      typeof nuevoSimbolo !== "string" ||
      !nuevoSimbolo.trim()
    ) {
      return false;
    }

    const simbolo =
      nuevoSimbolo.trim();

    if (simbolo === this.simboloActual) {
      return true;
    }

    this.simboloActual = simbolo;

    this.diagnostico(
      `Mercado cambiado a ${simbolo}.`
    );

    if (this.estaConectado()) {
      this.olvidarSuscripcion();

      setTimeout(() => {
        if (this.estaConectado()) {
          this.suscribirseATicks();
        }
      }, 250);
    }

    return true;
  }


  /* ===================================================
  PROCESAR RESPUESTA
  =================================================== */

  procesarMensaje(evento) {
    let datos;

    try {
      datos =
        JSON.parse(evento.data);
    } catch (error) {
      this.diagnostico(
        "Deriv envió una respuesta que no se pudo interpretar.",
        "error"
      );

      return;
    }


    if (datos.error) {
      const mensaje =
        datos.error.message ||
        "Deriv devolvió un error.";

      this.emitir("error", {
        mensaje,
        codigo:
          datos.error.code || "",
        datos
      });

      this.diagnostico(
        `${datos.error.code || "ERROR"}: ${mensaje}`,
        "error"
      );

      return;
    }


    if (datos.subscription?.id) {
      this.idSuscripcion =
        datos.subscription.id;
    }


    if (datos.msg_type === "ping") {
      return;
    }


    if (
      datos.msg_type === "tick" &&
      datos.tick
    ) {
      const precio =
        Number(datos.tick.quote);

      const epoch =
        Number(datos.tick.epoch);

      const pipSize =
        Number.isInteger(
          Number(datos.tick.pip_size)
        )
          ? Number(datos.tick.pip_size)
          : this.calcularPipSize(
              datos.tick.quote
            );

      if (!Number.isFinite(precio)) {
        return;
      }

      this.emitir("tick", {
        simbolo:
          datos.tick.symbol ||
          this.simboloActual,

        precio,
        epoch:
          Number.isFinite(epoch)
            ? epoch
            : Math.floor(Date.now() / 1000),

        pipSize
      });
    }
  }


  calcularPipSize(valor) {
    const texto =
      String(valor);

    if (!texto.includes(".")) {
      return 0;
    }

    return texto
      .split(".")[1]
      .length;
  }


  /* ===================================================
  PING
  =================================================== */

  iniciarPing() {
    this.limpiarPing();

    this.temporizadorPing =
      setInterval(() => {
        if (this.estaConectado()) {
          this.enviar({
            ping: 1
          });
        }
      }, INTERVALO_PING);
  }


  limpiarPing() {
    if (this.temporizadorPing) {
      clearInterval(
        this.temporizadorPing
      );

      this.temporizadorPing = null;
    }
  }


  /* ===================================================
  RECONEXIÓN
  =================================================== */

  programarReconexion() {
    if (this.cierreManual) {
      return;
    }

    this.limpiarTemporizadorReconexion();

    this.intentosReconexion++;

    const espera =
      Math.min(
        TIEMPO_RECONEXION_MAXIMO,
        TIEMPO_RECONEXION_INICIAL *
        this.intentosReconexion
      );

    this.diagnostico(
      `Reintentando conexión en ${Math.round(espera / 1000)} segundos.`,
      "advertencia"
    );

    this.temporizadorReconexion =
      setTimeout(() => {
        if (!this.cierreManual) {
          this.abrirConexion();
        }
      }, espera);
  }


  limpiarTemporizadorReconexion() {
    if (this.temporizadorReconexion) {
      clearTimeout(
        this.temporizadorReconexion
      );

      this.temporizadorReconexion =
        null;
    }
  }


  limpiarTemporizadorConexion() {
    if (this.temporizadorConexion) {
      clearTimeout(
        this.temporizadorConexion
      );

      this.temporizadorConexion =
        null;
    }
  }


  manejarErrorConexion(error) {
    this.cambiarEstado(
      "offline",
      "OFFLINE"
    );

    this.emitir("error", {
      mensaje:
        error?.message ||
        "No fue posible crear la conexión.",
      error
    });

    this.programarReconexion();
  }


  /* ===================================================
  DESCONECTAR
  =================================================== */

  desconectar() {
    this.cierreManual = true;

    this.limpiarTemporizadorReconexion();
    this.limpiarTemporizadorConexion();
    this.limpiarPing();

    if (this.estaConectado()) {
      this.olvidarSuscripcion();
    }

    if (this.socket) {
      try {
        this.socket.close(
          1000,
          "Cierre manual"
        );
      } catch (error) {
        console.warn(error);
      }
    }

    this.socket = null;
    this.idSuscripcion = null;

    this.cambiarEstado(
      "offline",
      "OFFLINE"
    );

    return true;
  }
}


/* =====================================================
INSTANCIA PRINCIPAL
===================================================== */

export const derivAPI =
  new DerivAPI();
