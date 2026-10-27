// Tiny promise wrapper around IndexedDB, with an in-memory fallback when it's unavailable.
const DB = "expenses-db", STORE = "expenses";

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" }).createIndex("date", "date");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
  });
}

export async function createStore() {
  try {
    const db = await open();
    return {
      persistent: true,
      all: () => tx(db, "readonly", (s) => s.getAll()),
      put: (e) => tx(db, "readwrite", (s) => s.put(e)),
      remove: (id) => tx(db, "readwrite", (s) => s.delete(id)),
      clear: () => tx(db, "readwrite", (s) => s.clear()),
    };
  } catch {
    const mem = new Map();
    return {
      persistent: false,
      all: async () => [...mem.values()],
      put: async (e) => mem.set(e.id, e),
      remove: async (id) => mem.delete(id),
      clear: async () => mem.clear(),
    };
  }
}
