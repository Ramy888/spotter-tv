# Writes the Spotter logo SVGs. The mark: three chevrons stacked and rising ("Level up"); the
# lowest is dim, the middle white, the top volt. Every rep moves you up.
# logo-mark.svg: app icon (dark rounded square). logo-mark-transparent.svg: for dark screens.
# logo-mark-square.svg: opaque full square for store icons. logo-small*.svg: thicker strokes for
# 16-64 px, where thin lines fade.

VOLT, GROUND, OFF, WHITE = "#C8FF3D", "#0A0B10", "#3A3F55", "#F4F5F7"

def chevrons(width):
    # Apexes at y 118/210/302, arms 92 lower: the stack is centred in the 512 box.
    return "".join(f'<path d="M140 {y} L256 {y - 92} L372 {y}" fill="none" stroke="{c}" stroke-width="{width}" '
                   f'stroke-linecap="round" stroke-linejoin="round"/>'
                   for y, c in ((394, OFF), (302, WHITE), (210, VOLT)))

def svg(body, bg, radius=112):
    back = f'<rect width="512" height="512" rx="{radius}" fill="{GROUND}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">\n  {back}\n  '
            f'{body}\n</svg>\n')

open("logo-mark.svg", "w").write(svg(chevrons(46), True))
open("logo-mark-transparent.svg", "w").write(svg(chevrons(46), False))
open("logo-mark-square.svg", "w").write(svg(chevrons(46), True, 0))
open("logo-small.svg", "w").write(svg(chevrons(58), True))
open("logo-small-transparent.svg", "w").write(svg(chevrons(58), False))
