"""
Los dibujos de lo que solo existe en Pokémon Añil: Royaleon, Cefireon y sus
formas y megas nuevas, y los objetos nuevos.

Uso:
    pip install pillow pyoxipng
    python scripts/anil-sprites.py "<carpeta Graphics del juego>"

La carpeta `Graphics` del juego tiene `Pokemon/` (Front, Front shiny, Icons,
Icons shiny) e `Items/`. Lee `src/lib/anil.json` y `scripts/anil-objetos.json`
(los saca `scripts/anil.py`) y escribe en `public/anil/`:

- `frente/<n>.png` (y `shiny/`): la tira animada, para la ficha. El shiny va
  como lista de colores si es el mismo dibujo, como los de
  `scripts/sprites-animados.py`.
- `quieto/<n>.png` (y `shiny/`): el primer fotograma, ya recortado, para las
  casillas. También va **dentro** de `src/lib/anil-quietos.json`, porque es lo
  que el servidor guarda como imagen de la captura y en el servidor no se
  puede contar con leer `public/`.
- `iconos/<n>.png` (y `shiny/`): el icono de caja, preparado como los de
  `scripts/iconos-de-caja.py`.
- `objetos/<slug>.png`: el dibujo de cada objeto nuevo.

Lo de los pokémon de siempre no se toca: Añil usa los mismos dibujos que el
paquete de Essentials (con otro ritmo de fotogramas), así que no compensa
duplicarlos.
"""

import base64
import importlib.util
import io
import json
import os
import sys

from PIL import Image

AQUI = os.path.dirname(__file__)
SALIDA = os.path.join(AQUI, "..", "public", "anil")
LIB = os.path.join(AQUI, "..", "src", "lib")


def modulo(nombre, fichero):
    spec = importlib.util.spec_from_file_location(nombre, os.path.join(AQUI, fichero))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


animados = modulo("animados", "sprites-animados.py")
iconos = modulo("iconos", "iconos-de-caja.py")


def buscar(carpeta, clave):
    """El fichero de esa clave, sin mirar mayúsculas (el juego tiene .png y .PNG)"""
    for f in os.listdir(carpeta):
        if f.rsplit(".", 1)[0].upper() == clave.upper():
            return os.path.join(carpeta, f)
    return None


def guardar(imagen, destino):
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    tmp = destino[:-4] + ".tmp.png"
    imagen.save(tmp)
    tamano = animados.optimizar((tmp, destino))
    os.remove(tmp)
    return tamano


def quieto(tira):
    """El primer fotograma, recortado a lo que se ve con 2 píxeles de margen y cuadrado"""
    fotograma = tira.crop((0, 0, tira.height, tira.height))
    caja = fotograma.getchannel("A").getbbox()
    lado = max(caja[2] - caja[0], caja[3] - caja[1]) + 4
    salida = Image.new("RGBA", (lado, lado))
    salida.paste(fotograma.crop(caja), ((lado - (caja[2] - caja[0])) // 2, (lado - (caja[3] - caja[1])) // 2))
    return salida


def main():
    graficos = sys.argv[1]
    pokemon = os.path.join(graficos, "Pokemon")
    anil = json.load(open(os.path.join(LIB, "anil.json"), encoding="utf-8"))
    claves = {e["dex"]: e["name"].upper() for e in anil["especies"]}
    # Si a una forma le falta algo (Mewtwo Armadura no trae icono), el de su especie
    respaldo = {}
    for f in anil["formas"]:
        claves[f["id"]] = f["sprite"]
        respaldo[f["id"]] = f["sprite"].split("_")[0]

    total, incrustados, manifiesto = 0, {}, {"shiny": [], "colores": [], "iconosShiny": []}
    for numero, clave in claves.items():
        normal = buscar(os.path.join(pokemon, "Front"), clave)
        tira = Image.open(normal).convert("RGBA")
        total += guardar(animados.con_paleta_exacta(tira), os.path.join(SALIDA, "frente", f"{numero}.png"))
        fijo = quieto(tira)
        total += guardar(fijo, os.path.join(SALIDA, "quieto", f"{numero}.png"))
        incrustados[str(numero)] = {"normal": None, "shiny": None}

        ruta_shiny = buscar(os.path.join(pokemon, "Front shiny"), clave)
        fijo_shiny = None
        if ruta_shiny:
            tira_shiny = Image.open(ruta_shiny).convert("RGBA")
            colores = animados.cambio_de_colores(tira, tira_shiny)
            if colores is not None:
                with open(os.path.join(SALIDA, "frente", "shiny", f"{numero}.json"), "w", encoding="utf-8") as f:
                    json.dump(colores, f, separators=(",", ":"))
                manifiesto["colores"].append(numero)
            else:
                total += guardar(animados.con_paleta_exacta(tira_shiny), os.path.join(SALIDA, "frente", "shiny", f"{numero}.png"))
                manifiesto["shiny"].append(numero)
            fijo_shiny = quieto(tira_shiny)
            total += guardar(fijo_shiny, os.path.join(SALIDA, "quieto", "shiny", f"{numero}.png"))

        icono = buscar(os.path.join(pokemon, "Icons"), clave) or buscar(os.path.join(pokemon, "Icons"), respaldo.get(numero, clave))
        total += guardar(iconos.preparado(iconos.primer_fotograma(icono)), os.path.join(SALIDA, "iconos", f"{numero}.png"))
        icono_shiny = buscar(os.path.join(pokemon, "Icons shiny"), clave)
        if icono_shiny:
            total += guardar(iconos.preparado(iconos.primer_fotograma(icono_shiny)), os.path.join(SALIDA, "iconos", "shiny", f"{numero}.png"))
            manifiesto["iconosShiny"].append(numero)

        for cual, imagen in (("normal", fijo), ("shiny", fijo_shiny)):
            if imagen is None:
                continue
            datos = io.BytesIO()
            animados.con_paleta_exacta(imagen).save(datos, "PNG", optimize=True)
            incrustados[str(numero)][cual] = "data:image/png;base64," + base64.b64encode(datos.getvalue()).decode()

    objetos = json.load(open(os.path.join(AQUI, "anil-objetos.json"), encoding="utf-8"))
    for slug, clave in objetos.items():
        dibujo = buscar(os.path.join(graficos, "Items"), clave)
        if dibujo:
            total += guardar(Image.open(dibujo).convert("RGBA"), os.path.join(SALIDA, "objetos", f"{slug}.png"))

    json.dump(incrustados, open(os.path.join(LIB, "anil-quietos.json"), "w", encoding="utf-8"), separators=(",", ":"))
    json.dump(manifiesto, open(os.path.join(LIB, "anil-sprites.json"), "w", encoding="utf-8"), separators=(",", ":"))
    print(f"{len(claves)} pokémon y {len(objetos)} objetos, {total / 1024:.0f} KB en public/anil")


if __name__ == "__main__":
    main()
