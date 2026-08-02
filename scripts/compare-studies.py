#!/usr/bin/env python3
"""
Compara las cifras publicadas (hardcodeadas en cada src/pages/analisis/*.astro)
contra los agregados recalculados del motor v2 (scripts/out/v2/<niche>.json).
No escribe nada — solo imprime la tabla de diffs para revisión humana antes
de decidir qué páginas actualizar.
"""
import json, re, glob, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_V2 = os.path.join(ROOT, "scripts/out/v2")
PAGES = os.path.join(ROOT, "src/pages/analisis")

# niche url-list -> archivo(s) .astro publicados que citan esas cifras
MAPPING = {
    "urls": ["estudio-webs-clinicas-dentales-costa-rica-2026.astro"],
    "urls-esteticas": ["estudio-webs-clinicas-esteticas-costa-rica-2026.astro"],
    "urls-medicos": ["estudio-webs-consultorios-medicos-costa-rica-2026.astro"],
    "urls-acabados": ["estudio-webs-acabados-instaladores-costa-rica-2026.astro"],
    "urls-constructoras": ["estudio-webs-constructoras-costa-rica-2026.astro"],
    "urls-cocinas": ["estudio-webs-cocinas-muebles-costa-rica-2026.astro"],
    "urls-piscinas": ["estudio-webs-piscinas-exteriores-costa-rica-2026.astro"],
    "urls-moda": ["estudio-webs-tienda-moda-costa-rica-2026.astro"],
    "urls-belleza": ["estudio-webs-tienda-belleza-costa-rica-2026.astro"],
    "urls-hogar": ["estudio-webs-tienda-hogar-costa-rica-2026.astro"],
    "urls-electronica": ["estudio-webs-tienda-electronica-costa-rica-2026.astro"],
    "urls-alimentos": ["estudio-webs-tienda-alimentos-costa-rica-2026.astro"],
    "urls-mascotas": ["estudio-webs-tienda-mascotas-costa-rica-2026.astro"],
    "urls-restaurantes": ["estudio-webs-restaurantes-costa-rica-2026.astro"],
    "urls-cafeterias": ["estudio-webs-cafeterias-costa-rica-2026.astro"],
    "urls-panaderias": ["estudio-webs-panaderias-costa-rica-2026.astro"],
    "urls-heladerias": ["estudio-webs-heladerias-costa-rica-2026.astro"],
    "urls-bares": ["estudio-webs-bares-discotecas-costa-rica-2026.astro"],
    "urls-consultoria": ["estudio-webs-consultoria-empresarial-costa-rica-2026.astro"],
    "urls-cursos": ["estudio-webs-academias-cursos-costa-rica-2026.astro"],
    "urls-agencias-web": ["estudio-webs-agencias-diseno-costa-rica-2026.astro"],
    "urls-marketing": ["estudio-webs-marketing-digital-costa-rica-2026.astro"],
    "urls-programacion": ["estudio-webs-programacion-desarrollo-costa-rica-2026.astro"],
    "urls-spa": [],       # sin página publicada todavía
    "urls-fitness": [],   # sin página publicada todavía
    "urls-cine": [],      # sin página publicada todavía
    "urls-tours": [],     # sin página publicada todavía
}


def load_json(niche):
    path = os.path.join(OUT_V2, f"{niche}.json")
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def aggregate(results):
    ok = [r for r in results if "index" in r]
    n = len(ok)
    if n == 0:
        return None

    def pct(pred):
        return round(100 * sum(1 for d in ok if pred(d)) / n)

    def pillar(d, key):
        for p in d["pillars"]:
            if p["key"] == key:
                return p["score"]
        return 0

    return {
        "n": n,
        "n_total": len(results),
        "indice": round(sum(d["index"] for d in ok) / n),
        "velocidad": round(sum(pillar(d, "velocidad") for d in ok) / n),
        "visibilidad": round(sum(pillar(d, "visibilidad") for d in ok) / n),
        "conversion": round(sum(pillar(d, "conversion") for d in ok) / n),
        "automatizacion": round(sum(pillar(d, "automatizacion") for d in ok) / n),
        "sinPixel": pct(lambda d: not d["tracking"]["metaPixel"]),
        "sinAnalytics": pct(lambda d: not d["tracking"]["any"]),
        "sinWhatsApp": pct(lambda d: not d["conversion"]["whatsapp"]),
        "reprVelocidad": pct(lambda d: (d["speed"]["mobile"] or {}).get("performance") in (None,) or (d["speed"]["mobile"]["performance"] or 0) < 50),
        "gradeA": sum(1 for d in ok if d["grade"] in ("A", "A+")),
        "gradeB": sum(1 for d in ok if d["grade"] == "B"),
        "gradeC": sum(1 for d in ok if d["grade"] == "C"),
        "gradeD": sum(1 for d in ok if d["grade"] == "D"),
        "gradeE": sum(1 for d in ok if d["grade"] == "E"),
        "failed": [r["url"] for r in results if "failed" in r],
    }


def parse_published(astro_path):
    """Extrae el objeto const D = {...} de una página publicada con regex laxo."""
    with open(astro_path) as f:
        src = f.read()
    m = re.search(r"const D = \{(.*?)\n\};", src, re.S)
    if not m:
        return None
    body = m.group(1)

    def num(key):
        mm = re.search(rf"{key}:\s*(-?\d+)", body)
        return int(mm.group(1)) if mm else None

    pilares = {}
    for pm in re.finditer(r"k:\s*'(\w+)',\s*v:\s*(\d+)", body):
        pilares[pm.group(1)] = int(pm.group(2))

    grados = {}
    for gm in re.finditer(r"g:\s*'(\w)',[^}]*?n:\s*(\d+)", body):
        grados[gm.group(1)] = int(gm.group(2))

    return {
        "revisadas": num("revisadas"),
        "legibles": num("legibles"),
        "indice": num("indice"),
        "sinPixel": num("sinPixel"),
        "sinAnalytics": num("sinAnalytics"),
        "sinWhatsApp": num("sinWhatsApp"),
        "pilares": pilares,
        "grados": grados,
    }


def fmt_delta(old, new):
    if old is None or new is None:
        return "?"
    d = new - old
    sign = "+" if d > 0 else ""
    flag = "  ⚠" if abs(d) >= 10 else ""
    return f"{old} → {new} ({sign}{d}){flag}"


def main():
    print(f"{'NICHO':30s} {'n (ok/total)':13s} {'Índice':22s} {'sin Pixel':22s} {'sin Analytics':22s} {'sin WhatsApp':22s}")
    print("-" * 135)
    no_data = []
    no_page = []
    for niche, pages in MAPPING.items():
        results = load_json(niche)
        if results is None:
            no_data.append(niche)
            continue
        agg = aggregate(results)
        if agg is None:
            continue
        if not pages:
            no_page.append((niche, agg))
            continue
        for page in pages:
            path = os.path.join(PAGES, page)
            if not os.path.exists(path):
                print(f"{niche:30s}  (página no encontrada: {page})")
                continue
            pub = parse_published(path)
            if pub is None:
                print(f"{niche:30s}  (no se pudo parsear const D en {page})")
                continue
            short_name = page.replace('estudio-webs-', '').replace('-costa-rica-2026.astro', '')
            n_str = f"{agg['n']}/{agg['n_total']}"
            print(
                f"{short_name:30s} "
                f"{n_str:13s} "
                f"{fmt_delta(pub['indice'], agg['indice']):22s} "
                f"{fmt_delta(pub['sinPixel'], agg['sinPixel']):22s} "
                f"{fmt_delta(pub['sinAnalytics'], agg['sinAnalytics']):22s} "
                f"{fmt_delta(pub['sinWhatsApp'], agg['sinWhatsApp']):22s}"
            )
            if agg["failed"]:
                print(f"    fallidos ({len(agg['failed'])}): {', '.join(agg['failed'][:5])}{' …' if len(agg['failed'])>5 else ''}")

    if no_page:
        print("\n— Sin página publicada (material nuevo, no se compara) —")
        for niche, agg in no_page:
            print(f"  {niche:25s} n={agg['n']}/{agg['n_total']}  índice={agg['indice']}  sinPixel={agg['sinPixel']}%")

    if no_data:
        print(f"\n— Aún sin datos v2 (en cola o en progreso): {', '.join(no_data)}")


if __name__ == "__main__":
    main()
