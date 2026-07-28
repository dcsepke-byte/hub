import json
import requests
from typing import Optional
from app.config import Config

HEADERS = {
    "Authorization": f"Bearer {Config.NOTION_API_KEY}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}


def _safe_json(r: requests.Response) -> dict:
    try:
        return r.json()
    except Exception:
        return {"error": r.status_code, "text": r.text}


def get_tasks(filter_project: Optional[str] = None, status: Optional[str] = None, limit: int = 100) -> list[dict]:
    if not Config.NOTION_API_KEY or not Config.NOTION_TASKS_DB:
        return []

    url = f"https://api.notion.com/v1/databases/{Config.NOTION_TASKS_DB}/query"
    filters = []
    if filter_project:
        filters.append({"property": "Projekt", "select": {"equals": filter_project}})
    if status:
        filters.append({"property": "Status", "status": {"equals": status}})

    body: dict = {"page_size": limit}
    if len(filters) == 1:
        body["filter"] = filters[0]
    elif filters:
        body["filter"] = {"and": filters}

    r = requests.post(url, headers=HEADERS, json=body, timeout=20)
    if not r.ok:
        return [{"id": "error", "title": f"Notion Fehler {r.status_code}", "status": "Blockiert", "project": ""}]

    data = r.json()
    tasks = []
    for page in data.get("results", []):
        props = page.get("properties", {})
        title = props.get("Aufgabe", {}).get("title", [{}])[0].get("plain_text", "Ohne Titel")
        project = props.get("Projekt", {}).get("select", {}).get("name", "")
        status_val = props.get("Status", {}).get("status", {}).get("name", "Offen")
        tasks.append({
            "id": page["id"],
            "title": title,
            "project": project,
            "status": status_val,
            "url": page.get("url", ""),
            "due": _extract_date(props.get("Fällig am", {})),
        })
    return tasks


def update_task_status(page_id: str, status: str) -> bool:
    url = f"https://api.notion.com/v1/pages/{page_id}"
    body = {"properties": {"Status": {"status": {"name": status}}}}
    r = requests.patch(url, headers=HEADERS, json=body, timeout=20)
    return r.ok


def create_task(title: str, project: str = "", status: str = "Offen", due: str = "") -> dict:
    url = "https://api.notion.com/v1/pages"
    props = {
        "Aufgabe": {"title": [{"text": {"content": title}}]},
        "Projekt": {"select": {"name": project or "Persoenlich"}},
        "Status": {"status": {"name": status}},
    }
    if due:
        props["Fällig am"] = {"date": {"start": due}}
    body = {
        "parent": {"database_id": Config.NOTION_TASKS_DB},
        "properties": props,
    }
    r = requests.post(url, headers=HEADERS, json=body, timeout=20)
    return _safe_json(r)


def create_knowledge_entry(title: str, content: str, project: str = "Server") -> dict:
    url = "https://api.notion.com/v1/pages"
    body = {
        "parent": {"database_id": Config.NOTION_KNOWLEDGE_DB},
        "properties": {
            "Titel": {"title": [{"text": {"content": title}}]},
            "Projekt": {"select": {"name": project}},
            "Kategorie": {"select": {"name": "Dokumentation"}},
        },
        "children": [
            {"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"text": {"content": content}}]}}
        ],
    }
    r = requests.post(url, headers=HEADERS, json=body, timeout=20)
    return _safe_json(r)


def _extract_date(prop: dict) -> str:
    if prop.get("date") and prop["date"].get("start"):
        return prop["date"]["start"]
    return ""
