import os
from pathlib import Path
from typing import Optional
import requests
from app.config import Config

OLLAMA_BASE = os.environ.get("OLLAMA_BASE_URL", "https://ollama.com/v1")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "kimi-k2.7-code")


def chat_completion(messages: list[dict], stream: bool = False, timeout: int = 60) -> dict:
    """Send messages to Ollama Cloud-compatible API."""
    api_key = os.environ.get("OLLAMA_API_KEY") or os.environ.get("OPENAI_API_KEY") or ""
    if not api_key:
        return {"ok": False, "error": "Kein API-Key für KI-Anfragen konfiguriert."}

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    # Ollama Cloud uses OpenAI-compatible /v1/chat/completions
    url = f"{OLLAMA_BASE.rstrip('/')}/chat/completions"
    body = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": stream,
        "temperature": 0.7,
    }

    try:
        r = requests.post(url, headers=headers, json=body, timeout=timeout)
        if not r.ok:
            return {"ok": False, "error": f"HTTP {r.status_code}: {r.text[:200]}"}
        data = r.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return {"ok": True, "text": content.strip(), "model": data.get("model", OLLAMA_MODEL)}
    except requests.exceptions.Timeout:
        return {"ok": False, "error": "KI-Antwort hat zu lange gedauert."}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def generate_daily_report(tasks: list[dict], weather_text: str) -> str:
    system_msg = {
        "role": "system",
        "content": "Du bist Hermes, Danny's persönlicher KI-Assistent. Schreibe kurz, knackig, manager-tauglich. Nutze Stichpunkte, keine Floskeln."
    }
    tasks_text = "\n".join(f"- {t['title']} ({t.get('project','')}, {t.get('status','')})" for t in tasks[:30]) or "Keine offenen Tasks."
    user_msg = {
        "role": "user",
        "content": f"Erstelle einen kurzen Tagesbericht für Danny.\n\nOffene Tasks:\n{tasks_text}\n\nWetter heute: {weather_text}\n\nForm:\n- 1 Satz Gesamtlage\n- 3-5 konkrete Stichpunkte\n- 1 Handlungsempfehlung"
    }
    res = chat_completion([system_msg, user_msg], timeout=45)
    if res.get("ok"):
        return res["text"]
    return f"Tagesbericht konnte nicht generiert werden: {res.get('error')}"


def answer_user_question(history: list[dict]) -> dict:
    system_msg = {
        "role": "system",
        "content": "Du bist Hermes, Danny's persönlicher KI-Assistent. Antworte kurz, präzise, lösungsorientiert. Keine Füllwörter. Du kennst Danny's Projekte: Party Arena, KI-Videos, Hochzeit, Server, Klavier-Coach, Bangkok."
    }
    messages = [system_msg] + history
    return chat_completion(messages, timeout=60)
