"""
Premium SVG app icons for HUB — v5 (rich detail).
Full-bleed symbols with layered details: gradients inside symbols, accent colors,
shadows/highlights within the symbol, small but meaningful elements.
"""
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "static", "images", "apps")
os.makedirs(OUT, exist_ok=True)

APPS = {}

APPS["party-arena"] = {
    "grad": ("#FF375F", "#FF6B8A"),
    "symbol": """
        <!-- controller shell with depth -->
        <path d="M4.6,8.4c-1.6,0 -2.9,1.3 -2.9,2.9v2.6c0,1.6 1.3,2.9 2.9,2.9h14.8c1.6,0 2.9,-1.3 2.9,-2.9v-2.6c0,-1.6 -1.3,-2.9 -2.9,-2.9h-14.8z" fill="#ffffff" fill-opacity="0.97"/>
        <path d="M4.6,9.6c-1,0 -1.8,0.8 -1.8,1.8v2.5c0,1 0.8,1.8 1.8,1.8h14.8c1,0 1.8,-0.8 1.8,-1.8v-2.5c0,-1 -0.8,-1.8 -1.8,-1.8h-14.8z" fill="#FF2D55" fill-opacity="0.18"/>
        <!-- D-pad -->
        <path d="M7.4,11.3h1.6v-1.6h1.5v1.6h1.6v1.5h-1.6v1.6h-1.5v-1.6h-1.6v-1.5z" fill="#FF2D55"/>
        <path d="M14.6,10.9h3.4v1.7h-3.4zM14.6,13.4h3.4v1.7h-3.4z" fill="#FF6B8A"/>
        <!-- action buttons -->
        <circle cx="17.3" cy="11.8" r="1.35" fill="#FF8FA3"/>
        <circle cx="19.3" cy="13.8" r="1.35" fill="#FFD60A"/>
        <circle cx="6.8" cy="15.4" r="1.2" fill="#30D158"/>
        <!-- stick nubs -->
        <circle cx="11" cy="13.4" r="1.1" fill="#FF6B8A"/>
        <circle cx="11" cy="13.4" r="0.45" fill="#ffffff" fill-opacity="0.6"/>
        <!-- highlight -->
        <path d="M5.2,10.2c0.4,-0.5 1,-0.8 1.6,-0.8" stroke="#ffffff" stroke-width="0.6" stroke-linecap="round" fill="none" fill-opacity="0.7"/>
    """,
    "bbox": (1.5, 6.2, 21.9, 18.0),
}

APPS["piano-coach"] = {
    "grad": ("#5856D6", "#7A7AF0"),
    "symbol": """
        <!-- piano body -->
        <rect x="3.8" y="5.8" width="16.4" height="12.4" rx="2.4" fill="#ffffff" fill-opacity="0.97"/>
        <rect x="3.8" y="5.8" width="16.4" height="12.4" rx="2.4" fill="none" stroke="#3d3a66" stroke-opacity="0.15" stroke-width="0.6"/>
        <!-- top rail -->
        <rect x="3.8" y="5.8" width="16.4" height="1.6" rx="0.8" fill="#ffffff" fill-opacity="0.5"/>
        <!-- white keys -->
        <path d="M5.6,7.6h2.2v10.4h-2.2zM9.4,7.6h2.2v10.4h-2.2zM13.2,7.6h2.2v10.4h-2.2zM17,7.6h2.2v10.4h-2.2z" fill="#e9e4ff"/>
        <!-- black keys with depth -->
        <rect x="6.9" y="7.6" width="1.3" height="4.2" rx="0.3" fill="#2d2a3e"/>
        <rect x="10.7" y="7.6" width="1.3" height="4.2" rx="0.3" fill="#2d2a3e"/>
        <rect x="14.5" y="7.6" width="1.3" height="4.2" rx="0.3" fill="#2d2a3e"/>
        <rect x="6.9" y="7.6" width="1.3" height="1.1" rx="0.3" fill="#3d3a66" fill-opacity="0.8"/>
        <rect x="10.7" y="7.6" width="1.3" height="1.1" rx="0.3" fill="#3d3a66" fill-opacity="0.8"/>
        <rect x="14.5" y="7.6" width="1.3" height="1.1" rx="0.3" fill="#3d3a66" fill-opacity="0.8"/>
        <!-- red accent key line -->
        <path d="M3.8,13.2h16.4" stroke="#FF375F" stroke-opacity="0.35" stroke-width="0.5"/>
    """,
    "bbox": (3.6, 5.6, 20.4, 18.4),
}

APPS["bangkok"] = {
    "grad": ("#FF9500", "#FFB340"),
    "symbol": """
        <!-- temple base -->
        <path d="M4.6,15.6c0.6,-0.9 1.6,-1.5 2.8,-1.7l0.5,-1.3l1.2,-0.5l0.3,-1.6l1.1,-1.1l1.1,1.1l0.3,1.6l1.2,0.5l0.5,1.3c1.2,0.2 2.2,0.8 2.8,1.7h-11.8z" fill="#ffffff" fill-opacity="0.97"/>
        <!-- spires -->
        <path d="M12,7.2l0.7,1.6l-0.2,1.2l-0.5,0.3l-0.5,-0.3l-0.2,-1.2l0.7,-1.6z" fill="#ffffff" fill-opacity="0.9"/>
        <path d="M8.9,8.6l0.5,1.2l-0.15,1l-0.4,0.25l-0.4,-0.25l-0.15,-1l0.6,-1.2z" fill="#ffffff" fill-opacity="0.65"/>
        <path d="M15.1,8.6l0.5,1.2l-0.15,1l-0.4,0.25l-0.4,-0.25l-0.15,-1l0.6,-1.2z" fill="#ffffff" fill-opacity="0.65"/>
        <!-- door -->
        <path d="M10.6,15.6v-2.6c0,-0.4 0.3,-0.7 0.7,-0.7h1.4c0.4,0 0.7,0.3 0.7,0.7v2.6h-2.8z" fill="#E8590C"/>
        <path d="M10.6,15.6v-2.6c0,-0.4 0.3,-0.7 0.7,-0.7h1.4c0.4,0 0.7,0.3 0.7,0.7v2.6h-2.8z" fill="#ffffff" fill-opacity="0.3"/>
        <!-- base line -->
        <path d="M4.4,16.9h15.2" stroke="#ffffff" stroke-width="1" stroke-linecap="round" fill="none" fill-opacity="0.5"/>
    """,
    "bbox": (4.0, 6.6, 20.0, 17.4),
}

APPS["notizen"] = {
    "grad": ("#FFD60A", "#FFE566"),
    "symbol": """
        <!-- paper -->
        <path d="M5.4,4.2h8.4l5.8,5.8v9.8c0,1 -0.8,1.8 -1.8,1.8H5.4c-1,0 -1.8,-0.8 -1.8,-1.8V6c0,-1 0.8,-1.8 1.8,-1.8z" fill="#ffffff" fill-opacity="0.97"/>
        <path d="M13.8,4.2l5.8,5.8h-4.6c-0.7,0 -1.2,-0.5 -1.2,-1.2V4.2z" fill="#FFD60A" fill-opacity="0.35"/>
        <!-- fold shadow -->
        <path d="M13.8,4.2l5.8,5.8h-4.6c-0.7,0 -1.2,-0.5 -1.2,-1.2V4.2z" fill="none" stroke="#FFD60A" stroke-opacity="0.4" stroke-width="0.7"/>
        <!-- lines -->
        <path d="M6.8,12.2h7.4M6.8,15.4h7.4M6.8,18.4h4.6" stroke="#FFB300" stroke-width="0.9" stroke-linecap="round" fill="none" stroke-opacity="0.75"/>
        <!-- pencil -->
        <path d="M15.2,6.6l2.4,2.4l-5.2,5.2l-3,0.6l0.6,-3l5.2,-5.2z" fill="#FFB300"/>
        <path d="M16.4,5.4l1.2,1.2l-0.8,0.8l-1.2,-1.2l0.8,-0.8z" fill="#FFE566"/>
        <path d="M15.2,6.6l2.4,2.4l-5.2,5.2l-3,0.6l0.6,-3l5.2,-5.2z" fill="none" stroke="#B26E00" stroke-opacity="0.3" stroke-width="0.5"/>
        <!-- pencil tip -->
        <path d="M17.6,7.8l-3.6,3.6" stroke="#ffffff" stroke-width="0.5" stroke-linecap="round" fill="none"/>
    """,
    "bbox": (3.4, 4.0, 22.2, 19.8),
}

APPS["projects"] = {
    "grad": ("#AF52DE", "#C47FF0"),
    "symbol": """
        <!-- folder -->
        <path d="M4,8.4h5.2l2,2H19.8c0.9,0 1.6,0.7 1.6,1.6v6.4c0,0.9 -0.7,1.6 -1.6,1.6H4c-0.9,0 -1.6,-0.7 -1.6,-1.6v-8.4c0,-0.9 0.7,-1.6 1.6,-1.6z" fill="#ffffff" fill-opacity="0.97"/>
        <path d="M4,8.4h5.2l2,2H19.8c0.9,0 1.6,0.7 1.6,1.6v1H2.4v-2.6c0,-0.9 0.7,-1.6 1.6,-1.6z" fill="#AF52DE" fill-opacity="0.25"/>
        <!-- mini bar chart -->
        <rect x="7" y="14.2" width="1.8" height="4" rx="0.5" fill="#AF52DE"/>
        <rect x="10" y="11.8" width="1.8" height="6.4" rx="0.5" fill="#AF52DE"/>
        <rect x="13" y="13" width="1.8" height="5.2" rx="0.5" fill="#C47FF0"/>
        <rect x="7" y="14.2" width="1.8" height="4" rx="0.5" fill="#ffffff" fill-opacity="0.35"/>
        <rect x="10" y="11.8" width="1.8" height="6.4" rx="0.5" fill="#ffffff" fill-opacity="0.35"/>
    """,
    "bbox": (2.2, 6.6, 21.8, 19.8),
}

APPS["todo"] = {
    "grad": ("#30D158", "#5CE084"),
    "symbol": """
        <circle cx="12" cy="12" r="9.4" fill="#ffffff" fill-opacity="0.97"/>
        <circle cx="12" cy="12" r="9.4" fill="none" stroke="#1f8f3d" stroke-opacity="0.15" stroke-width="0.8"/>
        <!-- check -->
        <path d="M8.3,12.5l2.4,2.4l5,-5.3" fill="none" stroke="#1f8f3d" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8.3,12.5l2.4,2.4l5,-5.3" fill="none" stroke="#ffffff" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- gloss arc -->
        <path d="M6.4,8.2c0.9,-1.2 2.4,-2 4.1,-2.2" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" fill="none" fill-opacity="0.55"/>
        <!-- small sparkle -->
        <circle cx="16.8" cy="6.8" r="0.6" fill="#ffffff" fill-opacity="0.8"/>
    """,
    "bbox": (2.4, 2.4, 21.6, 21.6),
}

APPS["explorer"] = {
    "grad": ("#0A84FF", "#4DA6FF"),
    "symbol": """
        <path d="M4,8.4h5.2l2,2H19.8c0.9,0 1.6,0.7 1.6,1.6v6.4c0,0.9 -0.7,1.6 -1.6,1.6H4c-0.9,0 -1.6,-0.7 -1.6,-1.6v-8.4c0,-0.9 0.7,-1.6 1.6,-1.6z" fill="#ffffff" fill-opacity="0.97"/>
        <path d="M4,8.4h5.2l2,2H19.8c0.9,0 1.6,0.7 1.6,1.6v1H2.4v-2.6c0,-0.9 0.7,-1.6 1.6,-1.6z" fill="#0A84FF" fill-opacity="0.22"/>
        <!-- download arrow -->
        <path d="M12,11.4v5.6" stroke="#0A84FF" stroke-width="1.9" stroke-linecap="round" fill="none"/>
        <path d="M9.6,14.2l2.4,2.6l2.4,-2.6" fill="none" stroke="#0A84FF" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9.6,14.2l2.4,2.6l2.4,-2.6" fill="none" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- ground line -->
        <path d="M8,18.8h8" stroke="#0A84FF" stroke-opacity="0.3" stroke-width="0.9" stroke-linecap="round" fill="none"/>
    """,
    "bbox": (2.2, 6.6, 21.8, 19.6),
}

APPS["chat"] = {
    "grad": ("#5E5CE6", "#8A88F5"),
    "symbol": """
        <path d="M4.2,5.6h15.6c1.1,0 2,0.9 2,2v7.8c0,1.1 -0.9,2 -2,2h-9.4l-4.4,4v-4h-1.8c-1.1,0 -2,-0.9 -2,-2V7.6c0,-1.1 0.9,-2 2,-2z" fill="#ffffff" fill-opacity="0.97"/>
        <!-- bubble lines -->
        <rect x="6.2" y="10" width="9" height="1.5" rx="0.75" fill="#5E5CE6" fill-opacity="0.55"/>
        <rect x="6.2" y="13" width="6.4" height="1.5" rx="0.75" fill="#5E5CE6" fill-opacity="0.35"/>
        <!-- sender dot -->
        <circle cx="17" cy="10.75" r="0.85" fill="#5E5CE6" fill-opacity="0.5"/>
        <!-- tail highlight -->
        <path d="M8.6,17.4l-1.6,1.6" stroke="#ffffff" stroke-opacity="0.5" stroke-width="0.7" stroke-linecap="round" fill="none"/>
    """,
    "bbox": (1.8, 3.6, 22.2, 21.4),
}

APPS["settings"] = {
    "grad": ("#8E8E93", "#B0B0B6"),
    "symbol": """
        <path d="M12,3.6l1.7,1.8l0.35,0.3l0.55,0.1l2.4,-0.35l1.5,2.1l-1.55,2l-0.25,0.35l0.15,0.45l0.6,2.3l-2.1,1.4l-2.1,-1.4l-0.45,-0.3l-0.45,0.15l-2.1,1.55l-2.2,-1.4l0.6,-2.3l0.15,-0.45l-0.25,-0.35l-1.6,-2l1.5,-2.1l2.4,0.35l0.55,-0.1l0.35,-0.3L12,3.6z" fill="#ffffff" fill-opacity="0.97"/>
        <!-- teeth detail -->
        <path d="M12,3.6l1.7,1.8l0.35,0.3l0.55,0.1l2.4,-0.35l1.5,2.1l-1.55,2l-0.25,0.35l0.15,0.45l0.6,2.3l-2.1,1.4l-2.1,-1.4l-0.45,-0.3l-0.45,0.15l-2.1,1.55l-2.2,-1.4l0.6,-2.3l0.15,-0.45l-0.25,-0.35l-1.6,-2l1.5,-2.1l2.4,0.35l0.55,-0.1l0.35,-0.3L12,3.6z" fill="none" stroke="#8E8E93" stroke-opacity="0.35" stroke-width="0.4"/>
        <circle cx="12" cy="12" r="2.5" fill="#8E8E93"/>
        <circle cx="12" cy="12" r="2.5" fill="none" stroke="#6d6d74" stroke-opacity="0.3" stroke-width="0.5"/>
        <circle cx="12" cy="12" r="1.15" fill="#ffffff"/>
        <!-- gloss -->
        <path d="M9.6,6.6c0.7,-0.6 1.6,-0.9 2.4,-1" stroke="#ffffff" stroke-width="0.7" stroke-linecap="round" fill="none" fill-opacity="0.4"/>
    """,
    "bbox": (4.2, 3.6, 19.8, 20.4),
}

APPS["hub"] = {
    "grad": ("#5856D6", "#8B5CF6"),
    "symbol": """
        <path d="M12,3.4l8.4,7V19c0,0.8 -0.6,1.4 -1.4,1.4h-4.9v-5.3h-4.2v5.3H5c-0.8,0 -1.4,-0.6 -1.4,-1.4v-8.6L12,3.4z" fill="#ffffff" fill-opacity="0.97"/>
        <!-- door -->
        <path d="M12,5.4l6.6,5.5v7h-3.1v-5.3H8.5v5.3h-3.1v-7L12,5.4z" fill="#5856D6" fill-opacity="0.3"/>
        <path d="M10.4,15.4h3.2v5h-3.2z" fill="#5856D6"/>
        <!-- window -->
        <rect x="7.6" y="9.6" width="2" height="2" rx="0.4" fill="#ffffff" fill-opacity="0.85"/>
        <rect x="14.4" y="9.6" width="2" height="2" rx="0.4" fill="#ffffff" fill-opacity="0.85"/>
        <!-- ground -->
        <path d="M4.2,19.8h15.6" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round" fill="none" fill-opacity="0.35"/>
    """,
    "bbox": (3.4, 3.2, 20.6, 20.8),
}

APPS["budget"] = {
    "grad": ("#32D74B", "#6AE57E"),
    "symbol": """
        <circle cx="12" cy="12" r="9.4" fill="#ffffff" fill-opacity="0.97"/>
        <circle cx="12" cy="12" r="9.4" fill="none" stroke="#1f8f3d" stroke-opacity="0.12" stroke-width="0.8"/>
        <!-- euro coin -->
        <ellipse cx="12" cy="13.6" rx="2.6" ry="3.8" fill="#32D74B"/>
        <ellipse cx="12" cy="13.6" rx="2.6" ry="3.8" fill="none" stroke="#1f8f3d" stroke-opacity="0.3" stroke-width="0.5"/>
        <path d="M10.2,10.6h3.4M10.2,13.4h3.4" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round"/>
        <path d="M12,6.6v9.8" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="1.2" fill="#ffffff"/>
        <!-- rising bars -->
        <rect x="5.2" y="15.4" width="1.4" height="2.2" rx="0.4" fill="#32D74B" fill-opacity="0.35"/>
        <rect x="7.4" y="13.6" width="1.4" height="4" rx="0.4" fill="#32D74B" fill-opacity="0.5"/>
        <!-- gloss -->
        <path d="M6.6,7.6c0.8,-0.8 1.9,-1.3 3,-1.4" stroke="#ffffff" stroke-width="1" stroke-linecap="round" fill="none" fill-opacity="0.5"/>
    """,
    "bbox": (2.4, 2.4, 21.6, 21.6),
}

APPS["health"] = {
    "grad": ("#FF453A", "#FF6961"),
    "symbol": """
        <path d="M12,20.3l-1.5,-1.35C5.7,14.65 2.8,11.95 2.8,8.65c0,-2.7 2.2,-4.9 4.9,-4.9c1.6,0 3.1,0.75 4.3,2c1.2,-1.25 2.7,-2 4.3,-2c2.7,0 4.9,2.2 4.9,4.9c0,3.3 -2.9,6 -7.7,10.3L12,20.3z" fill="#ffffff" fill-opacity="0.97"/>
        <!-- inner heart shade -->
        <path d="M12,18.4l-1.2,-1.05C6.9,14.5 4.5,12.2 4.5,9.5c0,-1.9 1.5,-3.4 3.4,-3.4c1.1,0 2.1,0.5 2.9,1.35L12,8.8l1.2,-1.35c0.8,-0.85 1.8,-1.35 2.9,-1.35c1.9,0 3.4,1.5 3.4,3.4c0,2.7 -2.4,5 -6.3,7.85L12,18.4z" fill="#FF453A" fill-opacity="0.08"/>
        <!-- pulse -->
        <path d="M6.6,10.4h2l1.15,-2.2l2,4.1l1.15,-2.1h3.5" fill="none" stroke="#FF453A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- gloss -->
        <path d="M6.8,5.4c0.9,-0.7 2,-1.1 3.1,-1.1" stroke="#ffffff" stroke-width="1" stroke-linecap="round" fill="none" fill-opacity="0.5"/>
    """,
    "bbox": (2.8, 3.6, 21.2, 20.4),
}


def svg_icon(name, cfg):
    c1, c2 = cfg["grad"]
    symbol = cfg["symbol"]
    minx, miny, maxx, maxy = cfg["bbox"]
    bw, bh = maxx - minx, maxy - miny
    target = 512 * 0.80
    scale = target / max(bw, bh)
    sw, sh = bw * scale, bh * scale
    tx = (512 - sw) / 2 - minx * scale
    ty = (512 - sh) / 2 - miny * scale
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{c1}"/>
      <stop offset="100%" stop-color="{c2}"/>
    </linearGradient>
    <clipPath id="r"><rect width="512" height="512" rx="116"/></clipPath>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.20"/>
      <stop offset="38%" stop-color="#ffffff" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.08"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <g clip-path="url(#r)">
    <rect width="512" height="512" fill="url(#bg)"/>
    <rect width="512" height="512" fill="url(#sheen)"/>
    <g transform="translate({tx:.1f} {ty:.1f}) scale({scale:.2f})" filter="url(#shadow)">
      {symbol}
    </g>
  </g>
</svg>"""


for name, cfg in APPS.items():
    with open(os.path.join(OUT, f"{name}.svg"), "w", encoding="utf-8") as f:
        f.write(svg_icon(name, cfg))
    print("generated", name)

print("RICH DETAIL SVG ICONS DONE")
