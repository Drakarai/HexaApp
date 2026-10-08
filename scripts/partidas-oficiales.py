"""
Las tablas para leer partidas de los juegos oficiales (1ª a 7ª generación).

Uso:
    git clone --depth 1 --filter=blob:none --sparse https://github.com/kwsch/PKHeX
    (cd PKHeX && git sparse-checkout set PKHeX.Core/PKM PKHeX.Core/Resources/text/locations)
    python scripts/partidas-oficiales.py PKHeX/PKHeX.Core <carpeta con los CSV de PokéAPI>

Hacen falta de PokéAPI (data/v2/csv): moves, abilities, natures, items,
item_game_indices, pokemon_abilities y pokemon_abilities_past.

Escribe dos ficheros:
- `src/lib/partida/oficial/letras.json`, que va **al navegador** con los
  lectores: las tablas de letras de cada generación (de la 1ª a la 4ª el juego
  no guarda el texto en Unicode) y los números de especie de la 1ª y la 3ª, que
  no son los de la Pokédex nacional.
- `src/lib/partida/oficial-tablas.json`, **solo para el servidor**: de los
  números de cada juego a lo de la app (movimientos, habilidades, naturalezas,
  objetos —que cambian de número según la generación—, formas y lugares, con
  el nombre en español que da el juego, sacado de PKHeX) y las dos habilidades
  de cada especie en la 3ª, que solo guarda cuál de las dos lleva.

Solo entra lo que la app conoce: lo demás no se podría guardar.
"""

import csv
import json
import os
import re
import sys

AQUI = os.path.dirname(__file__)
LIB = os.path.join(AQUI, "..", "src", "lib")

LIGADURAS = {"LI0": "'d", "LI1": "'l", "LI2": "'m", "LI3": "'r", "LI4": "'s", "LI5": "'t", "LI6": "'v"}


def caracter(literal):
    cuerpo = literal[1:-1]
    if cuerpo.startswith("\\u"):
        return chr(int(cuerpo[2:], 16))
    if cuerpo.startswith("\\"):
        return {"'": "'", "\\": "\\", "0": "", "n": "\n"}.get(cuerpo[1:], cuerpo[1:])
    return cuerpo


def constantes(textos):
    """Las `const char X = '…';` de los ficheros, también las que apuntan a otra"""
    salida = {"NUL": "", "Terminator": "", "TerminatorNull": "", "HGM": "♂", "HGF": "♀", "FGM": "♂", "FGF": "♀"}
    pendientes = []
    for texto in textos:
        for nombre, valor in re.findall(r"const char (\w+)\s*=\s*([^;]+);", texto):
            valor = valor.strip()
            if valor.startswith("'"):
                salida.setdefault(nombre, caracter(valor))
            else:
                pendientes.append((nombre, valor.split(".")[-1]))
    for nombre, otro in pendientes:
        salida.setdefault(nombre, salida.get(otro, ""))
    salida.update(LIGADURAS)
    salida["NUL"] = ""
    return salida


def tabla(texto, nombre, consts):
    """Los elementos de `nombre => [ … ];` como lista de textos"""
    m = re.search(nombre + r"\s*=>[^\[]*\[(.*?)\n\s*\];", texto, re.S)
    if not m:
        raise SystemExit(f"No encuentro la tabla {nombre}")
    cuerpo = re.sub(r"//[^\n]*", "", m.group(1))
    elementos = re.findall(r"'(?:\\u[0-9A-Fa-f]{4}|\\.|[^'\\])'|\w+", cuerpo)
    return [caracter(e) if e.startswith("'") else consts.get(e, "") for e in elementos]


def tabla_numerica(texto, nombre):
    m = re.search(nombre + r"\s*=>\s*\[(.*?)\];", texto, re.S)
    return [int(x, 16) if "x" in x else int(x) for x in re.findall(r"-?0x[0-9A-Fa-f]+|-?\d+", re.sub(r"//[^\n]*", "", m.group(1)))]


def leer_csv(carpeta, nombre):
    return list(csv.DictReader(open(os.path.join(carpeta, nombre + ".csv"), encoding="utf-8")))


def lugares(carpeta, prefijo):
    """De `text_<juego>_<desde>_es.txt`: el número de cada lugar es su línea, contando desde `desde`"""
    salida = {}
    for fichero in sorted(os.listdir(carpeta)):
        m = re.fullmatch(prefijo + r"_(\d+)_es\.txt", fichero)
        if not m:
            continue
        desde = int(m.group(1))
        for i, linea in enumerate(open(os.path.join(carpeta, fichero), encoding="utf-8-sig").read().split("\n")):
            nombre = linea.strip()
            # Los huecos, los de relleno («－－－») y los que llevan códigos del juego no son sitios
            if not nombre or set(nombre) <= {"-", "－"} or "\\x" in nombre or any(ord(c) < 32 for c in nombre):
                continue
            salida[str(desde + i)] = nombre
    return salida


def main():
    pkhex, csvs = sys.argv[1:3]
    cadenas = os.path.join(pkhex, "PKM", "Strings")
    leer = lambda nombre: open(os.path.join(cadenas, nombre), encoding="utf-8").read()
    s1, s2, s3, s4 = leer("StringConverter1.cs"), leer("StringConverter2.cs"), leer("StringConverter3.cs"), leer("StringConverter4Util.cs")
    consts = constantes([s1, s2, s3, s4])
    conversor = open(os.path.join(pkhex, "PKM", "Util", "Conversion", "SpeciesConverter.cs"), encoding="utf-8").read()

    # --- Especies de la 1ª y la 3ª ---------------------------------------------
    gen1 = tabla_numerica(conversor, "Table1InternalToNational")
    delta3 = tabla_numerica(conversor, "Table3NationalToInternal")
    gen3 = {}
    for i, d in enumerate(delta3):
        nacional = 252 + i
        gen3[nacional + d] = nacional

    letras = {
        "g1": tabla(s1, "TableEN", consts),
        # La de Italia es también la de España
        "g2": tabla(s2, "TableITA", consts),
        "g3": tabla(s3, "G3_EN", consts),
        "g4": tabla(s4, "TableINT", consts),
        "especiesG1": gen1,
        "especiesG3": {str(k): v for k, v in sorted(gen3.items())},
    }
    json.dump(letras, open(os.path.join(LIB, "partida", "oficial", "letras.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    # --- Lo de la app ---------------------------------------------------------
    app = lambda nombre: json.load(open(os.path.join(LIB, nombre), encoding="utf-8"))
    movs_app = {m["s"] for m in app("movimientos.json")["movimientos"]}
    hab_app = {h["s"] for h in app("habilidades.json")["habilidades"]}
    obj_app = {o["slug"] for o in app("objetos.json")["objetos"]}
    nat_app = {n["s"] for n in app("movimientos.json")["naturalezas"]}
    internos = app("anil-internos.json")

    movimientos = {r["id"]: r["identifier"] for r in leer_csv(csvs, "moves") if r["identifier"] in movs_app}
    habilidades = {r["id"]: r["identifier"] for r in leer_csv(csvs, "abilities") if r["identifier"] in hab_app}
    naturalezas = [None] * 25
    for r in leer_csv(csvs, "natures"):
        if r["identifier"] in nat_app:
            naturalezas[int(r["game_index"])] = r["identifier"]
    slug_de_objeto = {r["id"]: r["identifier"] for r in leer_csv(csvs, "items")}
    objetos = {}
    for r in leer_csv(csvs, "item_game_indices"):
        slug = slug_de_objeto.get(r["item_id"])
        if slug in obj_app and int(r["generation_id"]) in (2, 3, 4, 5, 6, 7):
            objetos.setdefault(r["generation_id"], {})[r["game_index"]] = slug

    # Las formas, con el número de forma del juego, que es el de Essentials (ver scripts/anil.py)
    nacional = {clave: dex for clave, dex in internos["especies"].items()}
    formas = {}
    for clave, pid in internos["formas"].items():
        especie, forma = clave.rsplit("_", 1)
        if especie in nacional and pid < 20000:
            formas[f"{nacional[especie]}_{forma}"] = pid

    # Las dos habilidades de cada especie en la 3ª: las de entonces, si cambiaron
    actuales = {}
    for r in leer_csv(csvs, "pokemon_abilities"):
        if r["is_hidden"] == "0" and int(r["pokemon_id"]) <= 386:
            actuales.setdefault(int(r["pokemon_id"]), {})[int(r["slot"])] = r["ability_id"]
    pasadas = {}
    for r in leer_csv(csvs, "pokemon_abilities_past"):
        g = int(r["generation_id"])
        if r["is_hidden"] == "0" and g >= 3 and int(r["pokemon_id"]) <= 386:
            clave = (int(r["pokemon_id"]), int(r["slot"]))
            if clave not in pasadas or g < pasadas[clave][0]:
                pasadas[clave] = (g, r["ability_id"])
    habilidades_g3 = {}
    for dex, ranuras in actuales.items():
        lista = []
        for ranura in (1, 2):
            valor = pasadas[(dex, ranura)][1] if (dex, ranura) in pasadas else ranuras.get(ranura)
            lista.append(habilidades.get(valor) if valor else None)
        habilidades_g3[str(dex)] = lista

    textos = os.path.join(pkhex, "Resources", "text", "locations")
    tablas = {
        "movimientos": movimientos,
        "habilidades": habilidades,
        "naturalezas": naturalezas,
        "objetos": objetos,
        "formas": formas,
        "habilidadesG3": habilidades_g3,
        "lugares": {
            "gsc": lugares(os.path.join(textos, "gen2"), "text_gsc"),
            "rsefrlg": lugares(os.path.join(textos, "gen3"), "text_rsefrlg"),
            "hgss": lugares(os.path.join(textos, "gen4"), "text_hgss"),
            "bw2": lugares(os.path.join(textos, "gen5"), "text_bw2"),
            "xy": lugares(os.path.join(textos, "gen6"), "text_xy"),
            "sm": lugares(os.path.join(textos, "gen7"), "text_sm"),
        },
    }
    json.dump(tablas, open(os.path.join(LIB, "partida", "oficial-tablas.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(
        f"{len(movimientos)} movimientos, {len(habilidades)} habilidades, {sum(1 for n in naturalezas if n)} naturalezas, "
        + ", ".join(f"{len(v)} objetos de {k}ª" for k, v in sorted(objetos.items()))
        + f", {len(formas)} formas, " + ", ".join(f"{len(v)} lugares de {k}" for k, v in tablas["lugares"].items())
    )
    print("letras:", {k: len(v) for k, v in letras.items()})


if __name__ == "__main__":
    main()
