import { redirect } from "next/navigation";

/**
 * Donde vivía Equipo y PC cuando era solo del Soul Link. Ahora está en
 * /equipo, que sirve para todos los lockes; esto es para los enlaces viejos.
 */
export default function AntesSoulLink() {
  redirect("/equipo");
}
