import requests
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import List, Dict

FEED_URL = "https://www.tagesschau.de/xml/rss2/"


def fetch_news(limit: int = 5) -> Dict:
    try:
        r = requests.get(FEED_URL, timeout=8)
        r.raise_for_status()
        root = ET.fromstring(r.content)
        items = []
        for item in root.findall(".//item")[:limit]:
            title = item.findtext("title", default="").strip()
            link = item.findtext("link", default="").strip()
            desc = item.findtext("description", default="").strip()
            pub_date = item.findtext("pubDate", default="").strip()
            items.append({
                "title": title,
                "url": link,
                "description": desc[:200] + ("..." if len(desc) > 200 else ""),
                "published": pub_date,
            })
        return {"ok": True, "source": "tagesschau.de", "items": items}
    except Exception as e:
        return {"ok": False, "error": str(e), "items": []}
