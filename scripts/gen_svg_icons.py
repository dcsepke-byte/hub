"""
iOS-style monochrome app icons for HUB — v9.
Two variants per app: dark (black bg, white symbol) and light (white bg, black symbol).
Simple, clean Material Design symbols — exactly like iOS utilities icons.
Vector SVG = razor sharp at any size.
"""
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "static", "images", "apps")
os.makedirs(OUT, exist_ok=True)

# Simple Material Design symbol paths (24x24), white symbol on dark / black on light
APPS = {
    "party-arena": {
        "label": "Party Arena",
        # sports_esports controller
        "path": "M7.97,16L20,4c0,0 1.5,-1.5 2.5,-1.5L22.5,1.5c-0.5,0 -1,-0.5 -2,-0.5C18,0 13.5,3 11,5.5L6.5,11L4,13c-0.4,0.4 -0.6,1 -0.6,1.6c0,0.6 0.2,1.2 0.6,1.6L7,19c0.4,0.4 1,0.6 1.6,0.6c0.6,0 1.2,-0.2 1.6,-0.6L13,16.5L15,14.5zM4,21l5,-5l-1.5,-1.5L2.5,19.5z",
    },
    "piano-coach": {
        "label": "Klavier",
        # piano keys
        "path": "M21,2L3,2c-1.1,0 -2,0.9 -2,2v16c0,1.1 0.9,2 2,2h18c1.1,0 2,-0.9 2,-2L23,4c0,-1.1 -0.9,-2 -2,-2zM14,20h-4v-7.5c0,-0.3 -0.2,-0.6 -0.5,-0.7C9.2,11.7 9,11.4 9,11L9,4h6v7c0,0.4 0.2,0.7 0.5,0.8c0.3,0.1 0.5,0.4 0.5,0.7L16,20z",
    },
    "bangkok": {
        "label": "Bangkok",
        # flight / airplane
        "path": "M21,16v-2l-8,-5V3.5C13,2.67 12.33,2 11.5,2S10,2.67 10,3.5V9l-8,5v2l8,-2.5V19l-2,1.5V22l3.5,-1l3.5,1v-1.5L13,19v-5.5L21,16z",
    },
    "notizen": {
        "label": "Notizen",
        # note_alt / edit note
        "path": "M3,17.25V21h3.75L17.81,9.94l-3.75,-3.75L3,17.25zM20.71,7.04c0.39,-0.39 0.39,-1.02 0,-1.41l-2.34,-2.34c-0.39,-0.39 -1.02,-0.39 -1.41,0l-1.83,1.83l3.75,3.75L20.71,7.04z",
    },
    "projects": {
        "label": "Projekte",
        # folder_open
        "path": "M20,6h-8l-2,-2L4,4c-1.1,0 -1.99,0.9 -1.99,2L2,18c0,1.1 0.9,2 2,2h16c1.1,0 2,-0.9 2,-2L22,8c0,-1.1 -0.9,-2 -2,-2zM4,18L4,6h8.41l1.41,2L20,8v10L4,18z",
    },
    "todo": {
        "label": "To-Do",
        # check_circle
        "path": "M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10s10,-4.48 10,-10S17.52,2 12,2zM10,17l-5,-5l1.41,-1.41L10,14.17l7.59,-7.59L19,8l-9,9z",
    },
    "explorer": {
        "label": "Explorer",
        # folder + download
        "path": "M20,6h-8l-2,-2L4,4c-1.1,0 -1.99,0.9 -1.99,2L2,18c0,1.1 0.9,2 2,2h16c1.1,0 2,-0.9 2,-2L22,8c0,-1.1 -0.9,-2 -2,-2zM12,17l-4,-4h2.5v-3h3v3L16,13l-4,4z",
    },
    "chat": {
        "label": "Hermes",
        # chat_bubble
        "path": "M20,2L4,2c-1.1,0 -2,0.9 -2,2v18l4,-4h14c1.1,0 2,-0.9 2,-2L22,4c0,-1.1 -0.9,-2 -2,-2z",
    },
    "settings": {
        "label": "Settings",
        # settings gear (official)
        "path": "M19.14,12.94c0.04,-0.3 0.06,-0.61 0.06,-0.94c0,-0.32 -0.02,-0.64 -0.07,-0.94l2.03,-1.58c0.18,-0.14 0.23,-0.41 0.12,-0.61l-1.92,-3.32c-0.12,-0.22 -0.37,-0.29 -0.59,-0.22l-2.39,0.96c-0.5,-0.38 -1.03,-0.7 -1.62,-0.94L14.4,2.81c-0.04,-0.24 -0.24,-0.41 -0.48,-0.41h-3.84c-0.24,0 -0.43,0.17 -0.47,0.41L9.25,5.35C8.66,5.59 8.12,5.92 7.63,6.29L5.24,5.33c-0.22,-0.08 -0.47,0 -0.59,0.22L2.74,8.87C2.62,9.08 2.66,9.34 2.86,9.48l2.03,1.58C4.84,11.36 4.8,11.69 4.8,12s0.02,0.64 0.07,0.94l-2.03,1.58c-0.18,0.14 -0.23,0.41 -0.12,0.61l1.92,3.32c0.12,0.22 0.37,0.29 0.59,0.22l2.39,-0.96c0.5,0.38 1.03,0.7 1.62,0.94l0.36,2.54c0.05,0.24 0.24,0.41 0.48,0.41h3.84c0.24,0 0.44,-0.17 0.47,-0.41l0.36,-2.54c0.59,-0.24 1.13,-0.56 1.62,-0.94l2.39,0.96c0.22,0.08 0.47,0 0.59,-0.22l1.92,-3.32c0.12,-0.22 0.07,-0.47 -0.12,-0.61L19.14,12.94zM12,15.6c-1.98,0 -3.6,-1.62 -3.6,-3.6s1.62,-3.6 3.6,-3.6s3.6,1.62 3.6,3.6S13.98,15.6 12,15.6z",
    },
    "hub": {
        "label": "HUB",
        # home
        "path": "M10,20v-6h4v6h5v-8h3L12,3L2,12h3v8z",
    },
    "budget": {
        "label": "Budget",
        # attach_money ($)
        "path": "M11.8,10.9c-2.27,-0.59 -3,-1.2 -3,-2.15c0,-1.09 1.01,-1.85 2.7,-1.85c1.78,0 2.44,0.85 2.5,2.1h2.21c-0.07,-1.72 -1.12,-3.3 -3.21,-3.81V3h-3v2.16c-1.94,0.42 -3.5,1.68 -3.5,3.61c0,2.31 1.91,3.46 4.7,4.13c2.5,0.6 3,1.48 3,2.41c0,0.69 -0.49,1.79 -2.7,1.79c-2.06,0 -2.87,-0.92 -2.98,-2.1h-2.2c0.12,2.19 1.76,3.42 3.68,3.83V21h3v-2.15c1.95,-0.37 3.5,-1.68 3.5,-3.55c0,-2.31 -1.91,-3.46 -4.7,-4.13z",
    },
    "health": {
        "label": "Gesundheit",
        # favorite (heart)
        "path": "M12,21.35l-1.45,-1.32C5.4,15.36 2,12.28 2,8.5C2,5.42 4.42,3 7.5,3c1.74,0 3.41,0.81 4.5,2.09C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.42 22,8.5c0,3.78 -3.4,6.86 -8.55,11.54L12,21.35z",
    },
}


def svg_icon(name, cfg, mode):
    """mode: 'dark' → black bg + white symbol; 'light' → white bg + black symbol."""
    label = cfg["label"]
    path = cfg["path"]
    if mode == "dark":
        bg1, bg2 = "#1C1C1E", "#3A3A3C"
        sym = "#FFFFFF"
        border = "rgba(255,255,255,0.12)"
    else:
        bg1, bg2 = "#F2F2F7", "#E5E5EA"
        sym = "#1C1C1E"
        border = "rgba(0,0,0,0.08)"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{bg1}"/>
      <stop offset="100%" stop-color="{bg2}"/>
    </linearGradient>
    <clipPath id="r"><rect width="512" height="512" rx="116"/></clipPath>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.06"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#r)">
    <rect width="512" height="512" fill="url(#bg)"/>
    <rect width="512" height="512" fill="none" stroke="{border}" stroke-width="3"/>
    <rect width="512" height="512" fill="url(#sheen)"/>
    <g transform="translate(136 136) scale(10)">
      <path d="{path}" fill="{sym}" fill-opacity="0.94"/>
    </g>
    <text x="256" y="442" text-anchor="middle" font-family="'Inter', -apple-system, 'Segoe UI', system-ui, sans-serif" font-size="46" font-weight="800" letter-spacing="-0.8" fill="{sym}" fill-opacity="0.94">{label}</text>
  </g>
</svg>"""


for name, cfg in APPS.items():
    for mode in ("dark", "light"):
        with open(os.path.join(OUT, f"{name}-{mode}.svg"), "w", encoding="utf-8") as f:
            f.write(svg_icon(name, cfg, mode))
    print("generated", name, "(dark + light)")

print("MONOCHROME ICONS DONE")
