/**
 * Las reglas de seguridad que no dependen de la base de datos, para poder
 * probarlas (`tests/seguridad.test.ts`): cuándo se frena a quien falla al
 * entrar y qué contraseñas valen.
 */

/**
 * Cuántos fallos se toleran **en la ventana** antes de frenar. Por cuenta,
 * pocos: nadie se equivoca cinco veces seguidas con su propia contraseña. Por
 * red, más, porque detrás de la wifi de una casa o de un bar puede haber
 * varios jugadores entrando a la vez.
 */
export const LIMITES_DE_ENTRADA = {
  ventanaMinutos: 15,
  porUsuario: 5,
  porRed: 20,
} as const;

/**
 * Cuántos minutos hay que esperar para volver a probar, o 0 si se puede ya.
 * Se espera hasta que el fallo más viejo de los que cuentan sale de la
 * ventana: así no hay que esperar la ventana entera desde el último intento.
 */
export function minutosDeEspera({
  fallosDelUsuario,
  fallosDeLaRed,
  ahora,
}: {
  /** Fechas de los fallos de esa cuenta dentro de la ventana */
  fallosDelUsuario: Date[];
  /** Y los de esa red */
  fallosDeLaRed: Date[];
  ahora: Date;
}) {
  const ventana = LIMITES_DE_ENTRADA.ventanaMinutos * 60_000;
  const espera = (fallos: Date[], limite: number) => {
    const recientes = fallos
      .filter((f) => ahora.getTime() - f.getTime() < ventana)
      .sort((a, b) => b.getTime() - a.getTime());
    if (recientes.length < limite) return 0;
    // El que hace `limite` contando desde el último: cuando salga, se vuelve a poder
    const decisivo = recientes[limite - 1];
    return Math.max(1, Math.ceil((decisivo.getTime() + ventana - ahora.getTime()) / 60_000));
  };
  return Math.max(
    espera(fallosDelUsuario, LIMITES_DE_ENTRADA.porUsuario),
    espera(fallosDeLaRed, LIMITES_DE_ENTRADA.porRed),
  );
}

export const CONTRASENA_MINIMA = 8;

/**
 * Las que se prueban primero. No pretende ser una lista completa: solo que
 * nadie se quede con la que todo el mundo adivina.
 */
const DEMASIADO_CONOCIDAS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "87654321",
  "11111111",
  "00000000",
  "password",
  "password1",
  "contraseña",
  "contrasena",
  "qwertyui",
  "qwerty123",
  "abcd1234",
  "pokemon1",
  "pokemon123",
  "pikachu1",
  "nuzlocke",
  "hexaapp1",
]);

/** Qué tiene de malo una contraseña nueva, o null si vale. */
export function problemaDeContrasena(contrasena: string, usuario = "") {
  if (contrasena.length < CONTRASENA_MINIMA) {
    return `La contraseña tiene que tener al menos ${CONTRASENA_MINIMA} caracteres.`;
  }
  if (contrasena.length > 200) return "Esa contraseña es demasiado larga.";
  const normal = contrasena.toLowerCase();
  // Con un usuario corto («ana») no: saldría en contraseñas que no tienen nada que ver
  const suyo = usuario.toLowerCase();
  if (suyo && (normal === suyo || (suyo.length >= 4 && normal.includes(suyo)))) {
    return "La contraseña no puede llevar dentro el nombre de usuario.";
  }
  if (DEMASIADO_CONOCIDAS.has(normal) || /^(.)\1+$/.test(contrasena)) {
    return "Esa contraseña es de las primeras que se prueban. Elige otra.";
  }
  return null;
}
