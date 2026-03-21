"use client"

import { useInactivityLogout } from "@/hooks/useInactivityLogout"

/**
 * Componente invisible que activa el cierre de sesión por inactividad.
 * Se monta en el layout del dashboard para proteger toda la aplicación.
 */
export function InactivityGuard() {
    useInactivityLogout()
    return null
}
