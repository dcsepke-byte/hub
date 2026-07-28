import os
import json
import requests
from typing import Optional
from app.config import Config

# Einfacher Aktien-Tracker über Yahoo Finance (kostenlos, unauthentifiziert)
# Yahoo Finance API URL für Chart-Daten
YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=2d"

SYMBOLS_FILE = os.path.join(Config.FILES_DIR, "stocks.json")

DEFAULT_SYMBOLS = ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "GOOGL"]


def _load_symbols():
    if os.path.exists(SYMBOLS_FILE):
        try:
            with open(SYMBOLS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except Exception:
            pass
    return DEFAULT_SYMBOLS.copy()


def _save_symbols(symbols):
    try:
        os.makedirs(os.path.dirname(SYMBOLS_FILE), exist_ok=True)
        with open(SYMBOLS_FILE, "w", encoding="utf-8") as f:
            json.dump(symbols, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False


def _quote(symbol: str) -> Optional[dict]:
    try:
        r = requests.get(YAHOO_URL.format(symbol=symbol), timeout=10, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        if not r.ok:
            return None
        data = r.json()
        result = data.get("chart", {}).get("result", [None])[0]
        if not result:
            return None
        meta = result.get("meta", {})
        price = meta.get("regularMarketPrice", 0)
        prev = meta.get("previousClose") or meta.get("chartPreviousClose", price)
        change = price - prev if price and prev else 0
        percent = (change / prev * 100) if prev else 0
        currency = meta.get("currency", "USD")
        return {
            "symbol": symbol,
            "price": price,
            "currency": currency,
            "change": change,
            "percent": percent,
        }
    except Exception:
        return None


def fetch_quotes():
    symbols = _load_symbols()
    items = []
    for s in symbols:
        q = _quote(s)
        if q:
            items.append(q)
    if not items:
        return {"ok": False, "error": "Aktienkurse momentan nicht abrufbar"}
    return {"ok": True, "items": items}


def add_symbol(symbol: str):
    symbol = (symbol or "").strip().upper()
    if not symbol:
        return {"ok": False, "error": "Symbol fehlt"}
    symbols = _load_symbols()
    if symbol in symbols:
        return {"ok": False, "error": "Symbol bereits vorhanden"}
    q = _quote(symbol)
    if not q:
        return {"ok": False, "error": f"Symbol {symbol} nicht gefunden"}
    symbols.append(symbol)
    _save_symbols(symbols)
    return {"ok": True, "quote": q}


def remove_symbol(symbol: str):
    symbol = (symbol or "").strip().upper()
    symbols = _load_symbols()
    if symbol in DEFAULT_SYMBOLS:
        return {"ok": False, "error": "Standard-Symbol kann nicht entfernt werden"}
    if symbol not in symbols:
        return {"ok": False, "error": "Symbol nicht vorhanden"}
    symbols.remove(symbol)
    _save_symbols(symbols)
    return {"ok": True}
