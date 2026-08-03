"""Tests für PWA Install-Banner (in static/js/app.js und static/css/style.css)"""
import os
import re
import unittest

HUB_DIR = os.path.join(os.path.dirname(__file__), "..")
APP_JS_PATH = os.path.join(HUB_DIR, "static", "js", "app.js")
CSS_PATH = os.path.join(HUB_DIR, "static", "css", "style.css")


class TestInstallBannerJS(unittest.TestCase):
    """Validiert die Install-Banner-Implementierung in app.js."""

    @classmethod
    def setUpClass(cls):
        with open(APP_JS_PATH, "r") as f:
            cls.content = f.read()

    def test_initInstallBanner_called(self):
        """initInstallBanner() wird in init() aufgerufen."""
        # Prüfe dass init() die Funktion aufruft
        init_match = re.search(r'function init\(\)\s*\{.*?initInstallBanner\(\)', self.content, re.DOTALL)
        self.assertIsNotNone(init_match,
                             "initInstallBanner() wird nicht in init() aufgerufen")

    def test_function_exists(self):
        """Alle benötigten Funktionen existieren."""
        required_funcs = ["initInstallBanner", "checkShowBanner", "showInstallBanner"]
        for func in required_funcs:
            self.assertIn(f"function {func}(", self.content,
                          f"Funktion '{func}' fehlt in app.js")

    def test_beforeinstallprompt_listener(self):
        """beforeinstallprompt-Event wird abgefangen."""
        self.assertIn("beforeinstallprompt", self.content,
                      "beforeinstallprompt-Listener fehlt")

    def test_deferredPrompt_variable(self):
        """deferredPrompt-Variable wird deklariert."""
        self.assertIn("deferredPrompt", self.content,
                      "deferredPrompt-Variable fehlt")

    def test_localStorage_keys(self):
        """localStorage-Schlüssel hub_visit_count und hub_pwa_dismissed werden verwendet."""
        self.assertIn("hub_visit_count", self.content,
                      "hub_visit_count nicht in app.js")
        self.assertIn("hub_pwa_dismissed", self.content,
                      "hub_pwa_dismissed nicht in app.js")

    def test_banner_html_structure(self):
        """Banner-HTML enthält die richtigen Elemente."""
        self.assertIn("install-banner", self.content,
                      "install-banner-Klasse fehlt")
        self.assertIn("Zum Home-Bildschirm hinzufügen", self.content,
                      "Banner-Text fehlt")
        self.assertIn("Installieren", self.content,
                      "Installieren-Button fehlt")

    def test_banner_close_dismisses(self):
        """Schließen-Button setzt hub_pwa_dismissed."""
        # Prüfe dass beim Schließen der localStorage auf 1 gesetzt wird
        self.assertIn('"hub_pwa_dismissed", "1"', self.content,
                      "Dismissal-Speicherung fehlt")

    def test_prompt_call(self):
        """Installieren-Button ruft deferredPrompt.prompt() auf."""
        self.assertIn("deferredPrompt.prompt()", self.content,
                      "prompt()-Aufruf fehlt")


class TestInstallBannerCSS(unittest.TestCase):
    """Validiert die Install-Banner-CSS-Regeln."""

    @classmethod
    def setUpClass(cls):
        with open(CSS_PATH, "r") as f:
            cls.content = f.read()

    def test_banner_class_exists(self):
        """.install-banner-Klasse ist definiert."""
        self.assertIn(".install-banner", self.content,
                      ".install-banner-CSS-Regel fehlt")

    def test_mobile_only(self):
        """Banner wird nur auf Mobile (<761px) angezeigt."""
        self.assertIn("761px", self.content,
                      "Mobile-Only-Media-Query fehlt")

    def test_banner_has_position_fixed(self):
        """Banner hat position: fixed."""
        self.assertIn("position: fixed", self.content,
                      "position: fixed fehlt im Banner-CSS")

    def test_banner_child_classes(self):
        """Kind-Klassen .banner-icon, .banner-text, .banner-btn, .banner-close."""
        child_classes = [".banner-icon", ".banner-text", ".banner-btn", ".banner-close"]
        for cls in child_classes:
            self.assertIn(cls, self.content,
                          f"CSS-Klasse '{cls}' fehlt")

    def test_animation_present(self):
        """Banner verwendet sheetUp-Animation."""
        self.assertIn("sheetUp", self.content,
                      "sheetUp-Animation fehlt")


class TestNewsTabsCSS(unittest.TestCase):
    """Validiert die News-Tabs-CSS-Regeln."""

    @classmethod
    def setUpClass(cls):
        with open(CSS_PATH, "r") as f:
            cls.content = f.read()

    def test_news_tabs_class_exists(self):
        """.news-tabs-Klasse ist definiert."""
        self.assertIn(".news-tabs", self.content,
                      ".news-tabs-CSS-Regel fehlt")

    def test_tab_button_styles(self):
        """Tab-Button-Styles (.news-tabs button) sind vorhanden."""
        self.assertIn(".news-tabs button", self.content,
                      ".news-tabs button-Regel fehlt")

    def test_active_tab_style(self):
        """Aktiver Tab hat accent-Hintergrund."""
        self.assertIn(".news-tabs button.active", self.content,
                      "Aktiver-Tab-Style fehlt")


if __name__ == "__main__":
    unittest.main()
