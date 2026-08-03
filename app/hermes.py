import os
from pathlib import Path
from typing import Optional
import requests
from app.config import Config

# DeepSeek ist der Primärprovider, Ollama Cloud der Fallback
DEEPSEEK_BASE = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash")
OLLAMA_BASE = os.environ.get("OLLAMA_BASE_URL", "https://ollama.com/v1")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "kimi-k2.7-code")


def _chat_completion(messages, base, model, api_key, stream=False, timeout=60):
    """Send messages to an OpenAI-compatible API."""
    if not api_key:
        return {"ok": False, "error": "Kein API-Key für KI-Anfragen konfiguriert."}
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    url = f"{base.rstrip('/')}/chat/completions"
    body = {"model": model, "messages": messages, "stream": stream, "temperature": 0.7}
    try:
        r = requests.post(url, headers=headers, json=body, timeout=timeout)
        if not r.ok:
            return {"ok": False, "error": f"HTTP {r.status_code}: {r.text[:200]}"}
        data = r.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return {"ok": True, "text": content.strip(), "model": data.get("model", model)}
    except requests.exceptions.Timeout:
        return {"ok": False, "error": "KI-Antwort hat zu lange gedauert."}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def chat_completion(messages: list[dict], stream: bool = False, timeout: int = 60) -> dict:
    """DeepSeek zuerst, bei Fehler Fallback auf Ollama Cloud."""
    # Primär: DeepSeek
    deepseek_key = os.environ.get("DEEPSEEK_API_KEY") or ""
    if deepseek_key:
        res = _chat_completion(messages, DEEPSEEK_BASE, DEEPSEEK_MODEL, deepseek_key, stream, timeout)
        if res.get("ok"):
            return res
        # Bei DeepSeek-Fehler → Fallback Ollama
        fallback_reason = res.get("error", "")
    else:
        fallback_reason = "kein DEEPSEEK_API_KEY"

    # Fallback: Ollama Cloud
    ollama_key = os.environ.get("OLLAMA_API_KEY") or ""
    if ollama_key:
        res2 = _chat_completion(messages, OLLAMA_BASE, OLLAMA_MODEL, ollama_key, stream, timeout)
        if res2.get("ok"):
            return res2
        return {"ok": False, "error": f"DeepSeek: {fallback_reason}; Ollama: {res2.get('error', 'unbekannt')}"}

    return {"ok": False, "error": f"DeepSeek: {fallback_reason}; kein OLLAMA_API_KEY"}


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


def answer_user_question(history: list[dict], context: dict = None) -> dict:
    base = "Du bist Hermes, Danny's persönlicher KI-Assistent. Antworte kurz, präzise, lösungsorientiert. Keine Füllwörter. Du kennst Danny's Projekte: Party Arena, KI-Videos, Hochzeit, Server, Klavier-Coach, Bangkok."
    if context:
        parts = []
        page = (context.get("page") or "").strip()
        project = (context.get("project") or "").strip()
        task_ids = context.get("task_ids") or []
        if page == "home":
            parts.append("Danny ist gerade auf der Startseite seines HUB-Dashboards.")
        elif page == "projects":
            parts.append("Danny schaut sich seine Projektübersicht an.")
        elif page == "project" and project:
            parts.append(f"Danny schaut das Projekt '{project}' an.")
        elif page == "chat" or page == "chatthread":
            if project:
                parts.append(f"Danny ist im Hermes-Chat und hat das Projekt '{project}' geöffnet.")
            else:
                parts.append("Danny ist im Hermes-Chat.")
        elif page:
            parts.append(f"Danny ist auf der Seite '{page}'.")
        if task_ids and isinstance(task_ids, list):
            parts.append(f"Relevante Task-IDs: {', '.join(str(t) for t in task_ids[:10])}.")
        if parts:
            base += " " + " ".join(parts)
    system_msg = {"role": "system", "content": base}
    messages = [system_msg] + history
    return chat_completion(messages, timeout=60)
