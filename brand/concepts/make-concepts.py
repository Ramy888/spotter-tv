# Logo concepts to replace the squatting figure (docs/outstanding.md). Writes concept-*.svg and
# sheet.html (each concept large, at 32 px, and beside the wordmark). Text uses the app's fonts.
import base64, math

VOLT, GROUND, OFF, WHITE = "#C8FF3D", "#0A0B10", "#2A2E40", "#F4F5F7"
font = lambda p: base64.b64encode(open(p, "rb").read()).decode()
BLACK = font("../../tv-app/assets/fonts/ArchivoCondensed-Black.ttf")
STYLE = f"<style>@font-face{{font-family:D;src:url(data:font/ttf;base64,{BLACK})}}</style>"

def ticks(cx, cy, r, n, lit, length, width, lit_color=VOLT, start=0):
    out = []
    for i in range(n):
        a = math.radians(i * 360 / n - 90 + start)
        p = lambda d: (cx + (r + d) * math.cos(a), cy + (r + d) * math.sin(a))
        (x1, y1), (x2, y2) = p(-length / 2), p(length / 2)
        out.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{lit_color if i < lit else OFF}" '
                   f'stroke-width="{width}" stroke-linecap="round"/>')
    return "".join(out)

def svg(body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{STYLE}'
            f'<rect width="512" height="512" rx="112" fill="{GROUND}"/>{body}</svg>')

concepts = {}

# A. Ring + S: the tick ring that fills around every rep count, with a condensed S.
concepts["a-ring-s"] = ("Ring + S", "The rep ring, filling, around a bold condensed S.",
    svg(ticks(256, 256, 190, 24, 17, 44, 20) +
        f'<text x="256" y="338" text-anchor="middle" font-family="D" font-size="250" fill="{WHITE}">S</text>'))

# B. Spotter's eye: an almond eye whose iris is the tick ring; a spotter watches your form.
eye = (f'<path d="M56 256 Q256 70 456 256 Q256 442 56 256 Z" fill="none" stroke="{WHITE}" stroke-width="22" stroke-linejoin="round"/>'
       + ticks(256, 256, 92, 16, 11, 26, 13) + f'<circle cx="256" cy="256" r="40" fill="{VOLT}"/>'
       + f'<circle cx="272" cy="240" r="12" fill="{GROUND}"/>')
concepts["b-eye"] = ("Spotter's eye", "An eye whose iris is the rep ring: someone is watching your form.", svg(eye))

# C. Scoreboard: one big counted rep, like a scoreboard digit, with a single lit tick above.
concepts["c-scoreboard"] = ("Scoreboard", "A scoreboard rep count: the moment a rep counts.",
    svg(ticks(256, 256, 190, 24, 1, 50, 24) + ticks(256, 256, 190, 24, 0, 50, 24, start=15)[0:0] +
        f'<text x="256" y="372" text-anchor="middle" font-family="D" font-size="330" fill="{WHITE}">1</text>'
        f'<text x="352" y="372" text-anchor="middle" font-family="D" font-size="120" fill="{VOLT}">+</text>'))

# D. Phone to TV: a phone and a TV linked by an arc of ticks (the product in one picture).
link = []
for i in range(7):
    t = (i + 1) / 8
    x = 150 + (360 - 150) * t
    y = 210 - math.sin(math.pi * t) * 95
    link.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{9 if i % 2 else 11}" fill="{VOLT}" opacity="{0.45 + 0.08 * i:.2f}"/>')
concepts["d-phone-tv"] = ("Phone to TV", "Your phone is the camera, your TV is the coach.",
    svg(f'<rect x="86" y="196" width="104" height="188" rx="22" fill="none" stroke="{WHITE}" stroke-width="20"/>'
        f'<circle cx="138" cy="226" r="9" fill="{VOLT}"/>'
        f'<rect x="246" y="208" width="194" height="128" rx="18" fill="none" stroke="{WHITE}" stroke-width="20"/>'
        f'<path d="M300 372 H386" stroke="{WHITE}" stroke-width="20" stroke-linecap="round"/>'
        f'<text x="343" y="306" text-anchor="middle" font-family="D" font-size="92" fill="{VOLT}">12</text>' + "".join(link)))

# E. Spot mark: a volt "spot" (the dot a spotter keeps on you) with the ring as its halo.
concepts["e-spot"] = ("The spot", "A single volt spot inside an open ring: simple, bold, ownable.",
    svg(f'<circle cx="256" cy="256" r="170" fill="none" stroke="{OFF}" stroke-width="40"/>'
        f'<path d="M256 86 A170 170 0 1 1 103.6 180" fill="none" stroke="{VOLT}" stroke-width="40" stroke-linecap="round"/>'
        f'<circle cx="256" cy="256" r="74" fill="{WHITE}"/>'))

for key, (_, _, s) in concepts.items():
    open(f"concept-{key}.svg", "w").write(s + "\n")

cards = "".join(f'''
<div class="card"><div class="big">{s}</div>
<div class="row"><div class="tiny">{s}</div><div class="word"><div class="mini">{s}</div><span>SPOTTER</span></div></div>
<h2>{chr(65 + i)}. {name}</h2><p>{desc}</p></div>''' for i, (key, (name, desc, s)) in enumerate(concepts.items()))
open("sheet.html", "w").write(f'''<!doctype html><html><head><meta charset="utf-8">{STYLE}<style>
html,body{{margin:0;background:#0A0B10;color:#F4F5F7;font-family:system-ui,sans-serif;width:1600px}}
h1{{font-family:D;font-size:56px;margin:32px 40px 8px}} .sub{{margin:0 40px 24px;color:#A3A8B8}}
.grid{{display:grid;grid-template-columns:repeat(5,1fr);gap:20px;padding:0 40px 40px}}
.card{{background:#14161F;border:1px solid #2A2E40;border-radius:20px;padding:20px}}
.big svg{{width:100%;height:auto;display:block}} .row{{display:flex;align-items:center;gap:18px;margin-top:16px}}
.tiny svg{{width:32px;height:32px;display:block}} .word{{display:flex;align-items:center;gap:8px}}
.mini svg{{width:34px;height:34px;display:block}} .word span{{font-family:D;font-size:28px;letter-spacing:1px}}
h2{{font-family:D;font-size:30px;margin:14px 0 4px}} p{{margin:0;color:#A3A8B8;font-size:15px;line-height:1.4}}
</style></head><body><h1>SPOTTER LOGO CONCEPTS</h1>
<p class="sub">Each at app-icon size, at 32 px (browser tab), and beside the wordmark.</p>
<div class="grid">{cards}</div></body></html>''')
print("ok", len(concepts))
