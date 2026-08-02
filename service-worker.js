/*
=========================================================
TRADING ANALYST PRO MR
Archivo: service-worker.js

Versión de caché:
9.1.2

Todos los archivos están en la carpeta principal.
=========================================================
*/

const NOMBRE_CACHE =
  "trading-analyst-pro-mr-9.1.2";


const ARCHIVOS = [
  "./",
  "./index.html",
  "./style.css?v=9.1.2",
  "./app.js?v=9.1.2",
  "./deriv-api.js",
  "./indicators.js",
  "./prediction.js",
  "./monitor.js",
  "./voice.js",
  "./manifest.webmanifest?v=9.1.2",
  "./icon.svg?v=9.1.2"
];


/* =====================================================
INSTALACIÓN
===================================================== */

self.addEventListener(
  "install",
  (evento) => {
    evento.waitUntil(
      caches
        .open(NOMBRE_CACHE)
        .then(
          (cache) =>
            cache.addAll(
              ARCHIVOS
            )
        )
        .then(
          () =>
            self.skipWaiting()
        )
    );
  }
);


/* =====================================================
ACTIVACIÓN
===================================================== */

self.addEventListener(
  "activate",
  (evento) => {
    evento.waitUntil(
      caches
        .keys()
        .then(
          (nombres) =>
            Promise.all(
              nombres
                .filter(
                  (nombre) =>
                    nombre !==
                    NOMBRE_CACHE
                )
                .map(
                  (nombre) =>
                    caches.delete(
                      nombre
                    )
                )
            )
        )
        .then(
          () =>
            self.clients.claim()
        )
    );
  }
);


/* =====================================================
SOLICITUDES
===================================================== */

self.addEventListener(
  "fetch",
  (evento) => {
    if (
      evento.request.method !==
      "GET"
    ) {
      return;
    }

    evento.respondWith(
      fetch(
        evento.request
      )
        .then(
          (respuesta) => {
            const copia =
              respuesta.clone();

            caches
              .open(
                NOMBRE_CACHE
              )
              .then(
                (cache) =>
                  cache.put(
                    evento.request,
                    copia
                  )
              );

            return respuesta;
          }
        )
        .catch(
          () =>
            caches.match(
              evento.request
            )
        )
    );
  }
);
