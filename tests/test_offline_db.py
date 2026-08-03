"""Tests für IndexedDB Offline-Framework (static/js/offline-db.js)"""
import os
import re
import unittest

HUB_DIR = os.path.join(os.path.dirname(__file__), "..")
OFFLINE_DB_PATH = os.path.join(HUB_DIR, "static", "js", "offline-db.js")
INDEX_HTML_PATH = os.path.join(HUB_DIR, "templates", "index.html")


class TestOfflineDBStructure(unittest.TestCase):
    """Validiert die Struktur von offline-db.js."""

    @classmethod
    def setUpClass(cls):
        with open(OFFLINE_DB_PATH, "r") as f:
            cls.content = f.read()

    def test_file_exists(self):
        """Datei offline-db.js existiert."""
        self.assertTrue(os.path.exists(OFFLINE_DB_PATH),
                        "static/js/offline-db.js fehlt")

    def test_db_name(self):
        """DB-Name ist 'hub-offline'."""
        self.assertIn('"hub-offline"', self.content,
                      "DB-Name 'hub-offline' nicht gefunden")

    def test_stores_defined(self):
        """Alle 5 Stores sind definiert."""
        expected_stores = ["tasks", "notes", "health_log", "budget_tx", "chat_threads"]
        for store in expected_stores:
            self.assertIn(f'"{store}"', self.content,
                          f"Store '{store}' nicht in offline-db.js")

    def test_window_export(self):
        """Globales window.OfflineDB-Objekt wird exportiert."""
        self.assertIn("window.OfflineDB", self.content,
                      "window.OfflineDB-Export fehlt")

    def test_functions_per_store(self):
        """Jeder Store hat getAll, put, delete, clear."""
        expected_funcs = ["getAll", "put", "delete", "clear"]
        # Zähle Vorkommen der Store-Namen (sollte für jeden Store je 4 Funktionen geben)
        store_count = len(re.findall(r'"tasks"|"notes"|"health_log"|"budget_tx"|"chat_threads"', self.content))
        self.assertGreater(store_count, 4, "Zu wenige Store-Referenzen")

        for func in expected_funcs:
            self.assertIn(func, self.content,
                          f"Funktion '{func}' fehlt in offline-db.js")

    def test_put_requires_id(self):
        """put() prüft auf 'id'-Eigenschaft."""
        self.assertIn("'id'", self.content,
                      "ID-Validierung fehlt in put()")

    def test_iife_wrapper(self):
        """Datei verwendet IIFE-Wrapper (function () { ... })()"""
        self.assertIn("(function", self.content,
                      "IIFE-Wrapper fehlt")
        self.assertIn('"use strict"', self.content,
                      "'use strict' fehlt")

    def test_openDB_function(self):
        """openDB()-Funktion existiert mit onupgradeneeded."""
        self.assertIn("openDB", self.content,
                      "openDB-Funktion fehlt")
        self.assertIn("onupgradeneeded", self.content,
                      "onupgradeneeded-Handler fehlt")


class TestOfflineDBScriptIncluded(unittest.TestCase):
    """Validiert, dass offline-db.js in index.html eingebunden ist."""

    def test_script_tag_present(self):
        """index.html enthält <script> für offline-db.js."""
        with open(INDEX_HTML_PATH, "r") as f:
            html = f.read()
        self.assertIn("offline-db.js", html,
                      "offline-db.js nicht in index.html eingebunden")


if __name__ == "__main__":
    unittest.main()
