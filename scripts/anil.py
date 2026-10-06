"""
Saca de los datos de Pokémon Añil lo que la app usa en los lockes de Añil.

Uso:
    git clone https://github.com/PepeLePew016/AnilShowdown
    python scripts/anil.py AnilShowdown/pbs <carpeta con los CSV de PokéAPI> <pokemon_forms.txt de Essentials estándar>

Los PBS son los ficheros de datos del juego (Pokémon Essentials), copiados en
el repositorio de su servidor de Showdown. Los CSV, los de PokéAPI
(data/v2/csv). El `pokemon_forms.txt` de Essentials sin tocar sirve para saber
qué formas son las de siempre y cuáles ha añadido Añil. Escribe
`src/lib/anil.json` (lo que se usa en todas partes) y
`src/lib/habilidades-anil.json` (las habilidades, que pesan más y se cargan
solo al hacer falta).

Por qué así:
- Se compara con **los datos de la app** (`tipos.json`, `movimientos.json`,
  `pokedex.json`, `habilidades.json`, `objetos.json`) y se guarda **solo lo
  que cambia**: si un día se rehacen esos, basta con volver a pasar este.
- **Pokémon nuevos** (Royaleon, Cefireon) y **formas y megas nuevas** (Mega
  Venusaur Y, Mega Snorlax, los cortes de Furfrou con su tipo…) llevan números
  del 20001 en adelante, que no chocan con PokéAPI (especies hasta ~1025,
  formas desde 10001). Royaleon y Cefireon van primero para que sigan siendo
  el 20001 y el 20002.
- Una forma de Añil es **la oficial** si está en Essentials estándar con el
  mismo número (Mega Venusaur, aunque Añil la llame «X» y le cambie la
  piedra) o si su nombre coincide con una de la app. Las formas oficiales que
  la app no tiene aparte (letras de Unown, motivos de Vivillon…) no entran:
  no son de Añil. De las que Añil añade, entran las megas, las que cambian de
  tipo respecto a Essentials (Furfrou) y Pikachu Amarillo y Mewtwo Armadura.
- **Megapiedras**: cada piedra de Añil, a qué mega lleva desde qué forma. Las
  que la app no tiene (Venusaurita X, las de Leyendas Z-A, las inventadas) son
  objetos nuevos de Añil.
- **Objetos**: los de Añil que la app no tiene (sin MT ni objetos clave) y los
  de la app que Añil no tiene, para quitarlos de su lista.
- **Habilidades**: todas las de Añil con su nombre y su descripción, que es la
  que vale allí (la de Entusiasmo, por ejemplo, cambia), y las de cada pokémon
  cuando no son las oficiales.
- **Movimientos**: los nuevos, los que cambian de tipo y los que cambian de
  potencia.
"""

import csv
import json
import os
import re
import sys
import unicodedata

AQUI = os.path.dirname(__file__)
LIB = os.path.join(AQUI, "..", "src", "lib")
PRIMER_NUMERO = 20001
CATEGORIAS = {"Status": 0, "Physical": 1, "Special": 2}

# Movimientos oficiales que Essentials escribe distinto que PokéAPI, y los
# oficiales que la app no tiene (Plegaria Vital, Luz Devastadora): no son de Añil
OFICIALES = {"visegrip": "vice-grip", "eeveevolley": "veevee-volley", "revivalblessing": None, "nihillight": None}

# Habilidades que Essentials escribe distinto que PokéAPI
HABILIDADES_OFICIALES = {
    "EMBODYASPECT": "embody-aspect-teal",
    "EMBODYASPECT_1": "embody-aspect-hearthflame",
    "EMBODYASPECT_2": "embody-aspect-wellspring",
    "EMBODYASPECT_3": "embody-aspect-cornerstone",
    "ASONECHILLINGNEIGH": "as-one-glastrier",
    "ASONEGRIMNEIGH": "as-one-spectrier",
}

# Formas que el nombre no empareja solo: (especie, número de Añil) → número de PokéAPI
FORMAS_A_MANO = {
    ("TATSUGIRI", "3"): 10322,
    ("TATSUGIRI", "4"): 10323,
    ("TATSUGIRI", "5"): 10324,
    ("MAGEARNA", "3"): 10318,
    ("EEVEE", "1"): 10159,
}

# Formas nuevas de Añil que no son megas ni cambian de tipo, pero son suyas
FORMAS_DE_ANIL = {("PIKACHU", "16"), ("MEWTWO", "5")}

# Bolsillos de Essentials que no se llevan encima: MT y objetos clave
BOLSILLOS_FUERA = {"4", "8"}
GRUPO_DEL_BOLSILLO = {"1": "Objetos", "2": "Medicinas", "3": "Bolas", "5": "Bayas", "6": "Objetos", "7": "Objetos de combate"}


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


def etiqueta(nombre, especie):
    """Como las de la app: «Mega Y», «Corte Corazón», «Amarillo» (sin la especie ni «Forma»)"""
    palabras = [p for p in nombre.split() if p.lower() not in (especie.lower(), "forma")]
    return " ".join(palabras) or nombre


def lista(campo):
    return [x.strip() for x in campo.split(",") if x.strip()] if campo else []


def main():
    pbs, csvs, ruta_estandar = sys.argv[1:4]
    cargar = lambda nombre: json.load(open(os.path.join(LIB, nombre), encoding="utf-8"))
    tipos_app = cargar("tipos.json")
    pokedex = cargar("pokedex.json")["species"]
    movimientos = cargar("movimientos.json")["movimientos"]
    habilidades_app = cargar("habilidades.json")
    objetos_app = cargar("objetos.json")["objetos"]
    formas_animados = json.load(open(os.path.join(AQUI, "sprites-animados-formas.json"), encoding="utf-8"))
    tipo_id = {t["slug"]: t["id"] for t in tipos_app["tipos"]}
    de_ahora = {int(k): v for k, v in tipos_app["porPokemon"].items()}

    def tipos_de(campo):
        return [tipo_id[t.lower()] for t in lista(campo) if t.lower() in tipo_id]

    especie_id = {}
    for fila in csv.DictReader(open(os.path.join(csvs, "pokemon_species.csv"), encoding="utf-8")):
        especie_id[fila["identifier"].replace("-", "").upper()] = int(fila["id"])
    especie_id["NIDORANFE"], especie_id["NIDORANMA"] = 29, 32
    formas_app = {e["dex"]: e.get("forms", []) for e in pokedex}
    nombre_app = {e["dex"]: e["name"] for e in pokedex}
    estandar = {tuple(s["clave"]): s["campos"] for s in leer_pbs(ruta_estandar)}

    especies = leer_pbs(os.path.join(pbs, "pokemon.txt"))
    por_clave = {s["clave"][0]: s for s in especies}

    # --- Pokémon nuevos: las especies que PokéAPI no conoce -----------------
    numero = PRIMER_NUMERO
    nuevos = []
    for s in especies:
        if s["clave"][0].upper() in especie_id:
            continue
        nuevos.append({"dex": numero, "name": s["campos"]["Name"], "tipos": tipos_de(s["campos"]["Types"]), "clave": s["clave"][0]})
        numero += 1
    numero_de_especie = dict(especie_id)
    for n in nuevos:
        numero_de_especie[n["clave"].upper()] = n["dex"]
    nuevo_por_clave = {n["clave"]: n for n in nuevos}
    for s in especies:
        for destino in lista(s["campos"].get("Evolutions", ""))[0::3]:
            if destino in nuevo_por_clave:
                nuevo_por_clave[destino]["de"] = especie_id[s["clave"][0].upper()]

    # --- Formas: la oficial que es, o una nueva de Añil ---------------------
    def huella(nombre, *especies_):
        p = f" {plano(nombre)} "
        for e in especies_:
            if e:
                p = p.replace(f" {plano(e)} ", " ")
        return " ".join(w for w in p.split() if w not in ("forma", "de", "la", "el", "del"))

    formas = leer_pbs(os.path.join(pbs, "pokemon_forms.txt"))
    numero_de_forma = {}  # (CLAVE, "n") → número en la app
    formas_nuevas = []
    for s in formas:
        base, n = s["clave"][0], s["clave"][1] if len(s["clave"]) > 1 else "0"
        campos = s["campos"]
        dex = especie_id.get(base.upper())
        if n == "0" or base not in por_clave:
            continue
        if (base, n) in FORMAS_A_MANO:
            numero_de_forma[(base, n)] = FORMAS_A_MANO[(base, n)]
            continue
        if dex and (base, n) in estandar and f"{base}_{n}" in formas_animados:
            numero_de_forma[(base, n)] = formas_animados[f"{base}_{n}"]
            continue
        if dex:
            suya = huella(campos.get("FormName", ""), por_clave[base]["campos"]["Name"], nombre_app.get(dex))
            candidatas = [
                fid
                for fid, etiqueta in formas_app.get(dex, [])
                if fid != dex and suya and huella(etiqueta, por_clave[base]["campos"]["Name"], nombre_app.get(dex)) == suya
            ]
            if len(candidatas) == 1:
                numero_de_forma[(base, n)] = candidatas[0]
                continue
        # No es una de la app: ¿es de Añil?
        tipos_estandar = estandar.get((base, n), {}).get("Types") or por_clave[base]["campos"].get("Types")
        cambia_tipo = "Types" in campos and tipos_de(campos["Types"]) != tipos_de(tipos_estandar or "")
        if not ((base, n) not in estandar and campos.get("MegaStone")) and not cambia_tipo and (base, n) not in FORMAS_DE_ANIL:
            continue
        nueva = {
            "id": numero,
            "de": numero_de_especie[base.upper()],
            "etiqueta": etiqueta(campos.get("FormName") or f"Forma {n}", por_clave[base]["campos"]["Name"]),
            "clave": (base, n),
        }
        numero_de_forma[(base, n)] = numero
        formas_nuevas.append(nueva)
        numero += 1

    def numero_de(base, n):
        return numero_de_especie.get(base.upper()) if n == "0" else numero_de_forma.get((base, n))

    # --- Tipos en Añil ------------------------------------------------------
    tipos_en_anil = {}
    for s in especies:
        dex = numero_de_especie.get(s["clave"][0].upper())
        if dex and "Types" in s["campos"]:
            tipos_en_anil[dex] = tipos_de(s["campos"]["Types"])
    for s in formas:
        base, n = s["clave"][0], s["clave"][1] if len(s["clave"]) > 1 else "0"
        fid = numero_de(base, n) if n != "0" else None
        if fid is None or base not in por_clave:
            continue
        tipos_en_anil[fid] = tipos_de(s["campos"]["Types"]) if "Types" in s["campos"] else tipos_de(por_clave[base]["campos"]["Types"])
    cambios_de_tipo = {k: v for k, v in tipos_en_anil.items() if v and v != de_ahora.get(k)}
    for nueva in formas_nuevas:
        nueva["tipos"] = tipos_en_anil[nueva["id"]]

    # --- Objetos -------------------------------------------------------------
    slug_de_objeto = {o["slug"].replace("-", ""): o["slug"] for o in objetos_app}
    objetos = leer_pbs(os.path.join(pbs, "items.txt"))
    def objeto_de(clave):
        return slug_de_objeto.get(clave.lower()) or f"anil-{clave.lower()}"
    objetos_nuevos = []
    for o in objetos:
        clave, campos = o["clave"][0], o["campos"]
        if clave.lower() in slug_de_objeto or campos.get("Pocket") in BOLSILLOS_FUERA:
            continue
        objetos_nuevos.append({"slug": objeto_de(clave), "nombre": campos["Name"], "grupo": GRUPO_DEL_BOLSILLO.get(campos.get("Pocket"), "Objetos"), "clave": clave})
    en_anil = {o["clave"][0].lower() for o in objetos}
    objetos_fuera = sorted(o["slug"] for o in objetos_app if o["slug"].replace("-", "") not in en_anil)

    # --- Megapiedras: a qué mega lleva cada una, y desde qué forma ----------
    megas = {}
    for s in formas:
        base, n = s["clave"][0], s["clave"][1] if len(s["clave"]) > 1 else "0"
        piedra = s["campos"].get("MegaStone")
        mega = numero_de(base, n)
        if not piedra or mega is None:
            continue
        desde = numero_de(base, s["campos"].get("UnmegaForm", "0")) or numero_de_especie[base.upper()]
        megas.setdefault(objeto_de(piedra), []).append([mega, desde])
    # Dos megas con el mismo nombre (Toxtricity): se distinguen por la forma de la que salen
    etiqueta_de_forma = {fid: et for e in pokedex for fid, et in e.get("forms", [])}
    for nueva in formas_nuevas:
        repetidas = [f for f in formas_nuevas if f["de"] == nueva["de"] and f["etiqueta"] == nueva["etiqueta"]]
        if len(repetidas) > 1:
            for piedra, destinos in megas.items():
                for mega, desde in destinos:
                    if mega == nueva["id"] and desde != nueva["de"]:
                        nueva["etiqueta"] += f" ({etiqueta_de_forma.get(desde, desde)})"
    for nueva in formas_nuevas:
        campos = next(f["campos"] for f in formas if (f["clave"][0], f["clave"][1] if len(f["clave"]) > 1 else "0") == nueva["clave"])
        if campos.get("MegaStone"):
            nueva["mega"] = objeto_de(campos["MegaStone"])

    # --- Habilidades -----------------------------------------------------------
    slug_de_habilidad = {h["s"].replace("-", ""): h["s"] for h in habilidades_app["habilidades"]}
    def habilidad_de(clave):
        return HABILIDADES_OFICIALES.get(clave) or slug_de_habilidad.get(clave.lower()) or f"anil-{clave.lower()}"
    habilidades = [
        {"s": habilidad_de(h["clave"][0]), "n": h["campos"]["Name"], "d": h["campos"].get("Description", "")}
        for h in leer_pbs(os.path.join(pbs, "abilities.txt"))
    ]
    habilidades.sort(key=lambda h: h["n"])
    def suyas(campos, respaldo=None):
        normales = lista(campos.get("Abilities", "")) or (respaldo or {}).get("normales", [])
        ocultas = lista(campos.get("HiddenAbilities", "")) or (respaldo or {}).get("ocultas", [])
        vistas = []
        for h in [*normales, *ocultas]:
            if habilidad_de(h) not in vistas:
                vistas.append(habilidad_de(h))
        return vistas, {"normales": normales, "ocultas": ocultas}
    por_pokemon = {}
    de_la_especie = {}
    for s in especies:
        dex = numero_de_especie.get(s["clave"][0].upper())
        if dex:
            lista_, crudas = suyas(s["campos"])
            de_la_especie[s["clave"][0]] = crudas
            por_pokemon[dex] = lista_
    for s in formas:
        base, n = s["clave"][0], s["clave"][1] if len(s["clave"]) > 1 else "0"
        fid = numero_de(base, n) if n != "0" else None
        if fid is not None and ("Abilities" in s["campos"] or "HiddenAbilities" in s["campos"] or fid >= PRIMER_NUMERO):
            por_pokemon[fid], _ = suyas(s["campos"], de_la_especie.get(base))
    oficiales = habilidades_app["porPokemon"]
    habilidades_por_pokemon = {str(k): v for k, v in sorted(por_pokemon.items()) if v and v != oficiales.get(str(k))}

    # --- Movimientos: los nuevos, y los de siempre que cambian de tipo o de potencia
    slugs_app = {m["s"].replace("-", ""): m for m in movimientos}
    nuevos_movs, tipos_de_movimientos, potencias = [], {}, {}
    for s in leer_pbs(os.path.join(pbs, "moves.txt")):
        clave, campos = s["clave"][0].lower(), s["campos"]
        tipo = tipo_id.get(campos["Type"].lower())
        if tipo is None or (clave in OFICIALES and OFICIALES[clave] is None):
            continue
        if clave in OFICIALES:
            clave = OFICIALES[clave].replace("-", "")
        potencia = int(campos["Power"]) if campos.get("Power") and campos["Power"] not in ("0", "1") else None
        if clave in slugs_app:
            suyo = slugs_app[clave]
            if suyo["t"] != tipo:
                tipos_de_movimientos[suyo["s"]] = tipo
            if potencia and suyo.get("p") and potencia != suyo["p"]:
                potencias[suyo["s"]] = potencia
            continue
        nuevo = {"s": f"anil-{clave}", "n": campos["Name"], "t": tipo, "c": CATEGORIAS[campos["Category"]], "g": 9}
        if potencia:
            nuevo["p"] = potencia
        nuevos_movs.append(nuevo)

    # --- Escribir ------------------------------------------------------------
    datos = {
        "especies": [{k: v for k, v in n.items() if k != "clave"} for n in nuevos],
        "formas": [
            {**{k: v for k, v in f.items() if k != "clave"}, "sprite": f"{f['clave'][0]}_{f['clave'][1]}"} for f in formas_nuevas
        ],
        "tipos": {str(k): v for k, v in sorted(cambios_de_tipo.items())},
        "movimientos": nuevos_movs,
        "tiposDeMovimientos": tipos_de_movimientos,
        "potencias": potencias,
        "megas": megas,
        "objetos": {"nuevos": [{k: v for k, v in o.items() if k != "clave"} for o in objetos_nuevos], "fuera": objetos_fuera},
    }
    json.dump(datos, open(os.path.join(LIB, "anil.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    json.dump(
        {"habilidades": habilidades, "porPokemon": habilidades_por_pokemon},
        open(os.path.join(LIB, "habilidades-anil.json"), "w", encoding="utf-8"),
        ensure_ascii=False,
        separators=(",", ":"),
    )
    # Qué dibujo de objeto toca a cada objeto nuevo, para scripts/anil-sprites.py
    json.dump(
        {o["slug"]: o["clave"] for o in objetos_nuevos},
        open(os.path.join(AQUI, "anil-objetos.json"), "w", encoding="utf-8"),
        separators=(",", ":"),
    )
    nuevas_hab = [h["n"] for h in habilidades if h["s"].startswith("anil-")]
    print(
        f"{len(nuevos)} pokémon nuevos, {len(formas_nuevas)} formas nuevas ({sum(1 for f in formas_nuevas if 'mega' in f)} megas), "
        f"{len(cambios_de_tipo)} cambios de tipo, {len(nuevos_movs)} movimientos nuevos, {len(tipos_de_movimientos)} con otro tipo, "
        f"{len(potencias)} con otra potencia, {len(megas)} megapiedras, {len(objetos_nuevos)} objetos nuevos y {len(objetos_fuera)} fuera, "
        f"{len(habilidades)} habilidades ({len(nuevas_hab)} nuevas: {nuevas_hab}), {len(habilidades_por_pokemon)} pokémon con otras habilidades"
    )
    for f in formas_nuevas:
        print("  ", f["id"], f["etiqueta"], f["tipos"], f.get("mega", ""))


if __name__ == "__main__":
    main()
