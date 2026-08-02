"""
Generate high-quality SVG app icons for HUB (iOS-style).
Each icon: 512x512, diagonal gradient, rounded-rect clip, white Material Design symbol.
"""
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "static", "images", "apps")
os.makedirs(OUT, exist_ok=True)

# Material Design icon paths (24x24 viewBox, white fill)
# Source: Google Material Design Icons (Apache 2.0)
ICONS = {
    "party-arena": "M7.97,16L20,4c0,0 1.5,-1.5 2.5,-1.5L22.5,1.5c-0.5,0 -1,-0.5 -2,-0.5C18,0 13.5,3 11,5.5L6.5,11L4,13c-0.4,0.4 -0.6,1 -0.6,1.6c0,0.6 0.2,1.2 0.6,1.6l0,0L7,19l0,0c0.4,0.4 1,0.6 1.6,0.6c0.6,0 1.2,-0.2 1.6,-0.6L13,16.5l0,0L15,14.5zM4,21l5,-5l-1.5,-1.5L2.5,19.5z",
    # Game controller alternative (sports_esports)
    "piano-coach": "M21,2L3,2c-1.1,0 -2,0.9 -2,2v16c0,1.1 0.9,2 2,2h18c1.1,0 2,-0.9 2,-2L23,4c0,-1.1 -0.9,-2 -2,-2zM14,20h-4v-7.5c0,-0.3 -0.2,-0.6 -0.5,-0.7C9.2,11.7 9,11.4 9,11L9,4h6v7c0,0.4 0.2,0.7 0.5,0.8c0.3,0.1 0.5,0.4 0.5,0.7L16,20z",
    "bangkok": "M21.5,15.5L21.5,12L14,5L11,5l0.5,4L8,6L5,6l1,3l-3,3l2.5,1.5l1.5,-1l1,3l3,3l-2.5,2.5l3,1l2.5,-1l3,3l0,0c1.1,0 2,-0.9 2,-2z",
    "notizen": "M14,2L6,2c-1.1,0 -2,0.9 -2,2v16c0,1.1 0.9,2 2,2h12c1.1,0 2,-0.9 2,-2L20,8l-6,-6zM16,18L8,18v-2h8v2zM16,14L8,14v-2h8v2zM13,9L13,3.5L18.5,9L13,9z",
    "projects": "M20,6h-8l-2,-2L4,4c-1.1,0 -1.99,0.9 -1.99,2L2,18c0,1.1 0.9,2 2,2h16c1.1,0 2,-0.9 2,-2L22,8c0,-1.1 -0.9,-2 -2,-2zM18,14h-4v4h-4v-4L6,14v-4h4L10,6h4v4h4v4z",
    "todo": "M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10s10,-4.48 10,-10S17.52,2 12,2zM10,17l-5,-5l1.41,-1.41L10,14.17l7.59,-7.59L19,8l-9,9z",
    "explorer": "M6,2c-1.1,0 -1.99,0.9 -1.99,2L4,20c0,1.1 0.9,2 2,2h12c1.1,0 2,-0.9 2,-2L20,8l-6,-6L6,2zM13,9L13,3.5L18.5,9L13,9zM16,16v2L8,18v-2h8zM16,13v2L8,15v-2h8z",
    "chat": "M20,2L4,2c-1.1,0 -2,0.9 -2,2v18l4,-4h14c1.1,0 2,-0.9 2,-2L22,4c0,-1.1 -0.9,-2 -2,-2zM6,9h12v2L6,11L6,9zM14,14L6,14v-2h8v2zM18,8L6,8L6,6h12v2z",
    "settings": "M19.14,12.94c0.04,-0.3 0.06,-0.61 0.06,-0.94c0,-0.32 -0.02,-0.64 -0.07,-0.94l2.03,-1.58c0.18,-0.14 0.23,-0.41 0.12,-0.61l-1.92,-3.32c-0.12,-0.22 -0.37,-0.29 -0.59,-0.22l-2.39,0.96c-0.5,-0.38 -1.03,-0.7 -1.62,-0.94L14.4,2.81c-0.04,-0.24 -0.24,-0.41 -0.48,-0.41h-3.84c-0.24,0 -0.43,0.17 -0.47,0.41L9.25,5.35C8.66,5.59 8.12,5.92 7.63,6.29L5.24,5.33c-0.22,-0.08 -0.47,0 -0.59,0.22L2.74,8.87C2.62,9.08 2.66,9.34 2.86,9.48l2.03,1.58C4.84,11.36 4.8,11.69 4.8,12s0.02,0.64 0.07,0.94l-2.03,1.58c-0.18,0.14 -0.23,0.41 -0.12,0.61l1.92,3.32c0.12,0.22 0.37,0.29 0.59,0.22l2.39,-0.96c0.5,0.38 1.03,0.7 1.62,0.94l0.36,2.54c0.05,0.24 0.24,0.41 0.48,0.41h3.84c0.24,0 0.44,-0.17 0.47,-0.41l0.36,-2.54c0.59,-0.24 1.13,-0.56 1.62,-0.94l2.39,0.96c0.22,0.08 0.47,0 0.59,-0.22l1.92,-3.32c0.12,-0.22 0.07,-0.47 -0.12,-0.61L19.14,12.94zM12,15.6c-1.98,0 -3.6,-1.62 -3.6,-3.6s1.62,-3.6 3.6,-3.6s3.6,1.62 3.6,3.6S13.98,15.6 12,15.6z",
    "hub": "M10,20v-6h4v6h5v-8h3L12,3L2,12h3v8z",
    "budget": "M15,10L15,8L9,8v1.83L11.46,12L9,14.17L9,16h6v-2h-2.87L14.87,13L11.67,10zM12,2C6.48,2 2,6.48 2,12s4.48,10 10,10s10,-4.48 10,-10S17.52,2 12,2zM12,20c-4.41,0 -8,-3.59 -8,-8s3.59,-8 8,-8s8,3.59 8,8S16.41,20 12,20z",
    "health": "M12,21.35l-1.45,-1.32C5.4,15.36 2,12.28 2,8.5C2,5.42 4.42,3 7.5,3c1.74,0 3.41,0.81 4.5,2.09C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.42 22,8.5c0,3.78 -3.4,6.86 -8.55,11.54L12,21.35z",
    "piano-alt": "M20,2L4,2c-1.1,0 -2,0.9 -2,2v16c0,1.1 0.9,2 2,2h16c1.1,0 2,-0.9 2,-2L22,4c0,-1.1 -0.9,-2 -2,-2zM10,20L5,20L5,4h5v16zM14,20h-4L10,4h4v16zM19,20h-4L15,4h4v16z",
}

# gradients per app (start, end)
GRADIENTS = {
    "party-arena": ("#FF3B5C", "#FF7A9E"),
    "piano-coach": ("#5E5CE6", "#9B6BFF"),
    "bangkok": ("#E8590C", "#FFA94D"),
    "notizen": ("#0CA678", "#63E6BE"),
    "projects": ("#AF52DE", "#D08BFF"),
    "todo": ("#2BB673", "#5BE7A0"),
    "explorer": ("#0A84FF", "#6FC4FF"),
    "chat": ("#5B5BD6", "#8E8EFF"),
    "settings": ("#7D7D85", "#B8B8C2"),
    "hub": ("#4F46E5", "#8B5CF6"),
    "budget": ("#37B24D", "#8CE99A"),
    "health": ("#E03131", "#FF8787"),
}


def svg_icon(name, path, c1, c2):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="{c1}"/>
      <stop offset="100%" stop-color="{c2}"/>
    </linearGradient>
    <clipPath id="r"><rect width="512" height="512" rx="112"/></clipPath>
    <radialGradient id="gloss" cx="35%" cy="25%" r="80%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.12"/>
    </radialGradient>
  </defs>
  <g clip-path="url(#r)">
    <rect width="512" height="512" fill="url(#g)"/>
    <rect width="512" height="512" fill="url(#gloss)"/>
    <g transform="translate(136 136) scale(10)">
      <path d="{path}" fill="#ffffff" fill-opacity="0.96"/>
    </g>
  </g>
</svg>"""


for name, path in ICONS.items():
    if name.endswith("-alt"):
        continue
    c1, c2 = GRADIENTS.get(name, ("#6366F1", "#818CF8"))
    with open(os.path.join(OUT, f"{name}.svg"), "w", encoding="utf-8") as f:
        f.write(svg_icon(name, path, c1, c2))
    print("generated", name)

print("SVG icons done")
