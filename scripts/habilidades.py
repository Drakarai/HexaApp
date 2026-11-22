"""
Las habilidades de los juegos oficiales, para la ficha de combate: nombre y
descripción en español, y cuáles puede tener cada pokémon.

Uso:
    python scripts/habilidades.py <carpeta con los CSV de PokéAPI>

Los CSV son los de PokéAPI (data/v2/csv): abilities, ability_names,
ability_flavor_text y pokemon_abilities. Escribe `src/lib/habilidades.json`.

Por qué así:
- Se guarda **el identificador de PokéAPI** ("overgrow"), como con los
  movimientos: es el de Showdown y no cambia si cambia la traducción.
- La descripción es **la más reciente en español** que tenga PokéAPI.
- De cada pokémon (formas y megas incluidas), sus habilidades en el orden del
  juego: las normales y, la última, la oculta. Sirven para ofrecerlas primero.
- Lo que PokéAPI aún no trae de las más recientes (las descripciones de la 9ª
  y las de Leyendas Z-A que le faltan) sale de `habilidades-recientes.json`,
  con el texto oficial en español del mod de expansión de USUM: sin eso, al
  regenerar volverían a quedarse vacías.
"""

import csv
import json
import os
import sys

ESPANOL = "7"
SALIDA = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "habilidades.json")
RECIENTES = os.path.join(os.path.dirname(__file__), "habilidades-recientes.json")


def completar(habilidades):
    """Rellena las descripciones vacías y añade las que PokéAPI no tiene; no pisa nada que ya traiga."""
    extra = json.load(open(RECIENTES, encoding="utf-8"))
    for h in habilidades:
        if not h["d"]:
            h["d"] = extra["descripciones"].get(h["s"], "")
    tiene = {h["s"] for h in habilidades}
    habilidades.extend(n for n in extra["nuevas"] if n["s"] not in tiene)
    habilidades.sort(key=lambda h: h["n"])


def main():
    carpeta = sys.argv[1]
    leer = lambda nombre: csv.DictReader(open(os.path.join(carpeta, f"{nombre}.csv"), encoding="utf-8"))

    principales = {f["id"]: f["identifier"] for f in leer("abilities") if f["is_main_series"] == "1"}
    nombres = {f["ability_id"]: f["name"] for f in leer("ability_names") if f["local_language_id"] == ESPANOL}
    descripciones = {}
    for f in leer("ability_flavor_text"):
        if f["language_id"] != ESPANOL:
            continue
        # Se queda la del grupo de versiones más nuevo
        previa = descripciones.get(f["ability_id"])
        if not previa or int(f["version_group_id"]) >= previa[0]:
            descripciones[f["ability_id"]] = (int(f["version_group_id"]), " ".join(f["flavor_text"].split()))

    habilidades = []
    for id_, slug in principales.items():
        if id_ not in nombres:
            continue
        habilidades.append({"s": slug, "n": nombres[id_], "d": descripciones.get(id_, (0, ""))[1]})
    completar(habilidades)

    por_pokemon = {}
    for f in sorted(leer("pokemon_abilities"), key=lambda f: (int(f["pokemon_id"]), int(f["slot"]))):
        slug = principales.get(f["ability_id"])
        if slug and f["ability_id"] in nombres:
            por_pokemon.setdefault(f["pokemon_id"], []).append(slug)

    json.dump(
        {"habilidades": habilidades, "porPokemon": por_pokemon},
        open(SALIDA, "w", encoding="utf-8"),
        ensure_ascii=False,
        separators=(",", ":"),
    )
    print(f"{len(habilidades)} habilidades, {len(por_pokemon)} pokémon")


if __name__ == "__main__":
    main()
