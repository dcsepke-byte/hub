"""
High-quality iOS-style app icons with real symbols for HUB.
Generates 512x512 PNGs (with outer shadow → 552x552 canvas like before).
"""
from PIL import Image, ImageDraw, ImageFilter
import os, math

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "static", "images", "apps")
os.makedirs(OUT, exist_ok=True)

S = 512
R = 116  # corner radius


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    return m


def make_icon(symbol_draw, c1, c2, glow=None):
    """symbol_draw(draw, w) draws the white symbol centered in a 512 canvas with margin ~90."""
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # diagonal gradient
    for y in range(S):
        t = y / S
        r = int(int(c1[1:3], 16) * (1 - t) + int(c2[1:3], 16) * t)
        g = int(int(c1[3:5], 16) * (1 - t) + int(c2[3:5], 16) * t)
        b = int(int(c1[5:7], 16) * (1 - t) + int(c2[5:7], 16) * t)
        draw.line([(0, y), (S, y)], fill=(r, g, b, 255))

    # soft radial highlight top-left
    hl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hd.ellipse((-S * 0.35, -S * 0.4, S * 0.75, S * 0.55), fill=(255, 255, 255, 70))
    hl = hl.filter(ImageFilter.GaussianBlur(60))
    img = Image.alpha_composite(img, hl)

    # mask
    mask = rounded_mask(S, R)
    img.putalpha(mask)

    # symbol
    sym = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sym)
    symbol_draw(sd, S)
    # slight drop shadow for symbol
    sym_shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ssd = ImageDraw.Draw(sym_shadow)
    # crude: draw symbol again in black underlay via alpha trick — simpler: blur a black copy
    black_sym = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    bd = ImageDraw.Draw(black_sym)
    symbol_draw(bd, S)
    black_sym = black_sym.filter(ImageFilter.GaussianBlur(6))
    black_alpha = black_sym.split()[3].point(lambda a: int(a * 0.45))
    black_sym.putalpha(black_alpha)
    img = Image.alpha_composite(img, black_sym)
    img = Image.alpha_composite(img, sym)
    img.putalpha(mask)

    # gloss
    gloss = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss)
    gd.rounded_rectangle((0, 0, S, int(S * 0.55)), radius=R, fill=(255, 255, 255, 26))
    gd.rounded_rectangle((0, int(S * 0.5), S, S), radius=R, fill=(0, 0, 0, 22))
    gloss.putalpha(rounded_mask(S, R))
    img = Image.alpha_composite(img, gloss)
    img.putalpha(mask)

    # outer shadow + canvas
    canvas = Image.new("RGBA", (S + 40, S + 40), (0, 0, 0, 0))
    sh = Image.new("RGBA", (S + 40, S + 40), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((20, 26, S + 20, S + 26), radius=R, fill=(0, 0, 0, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    canvas = Image.alpha_composite(canvas, sh)
    canvas.paste(img, (20, 20), img)
    return canvas.convert("RGB")


# ---------- symbol painters (white shapes on 512 canvas) ----------

def sym_controller(d, w):
    m = w * 0.5
    d.rounded_rectangle((m - 150, m - 62, m + 150, m + 62), radius=52, fill=(255, 255, 255, 245))
    d.rounded_rectangle((m - 150, m - 62, m + 150, m - 10), radius=52, fill=(255, 255, 255, 245))
    d.ellipse((m - 118, m - 92, m - 62, m - 36), fill=(255, 255, 255, 245))  # dpad up
    d.ellipse((m + 62, m - 92, m + 118, m - 36), fill=(255, 255, 255, 245))  # dpad right
    d.rounded_rectangle((m - 62, m - 26, m + 62, m + 26), radius=18, fill=(255, 255, 255, 245))
    d.ellipse((m - 118, m + 30, m - 66, m + 84), fill=(255, 255, 255, 245))
    d.ellipse((m + 66, m + 30, m + 118, m + 84), fill=(255, 255, 255, 245))
    # face buttons
    d.ellipse((m - 16, m - 54, m + 16, m - 22), fill=(255, 255, 255, 245))
    d.ellipse((m - 54, m - 16, m - 22, m + 16), fill=(255, 255, 255, 245))
    d.ellipse((m - 16, m + 22, m + 16, m + 54), fill=(255, 255, 255, 245))
    d.ellipse((m + 22, m - 16, m + 54, m + 16), fill=(255, 255, 255, 245))


def sym_piano(d, w):
    m = w // 2
    d.rounded_rectangle((m - 130, m - 90, m + 130, m + 90), radius=24, fill=(255, 255, 255, 245))
    # black keys
    bw = 44
    for i, x in enumerate(range(m - 130 + 20, m + 130, bw)):
        if i % 2 == 0:
            d.rounded_rectangle((x + 6, m - 90, x + 24, m - 26), radius=5, fill=(40, 40, 50, 255))
    # key lines
    for x in range(m - 130, m + 130, bw):
        d.line([(x, m - 90), (x, m + 90)], fill=(70, 70, 90, 200), width=3)


def sym_todo(d, w):
    m = w * 0.5
    d.ellipse((m - 125, m - 125, m + 125, m + 125), outline=(255, 255, 255, 245), width=26)
    d.line([(m - 70, m), (m - 22, m + 52), (m + 74, m - 56)], fill=(255, 255, 255, 245), width=30, joint="curve")


def sym_explorer(d, w):
    m = w * 0.5
    d.rounded_rectangle((m - 130, m - 60, m + 130, m + 60), radius=26, fill=(255, 255, 255, 245))
    d.rounded_rectangle((m - 130, m - 60, m + 40, m - 18), radius=18, fill=(255, 255, 255, 245))
    d.rounded_rectangle((m - 100, m - 78, m + 10, m - 46), radius=12, fill=(255, 255, 255, 245))


def sym_projects(d, w):
    m = w * 0.5
    d.rounded_rectangle((m - 125, m - 92, m + 45, m + 58), radius=26, fill=(255, 255, 255, 245))
    d.rounded_rectangle((m - 45, m - 58, m + 125, m + 92), radius=26, fill=(255, 255, 255, 245))
    d.line([(m - 125, m - 8), (m + 125, m - 8)], fill=(60, 60, 90, 120), width=6)


def sym_chat(d, w):
    m = w * 0.5
    d.rounded_rectangle((m - 135, m - 95, m + 135, m + 55), radius=42, fill=(255, 255, 255, 245))
    d.polygon([(m - 90, m + 38), (m - 90, m + 105), (m - 20, m + 38)], fill=(255, 255, 255, 245))
    d.ellipse((m - 62, m - 55, m - 36, m - 29), fill=(90, 90, 160, 200))
    d.ellipse((m - 13, m - 55, m + 13, m - 29), fill=(90, 90, 160, 200))
    d.ellipse((m + 36, m - 55, m + 62, m - 29), fill=(90, 90, 160, 200))


def sym_settings(d, w):
    m = w * 0.5
    d.ellipse((m - 62, m - 62, m + 62, m + 62), fill=(255, 255, 255, 245))
    for i in range(8):
        a = i * math.pi / 4
        x0 = m + 92 * math.cos(a); y0 = m + 92 * math.sin(a)
        x1 = m + 128 * math.cos(a); y1 = m + 128 * math.sin(a)
        d.line([(x0, y0), (x1, y1)], fill=(255, 255, 255, 245), width=34)
    d.ellipse((m - 88, m - 88, m + 88, m + 88), fill=(255, 255, 255, 245))
    d.ellipse((m - 44, m - 44, m + 44, m + 44), fill=(90, 90, 160, 200))


def sym_hub(d, w):
    m = w * 0.5
    d.rounded_rectangle((m - 100, m - 105, m + 100, m + 105), radius=28, fill=(255, 255, 255, 245))


def sym_bangkok(d, w):
    m = w * 0.5
    # airplane silhouette
    d.ellipse((m - 58, m - 30, m - 10, m + 10), fill=(255, 255, 255, 245))
    d.ellipse((m + 10, m - 30, m + 58, m + 10), fill=(255, 255, 255, 245))
    d.rounded_rectangle((m - 130, m - 34, m + 130, m + 34), radius=28, fill=(255, 255, 255, 245))
    d.polygon([(m - 130, m - 10), (m - 185, m - 10), (m - 150, m - 60), (m - 95, m - 38)], fill=(255, 255, 255, 245))
    d.polygon([(m + 130, m - 10), (m + 185, m - 10), (m + 150, m - 60), (m + 95, m - 38)], fill=(255, 255, 255, 245))
    d.polygon([(m - 30, m - 34), (m + 30, m - 34), (m + 110, m + 92), (m - 110, m + 92)], fill=(255, 255, 255, 245))


def sym_notes(d, w):
    m = w // 2
    d.rounded_rectangle((m - 100, m - 125, m + 100, m + 125), radius=24, fill=(255, 255, 255, 245))
    d.rounded_rectangle((m - 100, m - 125, m + 100, m - 40), radius=24, fill=(120, 130, 200, 255))
    for i, yy in enumerate(range(m - 10, m + 116, 34)):
        d.line([(m - 66, yy), (m + 66, yy)], fill=(70, 80, 130, 255), width=7)
    # pencil
    d.polygon([(m + 60, m - 60), (m + 122, m + 2), (m + 78, m + 46), (m + 16, m - 16)], fill=(255, 255, 255, 245))
    d.polygon([(m + 122, m + 2), (m + 78, m + 46), (m + 96, m + 64)], fill=(255, 214, 92, 255))


def sym_budget(d, w):
    m = w * 0.5
    d.ellipse((m - 128, m - 128, m + 128, m + 128), fill=(255, 255, 255, 245))
    d.ellipse((m - 76, m - 76, m + 76, m + 76), fill=(50, 120, 90, 255))
    # € symbol
    d.ellipse((m - 22, m - 74, m + 34, m - 34), outline=(255, 255, 255, 245), width=16)
    d.line([(m - 18, m - 18), (m + 42, m - 18)], fill=(255, 255, 255, 245), width=16)
    d.line([(m - 18, m + 18), (m + 42, m + 18)], fill=(255, 255, 255, 245), width=16)
    d.line([(m + 8, m - 74), (m + 8, m + 74)], fill=(255, 255, 255, 245), width=16)


def sym_health(d, w):
    m = w * 0.5
    d.polygon([(m, m - 92), (m - 128, m + 30), (m, m + 128), (m + 128, m + 30)], fill=(255, 255, 255, 245))
    d.ellipse((m - 150, m - 130, m - 20, m + 10), fill=(255, 255, 255, 245))
    d.ellipse((m + 20, m - 130, m + 150, m + 10), fill=(255, 255, 255, 245))
    # pulse line
    d.line([(m - 90, m + 6), (m - 40, m + 6), (m - 14, m - 30), (m + 16, m + 34), (m + 42, m + 6), (m + 90, m + 6)],
           fill=(210, 60, 90, 255), width=18, joint="curve")


APPS = [
    ("party-arena", sym_controller, ("#FF3B5C", "#FF6B9D"), "#FF3B5C"),
    ("piano-coach", sym_piano, ("#5E5CE6", "#9B6BFF"), "#5E5CE6"),
    ("todo", sym_todo, ("#2BB673", "#5BE7A0"), "#2BB673"),
    ("explorer", sym_explorer, ("#0A84FF", "#6FC4FF"), "#0A84FF"),
    ("projects", sym_projects, ("#AF52DE", "#D08BFF"), "#AF52DE"),
    ("chat", sym_chat, ("#5B5BD6", "#8E8EFF"), "#5B5BD6"),
    ("settings", sym_settings, ("#7D7D85", "#B0B0BA"), "#7D7D85"),
    ("hub", sym_hub, ("#4F46E5", "#8B5CF6"), "#4F46E5"),
    ("bangkok", sym_bangkok, ("#E8590C", "#FFA94D"), "#E8590C"),
    ("notizen", sym_notes, ("#0CA678", "#38D9A9"), "#0CA678"),
    ("budget", sym_budget, ("#37B24D", "#8CE99A"), "#37B24D"),
    ("health", sym_health, ("#E03131", "#FF6B6B"), "#E03131"),
]

for name, painter, (c1, c2), glow in APPS:
    icon = make_icon(painter, c1, c2)
    icon.save(os.path.join(OUT, f"{name}.png"), quality=95)
    print("generated", name)

print("ALL DONE")
