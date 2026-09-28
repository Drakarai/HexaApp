/**
 * Se carga antes de las pruebas. `server-only` no es un paquete instalado: lo
 * pone Next al compilar, para que un módulo del servidor no acabe en el
 * navegador. Fuera de Next no existe, así que aquí se cambia por un módulo
 * vacío; lo que se prueba es la cuenta, no dónde corre.
 */
const Module = require("node:module");
const path = require("node:path");

const original = Module._resolveFilename;
Module._resolveFilename = function (peticion, ...resto) {
  if (peticion === "server-only") return path.join(__dirname, "vacio.cjs");
  return original.call(this, peticion, ...resto);
};
