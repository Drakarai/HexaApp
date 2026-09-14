/**
 * Los números del sorteo de préstamos.
 *
 * Viven aquí y no en `app/actions/sorteos.ts` porque un fichero `"use server"`
 * solo puede exportar funciones: si exporta una constante, Next se queda sin
 * exportaciones y la pantalla entera deja de compilar.
 */

/** Un equipo son seis, así que eso es lo que cabe por persona. */
export const POR_PERSONA = 6;
/** De dos a seis personas en un reparto, de momento. */
export const MINIMO_DE_GENTE = 2;
export const MAXIMO_DE_GENTE = 6;
