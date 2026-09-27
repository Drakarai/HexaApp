# Las guías en PDF

Las guías que se reparten. **Aquí viven los originales**: el texto está en
`guia.html` (la de todos) y `guia-admin.html` (la de quien lleva un locke), y
los PDF se generan a partir de ellos con fotos de la aplicación funcionando.

El estilo lo comparten en `estilo.css`, así que las dos salen idénticas: tocar
un margen ahí las cambia a la vez.

Está en el repositorio porque una vez se perdió y hubo que rehacerla entera.
Las fotos (`img/`) **no** se guardan: pesan unos megas y se vuelven a sacar en
cinco minutos. Los PDF sí, en **`public/guia-de-uso.pdf`** y
**`public/guia-de-administrador.pdf`**, porque son los que descarga el apartado
*Guía de uso* de la aplicación y tienen que viajar con el despliegue. Por eso
las capturas van en JPEG comprimido con mozjpeg: en PNG el PDF se iba a cinco
megas.

Van con el **aspecto de ahora** de la aplicación: las mismas letras, que se
leen de `node_modules/@fontsource` (hace falta haber hecho `npm install`), y
los mismos iconos.

## Cómo rehacerla

Con una base de datos **recién sembrada** y la aplicación levantada contra
ella. Mejor una aparte, para no tocar la de trabajo (y nunca con
`--force-reset` sobre la que tiene cosas):

```bash
createdb hexaapp_guia    # o CREATE DATABASE desde psql
export DATABASE_URL=postgresql://…/hexaapp_guia DIRECT_URL=postgresql://…/hexaapp_guia
npx prisma db push --skip-generate
npm run db:seed          # los datos de ejemplo del Hexalocke 2
npm run build && npm run start

node guia/datos.mjs      # 1. prepara la partida de ejemplo
pg_dump -Fc "$DATABASE_URL" -f guia-datos.dump   # por si hay que repetir
node guia/capturas.mjs   # 2. saca las fotos a guia/img
node guia/pdf.mjs        # 3. arma los dos PDF de public/
```

`pdf.mjs` sin argumentos hace las dos; con `uso` o `admin`, solo esa. Con
`GUIA_VISTAS=/una/carpeta` deja además una foto de cada hoja, para repasarlas
sin abrir el PDF.

`datos.mjs` **no se puede pasar dos veces**: elige el juego y sube el logo de
la edición (`logo-ejemplo.svg`), rellena los mapas, apunta capturas, bajas y
gimnasios —en un orden que reparte las coronas—, cambia una regla, deja una
nota, un reto, objetos y **las dos primeras jornadas** enteras (con una sola no
salen las flechas de la clasificación), y repetirlo lo duplicaría todo. Si algo
sale torcido, vuelve a sembrar la base de datos y empieza de nuevo.

`capturas.mjs` sí se puede repetir, pero **las fotos de las reglas solo salen
bien la primera vez**: enseñan la regla cambiada tal y como la ve Héctor antes de
mirarla, y al sacarlas queda vista. Para repetirlas, restaura la copia que
hiciste después de `datos.mjs` (`pg_restore --clean --if-exists -d …`).

Los tres usan Playwright con el Chromium del sistema. Si el tuyo está en otro
sitio, `PLAYWRIGHT_CHROMIUM=/ruta/al/chromium node guia/…`. Lo mismo con
`GUIA_URL` si la aplicación no está en `localhost:3000`.

## Cómo se cambia el texto

Cada guía es una hoja por `<section class="pagina">`, con el tamaño de un A4
y **lo que sobra se recorta**. Por eso `pdf.mjs` avisa al final de las páginas
que se han quedado largas o que se meten debajo del pie: si sale ese aviso,
quita un párrafo o pasa las fotos a `.duo.compacta`, no lo dejes pasar.

Las clases que se usan:

| Clase | Para qué |
|---|---|
| `.fila` | texto a la izquierda y un móvil a la derecha |
| `.duo` | dos móviles uno al lado del otro |
| `.ancha` | una foto de ordenador a todo lo ancho |
| `ol.pasos` | los pasos numerados con su bolita |
| `.aviso` / `.aviso.ojo` | el recuadro de nota y el de ojo con esto |
| `.tarjetas` / `.rejilla` | tarjetas en fila, o de dos en dos |
| `.chuleta` | la lista de iconos con su significado |
| `.indice .nuevo` | una entrada del índice con la marca de "Nuevo" |

**Los iconos** se escriben `<i data-i="Crown" class="oro"></i>`: el nombre es
el del icono en [lucide](https://lucide.dev/icons), el mismo que usa la app, y
`pdf.mjs` lo cambia por su dibujo al generar el PDF (por eso, abierto tal cual
en el navegador, el HTML sale sin iconos). Colores: `oro`, `rojo`, `verde`; con
`data-relleno`, relleno en vez de trazo.

Al terminar, **el PDF nuevo hay que subirlo al repositorio**: hasta que no se
despliega, la aplicación sigue sirviendo el anterior.

## Al añadir algo a la aplicación

Si la novedad cambia algo que sale en una guía, toca actualizarla también: el
texto en su `.html` y, si la pantalla ha cambiado de aspecto, volver a sacar las
fotos. Y si se añade o se mueve una página, **el índice y la cuenta de páginas**
del apartado *Guía de uso* (`src/app/(app)/guia/page.tsx`) están escritos a mano
y no se enteran solos.

Al decidir en cuál va lo nuevo: si lo hace cualquiera, en la de uso; si es de
llevar un locke —emparejar, anotar resultados, repartir premios—, en la del
administrador.
