"""Tests für News-Kategorie-Umschalter (app/news.py)"""
import sys
import os
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app import news


class TestNewsCategories(unittest.TestCase):
    """Testet fetch_news() mit verschiedenen Kategorien."""

    @staticmethod
    def make_fake_rss(title_prefix="News"):
        """Erzeugt ein Fake-RSS-XML-Dokument."""
        items = ""
        for i in range(5):
            items += f"""
            <item>
                <title>{title_prefix} #{i+1}</title>
                <link>https://example.com/{title_prefix.lower()}/{i+1}</link>
                <description>Beschreibung {i+1} für {title_prefix}</description>
                <pubDate>Mon, 03 Aug 2026 10:00:00 +0200</pubDate>
            </item>"""
        return f'<?xml version="1.0"?><rss version="2.0"><channel>{items}</channel></rss>'

    def test_fetch_news_top_default(self):
        """Standard-Kategorie 'top' liefert Ergebnisse."""
        mock_resp = MagicMock()
        mock_resp.content = self.make_fake_rss("TopNews").encode("utf-8")
        mock_resp.raise_for_status.return_value = None

        with patch("app.news.requests.get", return_value=mock_resp):
            result = news.fetch_news(limit=5, category="top")
            self.assertTrue(result["ok"])
            self.assertEqual(result["category"], "Top")
            self.assertEqual(len(result["items"]), 5)
            self.assertIn("TopNews #1", result["items"][0]["title"])

    def test_fetch_news_wirtschaft(self):
        """Kategorie 'wirtschaft' verwendet Wirtschafts-Feed."""
        mock_resp = MagicMock()
        mock_resp.content = self.make_fake_rss("Wirtschaft").encode("utf-8")
        mock_resp.raise_for_status.return_value = None

        with patch("app.news.requests.get", return_value=mock_resp):
            result = news.fetch_news(limit=3, category="wirtschaft")
            self.assertTrue(result["ok"])
            self.assertEqual(result["category"], "Wirtschaft")
            self.assertEqual(len(result["items"]), 3)

    def test_fetch_news_sport(self):
        """Kategorie 'sport' verwendet Sport-Feed."""
        mock_resp = MagicMock()
        mock_resp.content = self.make_fake_rss("Sport").encode("utf-8")
        mock_resp.raise_for_status.return_value = None

        with patch("app.news.requests.get", return_value=mock_resp):
            result = news.fetch_news(limit=5, category="sport")
            self.assertTrue(result["ok"])
            self.assertEqual(result["category"], "Sport")

    def test_fetch_news_tech(self):
        """Kategorie 'tech' verwendet Wissen-Feed (Tech-Mapping)."""
        mock_resp = MagicMock()
        mock_resp.content = self.make_fake_rss("TechNews").encode("utf-8")
        mock_resp.raise_for_status.return_value = None

        with patch("app.news.requests.get", return_value=mock_resp):
            result = news.fetch_news(limit=5, category="tech")
            self.assertTrue(result["ok"])
            self.assertEqual(result["category"], "Tech")

    def test_fetch_news_wissenschaft(self):
        """Kategorie 'wissenschaft' verwendet Wissen-Feed."""
        mock_resp = MagicMock()
        mock_resp.content = self.make_fake_rss("Wissen").encode("utf-8")
        mock_resp.raise_for_status.return_value = None

        with patch("app.news.requests.get", return_value=mock_resp):
            result = news.fetch_news(limit=5, category="wissenschaft")
            self.assertTrue(result["ok"])
            self.assertEqual(result["category"], "Wissenschaft")

    def test_fetch_news_invalid_category_falls_back(self):
        """Ungültige Kategorie fällt auf 'top' zurück."""
        mock_resp = MagicMock()
        mock_resp.content = self.make_fake_rss("TopNews").encode("utf-8")
        mock_resp.raise_for_status.return_value = None

        with patch("app.news.requests.get", return_value=mock_resp):
            result = news.fetch_news(limit=5, category="nonsense")
            self.assertTrue(result["ok"])
            self.assertEqual(result["category"], "Top")

    def test_fetch_news_feed_error(self):
        """Bei Netzwerk-Fehler wird ok=False zurückgegeben."""
        with patch("app.news.requests.get", side_effect=Exception("Netzwerk-Fehler")):
            result = news.fetch_news(limit=5, category="top")
            self.assertFalse(result["ok"])
            self.assertIn("Netzwerk-Fehler", result["error"])
            self.assertEqual(result["items"], [])

    def test_feed_url_mapping(self):
        """Alle gültigen Kategorien haben eine Feed-URL."""
        valid = ["top", "tech", "wirtschaft", "sport", "wissenschaft"]
        for cat in valid:
            url = news.FEED_URLS.get(cat)
            self.assertIsNotNone(url, f"Keine URL für Kategorie '{cat}'")
            self.assertIn("tagesschau.de", url, f"URL für '{cat}' enthält nicht tagesschau.de")

    def test_api_endpoint_with_category(self):
        """Testet den /api/news-Endpunkt mit category-Parameter."""
        from app import app as flask_app

        flask_app.config["TESTING"] = True

        with patch("app.news.requests.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.content = (
                '<?xml version="1.0"?><rss version="2.0"><channel>'
                '<item><title>Wirtschaft News</title><link>https://ex.com/1</link>'
                '<description>Test</description><pubDate>Mon, 03 Aug 2026</pubDate></item>'
                "</channel></rss>"
            ).encode("utf-8")
            mock_resp.raise_for_status.return_value = None
            mock_get.return_value = mock_resp

            with flask_app.test_client() as client:
                # Login simulieren
                with client.session_transaction() as sess:
                    sess["hub_logged_in"] = True

                # Mit Kategorie wirtschaft
                resp = client.get("/api/news?category=wirtschaft")
                data = resp.get_json()
                self.assertTrue(data["ok"])
                self.assertEqual(data["category"], "Wirtschaft")

                # Ungültige Kategorie fällt zurück
                resp = client.get("/api/news?category=hacked")
                data = resp.get_json()
                self.assertTrue(data["ok"])
                self.assertEqual(data["category"], "Top")


if __name__ == "__main__":
    unittest.main()
