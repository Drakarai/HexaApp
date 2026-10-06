"""
Genera los iconos de caja del paquete de Pokémon Essentials (las carpetas
`Icons` e `Icons shiny`), para los dos estilos de iconos de Mi perfil:
«Espada y Escudo» (los de PokéAPI, con estos solo donde no llegan) y «Todos
iguales» (todos estos, también variocolor).

Uso:
    pip install pillow pyoxipng
    git clone -q --filter=blob:none --no-checkout --depth 1 https://github.com/PokeAPI/sprites pokeapi
    git -C pokeapi ls-tree --name-only HEAD sprites/pokemon/versions/generation-viii/icons/ | sed 's#.*/##' > iconos-pokeapi.txt
    python scripts/iconos-de-caja.py "<carpeta con Icons e Icons shiny>" <pokemon_species.csv> iconos-pokeapi.txt

Por qué así:
- Se generan **todos** los que hay en la app, y el manifiesto dice cuáles no
  tiene PokéAPI en los de Espada y Escudo (`sinEspadaYEscudo`: del #899 en
  adelante y unas cuantas formas), que son los que rellenan ese estilo. Los de
  Espada y Escudo tienen más detalle (estos son los de la 7ª al doble), pero
  no hay variocolor: por eso se puede elegir.
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
- **Los variocolor** van enteros en `shiny/` o, si ocupa menos, como un JSON
  de qué color pasa a cuál (y algún píxel suelto) para que el navegador
  repinte el normal, como los animados. Aquí gana casi siempre la imagen: a
  32 px un PNG es poquísimo y estos iconos tienen muchos colores casi iguales.
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
    for fichero in os.listdir(os.path.join(carpeta, "Icons")):
        if not fichero.lower().endswith(".png"):
            continue
        nombre = fichero[:-4]
        pokemon_id = formas.get(nombre, nombres.get(nombre.upper()))
        if pokemon_id in en_la_app:
            ficheros.setdefault(pokemon_id, fichero)

    os.makedirs(os.path.join(SALIDA, "shiny"), exist_ok=True)
    total = 0
    manifiesto = {"todos": [], "shiny": [], "colores": []}
    for pokemon_id, fichero in sorted(ficheros.items()):
        normal = primer_fotograma(os.path.join(carpeta, "Icons", fichero))
        total += guardar(preparado(normal), os.path.join(SALIDA, f"{pokemon_id}.png"))
        manifiesto["todos"].append(pokemon_id)
        ruta_shiny = os.path.join(carpeta, "Icons shiny", fichero)
        if not os.path.exists(ruta_shiny):
            continue
        shiny = primer_fotograma(ruta_shiny)
        cambio = repintado(preparado(normal), preparado(shiny))
        imagen = os.path.join(SALIDA, "shiny", f"{pokemon_id}.png")
        tamano = guardar(preparado(shiny), imagen)
        texto = json.dumps(cambio, separators=(",", ":")) if cambio is not None else None
        # Lo que menos ocupe: con muchos colores casi iguales, la lista pesa más que la imagen
        if texto is not None and len(texto) < tamano:
            os.remove(imagen)
            with open(os.path.join(SALIDA, "shiny", f"{pokemon_id}.json"), "w", encoding="utf-8") as f:
                f.write(texto)
            total += len(texto)
            manifiesto["colores"].append(pokemon_id)
        else:
            total += tamano
            manifiesto["shiny"].append(pokemon_id)

    manifiesto["alias"] = {str(de): a for de, a in ALIAS.items() if de in en_la_app}
    manifiesto["sinEspadaYEscudo"] = sorted(huecos)
    sin_nada = sorted(huecos - set(ficheros) - set(ALIAS))
    json.dump(manifiesto, open(MANIFIESTO, "w", encoding="utf-8"), separators=(",", ":"))
    print(
        f"{len(ficheros)} iconos ({len(manifiesto['shiny'])} shiny enteros, {len(manifiesto['colores'])} repintados), "
        f"{total / 1024:.0f} KB; {len(manifiesto['alias'])} alias; sin icono en Espada y Escudo ni aquí: {sin_nada}; "
        f"de la app sin icono aquí: {len(en_la_app - set(ficheros) - set(ALIAS))}"
    )


# Cuántos píxeles sueltos se apuntan como mucho antes de guardar el shiny entero
SUELTOS = 32


def repintado(normal, shiny):
    """
    Cómo pasar del icono normal al shiny: {"c": {"rrggbb": "rrggbb"}, "p": [[i, "rrggbbaa"], …]},
    o None si no compensa. Casi todos son el mismo dibujo con otros colores salvo
    algún píxel (un ojo, un brillo): el cambio de cada color es el que más se
    repite, y lo que no lo sigue va aparte, píxel a píxel (`i`, su posición).
    """
    if normal.size != shiny.size:
        return None
    pn, ps = list(normal.getdata()), list(shiny.getdata())
    votos = {}
    for p, q in zip(pn, ps):
        if p[3] and q[3]:
            votos.setdefault(p[:3], {}).setdefault(q[:3], 0)
            votos[p[:3]][q[:3]] += 1
    cambio = {p: max(destinos, key=destinos.get) for p, destinos in votos.items()}
    sueltos = []
    for i, (p, q) in enumerate(zip(pn, ps)):
        esperado = (*cambio.get(p[:3], p[:3]), p[3]) if p[3] else (0, 0, 0, 0)
        real = q if q[3] else (0, 0, 0, 0)
        if esperado != real:
            sueltos.append([i, "%02x%02x%02x%02x" % real])
    if len(sueltos) > SUELTOS:
        return None
    hexa = lambda c: "%02x%02x%02x" % c
    return {"c": {hexa(p): hexa(q) for p, q in cambio.items() if p != q}, "p": sueltos}


def primer_fotograma(ruta):
    tira = Image.open(ruta).convert("RGBA")
    return tira.crop((0, 0, tira.height, tira.height))


def preparado(fotograma):
    mitad = a_la_mitad(fotograma)
    return recortado(mitad, 1) if mitad else recortado(fotograma, 2)


def guardar(icono, destino):
    tmp = destino[:-4] + ".tmp.png"
    icono.save(tmp)
    tamano = animados.optimizar((tmp, destino))
    os.remove(tmp)
    return tamano


if __name__ == "__main__":
    main()
