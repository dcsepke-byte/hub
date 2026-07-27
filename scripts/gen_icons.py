from PIL import Image, ImageDraw
import os

base = os.path.dirname(os.path.abspath(__file__))
out_dir = os.path.join(base, "static", "images")
os.makedirs(out_dir, exist_ok=True)

for size in [192, 512]:
    img = Image.new("RGB", (size, size), "#0f0f11")
    draw = ImageDraw.Draw(img)
    cx = cy = size // 2
    r = int(size * 0.31)
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline="#6366f1", width=max(4, size//25))
    r2 = int(size * 0.16)
    draw.ellipse([cx-r2, cy-r2, cx+r2, cy+r2], fill="#6366f1")
    img.save(os.path.join(out_dir, f"icon-{size}.png"))

print("icons generated")
