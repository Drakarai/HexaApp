"""
Saca de los datos de Pokémon Añil lo que la app usa en los lockes de Añil:
los pokémon nuevos, los cambios de tipo y los movimientos nuevos.

Uso:
    git clone https://github.com/PepeLePew016/AnilShowdown
    python scripts/anil.py AnilShowdown/pbs <pokemon_species.csv>

Los PBS son los ficheros de datos del juego (Pokémon Essentials), copiados en
el repositorio del servidor de Showdown de Añil. El CSV es el de PokéAPI
(data/v2/csv). Escribe `src/lib/anil.json`.

Por qué así:
- Se compara con **los datos de la app** (`tipos.json`, `movimientos.json`,
  `pokedex.json`) y solo se guarda lo que cambia: si un día se rehacen esos,
  basta con volver a pasar este.
- **Pokémon nuevos**, solo las especies (Royaleon, Cefireon): las megas y
  formas nuevas de Añil no entran, lo pidió así el grupo. Llevan números del
  20001 en adelante, que no chocan con los de PokéAPI (especies hasta ~1025,
  formas desde 10001).
- Los **tipos de las formas** que ya existen (Mega Glalie, Ursaluna Luna
  Carmesí…) se emparejan por el nombre de la forma; si una forma no pone tipos,
  lleva los de su especie en Añil, como en el juego.
- Los **movimientos nuevos** se reconocen por su identificador interno, que
  está en inglés como los de PokéAPI: los que no existen en la app.
"""

import csv
import json
import os
import re
import sys
import unicodedata

AQUI = os.path.dirname(__file__)
LIB = os.path.join(AQUI, "..", "src", "lib")
SALIDA = os.path.join(LIB, "anil.json")
PRIMER_NUMERO = 20001
CATEGORIAS = {"Status": 0, "Physical": 1, "Special": 2}

# Movimientos oficiales que Essentials escribe distinto que PokéAPI, y los
# oficiales que la app no tiene (Plegaria Vital, Luz Devastadora): no son de Añil
OFICIALES = {"visegrip": "vice-grip", "eeveevolley": "veevee-volley", "revivalblessing": None, "nihillight": None}


def leer_pbs(ruta):
    secciones, actual = [], None
    for linea in open(ruta, encoding="utf-8-sig"):
        linea = linea.strip()
        if not linea or linea.startswith("#"):
            continue
        cabecera = re.fullmatch(r"\[(.+)\]", linea)
        if cabecera:
            actual = {"clave": [c.strip() for c in cabecera.group(1).split(",")], "campos": {}}
            secciones.append(actual)
        elif actual is not None and "=" in linea:
            campo, valor = linea.split("=", 1)
            actual["campos"][campo.strip()] = valor.strip()
    return secciones


def plano(texto):
    texto = unicodedata.normalize("NFD", texto)
    return re.sub(r"[^a-z0-9 ]", "", "".join(c for c in texto if not unicodedata.combining(c)).lower()).strip()


def main():
    pbs, ruta_species = sys.argv[1:3]
    tipos_app = json.load(open(os.path.join(LIB, "tipos.json"), encoding="utf-8"))
    pokedex = json.load(open(os.path.join(LIB, "pokedex.json"), encoding="utf-8"))["species"]
    movimientos = json.load(open(os.path.join(LIB, "movimientos.json"), encoding="utf-8"))["movimientos"]
    tipo_id = {t["slug"]: t["id"] for t in tipos_app["tipos"]}
    de_ahora = {int(k): v for k, v in tipos_app["porPokemon"].items()}

    def tipos_de(campo):
        return [tipo_id[t.lower()] for t in campo.split(",")]

    especie_id = {}
    for fila in csv.DictReader(open(ruta_species, encoding="utf-8")):
        especie_id[fila["identifier"].replace("-", "").upper()] = int(fila["id"])
    especie_id["NIDORANFE"], especie_id["NIDORANMA"] = 29, 32
    formas_app = {e["dex"]: e.get("forms", []) for e in pokedex}

    especies = leer_pbs(os.path.join(pbs, "pokemon.txt"))
    por_nombre = {s["clave"][0]: s for s in especies}

    # Pokémon nuevos: las especies que PokéAPI no conoce
    nuevos, numero = [], PRIMER_NUMERO
    for s in especies:
        if s["clave"][0].upper() in especie_id:
            continue
        nuevos.append({"dex": numero, "name": s["campos"]["Name"], "tipos": tipos_de(s["campos"]["Types"]), "clave": s["clave"][0]})
        numero += 1
    nuevo_por_clave = {n["clave"]: n for n in nuevos}
    # De quién evolucionan: lo dice la especie de antes ("Evolutions = ROYALEON,Item,…")
    for s in especies:
        partes = s["campos"].get("Evolutions", "").split(",")
        for destino in partes[0::3]:
            if destino in nuevo_por_clave:
                nuevo_por_clave[destino]["de"] = especie_id[s["clave"][0].upper()]

    # Cambios de tipo de las especies de siempre
    cambios = {}
    for clave, s in por_nombre.items():
        dex = especie_id.get(clave.upper())
        if dex is None or "Types" not in s["campos"]:
            continue
        suyos = tipos_de(s["campos"]["Types"])
        if suyos != de_ahora.get(dex):
            cambios[dex] = suyos

    # …y de sus formas, emparejadas por el nombre ("Mega Lucario Z" ↔ "Mega Z")
    def huella(nombre, especie):
        p = plano(nombre).replace(plano(especie), " ")
        palabras = [w for w in p.split() if w not in ("forma", "de", "la", "el")]
        return " ".join(palabras)

    for s in leer_pbs(os.path.join(pbs, "pokemon_forms.txt")):
        base, numero_forma = s["clave"][0], s["clave"][1] if len(s["clave"]) > 1 else "0"
        dex = especie_id.get(base.upper())
        if dex is None or numero_forma == "0" or base not in por_nombre:
            continue
        nombre_especie = por_nombre[base]["campos"]["Name"]
        suya = huella(s["campos"].get("FormName", ""), nombre_especie)
        if not suya:
            continue
        candidatas = [fid for fid, etiqueta in formas_app.get(dex, []) if fid != dex and huella(etiqueta, nombre_especie) == suya]
        if len(candidatas) != 1:
            continue
        tipos = tipos_de(s["campos"]["Types"]) if "Types" in s["campos"] else tipos_de(por_nombre[base]["campos"]["Types"])
        if tipos != de_ahora.get(candidatas[0]):
            cambios[candidatas[0]] = tipos
            print(f"  forma: {s['campos'].get('FormName')} → {candidatas[0]} {tipos}")

    # Movimientos: los nuevos, y los de siempre que cambian de tipo
    slugs_app = {m["s"].replace("-", ""): m for m in movimientos}
    nuevos_movs, tipos_de_movimientos = [], {}
    for s in leer_pbs(os.path.join(pbs, "moves.txt")):
        clave, campos = s["clave"][0].lower(), s["campos"]
        tipo = tipo_id.get(campos["Type"].lower())
        if tipo is None or (clave in OFICIALES and OFICIALES[clave] is None):
            continue
        if clave in OFICIALES:
            clave = OFICIALES[clave].replace("-", "")
        if clave in slugs_app:
            if slugs_app[clave]["t"] != tipo:
                tipos_de_movimientos[slugs_app[clave]["s"]] = tipo
            continue
        nuevo = {"s": f"anil-{clave}", "n": campos["Name"], "t": tipo, "c": CATEGORIAS[campos["Category"]], "g": 9}
        if campos.get("Power"):
            nuevo["p"] = int(campos["Power"])
        nuevos_movs.append(nuevo)

    datos = {
        "especies": [{k: v for k, v in n.items() if k != "clave"} for n in nuevos],
        "tipos": {str(k): v for k, v in sorted(cambios.items())},
        "movimientos": nuevos_movs,
        "tiposDeMovimientos": tipos_de_movimientos,
    }
    json.dump(datos, open(SALIDA, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(
        f"{len(nuevos)} pokémon nuevos {[n['name'] for n in nuevos]}, {len(cambios)} cambios de tipo, "
        f"{len(nuevos_movs)} movimientos nuevos {[m['n'] for m in nuevos_movs]}, "
        f"{len(tipos_de_movimientos)} movimientos con otro tipo {sorted(tipos_de_movimientos)}"
    )


if __name__ == "__main__":
    main()
