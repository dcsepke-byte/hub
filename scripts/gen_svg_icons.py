"""
Premium SVG app icons for HUB — v2.
Each icon: 512x512, diagonal 3-stop gradient, layered depth (inner shadow, gloss,
background sparkle texture), detailed multi-color symbol.
"""
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "static", "images", "apps")
os.makedirs(OUT, exist_ok=True)

# Per-app config: gradients (3 stops), symbol paths (white + accents), sparkle seed
APPS = {}

APPS["party-arena"] = {
    "grad": ("#FF2D55", "#FF5E7E", "#FF8FA3"),
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <!-- D-Pad + shell -->
        <path d="M6.5,8.5c-0.8,0 -1.5,0.7 -1.5,1.5v4c0,0.8 0.7,1.5 1.5,1.5h11c0.8,0 1.5,-0.7 1.5,-1.5v-4c0,-0.8 -0.7,-1.5 -1.5,-1.5h-11z" fill="#ffffff" fill-opacity="0.97"/>
        <path d="M6.5,9.2c-0.45,0 -0.8,0.35 -0.8,0.8v3.9c0,0.45 0.35,0.8 0.8,0.8h10.9c0.45,0 0.8,-0.35 0.8,-0.8v-3.9c0,-0.45 -0.35,-0.8 -0.8,-0.8h-10.9z" fill="#FF2D55" fill-opacity="0.28"/>
        <path d="M8.5,8.5v-1.3c0,-0.5 0.4,-0.9 0.9,-0.9h5.2c0.5,0 0.9,0.4 0.9,0.9v1.3h-2v-1h-3v1h-2z" fill="#ffffff" fill-opacity="0.97"/>
        <rect x="8.6" y="8.5" width="6.8" height="1.6" rx="0.6" fill="#ffffff"/>
        <circle cx="7.3" cy="12" r="1.35" fill="#FF8FA3"/>
        <circle cx="16.7" cy="12" r="1.35" fill="#FF8FA3"/>
        <circle cx="12" cy="14.2" r="0.9" fill="#FF2D55"/>
        <circle cx="10" cy="12" r="0.9" fill="#FF2D55"/>
        <circle cx="14" cy="12" r="0.9" fill="#FF2D55"/>
      </g>
    """,
    "spark": "M100,90m-3,0a3,3 0 1,0 6,0a3,3 0 1,0 -6,0M412,120m-2.5,0a2.5,2.5 0 1,0 5,0a2.5,2.5 0 1,0 -5,0",
}

APPS["piano-coach"] = {
    "grad": ("#5E5CE6", "#7A6FE8", "#A78BFA"),
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <rect x="4" y="6.5" width="16" height="11" rx="2" fill="#ffffff" fill-opacity="0.97"/>
        <rect x="4" y="6.5" width="16" height="2.6" fill="#E9E4FF"/>
        <path d="M7,9.1v8.4h2V9.1h-2zM11,9.1v8.4h2V9.1h-2zM15,9.1v8.4h2V9.1h-2z" fill="#2d2a3e"/>
        <rect x="6.9" y="8.9" width="1.4" height="2.8" rx="0.3" fill="#2d2a3e"/>
        <rect x="10.9" y="8.9" width="1.4" height="2.8" rx="0.3" fill="#2d2a3e"/>
        <rect x="14.9" y="8.9" width="1.4" height="2.8" rx="0.3" fill="#2d2a3e"/>
        <rect x="4.4" y="6.9" width="15.2" height="0.5" rx="0.25" fill="#ffffff" fill-opacity="0.8"/>
      </g>
    """,
    "spark": "M96,96m-2.5,0a2.5,2.5 0 1,0 5,0a2.5,2.5 0 1,0 -5,0M416,120m-2,0a2,2 0 1,0 4,0a2,2 0 1,0 -4,0",
}

APPS["bangkok"] = {
    "grad": ("#E8590C", "#F76707", "#FFA94D"),
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <!-- Temple silhouette -->
        <path d="M7.4,15.5l0.3,-1.2c0.2,-0.9 1,-1.6 1.9,-1.8l0.4,-1.1l1.4,-0.6l0.3,-1.9l1.5,-1.5l1.5,1.5l0.3,1.9l1.4,0.6l0.4,1.1c0.9,0.2 1.7,0.9 1.9,1.8l0.3,1.2h-11.6z" fill="#ffffff" fill-opacity="0.97"/>
        <path d="M12,9.4l0.9,0.9l-0.2,2.3l-0.7,0.4l-0.7,-0.4l-0.2,-2.3l0.9,-0.9z" fill="#FFA94D"/>
        <path d="M6.8,15.5l10.4,0l-0.2,1.1c-0.1,0.5 -0.5,0.9 -1,0.9h-8c-0.5,0 -0.9,-0.4 -1,-0.9l-0.2,-1.1z" fill="#ffffff" fill-opacity="0.7"/>
      </g>
    """,
    "spark": "M104,92m-2.5,0a2.5,2.5 0 1,0 5,0a2.5,2.5 0 1,0 -5,0M400,400m-3,0a3,3 0 1,0 6,0a3,3 0 1,0 -6,0",
}

APPS["notizen"] = {
    "grad": ("#0CA678", "#12B886", "#63E6BE"),
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <path d="M5,4h9l6,6v10c0,1.1 -0.9,2 -2,2H5c-1.1,0 -2,-0.9 -2,-2V6c0,-1.1 0.9,-2 2,-2z" fill="#ffffff" fill-opacity="0.97"/>
        <path d="M14,4l6,6h-5c-0.55,0 -1,-0.45 -1,-1V4z" fill="#0CA678" fill-opacity="0.55"/>
        <path d="M7,13h7v1.5H7V13zM7,16.5h7V18H7v-1.5z" fill="#0CA678" fill-opacity="0.7"/>
        <!-- pencil -->
        <path d="M16.2,7.4l2.2,2.2l-4.6,4.6l-2.6,0.5l0.5,-2.6l4.5,-4.7z" fill="#FFD43B"/>
        <path d="M17.4,6.2l1.4,1.4l-0.8,0.8l-1.4,-1.4l0.8,-0.8z" fill="#FFC078"/>
      </g>
    """,
    "spark": "M90,110m-2,0a2,2 0 1,0 4,0a2,2 0 1,0 -4,0M420,90m-2.5,0a2.5,2.5 0 1,0 5,0a2.5,2.5 0 1,0 -5,0",
}

APPS["projects"] = {
    "grad": ("#AF52DE", "#C56CF0", "#E5A7FF"),
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <path d="M4,8h5l2,2h9c1.1,0 2,0.9 2,2v7c0,1.1 -0.9,2 -2,2H4c-1.1,0 -2,-0.9 -2,-2v-9c0,-1.1 0.9,-2 2,-2z" fill="#ffffff" fill-opacity="0.97"/>
        <path d="M5,10h5.2l1,1H5v-1z" fill="#AF52DE" fill-opacity="0.5"/>
        <path d="M8.5,15.5l1,1l2.3,-2.3l1.7,1.7l1.7,-1.7l2.6,2.6v1.2H8.5v-2.5z" fill="#C56CF0" fill-opacity="0.65"/>
        <path d="M8.5,15.5l0.6,0.6l2.3,-2.3l1.7,1.7l1.7,-1.7l2.6,2.6" fill="none" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    """,
    "spark": "M100,100m-2.5,0a2.5,2.5 0 1,0 5,0a2.5,2.5 0 1,0 -5,0M410,110m-2,0a2,2 0 1,0 4,0a2,2 0 1,0 -4,0",
}

APPS["todo"] = {
    "grad": ("#2BB673", "#37C97E", "#5BE7A0"),
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <circle cx="12" cy="12" r="9.2" fill="#ffffff" fill-opacity="0.97"/>
        <circle cx="12" cy="12" r="7.6" fill="none" stroke="#2BB673" stroke-opacity="0.35" stroke-width="1.1"/>
        <path d="M8.2,12.4l2.4,2.4l5.2,-5.4" fill="none" stroke="#0B8F4E" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8.2,12.4l2.4,2.4l5.2,-5.4" fill="none" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    """,
    "spark": "M96,400m-2,0a2,2 0 1,0 4,0a2,2 0 1,0 -4,0M404,94m-2.5,0a2.5,2.5 0 1,0 5,0a2.5,2.5 0 1,0 -5,0",
}

APPS["explorer"] = {
    "grad": ("#0A84FF", "#2E9BFF", "#6FC4FF"),
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <path d="M4,8h5l2,2h9c1.1,0 2,0.9 2,2v6c0,1.1 -0.9,2 -2,2H4c-1.1,0 -2,-0.9 -2,-2v-8c0,-1.1 0.9,-2 2,-2z" fill="#ffffff" fill-opacity="0.97"/>
        <path d="M4.6,9.4h4.6l1.2,1.2h8.8c0.5,0 0.8,0.3 0.8,0.8v1.6H3.8v-3.2c0,-0.4 0.4,-0.4 0.8,-0.4z" fill="#0A84FF" fill-opacity="0.3"/>
        <path d="M8.5,14.2l1.2,1.2l2.6,-2.6l2.6,2.6l1.2,-1.2l-3.8,-3.8l-3.8,3.8z" fill="#0A84FF"/>
        <path d="M8.5,14.2l1.2,1.2l2.6,-2.6" fill="none" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round"/>
      </g>
    """,
    "spark": "M100,400m-2.5,0a2.5,2.5 0 1,0 5,0a2.5,2.5 0 1,0 -5,0M410,92m-2,0a2,2 0 1,0 4,0a2,2 0 1,0 -4,0",
}

APPS["chat"] = {
    "grad": ("#5B5BD6", "#6E6AE8", "#9E9EFF"),
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <path d="M4,5.5h16c1.1,0 2,0.9 2,2v8.2c0,1.1 -0.9,2 -2,2h-9.6L6,21v-3.3H4c-1.1,0 -2,-0.9 -2,-2V7.5c0,-1.1 0.9,-2 2,-2z" fill="#ffffff" fill-opacity="0.97"/>
        <path d="M6,10h12v1.4H6V10zM6,13.2h8v1.4H6v-1.4z" fill="#5B5BD6" fill-opacity="0.6"/>
        <path d="M7.4,10.4h3.2v3.2H7.4z" fill="#5B5BD6" fill-opacity="0.35"/>
      </g>
    """,
    "spark": "M100,100m-2,0a2,2 0 1,0 4,0a2,2 0 1,0 -4,0M404,404m-2.5,0a2.5,2.5 0 1,0 5,0a2.5,2.5 0 1,0 -5,0",
}

APPS["settings"] = {
    "grad": ("#6E6E78", "#8E8E98", "#C0C0C8"),
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <path d="M12,4l1.7,1.9l0.3,0.4l0.5,0.1l2.5,-0.3l1.4,2.1l-1.5,2l-0.3,0.4l0.2,0.5l0.5,2.4l-2.1,1.4l-2.1,-1.4l-0.5,-0.3l-0.5,0.2l-2.1,1.5l-2.2,-1.4l0.5,-2.4l0.2,-0.5l-0.3,-0.4l-1.6,-2l1.4,-2.1l2.5,0.3l0.5,-0.1l0.3,-0.4L12,4z" fill="#ffffff" fill-opacity="0.97"/>
        <circle cx="12" cy="12" r="2.6" fill="#6E6E78"/>
        <circle cx="12" cy="12" r="1.3" fill="#ffffff"/>
        <path d="M12,6.2l0.9,1l0.2,0.2l0.3,0.1l1.3,-0.2l0.8,1.1l-0.8,1l-0.2,0.2l0.1,0.3l0.3,1.2l-1.1,0.7l-1.1,-0.7l-0.3,-0.2l-0.3,0.1l-1.1,0.8l-1.2,-0.7l0.3,-1.2l0.1,-0.3l-0.2,-0.2l-0.9,-1l0.8,-1.1l1.3,0.2l0.3,-0.1l0.2,-0.2l0.9,-1z" fill="#ffffff" fill-opacity="0.25"/>
      </g>
    """,
    "spark": "M100,400m-2,0a2,2 0 1,0 4,0a2,2 0 1,0 -4,0",
}

APPS["hub"] = {
    "grad": ("#4F46E5", "#6366F1", "#A5B4FC"),
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <path d="M12,3.5l8.5,7H19v8.5h-5v-5.5h-4v5.5H5V10.5H3.5L12,3.5z" fill="#ffffff" fill-opacity="0.97"/>
        <path d="M12,5.2l6.4,5.3v7h-3.2v-5.5H8.8v5.5H5.6v-7L12,5.2z" fill="#4F46E5" fill-opacity="0.3"/>
        <path d="M8,13h8" stroke="#ffffff" stroke-width="1" stroke-opacity="0.5"/>
      </g>
    """,
    "spark": "M100,100m-2.5,0a2.5,2.5 0 1,0 5,0a2.5,2.5 0 1,0 -5,0M410,400m-2,0a2,2 0 1,0 4,0a2,2 0 1,0 -4,0",
}

APPS["budget"] = {
    "grad": ("#37B24D", "#51CF66", "#8CE99A"),
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <circle cx="12" cy="12" r="9" fill="#ffffff" fill-opacity="0.97"/>
        <circle cx="12" cy="12" r="7.2" fill="none" stroke="#37B24D" stroke-opacity="0.3" stroke-width="0.9"/>
        <ellipse cx="12" cy="13.4" rx="2.3" ry="3.4" fill="#37B24D"/>
        <path d="M10.6,10.6h2.8M10.6,13.2h2.8" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round"/>
        <path d="M12,7.2v9.6" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="1.15" fill="#ffffff"/>
      </g>
    """,
    "spark": "M100,96m-2,0a2,2 0 1,0 4,0a2,2 0 1,0 -4,0M400,400m-2.5,0a2.5,2.5 0 1,0 5,0a2.5,2.5 0 1,0 -5,0",
}

APPS["health"] = {
    "grad": ("#E03131", "#F03E3E", "#FF8787"),
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <path d="M12,20.5l-1.4,-1.3C5.7,14.9 2.8,12.1 2.8,8.7C2.8,5.9 5.1,3.6 7.9,3.6c1.6,0 3.1,0.75 4.1,1.95c1,-1.2 2.5,-1.95 4.1,-1.95c2.8,0 5.1,2.3 5.1,5.1c0,3.4 -2.9,6.2 -7.8,10.5L12,20.5z" fill="#ffffff" fill-opacity="0.97"/>
        <!-- pulse -->
        <path d="M6.5,10.4h2.2l1.2,-2.4l2.1,4.2l1.3,-2.4h3.4" fill="none" stroke="#E03131" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    """,
    "spark": "M100,100m-2,0a2,2 0 1,0 4,0a2,2 0 1,0 -4,0M408,408m-2.5,0a2.5,2.5 0 1,0 5,0a2.5,2.5 0 1,0 -5,0",
}


def svg_icon(name, cfg):
    c1, c2, c3 = cfg["grad"]
    symbol = cfg["symbol"]
    spark = cfg["spark"]
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{c1}"/>
      <stop offset="55%" stop-color="{c2}"/>
      <stop offset="100%" stop-color="{c3}"/>
    </linearGradient>
    <clipPath id="r"><rect width="512" height="512" rx="112"/></clipPath>
    <radialGradient id="gloss" cx="32%" cy="22%" r="90%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.34"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.14"/>
    </radialGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="symShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000000" flood-opacity="0.30"/>
    </filter>
  </defs>
  <g clip-path="url(#r)">
    <rect width="512" height="512" fill="url(#bg)"/>
    <!-- background sparkle texture -->
    <path d="{spark}" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2.5"/>
    <path d="{spark}" fill="#ffffff" fill-opacity="0.14"/>
    <!-- subtle bottom inner shadow -->
    <rect x="0" y="380" width="512" height="132" fill="url(#shine)"/>
    <rect x="0" y="420" width="512" height="92" fill="#000000" fill-opacity="0.10"/>
    <rect width="512" height="512" fill="url(#gloss)"/>
    <!-- symbol with soft shadow -->
    <g filter="url(#symShadow)">
      {symbol}
    </g>
  </g>
</svg>"""


for name, cfg in APPS.items():
    with open(os.path.join(OUT, f"{name}.svg"), "w", encoding="utf-8") as f:
        f.write(svg_icon(name, cfg))
    print("generated", name)

print("PREMIUM SVG ICONS DONE")
