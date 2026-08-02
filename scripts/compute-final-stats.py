#!/usr/bin/env python3
"""
Calcula el set COMPLETO de cifras finales (nivel hoja + nivel sector/pilar +
nivel maestro) a partir de los JSON re-validados en scripts/out/v2/.
No toca ninguna página .astro — solo escribe scripts/out/final-stats.json,
que luego se usa para reescribir cada página con criterio.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_V2 = os.path.join(ROOT, "scripts/out/v2")

LEAF_FILES = {
    "clinicas-dentales": "urls",
    "clinicas-esteticas": "urls-esteticas",
    "consultorios-medicos": "urls-medicos",
    "acabados-instaladores": "urls-acabados",
    "constructoras": "urls-constructoras",
    "cocinas-muebles": "urls-cocinas",
    "piscinas-exteriores": "urls-piscinas",
    "tienda-moda": "urls-moda",
    "tienda-belleza": "urls-belleza",
    "tienda-hogar": "urls-hogar",
    "tienda-electronica": "urls-electronica",
    "tienda-alimentos": "urls-alimentos",
    "tienda-mascotas": "urls-mascotas",
    "restaurantes": "urls-restaurantes",
    "cafeterias": "urls-cafeterias",
    "panaderias": "urls-panaderias",
    "heladerias": "urls-heladerias",
    "bares-discotecas": "urls-bares",
    "consultoria-empresarial": "urls-consultoria",
    "academias-cursos": "urls-cursos",
    "agencias-diseno": "urls-agencias-web",
    "marketing-digital": "urls-marketing",
    "programacion-desarrollo": "urls-programacion",
}

PILLARS = {
    "sector-salud": ["clinicas-dentales", "clinicas-esteticas", "consultorios-medicos"],
    "sector-construccion": ["acabados-instaladores", "constructoras", "cocinas-muebles", "piscinas-exteriores"],
    "ecommerce": ["tienda-moda", "tienda-belleza", "tienda-hogar", "tienda-electronica", "tienda-alimentos", "tienda-mascotas"],
    "alimentos-bebidas": ["restaurantes", "cafeterias", "panaderias", "heladerias", "bares-discotecas"],
    "servicios-digitales": ["consultoria-empresarial", "academias-cursos", "agencias-diseno", "marketing-digital", "programacion-desarrollo"],
}

MASTER_SECTORS = ["sector-salud", "sector-construccion", "ecommerce", "alimentos-bebidas"]


def load(niche_slug):
    fname = LEAF_FILES[niche_slug]
    with open(os.path.join(OUT_V2, f"{fname}.json")) as f:
        results = json.load(f)
    ok = [r for r in results if "index" in r]
    failed = [r["url"] for r in results if "failed" in r]
    return ok, failed


def pillar(d, key):
    for p in d["pillars"]:
        if p["key"] == key:
            return p["score"]
    return 0


def leaf_stats(niche_slug):
    ok, failed = load(niche_slug)
    n = len(ok)
    total = n + len(failed)

    def pct(pred):
        return round(100 * sum(1 for d in ok if pred(d)) / n) if n else 0

    def avg(f):
        return round(sum(f(d) for d in ok) / n) if n else 0

    grados = {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0}
    for d in ok:
        g = d["grade"].replace("+", "")
        grados[g] = grados.get(g, 0) + 1

    return {
        "revisadas": total,
        "legibles": n,
        "excluidas": total - n,
        "indice": avg(lambda d: d["index"]),
        "velocidad": avg(lambda d: pillar(d, "velocidad")),
        "visibilidad": avg(lambda d: pillar(d, "visibilidad")),
        "conversion": avg(lambda d: pillar(d, "conversion")),
        "automatizacion": avg(lambda d: pillar(d, "automatizacion")),
        "sinPixel": pct(lambda d: not d["tracking"]["metaPixel"]),
        "conPixel": pct(lambda d: d["tracking"]["metaPixel"]),
        "sinAnalytics": pct(lambda d: not d["tracking"]["any"]),
        "sinWhatsApp": pct(lambda d: not d["conversion"]["whatsapp"]),
        "reprVelocidad": pct(lambda d: ((d["speed"]["mobile"] or {}).get("performance") or 0) < 50),
        "grados": grados,
        "n_ok": n,
        "n_total": total,
        "failed_hosts": failed,
        "_sites": ok,  # uso interno para agregar a nivel pilar; se descarta al exportar
    }


def pillar_stats(sub_slugs):
    """Agrega por POOLING real de sitios (no promedio de promedios) — más
    riguroso que promediar los indices de cada sub-estudio."""
    pooled = []
    for slug in sub_slugs:
        pooled.extend(leaf_stats(slug)["_sites"])
    n = len(pooled)

    def pct(pred):
        return round(100 * sum(1 for d in pooled if pred(d)) / n) if n else 0

    def avg(f):
        return round(sum(f(d) for d in pooled) / n) if n else 0

    grados = {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0}
    for d in pooled:
        g = d["grade"].replace("+", "")
        grados[g] = grados.get(g, 0) + 1

    return {
        "total": n,
        "indice": avg(lambda d: d["index"]),
        "sinPixel": pct(lambda d: not d["tracking"]["metaPixel"]),
        "sinAnalytics": pct(lambda d: not d["tracking"]["any"]),
        "sinWhatsApp": pct(lambda d: not d["conversion"]["whatsapp"]),
        "gradoA": grados["A"],
        "grados": grados,
        "_sites": pooled,
    }


def strip_internal(d):
    return {k: v for k, v in d.items() if not k.startswith("_")}


def main():
    out = {"leaf": {}, "pillar": {}, "master": {}}

    for slug in LEAF_FILES:
        out["leaf"][slug] = strip_internal(leaf_stats(slug))

    pillar_pooled = {}
    for pname, subs in PILLARS.items():
        stats = pillar_stats(subs)
        pillar_pooled[pname] = stats
        entry = strip_internal(stats)
        entry["sectores"] = []
        for slug in subs:
            ls = out["leaf"][slug]
            entry["sectores"].append({"slug": slug, "n": ls["legibles"], "indice": ls["indice"], "sinPixel": ls["sinPixel"]})
        out["pillar"][pname] = entry

    # Maestro: pooling real de los 4 sectores núcleo (salud, construcción,
    # ecommerce, alimentos-bebidas) — replica la composición original del
    # estudio "estado-digital-empresas" (NO incluye servicios-digitales,
    # que se publicó después y nunca formó parte de ese estudio).
    master_pooled = []
    for pname in MASTER_SECTORS:
        master_pooled.extend(pillar_pooled[pname]["_sites"])
    n = len(master_pooled)
    out["master"] = {
        "total_sitios": n,  # cifra correcta y verificable — la publicada (386) no cuadra con la suma real de sectores (346)
        "indice": round(sum(d["index"] for d in master_pooled) / n),
        "sinPixel": round(100 * sum(1 for d in master_pooled if not d["tracking"]["metaPixel"]) / n),
        "sectores": {p: strip_internal(pillar_pooled[p]) for p in MASTER_SECTORS},
    }
    del out["master"]["sectores"]  # ya está completo en out["pillar"]; evita duplicar JSON gigante
    out["master"]["sector_totales"] = {p: pillar_pooled[p]["total"] for p in MASTER_SECTORS}
    out["master"]["sector_indices"] = {p: strip_internal(pillar_pooled[p])["indice"] for p in MASTER_SECTORS}
    out["master"]["sector_sinPixel"] = {p: strip_internal(pillar_pooled[p])["sinPixel"] for p in MASTER_SECTORS}

    with open(os.path.join(ROOT, "scripts/out/final-stats.json"), "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)

    # Resumen legible en consola
    print("═══ LEAF (23 estudios individuales) ═══")
    for slug, s in out["leaf"].items():
        print(f"  {slug:28s} n={s['legibles']:3d}  índice={s['indice']:3d}  sinPixel={s['sinPixel']:3d}%  sinAnalytics={s['sinAnalytics']:3d}%  sinWA={s['sinWhatsApp']:3d}%")
    print("\n═══ PILARES (5 sectores) ═══")
    for pname, s in out["pillar"].items():
        print(f"  {pname:22s} n={s['total']:3d}  índice={s['indice']:3d}  sinPixel={s['sinPixel']:3d}%  sinAnalytics={s['sinAnalytics']:3d}%")
    print("\n═══ MAESTRO (estado-digital-empresas) ═══")
    print(f"  total real (pooling 4 sectores núcleo): {out['master']['total_sitios']}  (publicado: 386 — NO cuadra con 104+90+109+43=346)")
    print(f"  índice: {out['master']['indice']}   sinPixel: {out['master']['sinPixel']}%")
    print(f"  por sector: {out['master']['sector_totales']}")


if __name__ == "__main__":
    main()
