/**
 * Qué se puede copiar de una edición a otra.
 *
 * Vive aquí y no en la acción porque **un fichero `"use server"` solo puede
 * exportar funciones async**: una constante ahí dentro deja el módulo sin
 * exportar nada y el error que sale no lo dice.
 */
export const COPIABLE = {
  REGLAS: "reglas",
  LEVEL_CAPS: "levelCaps",
  AJUSTES: "ajustes",
} as const;
