/**
 * Lo que envuelve cada pantalla, y que Next **vuelve a montar al cambiar de
 * sección** (el layout no: el menú y la cabecera se quedan quietos). Sirve para
 * la transición: cada bloque de la pantalla nueva entra con un fundido y un
 * pequeño desplazamiento, escalonado, en vez de aparecer de golpe. Es CSS puro
 * (`.entrada-de-pantalla` en globals.css); también lo hace la pantalla de
 * carga y, al llegar los datos, la página de verdad, porque son bloques nuevos.
 */
export default function Plantilla({ children }: { children: React.ReactNode }) {
  return <div className="entrada-de-pantalla">{children}</div>;
}
