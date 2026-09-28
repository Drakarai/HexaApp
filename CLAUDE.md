# Instrucciones para Claude en este repositorio

## Antes de nada

Lee **`PROYECTO.md`**. Contiene el contexto completo: qué es la aplicación, qué
decisiones se tomaron y por qué, cómo está organizado el código y qué queda
pendiente. Está escrito precisamente para que una sesión nueva se ponga al día
sin que el usuario tenga que explicar nada.

## Regla permanente

**Actualiza `PROYECTO.md` en el mismo commit en el que hagas cambios.** El
usuario lo pidió expresamente para que el proyecto sobreviva a la pérdida del
chat. Según lo que toques:

- Funcionalidad nueva o cambiada → la tabla del apartado 2 y, si hubo una
  decisión de diseño con su porqué, el apartado 3.
- Cambios de estructura o piezas con truco → el apartado 5.
- Algo que se termina o que se acuerda dejar para después → el apartado 6.
- Un hito grande → una línea en la cronología del apartado 8.
- Cambia siempre la fecha de "Última actualización".

No hace falta narrar cada retoque: el documento es un mapa, no un diario.

## Convenciones

- **Todo en español**: interfaz, mensajes de error, comentarios del código,
  mensajes de commit y respuestas al usuario.
- Los comentarios explican **por qué**, no qué hace la línea de al lado.
- Los textos de la interfaz son directos y con el tono del locke, sin
  solemnidad.

## Técnico

- Next.js (App Router, Server Actions), React, TypeScript, Tailwind 4,
  Prisma sobre PostgreSQL.
- En `globals.css` las clases propias se declaran con `@utility`: en Tailwind 4
  no se pueden componer con `@apply` de otra forma.
- Los permisos se comprueban **en el servidor**, dentro de cada server action;
  ocultar un botón no es una comprobación.
- Las notas se consultan y se borran siempre filtrando por `authorId`.
- Las imágenes se reducen en el navegador y se guardan como data URL.
- Verifica los cambios de verdad antes de darlos por buenos: `npm run build` y,
  cuando afecte a la interfaz, arrancar la aplicación y probarla.
- `npm test` prueba las reglas del locke y va dentro del build: si tocas una
  regla, actualiza o añade su caso en `tests/`.

## Al terminar

Commit y push a la rama de trabajo. Cada push a la rama principal se publica
solo en Vercel, así que lo que se sube va directo a producción.
