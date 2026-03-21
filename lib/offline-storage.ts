import { openDB, type DBSchema, type IDBPDatabase } from "idb"

interface JHIMSDB extends DBSchema {
  products: {
    key: string
    value: any
    indexes: { "by-updated": string }
  }
  sales: {
    key: string
    value: any
    indexes: { "by-updated": string }
  }
  categories: {
    key: string
    value: any
  }
  suppliers: {
    key: string
    value: any
  }
  users: {
    key: string
    value: any
  }
  notifications: {
    key: string
    value: any
    indexes: { "by-created": string }
  }
  pendingSync: {
    key: string
    value: {
      id: string
      type: "create" | "update" | "delete"
      resource: string
      data: any
      timestamp: number
    }
  }
}

let db: IDBPDatabase<JHIMSDB> | null = null

export async function initDB() {
  if (db) return db

  db = await openDB<JHIMSDB>("jhims-db", 2, {
    upgrade(db, oldVersion) {
      // Crear stores para cada recurso
      if (!db.objectStoreNames.contains("products")) {
        const productStore = db.createObjectStore("products", { keyPath: "_id" })
        productStore.createIndex("by-updated", "updatedAt")
      }
      if (!db.objectStoreNames.contains("sales")) {
        const salesStore = db.createObjectStore("sales", { keyPath: "_id" })
        salesStore.createIndex("by-updated", "createdAt")
      }
      if (!db.objectStoreNames.contains("categories")) {
        db.createObjectStore("categories", { keyPath: "_id" })
      }
      if (!db.objectStoreNames.contains("suppliers")) {
        db.createObjectStore("suppliers", { keyPath: "_id" })
      }
      if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", { keyPath: "_id" })
      }
      if (!db.objectStoreNames.contains("notifications")) {
        const notifStore = db.createObjectStore("notifications", { keyPath: "_id" })
        notifStore.createIndex("by-created", "createdAt")
      }
      if (!db.objectStoreNames.contains("pendingSync")) {
        db.createObjectStore("pendingSync", { keyPath: "id" })
      }
    },
  })

  return db
}

export async function saveToLocal(store: keyof JHIMSDB, data: any) {
  const database = await initDB()
  await database.put(store as any, data)
}

export async function getFromLocal(store: keyof JHIMSDB, key: string) {
  const database = await initDB()
  return await database.get(store as any, key)
}

export async function getAllFromLocal(store: keyof JHIMSDB) {
  const database = await initDB()
  return await database.getAll(store as any)
}

export async function deleteFromLocal(store: keyof JHIMSDB, key: string) {
  const database = await initDB()
  await database.delete(store as any, key)
}

export async function addPendingSync(operation: {
  type: "create" | "update" | "delete"
  resource: string
  data: any
}) {
  const database = await initDB()
  const id = `${operation.resource}-${Date.now()}-${Math.random()}`
  await database.put("pendingSync", {
    id,
    ...operation,
    timestamp: Date.now(),
  })
}

export async function getPendingSync() {
  const database = await initDB()
  return await database.getAll("pendingSync")
}

export async function clearPendingSync(id: string) {
  const database = await initDB()
  await database.delete("pendingSync", id)
}

export function isOnline() {
  return navigator.onLine
}
