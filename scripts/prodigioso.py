"""
Los datos del **Intercambio Prodigioso** (src/lib/prodigioso-especies.json),
de los CSV de PokéAPI: por cada especie del 1 al 1025, sus estadísticas base,
si es legendaria (también míticos y Ultraentes), su proporción de sexos, su
amistad de base, de quién evoluciona, **desde qué nivel se puede tener** y su
nombre en español (el que se le pone dentro del juego).

    python3 scripts/prodigioso.py <carpeta con los CSV de PokéAPI>

El nivel desde el que se puede tener es una cuenta nuestra: la base, desde el
1; lo que evoluciona por nivel, desde ese nivel; lo que evoluciona de otra
forma (piedra, intercambio, amistad), desde el 20 si es la primera evolución y
desde el 36 si es la segunda. Lo que sale de un bebé cuenta como base: Pikachu
se encuentra a nivel 3.
"""
import csv, json, sys, os

carpeta = sys.argv[1]
leer = lambda n: list(csv.DictReader(open(os.path.join(carpeta, n + ".csv"), encoding="utf-8")))

ULTRAENTES = {793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806}
especies = {int(r["id"]): r for r in leer("pokemon_species") if int(r["id"]) <= 1025}
stats = {}
for r in leer("pokemon_stats"):
    pid = int(r["pokemon_id"])
    if pid <= 1025:
        stats.setdefault(pid, {})[int(r["stat_id"])] = int(r["base_stat"])
nivel_de_evo = {}
for r in leer("pokemon_evolution"):
    e = int(r["evolved_species_id"])
    if r["evolution_trigger_id"] == "1" and r["minimum_level"]:
        m = int(r["minimum_level"])
        nivel_de_evo[e] = min(nivel_de_evo.get(e, 999), m)
nombres = {int(r["pokemon_species_id"]): r["name"] for r in leer("pokemon_species_names") if r["local_language_id"] == "7"}

def padre(n):
    v = especies[n]["evolves_from_species_id"]
    return int(v) if v else None

def es_bebe(n):
    return especies[n]["is_baby"] == "1"

def etapa(n):
    """1 la base (sin contar bebés), 2 la primera evolución, 3 la segunda"""
    p = padre(n)
    if p is None or es_bebe(n):
        return 1
    return 1 if es_bebe(p) else etapa(p) + 1

nivel_min = {}
def minimo(n):
    if n in nivel_min:
        return nivel_min[n]
    p = padre(n)
    if p is None or es_bebe(n) or es_bebe(p):
        v = 1
    elif n in nivel_de_evo:
        v = max(minimo(p), nivel_de_evo[n])
    else:
        v = max(minimo(p) + 1, 20 if etapa(n) == 2 else 36)
    nivel_min[n] = v
    return v

salida = []
for n in range(1, 1026):
    s = stats[n]
    e = especies[n]
    leg = e["is_legendary"] == "1" or e["is_mythical"] == "1" or n in ULTRAENTES
    salida.append([
        s[1], s[2], s[3], s[4], s[5], s[6],
        1 if leg else 0,
        int(e["gender_rate"]),
        int(e["base_happiness"] or 50),
        padre(n) or 0,
        minimo(n),
        nombres.get(n, ""),
    ])

destino = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "prodigioso-especies.json")
with open(destino, "w", encoding="utf-8") as f:
    json.dump({"campos": "ps,ataque,defensa,atEsp,defEsp,velocidad,legendario,sexo,amistad,de,nivelMinimo,nombre", "especies": salida}, f, ensure_ascii=False, separators=(",", ":"))
print(len(salida), "especies;", sum(1 for x in salida if x[6]), "legendarias")
