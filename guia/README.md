# Las guías en PDF

Las guías que se reparten. **Aquí viven los originales**: el texto está en
`guia.html` (la de todos) y `guia-admin.html` (la de quien lleva un locke), y
los PDF se generan a partir de ellos con fotos de la aplicación funcionando.

El estilo lo comparten en `estilo.css`, así que las dos salen idénticas: tocar
un margen ahí las cambia a la vez.

Está en el repositorio porque una vez se perdió y hubo que rehacerla entera.
Las fotos (`img/`) **no** se guardan: pesan tres megas y se vuelven a sacar en
cinco minutos. El PDF sí, pero en **`public/guia-de-uso.pdf`**, porque es el
que descarga el apartado *Guía de uso* de la aplicación y tiene que viajar con
el despliegue. Por eso las capturas se sacan en JPEG: en PNG el PDF se iba a
cinco megas.

## Cómo rehacerla

Con la base de datos **recién sembrada** y la aplicación levantada:

```bash
npm run db:seed          # los datos de ejemplo del Hexalocke 2
npm run build && npm run start

node guia/datos.mjs      # 1. prepara la partida de ejemplo
node guia/capturas.mjs   # 2. saca las fotos a guia/img
node guia/pdf.mjs        # 3. arma los dos PDF de public/
```

`pdf.mjs` sin argumentos hace las dos; con `uso` o `admin`, solo esa.

`datos.mjs` **no se puede pasar dos veces**: rellena los mapas, apunta
capturas, bajas, gimnasios, una nota, un reto, objetos y la primera jornada
entera, y repetirlo lo duplicaría todo. Si algo sale torcido, vuelve a sembrar
la base de datos y empieza de nuevo.

Los tres usan Playwright con el Chromium del sistema. Si el tuyo está en otro
sitio, `PLAYWRIGHT_CHROMIUM=/ruta/al/chromium node guia/…`. Lo mismo con
`GUIA_URL` si la aplicación no está en `localhost:3000`.

## Cómo se cambia el texto

Cada guía es una hoja por `<section class="pagina">`, con el tamaño de un A4
y **lo que sobra se recorta**. Por eso `pdf.mjs` avisa al final de las páginas
que se han quedado largas: si sale ese aviso, quita un párrafo o baja una foto
de tamaño, no lo dejes pasar.

Las clases que se usan:

| Clase | Para qué |
|---|---|
| `.fila` | texto a la izquierda y un móvil a la derecha |
| `.duo` | dos móviles uno al lado del otro |
| `.ancha` | una foto de ordenador a todo lo ancho |
| `ol.pasos` | los pasos numerados con su bolita |
| `.aviso` / `.aviso.ojo` | el recuadro de nota y el de ojo con esto |

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
