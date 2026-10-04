# Logo concepts, round 2 (round 1: make-concepts.py). Different ideas: no figure, no tick ring.
# Writes concept2-*.svg and sheet-2.html (each large, at 32 px, and beside the wordmark).
import base64

VOLT, GROUND, OFF, WHITE, AMBER = "#C8FF3D", "#0A0B10", "#2A2E40", "#F4F5F7", "#FFB547"
BLACK = base64.b64encode(open("../../tv-app/assets/fonts/ArchivoCondensed-Black.ttf", "rb").read()).decode()
STYLE = f"<style>@font-face{{font-family:D;src:url(data:font/ttf;base64,{BLACK})}}</style>"
svg = lambda body: (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{STYLE}'
                    f'<rect width="512" height="512" rx="112" fill="{GROUND}"/>{body}</svg>')
concepts = {}

# F. Kettlebell S: a volt kettlebell whose body carries a dark condensed S.
concepts["f-kettlebell"] = ("Kettlebell S", "A kettlebell with the S cut into it: home training, instantly.",
    svg(f'<path d="M190 196 V170 A66 66 0 0 1 322 170 V196" fill="none" stroke="{VOLT}" stroke-width="40" stroke-linecap="round"/>'
        f'<path d="M150 236 Q150 196 194 196 H318 Q362 196 362 236 L380 330 Q392 420 300 420 H212 Q120 420 132 330 Z" fill="{VOLT}"/>'
        f'<text x="256" y="388" text-anchor="middle" font-family="D" font-size="190" fill="{GROUND}">S</text>'))

# G. Bolt S: an S drawn as a lightning bolt, the brand's "volt" made literal.
concepts["g-bolt"] = ("Bolt S", "An S shaped like a lightning bolt: energy, speed, volt.",
    svg(f'<path d="M318 70 L150 268 H248 L194 442 L362 236 H262 Z" fill="{VOLT}" stroke="{VOLT}" stroke-width="10" stroke-linejoin="round"/>'))

# H. Level up: three stacked chevrons rising, the last one lit, like reps stacking into progress.
concepts["h-level-up"] = ("Level up", "Stacked chevrons rising: every rep moves you up.",
    svg("".join(f'<path d="M140 {y} L256 {y - 92} L372 {y}" fill="none" stroke="{c}" stroke-width="46" '
                f'stroke-linecap="round" stroke-linejoin="round"/>'
                for y, c in ((410, OFF), (318, WHITE), (226, VOLT)))))

# I. Spot, the mascot: a friendly round coach with a sweatband, from the reward-sticker world.
concepts["i-mascot"] = ("Spot, the mascot", "A friendly coach character, the face of the app and the stickers.",
    svg(f'<circle cx="256" cy="276" r="166" fill="{VOLT}"/>'
        f'<rect x="96" y="176" width="320" height="52" rx="26" fill="{WHITE}"/>'
        f'<rect x="96" y="194" width="320" height="16" fill="{AMBER}"/>'
        f'<circle cx="196" cy="290" r="24" fill="{GROUND}"/><circle cx="316" cy="290" r="24" fill="{GROUND}"/>'
        f'<circle cx="204" cy="282" r="8" fill="{WHITE}"/><circle cx="324" cy="282" r="8" fill="{WHITE}"/>'
        f'<path d="M200 352 Q256 400 312 352" fill="none" stroke="{GROUND}" stroke-width="22" stroke-linecap="round"/>'))

# J. Weight plate: a bumper plate seen face-on, with the S as its centre hub.
concepts["j-plate"] = ("Weight plate", "A bumper plate with the S as its hub: strength, at a glance.",
    svg(f'<circle cx="256" cy="256" r="186" fill="{VOLT}"/>'
        f'<circle cx="256" cy="256" r="134" fill="none" stroke="{GROUND}" stroke-width="10" opacity=".35"/>'
        f'<circle cx="256" cy="256" r="88" fill="{GROUND}"/>'
        f'<text x="256" y="318" text-anchor="middle" font-family="D" font-size="170" fill="{VOLT}">S</text>'))

# K. Pulse check: a heartbeat line that ends in a check mark, "your form is good".
concepts["k-pulse-check"] = ("Pulse check", "A pulse line that ends in a tick: good rep, good form.",
    svg(f'<path d="M70 280 H160 L196 196 L240 344 L276 250 L318 316 L432 170" fill="none" stroke="{VOLT}" '
        f'stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>'))

for key, (_, _, s) in concepts.items():
    open(f"concept2-{key}.svg", "w").write(s + "\n")

cards = "".join(f'''
<div class="card"><div class="big">{s}</div>
<div class="row"><div class="tiny">{s}</div><div class="word"><div class="mini">{s}</div><span>SPOTTER</span></div></div>
<h2>{chr(70 + i)}. {name}</h2><p>{desc}</p></div>''' for i, (key, (name, desc, s)) in enumerate(concepts.items()))
open("sheet-2.html", "w").write(f'''<!doctype html><html><head><meta charset="utf-8">{STYLE}<style>
html,body{{margin:0;background:#0A0B10;color:#F4F5F7;font-family:system-ui,sans-serif;width:1600px}}
h1{{font-family:D;font-size:56px;margin:32px 40px 8px}} .sub{{margin:0 40px 24px;color:#A3A8B8}}
.grid{{display:grid;grid-template-columns:repeat(6,1fr);gap:18px;padding:0 40px 40px}}
.card{{background:#14161F;border:1px solid #2A2E40;border-radius:20px;padding:18px}}
.big svg{{width:100%;height:auto;display:block}} .row{{display:flex;align-items:center;gap:14px;margin-top:14px}}
.tiny svg{{width:32px;height:32px;display:block}} .word{{display:flex;align-items:center;gap:8px}}
.mini svg{{width:30px;height:30px;display:block}} .word span{{font-family:D;font-size:24px;letter-spacing:1px}}
h2{{font-family:D;font-size:26px;margin:12px 0 4px}} p{{margin:0;color:#A3A8B8;font-size:14px;line-height:1.4}}
</style></head><body><h1>SPOTTER LOGO CONCEPTS, ROUND 2</h1>
<p class="sub">Each at app-icon size, at 32 px (browser tab), and beside the wordmark.</p>
<div class="grid">{cards}</div></body></html>''')
print("ok", len(concepts))
