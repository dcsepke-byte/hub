"""Server system stats via psutil."""
import psutil

def get_server_stats():
    """Return CPU, RAM, and disk usage percentages."""
    try:
        cpu = psutil.cpu_percent(interval=0.1)
        ram = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        return {
            "cpu_pct": cpu,
            "ram_total": round(ram.total / (1024**3), 1),
            "ram_used": round(ram.used / (1024**3), 1),
            "ram_pct": ram.percent,
            "disk_total": round(disk.total / (1024**3), 1),
            "disk_used": round(disk.used / (1024**3), 1),
            "disk_pct": disk.percent,
        }
    except Exception as e:
        return {"error": str(e), "cpu_pct": -1, "ram_pct": -1, "disk_pct": -1}
