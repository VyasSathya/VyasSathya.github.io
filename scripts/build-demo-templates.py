"""Build demo/templates.js from the researched business types in docs/research/templates-*.json.

Each research file is a list of business types with real milestones, billing, what clients owe and
decide, and sources. This keeps the research as the source and the page data as a build output.
Run: python scripts/build-demo-templates.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = ["home", "creative", "professional", "personal"]
# Shown as quick picks on the offer page, in this order; everything else is under "More".
FEATURED = ["kitchen-bath-remodel", "roofing", "interior-design", "landscape-hardscape", "video-production", "wedding-planning",
            "web-design", "real-estate-buyer", "immigration-law", "bookkeeping-cleanup", "auto-repair", "business-coaching"]
# Everyday words visitors type that the research keywords missed.
EXTRA = {"kitchen-bath-remodel": ["general contractor", "contractor", "plumber", "plumbing", "electrician", "handyman", "renovation", "remodeler", "kitchens"],
         "commercial-photography": ["photographer", "photography", "headshots"], "tax-prep-individual": ["accountant", "cpa"],
         "business-coaching": ["life coach", "coach", "coaching"], "web-design": ["website", "web developer", "developer"]}
# Short names for the pick buttons.
CHIP = {"kitchen-bath-remodel": "Remodeling", "adu-builder": "ADU builder", "landscape-hardscape": "Landscaping", "custom-cabinetry": "Cabinetry",
        "post-construction-cleaning": "Cleaning", "commercial-photography": "Photography", "wedding-photo-video": "Wedding photo and video", "corporate-events": "Event planning",
        "tax-prep-individual": "Tax prep", "tax-prep-business": "Business tax", "fractional-cfo": "Accounting", "family-law": "Family law",
        "real-estate-buyer": "Real estate", "real-estate-seller": "Real estate (selling)", "recruiting-search": "Recruiting", "insurance-broker-commercial": "Insurance",
        "business-coaching": "Coaching", "tutoring-test-prep": "Tutoring", "auto-repair": "Auto repair", "auto-body": "Auto body", "custom-fabrication": "Fabrication",
        "screen-printing": "Screen printing", "bridal-alterations": "Tailoring", "travel-planning": "Travel planning", "managed-it": "IT services", "3d-printing": "3D printing",
        "web-design": "Web design", "marketing-agency": "Marketing", "recording-studio": "Music production", "print-signage": "Print and signs", "animation-motion": "Animation", "branding": "Branding"}
GROUP_ORDER = ["Home and property", "Creative and media", "Professional services", "Personal and other"]


def fail(msg):
    raise SystemExit(f"build-demo-templates: {msg}")


def clean(s):
    return str(s).replace("â€™", "'").replace("â€”", "-").replace("â€“", "-").strip()


def main():
    out, groups = {}, {g: [] for g in GROUP_ORDER}
    for name in FILES:
        path = ROOT / "docs" / "research" / f"templates-{name}.json"
        types = json.loads(path.read_text(encoding="utf-8-sig"))
        for t in types:
            key = re.sub(r"[^a-z0-9-]", "-", t["key"].lower()).strip("-")
            if key in out:
                fail(f"duplicate key {key}")
            ms = t["ms"]
            if len(ms) != 4:
                fail(f"{key}: needs 4 milestones")
            words = sorted({clean(w).lower() for w in t.get("match", []) + [t["label"]] + EXTRA.get(t["key"], []) if clean(w)}, key=len, reverse=True)
            if not words:
                fail(f"{key}: no match words")
            ask = t["ask"]
            out[key] = {
                "label": clean(t["label"]), "chip": CHIP.get(key, re.sub(r"\s*\(.*?\)", "", clean(t["label"]))), "group": clean(t.get("group", "Personal and other")),
                "words": words,
                "biz": clean(t["biz"]), "person": clean(t["person"]), "project": clean(t["project"]), "summary": clean(t["summary"]),
                "ms": [[clean(m[0]), clean(m[1]), (int(m[2]) if m[2] else None), [clean(i) for i in m[3]][:5]] for m in ms],
                "waiting": clean(t["waiting"]),
                "ask": [clean(ask[0]), [clean(c) for c in ask[1]][:4], clean(ask[2]) if len(ask) > 2 else ""],
                "answered": [clean(t["answered"][0]), clean(t["answered"][1])],
                "checkin": [clean(c) for c in t["checkin"]][:3],
                "talk": [clean(c) for c in t["talk"]][:3],
                "tools": [clean(x) for x in t.get("tools", [])][:6],
            }
            g = out[key]["group"] if out[key]["group"] in groups else "Personal and other"
            groups[g].append(key)
    # Industry screens written from docs/research/flows-*.md: modules, the texts a client gets, apps.
    for mf in sorted((ROOT / "docs" / "research").glob("modules-*.json")):
        for key, extra in json.loads(mf.read_text(encoding="utf-8-sig")).items():
            if key not in out:
                fail(f"{mf.name}: unknown type {key}")
            out[key].update({k: extra[k] for k in ("modules", "texts", "apps") if k in extra})
    missing = [k for k in FEATURED if k not in out]
    if missing:
        fail(f"featured keys not found: {missing}; available: {sorted(out)}")

    js = ["// Built by scripts/build-demo-templates.py from docs/research/templates-*.json. Do not edit by hand.",
          "// One sample project per kind of business; {biz} is replaced with the visitor's business name."]
    js.append("const DEMO_TEMPLATES = {")
    for key, t in out.items():
        js.append(f"  {json.dumps(key)}: {json.dumps(t, ensure_ascii=True, separators=(',', ':'))},")
    js.append("};")
    js.append(f"const DEMO_FEATURED = {json.dumps(FEATURED)};")
    js.append(f"const DEMO_GROUPS = {json.dumps({g: k for g, k in groups.items() if k})};")
    js.append(r"""
const DEMO_FALLBACK = word => ({
  label: word, group: '', biz: '{biz}', person: 'Your client', project: `${word.charAt(0).toUpperCase() + word.slice(1)} project`,
  summary: 'Every step of the job, what is waiting on your client, and getting paid.',
  ms: [
    ['Kickoff', 'Scope, schedule and price agreed.', 100000, ['Kickoff call', 'Scope', 'Schedule']],
    ['First half of the work', 'The first half delivered.', 250000, ['Step one', 'Step two', 'Step three']],
    ['Second half of the work', 'Everything delivered for your review.', 250000, ['Step four', 'Step five', 'Review copy']],
    ['Wrap-up', 'Final changes and handover.', 100000, ['Final changes', 'Handover', 'Sign-off']],
  ],
  waiting: 'One thing we need from you',
  ask: ['A choice for you to make', ['Option A', 'Option B', 'Option C'], ''],
  answered: ['An earlier choice', 'Option A'],
  checkin: ['- Second half delivered', '- Final changes after your review', '- One thing from you'],
  talk: ['The second half is ready for your review.', 'Looks good. One small change?', 'Of course, send it over.'],
});

// A key, or words a visitor typed: the closest researched type, else a generic project in their words.
function demoTemplate(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  if (DEMO_TEMPLATES[t]) return Object.assign({ key: t }, DEMO_TEMPLATES[t]);
  const low = t.toLowerCase();
  let best = null, score = 0;
  // A whole keyword inside what they typed wins, longest first.
  for (const k of Object.keys(DEMO_TEMPLATES)) for (const w of DEMO_TEMPLATES[k].words) if (w.length > score && low.includes(w)) { best = k; score = w.length; }
  if (!best) {
    // Otherwise compare word stems, so "photographer" finds "photography" and "kitchens" finds "kitchen".
    const STOP = new Set(['studio', 'studi', 'servi', 'compa', 'busin', 'local', 'small', 'group', 'works', 'proje', 'clien', 'agenc', 'desig', 'speci']);
    const stem = w => w.slice(0, 5);
    const typed = low.split(/[^a-z0-9]+/).filter(w => w.length >= 4).map(stem).filter(s => !STOP.has(s));
    for (const k of Object.keys(DEMO_TEMPLATES)) {
      const stems = new Set(DEMO_TEMPLATES[k].words.join(' ').split(/[^a-z0-9]+/).filter(w => w.length >= 4).map(stem));
      const hits = typed.filter(s => stems.has(s)).length;
      if (hits > score) { best = k; score = hits; }
    }
  }
  return best ? Object.assign({ key: best }, DEMO_TEMPLATES[best]) : DEMO_FALLBACK(low.slice(0, 40));
}
""")
    (ROOT / "demo" / "templates.js").write_text("\n".join(js), encoding="utf-8")
    print(f"{len(out)} types; groups: " + ", ".join(f"{g} {len(k)}" for g, k in groups.items()))


if __name__ == "__main__":
    main()
