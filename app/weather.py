import os
import requests
from typing import Optional


def get_weather(lat: float = 52.27, lon: float = 10.53) -> dict:
    """Open-Meteo current weather + forecast."""
    try:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": ["temperature_2m", "weather_code", "is_day", "relative_humidity_2m", "wind_speed_10m"],
            "daily": ["weather_code", "temperature_2m_max", "temperature_2m_min"],
            "timezone": "Europe/Berlin",
            "forecast_days": 4,
            "temperature_unit": "celsius",
            "wind_speed_unit": "kmh",
        }
        r = requests.get(url, params=params, timeout=15)
        data = r.json()
        current = data.get("current", {})
        daily = data.get("daily", {})
        return {
            "ok": True,
            "current": {
                "temp": current.get("temperature_2m"),
                "code": current.get("weather_code"),
                "is_day": current.get("is_day"),
                "humidity": current.get("relative_humidity_2m"),
                "wind": current.get("wind_speed_10m"),
            },
            "daily": [
                {
                    "date": daily.get("time", [])[i],
                    "code": daily.get("weather_code", [])[i],
                    "max": daily.get("temperature_2m_max", [])[i],
                    "min": daily.get("temperature_2m_min", [])[i],
                }
                for i in range(len(daily.get("time", [])))
            ],
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


def weather_icon(code: int, is_day: int = 1) -> str:
    """WMO Weather interpretation codes (WW) to emoji."""
    if code is None:
        return "❓"
    mapping = {
        0: "☀️" if is_day else "🌙",
        1: "🌤️" if is_day else "☁️",
        2: "⛅" if is_day else "☁️",
        3: "☁️",
        45: "🌫️",
        48: "🌫️",
        51: "🌦️",
        53: "🌧️",
        55: "🌧️",
        61: "🌧️",
        63: "🌧️",
        65: "🌧️",
        71: "🌨️",
        73: "🌨️",
        75: "🌨️",
        77: "🌨️",
        80: "🌦️",
        81: "🌧️",
        82: "🌧️",
        85: "🌨️",
        86: "🌨️",
        95: "⛈️",
        96: "⛈️",
        99: "⛈️",
    }
    return mapping.get(code, "❓")
