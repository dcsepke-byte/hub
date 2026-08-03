/**
 * OfflineDB — IndexedDB-Wrapper für HUB Offline-First
 *
 * DB "hub-offline" mit Stores:
 *   tasks, notes, health_log, budget_tx, chat_threads
 *
 * Pro Store verfügbar:
 *   await OfflineDB.tasks.getAll()
 *   await OfflineDB.tasks.put(item)
 *   await OfflineDB.tasks.delete(id)
 *   await OfflineDB.tasks.clear()
 *
 * HINWEIS: Keine Sync-Logik — nur DB-Grundgerüst.
 */

(function () {
  "use strict";

  const DB_NAME = "hub-offline";
  const DB_VERSION = 1;

  const STORES = ["tasks", "notes", "health_log", "budget_tx", "chat_threads"];

  /** IndexedDB öffnen und Schema anlegen (falls nötig) */
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        STORES.forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: "id" });
          }
        });
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** Promise-Wrapper für IDB-Transaktionen */
  function storeTx(storeName, mode, callback) {
    return openDB().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const result = callback(store);

        tx.oncomplete = () => {
          db.close();
          resolve(result instanceof IDBRequest ? result.result : result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      });
    });
  }

  /** Store-Helper erstellen */
  function makeStore(name) {
    return {
      /** Alle Einträge aus dem Store holen */
      getAll() {
        return storeTx(name, "readonly", (store) => store.getAll());
      },

      /** Eintrag speichern (erstellen oder aktualisieren) */
      put(item) {
        if (!item || !item.id) {
          return Promise.reject(new Error("Item benötigt eine 'id'-Eigenschaft"));
        }
        return storeTx(name, "readwrite", (store) => store.put(item));
      },

      /** Eintrag anhand ID löschen */
      delete(id) {
        return storeTx(name, "readwrite", (store) => store.delete(id));
      },

      /** Ganzen Store leeren */
      clear() {
        return storeTx(name, "readwrite", (store) => store.clear());
      },
    };
  }

  /** Globales OfflineDB-Objekt bauen */
  const OfflineDB = {};
  STORES.forEach((name) => {
    OfflineDB[name] = makeStore(name);
  });

  // Export
  window.OfflineDB = OfflineDB;
})();
