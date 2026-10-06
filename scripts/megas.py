"""
Qué megapiedra oficial lleva a qué mega, para enseñar la mega en el Equipo y PC
cuando un pokémon lleva la suya.

Uso:
    python scripts/megas.py <pokemon_forms.txt de Essentials estándar>

PokéAPI no dice qué piedra es de quién; Essentials sí (`MegaStone =` en cada
mega). Los números de las formas salen de `scripts/sprites-animados-formas.json`
y los de los objetos, de `src/lib/objetos.json`. Escribe `src/lib/megas.json`:
`{ "venusaurite": [[10033, 3]] }`, la mega y desde qué pokémon (Charizard
tiene dos piedras; una piedra puede servir a varias formas, como en Añil).
"""

import json
import os
import re
import sys

AQUI = os.path.dirname(__file__)
LIB = os.path.join(AQUI, "..", "src", "lib")


def main():
    formas = json.load(open(os.path.join(AQUI, "sprites-animados-formas.json"), encoding="utf-8"))
    objetos = {o["slug"].replace("-", ""): o["slug"] for o in json.load(open(os.path.join(LIB, "objetos.json"), encoding="utf-8"))["objetos"]}
    pokedex = json.load(open(os.path.join(LIB, "pokedex.json"), encoding="utf-8"))["species"]
    especie_de_forma = {forma[0]: e["dex"] for e in pokedex for forma in e.get("forms", [])}

    megas, sin_piedra, clave = {}, [], None
    for linea in open(sys.argv[1], encoding="utf-8-sig"):
        linea = linea.strip()
        cabecera = re.fullmatch(r"\[(.+)\]", linea)
        if cabecera:
            clave = cabecera.group(1).replace(",", "_")
        elif linea.startswith("MegaStone") and clave:
            piedra = linea.split("=", 1)[1].strip().lower()
            mega = formas.get(clave)
            if mega is None or piedra not in objetos:
                sin_piedra.append(clave)
                continue
            megas.setdefault(objetos[piedra], []).append([mega, especie_de_forma[mega]])
    json.dump(megas, open(os.path.join(LIB, "megas.json"), "w", encoding="utf-8"), separators=(",", ":"))
    print(f"{len(megas)} megapiedras; sin emparejar: {sin_piedra}")


if __name__ == "__main__":
    main()
