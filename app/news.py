import requests
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import List, Dict

# RSS-Feeds pro Kategorie — mehrere Quellen für Robustheit
FEED_URLS = {
    "top": "https://www.tagesschau.de/xml/rss2/",
    "tech": "https://www.heise.de/rss/heise-atom.xml",
    "wirtschaft": "https://www.faz.net/rss/aktuell/wirtschaft/",
    "sport": "https://www.ran.de/sport/rss.xml",
    "wissenschaft": "https://wissenschaft.de/feed.xml",
}

CATEGORY_LABELS = {
    "top": "Top",
    "tech": "Tech",
    "wirtschaft": "Wirtschaft",
    "sport": "Sport",
    "wissenschaft": "Wissenschaft",
}


def _parse_rss(content: bytes, limit: int) -> list:
    """Parse RSS 2.0 XML to item list."""
    root = ET.fromstring(content)
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
    return items


def _parse_atom(content: bytes, limit: int) -> list:
    """Parse Atom 1.0 XML to item list (Heise nutzt Atom)."""
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    root = ET.fromstring(content)
    items = []
    for entry in root.findall("atom:entry", ns)[:limit]:
        title = entry.findtext("atom:title", default="", namespaces=ns).strip()
        link_el = entry.find("atom:link", ns)
        link = link_el.attrib.get("href", "") if link_el is not None else ""
        desc_el = entry.find("atom:summary", ns)
        desc = (desc_el.text or "").strip() if desc_el is not None else ""
        pub_date = entry.findtext("atom:updated", default="", namespaces=ns).strip()
        items.append({
            "title": title,
            "url": link,
            "description": desc[:200] + ("..." if len(desc) > 200 else ""),
            "published": pub_date,
        })
    return items


def fetch_news(limit: int = 5, category: str = "top") -> Dict:
    """Holt News aus RSS(/Atom)-Feed, Fallback auf top bei Fehler."""
    feed_url = FEED_URLS.get(category, FEED_URLS["top"])
    category_label = CATEGORY_LABELS.get(category, "Top")

    try:
        r = requests.get(feed_url, timeout=8, headers={"User-Agent": "HUB/1.0"})
        r.raise_for_status()
        content = r.content

        # Erkenne Feed-Typ: Atom wenn root tag {http://www.w3.org/2005/Atom}feed
        if b"http://www.w3.org/2005/Atom" in content[:500]:
            items = _parse_atom(content, limit)
            source = feed_url.split("/")[2].replace("www.", "")
        else:
            items = _parse_rss(content, limit)
            source = "tagesschau.de" if "tagesschau" in feed_url else feed_url.split("/")[2].replace("www.", "")

        # Fallback: wenn Kategorie-Feed leer, hole top-News
        if not items and category != "top":
            return fetch_news(limit, "top")

        return {
            "ok": True,
            "source": source,
            "category": category_label,
            "items": items,
        }
    except Exception as e:
        # Bei Fehler → Fallback auf top
        if category != "top":
            return fetch_news(limit, "top")
        return {"ok": False, "error": str(e), "category": category_label, "items": []}
