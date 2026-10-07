#!/usr/bin/env python3
"""
Junta las frases de cada especie del compañero (scripts/frases-de-especie/*.txt,
una línea por pokémon: «número|frase|frase») en src/lib/frases-de-especie.json,
que solo lee el servidor (ver lib/frases-del-companero.ts).

Comprueba que cada frase lleve {n} y avisa de las palabras con género que se
suelen colar («quieto», «contento»…): el mote no dice si es macho o hembra.

    python3 scripts/frases-de-especie.py
"""
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CARPETA = RAIZ / "scripts" / "frases-de-especie"
SALIDA = RAIZ / "src" / "lib" / "frases-de-especie.json"

CON_GENERO = re.compile(
    r"\b(quiet[oa]|content[oa]|dormid[oa]|despiert[oa]|cansad[oa]|enfadad[oa]|pegad[oa]|"
    r"misterios[oa]|preparad[oa]|list[oa]|orgullos[oa]|tranquil[oa]|atent[oa]|mism[oa]|"
    r"sentad[oa]|tumbad[oa]|colgad[oa]|abrazad[oa]|envuelt[oa]|cariños[oa]|pegajos[oa]|"
    r"coquet[oa]|solit[oa]|asustad[oa]|emocionad[oa]|aburrid[oa]|hambrient[oa]|feroz?)\b",
    re.IGNORECASE,
)

frases: dict[str, list[str]] = {}
avisos = []
for fichero in sorted(CARPETA.glob("*.txt")):
    for numero_de_linea, linea in enumerate(fichero.read_text(encoding="utf-8").splitlines(), 1):
        if not linea.strip() or linea.startswith("#"):
            continue
        numero, *suyas = [p.strip() for p in linea.split("|")]
        if not numero.isdigit() or not suyas:
            raise SystemExit(f"{fichero.name}:{numero_de_linea}: línea rara: {linea}")
        for frase in suyas:
            if "{n}" not in frase:
                raise SystemExit(f"{fichero.name}:{numero_de_linea}: sin {{n}}: {frase}")
            if CON_GENERO.search(frase):
                avisos.append(f"{fichero.name}:{numero_de_linea}: {frase}")
        if numero in frases:
            raise SystemExit(f"{fichero.name}:{numero_de_linea}: el {numero} está repetido")
        frases[numero] = suyas

faltan = [n for n in range(1, 1026) if str(n) not in frases]
SALIDA.write_text(json.dumps(frases, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"{len(frases)} especies, {sum(len(f) for f in frases.values())} frases → {SALIDA.relative_to(RAIZ)}")
if faltan:
    print("Sin frases:", faltan)
for aviso in avisos:
    print("¿Con género?", aviso)
