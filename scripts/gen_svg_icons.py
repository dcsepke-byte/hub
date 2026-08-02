"""
Premium SVG app icons for HUB — v3 (modern Apple-style).
Clean, minimal, iOS 18 system colors, subtle same-family gradients, big centered symbols.
No sparkles, no heavy shadows — premium = restraint.
"""
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "static", "images", "apps")
os.makedirs(OUT, exist_ok=True)

# Apple iOS 18 system colors — modern, saturated, same-family gradients
APPS = {}

APPS["party-arena"] = {
    "grad": ("#FF375F", "#FF6B8A"),  # systemPink
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <rect x="4.5" y="8.5" width="15" height="6.6" rx="3.3" fill="#ffffff" fill-opacity="0.96"/>
        <rect x="4.5" y="8.5" width="15" height="2.4" rx="1.2" fill="#ffffff"/>
        <circle cx="7" cy="11.8" r="1.1" fill="#FF375F"/>
        <circle cx="17" cy="11.8" r="1.1" fill="#FF375F"/>
        <circle cx="12" cy="13.6" r="0.95" fill="#FF6B8A"/>
        <path d="M8.8,11.8h6.4" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>
      </g>
    """,
}

APPS["piano-coach"] = {
    "grad": ("#5856D6", "#7A7AF0"),  # systemIndigo
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <rect x="4" y="6.5" width="16" height="11" rx="2.2" fill="#ffffff" fill-opacity="0.96"/>
        <rect x="7" y="9" width="1.5" height="8.5" fill="#5856D6"/>
        <rect x="11" y="9" width="1.5" height="8.5" fill="#5856D6"/>
        <rect x="15" y="9" width="1.5" height="8.5" fill="#5856D6"/>
        <rect x="7" y="6.5" width="16" height="2.4" rx="1.2" fill="#ffffff" fill-opacity="0.5"/>
      </g>
    """,
}

APPS["bangkok"] = {
    "grad": ("#FF9500", "#FFB340"),  # systemOrange
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <path d="M7.2,14.5l0.5,-1.6c0.3,-1 1.2,-1.7 2.2,-1.9l0.6,-1.6l1.5,-0.5l0.3,-2l1.3,-1.3l1.3,1.3l0.3,2l1.5,0.5l0.6,1.6c1,0.2 1.9,0.9 2.2,1.9l0.5,1.6h-12.8z" fill="#ffffff" fill-opacity="0.96"/>
        <path d="M8.2,14.5h7.6l-0.3,1c-0.2,0.7 -0.8,1.1 -1.5,1.1h-4c-0.7,0 -1.3,-0.4 -1.5,-1.1l-0.3,-1z" fill="#ffffff" fill-opacity="0.75"/>
      </g>
    """,
}

APPS["notizen"] = {
    "grad": ("#FFD60A", "#FFE566"),  # systemYellow
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <path d="M5,4.2h9l6,6v9.6c0,1 -0.8,1.8 -1.8,1.8H5c-1,0 -1.8,-0.8 -1.8,-1.8V6c0,-1 0.8,-1.8 1.8,-1.8z" fill="#ffffff" fill-opacity="0.96"/>
        <path d="M13.5,4.2l6,6h-4.8c-0.7,0 -1.2,-0.5 -1.2,-1.2V4.2z" fill="#FFD60A" fill-opacity="0.4"/>
        <path d="M7,12.5h7v1.6H7zM7,16h7v1.6H7z" fill="#FFD60A" fill-opacity="0.85"/>
        <path d="M15.8,7.2l2.2,2.2l-4.8,4.8l-2.7,0.5l0.5,-2.7l4.8,-4.8z" fill="#ffffff"/>
        <path d="M17,6l1.2,1.2l-0.9,0.9l-1.2,-1.2L17,6z" fill="#FFF9DB"/>
      </g>
    """,
}

APPS["projects"] = {
    "grad": ("#AF52DE", "#C47FF0"),  # systemPurple
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <path d="M4,8.5h5.2l2,2H20c0.9,0 1.6,0.7 1.6,1.6v6.3c0,0.9 -0.7,1.6 -1.6,1.6H4c-0.9,0 -1.6,-0.7 -1.6,-1.6v-8.3c0,-0.9 0.7,-1.6 1.6,-1.6z" fill="#ffffff" fill-opacity="0.96"/>
        <path d="M8,15.2l1.1,1.1l2.4,-2.4l1.8,1.8l2.7,-2.7l2.2,2.2v1.3H8v-1.3z" fill="none" stroke="#AF52DE" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8,18.6h8" stroke="#AF52DE" stroke-opacity="0.4" stroke-width="1.1" stroke-linecap="round"/>
      </g>
    """,
}

APPS["todo"] = {
    "grad": ("#30D158", "#5CE084"),  # systemGreen
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <circle cx="12" cy="12" r="9.4" fill="#ffffff" fill-opacity="0.96"/>
        <path d="M8.4,12.4l2.3,2.3l4.9,-5.2" fill="none" stroke="#30D158" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    """,
}

APPS["explorer"] = {
    "grad": ("#0A84FF", "#4DA6FF"),  # systemBlue
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <path d="M4,8.5h5.2l2,2H20c0.9,0 1.6,0.7 1.6,1.6v6.3c0,0.9 -0.7,1.6 -1.6,1.6H4c-0.9,0 -1.6,-0.7 -1.6,-1.6v-8.3c0,-0.9 0.7,-1.6 1.6,-1.6z" fill="#ffffff" fill-opacity="0.96"/>
        <path d="M8.3,14.6l1.1,1.1l2.6,-2.6l2.6,2.6l1.1,-1.1l-3.7,-3.7l-3.7,3.7z" fill="#0A84FF"/>
        <path d="M8.3,14.6l1.1,1.1l2.6,-2.6" fill="none" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round"/>
      </g>
    """,
}

APPS["chat"] = {
    "grad": ("#5E5CE6", "#8A88F5"),  # systemIndigoLight
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <path d="M4,5.5h16c1.1,0 2,0.9 2,2v8.2c0,1.1 -0.9,2 -2,2h-9.6L6,21v-3.3H4c-1.1,0 -2,-0.9 -2,-2V7.5c0,-1.1 0.9,-2 2,-2z" fill="#ffffff" fill-opacity="0.96"/>
        <path d="M6,10h12v1.5H6zM6,13.3h8v1.5H6z" fill="#5E5CE6" fill-opacity="0.55"/>
      </g>
    """,
}

APPS["settings"] = {
    "grad": ("#8E8E93", "#B0B0B6"),  # systemGray
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <path d="M12,4.6l1.6,1.7l0.3,0.3l0.5,0.1l2.3,-0.3l1.3,1.9l-1.4,1.8l-0.2,0.3l0.1,0.4l0.5,2.2l-1.9,1.3l-1.9,-1.3l-0.4,-0.3l-0.4,0.1l-1.9,1.4l-2,-1.3l0.5,-2.2l0.1,-0.4l-0.2,-0.3l-1.5,-1.8l1.3,-1.9l2.3,0.3l0.5,-0.1l0.3,-0.3L12,4.6z" fill="#ffffff" fill-opacity="0.96"/>
        <circle cx="12" cy="12" r="2.4" fill="#8E8E93"/>
        <circle cx="12" cy="12" r="1.1" fill="#ffffff"/>
      </g>
    """,
}

APPS["hub"] = {
    "grad": ("#5856D6", "#8B5CF6"),  # indigo→violet
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <path d="M12,3.8l8.2,6.8V19c0,0.8 -0.6,1.4 -1.4,1.4h-4.8v-5.2h-4v5.2H5.2c-0.8,0 -1.4,-0.6 -1.4,-1.4v-8.4L12,3.8z" fill="#ffffff" fill-opacity="0.96"/>
        <path d="M12,5.6l6.4,5.3v7h-3v-5.5H8.6v5.5h-3v-7L12,5.6z" fill="#5856D6" fill-opacity="0.3"/>
      </g>
    """,
}

APPS["budget"] = {
    "grad": ("#32D74B", "#6AE57E"),  # green (light mode #30D158 / dark #32D74B)
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <circle cx="12" cy="12" r="9.2" fill="#ffffff" fill-opacity="0.96"/>
        <ellipse cx="12" cy="13.6" rx="2.4" ry="3.6" fill="#32D74B"/>
        <path d="M10.4,10.8h3.2M10.4,13.4h3.2" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M12,6.8v9.6" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="1.2" fill="#ffffff"/>
      </g>
    """,
}

APPS["health"] = {
    "grad": ("#FF453A", "#FF6961"),  # systemRed
    "symbol": """
      <g transform="translate(136 136) scale(10)">
        <path d="M12,20.3l-1.4,-1.3C5.8,14.7 2.9,12 2.9,8.7c0,-2.7 2.2,-4.9 4.9,-4.9c1.6,0 3.1,0.75 4.2,2c1.1,-1.25 2.6,-2 4.2,-2c2.7,0 4.9,2.2 4.9,4.9c0,3.3 -2.9,6 -7.7,10.3L12,20.3z" fill="#ffffff" fill-opacity="0.96"/>
        <path d="M6.8,10.2h2.1l1.2,-2.3l2,4l1.2,-2.1h2.9" fill="none" stroke="#FF453A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    """,
}


def svg_icon(name, cfg):
    c1, c2 = cfg["grad"]
    symbol = cfg["symbol"]
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
    <g filter="url(#shadow)">
      {symbol}
    </g>
  </g>
</svg>"""


for name, cfg in APPS.items():
    with open(os.path.join(OUT, f"{name}.svg"), "w", encoding="utf-8") as f:
        f.write(svg_icon(name, cfg))
    print("generated", name)

print("MODERN SVG ICONS DONE")
