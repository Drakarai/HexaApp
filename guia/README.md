# La guía de uso en PDF

La guía que se reparte a los jugadores. **Aquí vive el original**: el texto
está en `guia.html` y el PDF se genera a partir de él con las fotos de la
aplicación funcionando.

Está en el repositorio porque una vez se perdió y hubo que rehacerla entera.
Lo que **no** se guarda aquí son las fotos ni el PDF (`img/` y `*.pdf` están
ignorados): pesan trece megas entre las dos cosas y se vuelven a sacar en
cinco minutos con los tres pasos de abajo.

## Cómo rehacerla

Con la base de datos **recién sembrada** y la aplicación levantada:

```bash
npm run db:seed          # los datos de ejemplo del Hexalocke 2
npm run build && npm run start

node guia/datos.mjs      # 1. prepara la partida de ejemplo
node guia/capturas.mjs   # 2. saca las fotos a guia/img
node guia/pdf.mjs        # 3. arma guia/HexaApp-guia-de-uso.pdf
```

`datos.mjs` **no se puede pasar dos veces**: rellena los mapas, apunta
capturas, bajas, gimnasios, una nota, un reto, objetos y la primera jornada
entera, y repetirlo lo duplicaría todo. Si algo sale torcido, vuelve a sembrar
la base de datos y empieza de nuevo.

Los tres usan Playwright con el Chromium del sistema. Si el tuyo está en otro
sitio, `PLAYWRIGHT_CHROMIUM=/ruta/al/chromium node guia/…`. Lo mismo con
`GUIA_URL` si la aplicación no está en `localhost:3000`.

## Cómo se cambia el texto

`guia.html` es una hoja por `<section class="pagina">`, con el tamaño de un A4
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

## Al añadir algo a la aplicación

Si la novedad cambia algo que sale en la guía, toca actualizarla también: el
texto en `guia.html` y, si la pantalla ha cambiado de aspecto, volver a sacar
las fotos.
