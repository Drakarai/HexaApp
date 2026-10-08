/**
 * Confeti para los momentos grandes: pasarse la Liga y entrar en el Hall de la
 * Fama. Hecho a mano sobre un lienzo que se pone encima de todo y se quita solo
 * al acabar, sin librerías: son cuarenta líneas y no hacía falta otra
 * dependencia.
 *
 * Sale disparado desde las dos esquinas de abajo, como un cañón de fiesta, con
 * los colores del tema de cada uno y oro. Quien tiene pedido en su móvil
 * «reducir movimiento» no lo ve.
 */
export function lanzarConfeti(cantidad = 160) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const lienzo = document.createElement("canvas");
  lienzo.setAttribute("aria-hidden", "true");
  Object.assign(lienzo.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    // Por encima de la entrada al Hall, que ya va sobre todo lo demás
    zIndex: "90",
  });
  document.body.appendChild(lienzo);

  const ancho = window.innerWidth;
  const alto = window.innerHeight;
  const densidad = Math.min(window.devicePixelRatio || 1, 2);
  lienzo.width = ancho * densidad;
  lienzo.height = alto * densidad;
  const ctx = lienzo.getContext("2d");
  if (!ctx) {
    lienzo.remove();
    return;
  }
  ctx.scale(densidad, densidad);

  const estilo = getComputedStyle(document.documentElement);
  const colores = [
    ...["--color-brand-400", "--color-brand-500"].map((v) => estilo.getPropertyValue(v).trim()).filter(Boolean),
    "#fbbf24",
    "#fde68a",
    "#ffffff",
    "#f472b6",
  ];

  const piezas = Array.from({ length: cantidad }, (_, i) => {
    const izquierda = i % 2 === 0;
    // Hacia arriba y hacia dentro, con algo de abanico
    const angulo = ((izquierda ? -62 : -118) + (Math.random() * 34 - 17)) * (Math.PI / 180);
    const fuerza = alto * (0.018 + Math.random() * 0.014);
    return {
      x: izquierda ? 0 : ancho,
      y: alto * 0.9,
      vx: Math.cos(angulo) * fuerza,
      vy: Math.sin(angulo) * fuerza,
      giro: Math.random() * Math.PI,
      vgiro: (Math.random() - 0.5) * 0.35,
      ancho: 6 + Math.random() * 6,
      alto: 3 + Math.random() * 4,
      color: colores[Math.floor(Math.random() * colores.length)],
      redondo: Math.random() < 0.25,
    };
  });

  const DURA = 3400;
  const inicio = performance.now();
  function cuadro(ahora: number) {
    const pasado = ahora - inicio;
    ctx!.clearRect(0, 0, ancho, alto);
    // Se desvanece en el último segundo, en vez de cortarse de golpe
    ctx!.globalAlpha = Math.max(0, Math.min(1, (DURA - pasado) / 1000));
    for (const p of piezas) {
      p.vy += alto * 0.0006;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.giro += p.vgiro;
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.giro);
      ctx!.fillStyle = p.color;
      if (p.redondo) {
        ctx!.beginPath();
        ctx!.arc(0, 0, p.alto, 0, Math.PI * 2);
        ctx!.fill();
      } else {
        // El coseno del giro lo estrecha: parece que da vueltas en el aire
        ctx!.fillRect(-p.ancho / 2, -p.alto / 2, p.ancho, p.alto * Math.abs(Math.cos(p.giro * 2)));
      }
      ctx!.restore();
    }
    if (pasado < DURA) requestAnimationFrame(cuadro);
    else lienzo.remove();
  }
  requestAnimationFrame(cuadro);
}
