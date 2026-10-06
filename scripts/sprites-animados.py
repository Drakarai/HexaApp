"""
Genera los sprites animados de la ficha a partir del paquete de Pokémon
Essentials (las carpetas `Front` y `Front shiny` del «Animated Pokemon System»).

Uso:
    pip install pillow pyoxipng
    python scripts/sprites-animados.py "<carpeta con Front y Front shiny>" <pokemon_species.csv> <pokemon.csv> <mapa_formas.json>

Los CSV son los de PokéAPI (data/v2/csv). `mapa_formas.json` dice qué número de
PokéAPI es cada forma de Essentials ("MEOWTH_1": 10107); está en
`scripts/sprites-animados-formas.json` y se hizo cruzando los nombres de forma
de Essentials con los de PokéAPI y revisándolos a ojo.

Por qué así:
- Solo se generan **del #650 en adelante y las formas**: del #1 al #649 están los
  animados oficiales de Blanco y Negro en PokéAPI y no hace falta guardarlos.
- Se quedan en **tira** (los fotogramas uno al lado del otro, como los trae
  Essentials) y la ficha los mueve fotograma a fotograma: un WebP o un GIF
  animado pesaban de 4 a 7 veces más.
- **Los shiny que son el mismo dibujo con otros colores** (nueve de cada diez)
  no se guardan como imagen: se guarda solo qué color pasa a cuál, en un JSON
  de unos cientos de bytes, y la ficha repinta el normal. Los demás (Mimikyu,
  los que cambian de tamaño…) van enteros.
- Son pixel art de menos de 256 colores y sin semitransparencias, así que pasar
  a paleta **no pierde nada** (se comprueba píxel a píxel) y luego se aprietan
  con oxipng: unos 12 KB de media.
"""

import csv
import io
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor

import oxipng
from PIL import Image

SALIDA = os.path.join(os.path.dirname(__file__), "..", "public", "sprites-animados")
MANIFIESTO = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "sprites-animados.json")


def nombres_de_especie(ruta_species):
    nombres = {}
    for fila in csv.DictReader(open(ruta_species, encoding="utf-8")):
        nombres[fila["identifier"].replace("-", "").upper()] = int(fila["id"])
    # Essentials los escribe con el símbolo del sexo
    nombres["NIDORANFE"] = 29
    nombres["NIDORANMA"] = 32
    return nombres


def con_paleta_exacta(original):
    """
    La misma imagen con paleta, **con sus colores exactos**: el cuantizador de
    PIL redondeaba alguno aunque hubiera menos de 256. Lo transparente va todo
    a un solo color, que es invisible igual. Sin semitransparencias (estos
    sprites no las tienen) basta con decir qué índices son transparentes.
    """
    pixeles = [p if p[3] else (0, 0, 0, 0) for p in original.getdata()]
    colores = sorted(set(pixeles), key=lambda c: c[3])  # los transparentes, primero
    if len(colores) > 256 or any(0 < c[3] < 255 for c in colores):
        return original
    indice = {c: i for i, c in enumerate(colores)}
    salida = Image.new("P", original.size)
    salida.putdata([indice[p] for p in pixeles])
    salida.putpalette([v for c in colores for v in c[:3]])
    salida.info["transparency"] = bytes(c[3] for c in colores)
    return salida


def normalizados(imagen):
    """Los píxeles, con todo lo transparente igual: el color de lo que no se ve no cuenta"""
    return [p if p[3] else (0, 0, 0, 0) for p in imagen.convert("RGBA").getdata()]


def cambio_de_colores(normal, shiny):
    """
    Si el shiny es el normal con otros colores, qué color pasa a cuál
    ({"rrggbb": "rrggbb"}, solo los que cambian); si no, None.
    """
    if normal.size != shiny.size:
        return None
    mapa = {}
    for p, q in zip(normalizados(normal), normalizados(shiny)):
        if mapa.setdefault(p, q) != q or (p[3] != q[3]):
            return None
    return {
        "%02x%02x%02x" % p[:3]: "%02x%02x%02x" % q[:3]
        for p, q in mapa.items()
        if p[3] and p[:3] != q[:3]
    }


def optimizar(tarea):
    origen, destino = tarea
    original = Image.open(origen).convert("RGBA")
    paleta = con_paleta_exacta(original)
    tmp = io.BytesIO()
    paleta.save(tmp, "PNG", optimize=True, transparency=paleta.info.get("transparency"))
    # libdeflater y no zopfli: zopfli apretaba un 10 % más, pero tardaba minutos por tira
    datos = oxipng.optimize_from_memory(
        tmp.getvalue(), level=4, strip=oxipng.StripChunks.all(), deflate=oxipng.Deflaters.libdeflater(12)
    )
    with open(destino, "wb") as f:
        f.write(datos)
    return len(datos)


def main():
    carpeta, ruta_species, _ruta_pokemon, ruta_formas = sys.argv[1:5]
    nombres = nombres_de_especie(ruta_species)
    formas = json.load(open(ruta_formas, encoding="utf-8"))

    # Qué fichero de Essentials va a qué número de PokéAPI
    elegidos = {}
    for fichero in os.listdir(os.path.join(carpeta, "Front")):
        if not fichero.lower().endswith(".png"):
            continue
        nombre = fichero[:-4]
        if nombre in formas:
            elegidos[nombre] = formas[nombre]
        elif nombre.upper() in nombres and nombres[nombre.upper()] >= 650:
            elegidos[nombre] = nombres[nombre.upper()]

    os.makedirs(os.path.join(SALIDA, "shiny"), exist_ok=True)
    tareas = []
    # normal: hay tira; shiny: hay tira shiny entera; colores: el shiny es el normal repintado
    manifiesto = {"normal": [], "shiny": [], "colores": []}
    for nombre, pokemon_id in sorted(elegidos.items(), key=lambda par: par[1]):
        normal = os.path.join(carpeta, "Front", f"{nombre}.png")
        shiny = os.path.join(carpeta, "Front shiny", f"{nombre}.png")
        tareas.append((normal, os.path.join(SALIDA, f"{pokemon_id}.png")))
        manifiesto["normal"].append(pokemon_id)
        if not os.path.exists(shiny):
            continue
        colores = cambio_de_colores(Image.open(normal), Image.open(shiny))
        if colores is not None:
            with open(os.path.join(SALIDA, "shiny", f"{pokemon_id}.json"), "w", encoding="utf-8") as f:
                json.dump(colores, f, separators=(",", ":"))
            manifiesto["colores"].append(pokemon_id)
        else:
            tareas.append((shiny, os.path.join(SALIDA, "shiny", f"{pokemon_id}.png")))
            manifiesto["shiny"].append(pokemon_id)

    with ProcessPoolExecutor() as ex:
        total = sum(ex.map(optimizar, tareas, chunksize=8))
    manifiesto = {clave: sorted(set(ids)) for clave, ids in manifiesto.items()}
    json.dump(manifiesto, open(MANIFIESTO, "w", encoding="utf-8"), separators=(",", ":"))
    print(f"{len(tareas)} ficheros, {total / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
