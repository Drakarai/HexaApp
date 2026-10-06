"""
Genera los iconos de caja que faltan en PokéAPI a partir del paquete de
Pokémon Essentials (la carpeta `Icons`).

Uso:
    pip install pillow pyoxipng
    git clone -q --filter=blob:none --no-checkout --depth 1 https://github.com/PokeAPI/sprites pokeapi
    git -C pokeapi ls-tree --name-only HEAD sprites/pokemon/versions/generation-viii/icons/ | sed 's#.*/##' > iconos-pokeapi.txt
    python scripts/iconos-de-caja.py "<carpeta Icons>" <pokemon_species.csv> iconos-pokeapi.txt

Por qué así:
- Solo se generan **los que no tiene PokéAPI** en los de Espada y Escudo (del
  #899 en adelante y unas cuantas formas): esos tienen más detalle que los de
  Essentials, que son los de la 7ª al doble de tamaño.
- **Quietos**: de los dos fotogramas del icono (el que salta) solo el primero;
  en una caja, treinta botando a la vez serían una feria.
- **Ya recortados** como los recorta `SpritePokemon` (cuadrado, 2 píxeles de
  margen y un lado mínimo para que un Pikachu no salga tan grande como un
  Wailord), así el navegador no tiene que hacerlo.
- Los que vienen al doble exacto se guardan **a la mitad** (32 px): a esa
  escala miden lo mismo que los de Espada y Escudo (Pikachu, 21×20 en los
  dos). Unos pocos están dibujados a 64 de verdad (los de Hisui, por ejemplo):
  esos se quedan así, con el lado mínimo al doble.
- Las formas que se ven igual que otra (los Dominantes, los Minior Meteorito,
  Greninja Fuerte Vínculo…) no llevan imagen: usan la de esa (`ALIAS`).
- Sin variocolor: los de Espada y Escudo no lo tienen y la casilla ya lleva su
  destello.
"""

import csv
import importlib.util
import json
import os
import sys

from PIL import Image

AQUI = os.path.dirname(__file__)
SALIDA = os.path.join(AQUI, "..", "public", "iconos-de-caja")
MANIFIESTO = os.path.join(AQUI, "..", "src", "lib", "iconos-de-caja.json")
POKEDEX = os.path.join(AQUI, "..", "src", "lib", "pokedex.json")

# La paleta exacta y el oxipng, los mismos que para los animados
_spec = importlib.util.spec_from_file_location("animados", os.path.join(AQUI, "sprites-animados.py"))
animados = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(animados)

# Iguales que otra forma (o que la especie): Dominantes, Meteorito, Fuerte
# Vínculo, Agrupamiento… y Koraidon y Miraidon en sus modos, que el paquete no trae
ALIAS = {
    10093: 10092,  # Raticate Dominante → de Alola
    10116: 658,  # Greninja Fuerte Vínculo
    10118: 10181,  # Zygarde 10 % Agrupamiento
    10119: 718,  # Zygarde 50 % Agrupamiento
    10121: 735,  # Gumshoos Dominante
    10122: 738,  # Vikavolt Dominante
    10128: 754,  # Lurantis Dominante
    10129: 758,  # Salazzle Dominante
    **{i: 774 for i in range(10130, 10136)},  # Minior Meteorito, de cualquier color
    10144: 778,  # Mimikyu Dominante
    10145: 10143,  # Mimikyu Dominante descubierto
    10149: 10115,  # Marowak Dominante → de Alola
    10153: 752,  # Araquanid Dominante
    10154: 777,  # Togedemaru Dominante
    **{i: 1007 for i in range(10264, 10268)},  # Koraidon
    **{i: 1008 for i in range(10268, 10272)},  # Miraidon
}

# Formas que tienen icono y no animado, así que no están en sprites-animados-formas.json
FORMAS_SOLO_ICONO = {
    "APPLETUN_1": 10217,  # Gigamax
    "TOXTRICITY_2": 10219,  # Gigamax
    "TOXTRICITY_3": 10228,  # Gigamax (Grave)
    "URSHIFU_2": 10226,  # Gigamax (Brusco)
    "GRENINJA_3": 10294,  # Mega
    "FLOETTE_6": 10296,  # Mega
    "ZYGARDE_4": 10301,  # Mega
    "TATSUGIRI_3": 10322,  # Mega
    "TATSUGIRI_4": 10323,
    "TATSUGIRI_5": 10324,
}

LADO_MINIMO = 26  # el de `LADO_MINIMO_DE_ICONO` en sprite-pokemon.tsx


def a_la_mitad(fotograma):
    """A la mitad si está dibujado al doble (con algún píxel suelto como mucho); si no, None"""
    mitad = fotograma.resize((fotograma.width // 2, fotograma.height // 2), Image.NEAREST)
    vuelta = mitad.resize(fotograma.size, Image.NEAREST)
    distintos = sum(1 for p, q in zip(fotograma.getdata(), vuelta.getdata()) if p != q)
    return mitad if distintos <= fotograma.width * fotograma.height // 50 else None


def recortado(icono, escala):
    caja = icono.getchannel("A").getbbox()
    ancho, alto = caja[2] - caja[0], caja[3] - caja[1]
    lado = max(ancho + 4 * escala, alto + 4 * escala, LADO_MINIMO * escala)
    salida = Image.new("RGBA", (lado, lado))
    salida.paste(icono.crop(caja), ((lado - ancho) // 2, (lado - alto) // 2))
    return salida


def main():
    carpeta, ruta_species, ruta_pokeapi = sys.argv[1:4]
    formas = json.load(open(os.path.join(AQUI, "sprites-animados-formas.json"), encoding="utf-8"))
    formas.update(FORMAS_SOLO_ICONO)
    nombres = animados.nombres_de_especie(ruta_species)

    # Los que hay en la app y no tienen icono de Espada y Escudo
    con_icono = {int(l.strip()[:-4]) for l in open(ruta_pokeapi) if l.strip()[:-4].isdigit()}
    en_la_app = set()
    for especie in json.load(open(POKEDEX, encoding="utf-8"))["species"]:
        en_la_app.add(especie["dex"])
        en_la_app.update(forma[0] for forma in especie.get("forms", []))
    huecos = en_la_app - con_icono

    ficheros = {}
    for fichero in os.listdir(carpeta):
        if not fichero.lower().endswith(".png"):
            continue
        nombre = fichero[:-4]
        pokemon_id = formas.get(nombre, nombres.get(nombre.upper()))
        if pokemon_id in huecos:
            ficheros.setdefault(pokemon_id, fichero)

    os.makedirs(SALIDA, exist_ok=True)
    total = 0
    for pokemon_id, fichero in sorted(ficheros.items()):
        tira = Image.open(os.path.join(carpeta, fichero)).convert("RGBA")
        fotograma = tira.crop((0, 0, tira.height, tira.height))
        mitad = a_la_mitad(fotograma)
        icono = recortado(mitad, 1) if mitad else recortado(fotograma, 2)
        tmp = os.path.join(SALIDA, f"{pokemon_id}.tmp.png")
        icono.save(tmp)
        destino = os.path.join(SALIDA, f"{pokemon_id}.png")
        total += animados.optimizar((tmp, destino))
        os.remove(tmp)

    alias = {str(de): a for de, a in ALIAS.items() if de in huecos}
    sin_nada = sorted(huecos - set(ficheros) - set(ALIAS))
    json.dump(
        {"locales": sorted(ficheros), "alias": alias},
        open(MANIFIESTO, "w", encoding="utf-8"),
        separators=(",", ":"),
    )
    print(f"{len(ficheros)} iconos, {total / 1024:.0f} KB; {len(alias)} alias; sin icono: {sin_nada}")


if __name__ == "__main__":
    main()
