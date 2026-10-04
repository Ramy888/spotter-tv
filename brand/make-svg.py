# Writes the Spotter logo SVGs: the squatting figure inside the tick ring (the TV app's signature).
# logo-mark.svg: app icon (dark rounded square). logo-mark-transparent.svg: for dark screens.
# logo-small.svg / logo-small-transparent.svg: for 16-64 px (a solid arc instead of ticks, which
# turn to noise when tiny); the transparent one is the small mark inside the apps.
import math

VOLT, GROUND, OFF, WHITE = "#C8FF3D", "#0A0B10", "#2A2E40", "#F4F5F7"

def ticks(cx, cy, r, n, lit, length, width):
    out = []
    for i in range(n):
        a = math.radians(i * 360 / n - 90)
        p = lambda d: (cx + (r + d) * math.cos(a), cy + (r + d) * math.sin(a))
        (x1, y1), (x2, y2) = p(-length / 2), p(length / 2)
        out.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{VOLT if i < lit else OFF}" '
                   f'stroke-width="{width}" stroke-linecap="round"/>')
    return "\n    ".join(out)

def arc(cx, cy, r, frac, width):
    end = math.radians(frac * 360 - 90)
    x, y = cx + r * math.cos(end), cy + r * math.sin(end)
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{OFF}" stroke-width="{width}"/>'
            f'<path d="M{cx} {cy - r} A{r} {r} 0 {1 if frac > 0.5 else 0} 1 {x:.1f} {y:.1f}" fill="none" '
            f'stroke="{VOLT}" stroke-width="{width}" stroke-linecap="round"/>')

def figure(width):
    # Side view, facing right: head, back leaning forward, thighs level, shins down, arms out.
    return (f'<g fill="none" stroke="{WHITE}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round">'
            f'<path d="M240 222 L202 304 L300 302 L290 388"/><path d="M236 242 L344 236"/></g>'
            f'<circle cx="254" cy="172" r="{width + 2}" fill="{WHITE}"/>')

def svg(body, bg, radius=112):
    back = f'<rect width="512" height="512" rx="{radius}" fill="{GROUND}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">\n  {back}\n  '
            f'{body}\n</svg>\n')

ring = ticks(256, 256, 196, 24, 17, 40, 18)
open("logo-mark.svg", "w").write(svg(f"<g>\n    {ring}\n  </g>\n  {figure(30)}", True))
# Store icons must be opaque: a full square (the store rounds corners itself where it wants to).
open("logo-mark-square.svg", "w").write(svg(f"<g>\n    {ring}\n  </g>\n  {figure(30)}", True, 0))
open("logo-mark-transparent.svg", "w").write(svg(f"<g>\n    {ring}\n  </g>\n  {figure(30)}", False))
open("logo-small.svg", "w").write(svg(f"{arc(256, 256, 196, 0.72, 44)}\n  {figure(40)}", True))
open("logo-small-transparent.svg", "w").write(svg(f"{arc(256, 256, 196, 0.72, 44)}\n  {figure(40)}", False))
