from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_dir = os.path.join(base, "static", "images", "apps")
os.makedirs(out_dir, exist_ok=True)

size = 512
radius = 112

APPS = [
    ("party-arena", "PA", ("#FF375F", "#FF6B8A")),
    ("piano-coach", "KC", ("#5856D6", "#8B5CF6")),
    ("todo", "✓", ("#34C759", "#30D158")),
    ("explorer", "Ex", ("#007AFF", "#5AC8FA")),
    ("projects", "Pr", ("#AF52DE", "#BF5AF2")),
    ("chat", "He", ("#5E5CE6", "#7C80F0")),
    ("settings", "⚙", ("#8E8E93", "#AEAEB2")),
    ("hub", "H", ("#6366f1", "#818cf8")),
]

for name, text, (c1, c2) in APPS:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # gradient background
    for y in range(size):
        ratio = y / size
        r = int(int(c1[1:3], 16) * (1 - ratio) + int(c2[1:3], 16) * ratio)
        g = int(int(c1[3:5], 16) * (1 - ratio) + int(c2[3:5], 16) * ratio)
        b = int(int(c1[5:7], 16) * (1 - ratio) + int(c2[5:7], 16) * ratio)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # mask rounded corners
    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    img.putalpha(mask)

    # gloss overlay
    gloss = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    gdraw = ImageDraw.Draw(gloss)
    gdraw.rounded_rectangle((0, 0, size, size//2 + 20), radius=radius, fill=(255, 255, 255, 40))
    gdraw.rounded_rectangle((0, size//2, size, size), radius=radius, fill=(0, 0, 0, 20))
    img = Image.alpha_composite(img, gloss)
    img.putalpha(mask)

    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 220)
    except Exception:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]
    draw.text((x, y), text, fill=(255, 255, 255, 245), font=font)

    # shadow layer
    shadow = Image.new("RGBA", (size + 40, size + 40), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle((20, 25, size + 20, size + 25), radius=radius, fill=(0, 0, 0, 60))
    sshadow = shadow.filter(ImageFilter.GaussianBlur(radius=20))
    final = Image.new("RGBA", (size + 40, size + 40), (0, 0, 0, 0))
    final.paste(sshadow, (0, 0), sshadow)
    final.paste(img, (20, 20), img)

    final.convert("RGB").save(os.path.join(out_dir, f"{name}.png"), quality=95)

print("app icons generated")
