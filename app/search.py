from typing import Optional
from app import notion, explorer


def search_all(query: str) -> dict:
    q = query.lower().strip()
    if not q:
        return {"tasks": [], "files": [], "projects": []}

    tasks = notion.get_tasks(limit=100)
    tasks = [t for t in tasks if q in t["title"].lower() or q in t.get("project", "").lower()]

    try:
        files = explorer.list_directory("")
        files = [f for f in files if q in f["name"].lower() or q in f.get("path", "").lower()]
    except Exception:
        files = []

    project_map = {
        "party arena": "Party Arena",
        "ki-videos": "KI-Videos",
        "hochzeit": "Hochzeit",
        "server": "Server",
        "klavier": "Klavier-Coach",
        "bangkok": "Bangkok",
        "hub": "Hub",
    }
    projects = [{"name": v, "keyword": k} for k, v in project_map.items() if q in k or q in v.lower()]

    return {"tasks": tasks, "files": files, "projects": projects, "query": q}
