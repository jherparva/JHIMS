import { getAllFromLocal, getPendingSync, clearPendingSync, saveToLocal, isOnline } from "./offline-storage"

export async function syncWithServer() {
  if (!isOnline()) {
    console.log("[JHIMS] Sin conexión, sincronización pospuesta")
    return
  }

  console.log("[JHIMS] Iniciando sincronización...")
  const pendingOperations = await getPendingSync()

  for (const operation of pendingOperations) {
    try {
      let response: Response

      switch (operation.type) {
        case "create":
          response = await fetch(`/api/${operation.resource}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(operation.data),
          })
          break

        case "update":
          response = await fetch(`/api/${operation.resource}/${operation.data._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(operation.data),
          })
          break

        case "delete":
          response = await fetch(`/api/${operation.resource}/${operation.data._id}`, {
            method: "DELETE",
          })
          break

        default:
          continue
      }

      if (response.ok) {
        await clearPendingSync(operation.id)
        console.log(`[JHIMS] Sincronizado: ${operation.type} ${operation.resource}`)
      }
    } catch (error) {
      console.error(`[JHIMS] Error sincronizando ${operation.id}:`, error)
    }
  }

  console.log("[JHIMS] Sincronización completada")
}

export async function fetchAndCache(resource: string) {
  try {
    const response = await fetch(`/api/${resource}`)
    if (response.ok) {
      const data = await response.json()

      // Guardar cada item en IndexedDB
      if (Array.isArray(data)) {
        for (const item of data) {
          await saveToLocal(resource as any, item)
        }
      }

      return data
    }
  } catch (error) {
    console.error(`[JHIMS] Error fetching ${resource}:`, error)
    // Si falla, devolver datos locales
    return await getAllFromLocal(resource as any)
  }
}

// Iniciar sincronización automática cada 5 minutos
if (typeof window !== "undefined") {
  setInterval(
    () => {
      syncWithServer()
    },
    5 * 60 * 1000,
  )

  // Sincronizar cuando vuelve la conexión
  window.addEventListener("online", () => {
    console.log("[JHIMS] Conexión restaurada, sincronizando...")
    syncWithServer()
  })
}
