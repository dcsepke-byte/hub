import requests
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import List, Dict

# Basis-Feed und Kategorie-Feeds (Tagesschau)
FEED_URLS = {
    "top": "https://www.tagesschau.de/xml/rss2/",
    "tech": "https://www.tagesschau.de/xml/rss2/wissen/",
    "wirtschaft": "https://www.tagesschau.de/xml/rss2/wirtschaft/",
    "sport": "https://www.tagesschau.de/xml/rss2/sport/",
    "wissenschaft": "https://www.tagesschau.de/xml/rss2/wissen/",
}

CATEGORY_LABELS = {
    "top": "Top",
    "tech": "Tech",
    "wirtschaft": "Wirtschaft",
    "sport": "Sport",
    "wissenschaft": "Wissenschaft",
}


def fetch_news(limit: int = 5, category: str = "top") -> Dict:
    """Holt News aus Tagesschau-RSS-Feed, optional mit Kategorie-Filter."""
    feed_url = FEED_URLS.get(category, FEED_URLS["top"])
    category_label = CATEGORY_LABELS.get(category, "Top")

    try:
        r = requests.get(feed_url, timeout=8)
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
        return {
            "ok": True,
            "source": "tagesschau.de",
            "category": category_label,
            "items": items,
        }
    except Exception as e:
        return {"ok": False, "error": str(e), "category": category_label, "items": []}
