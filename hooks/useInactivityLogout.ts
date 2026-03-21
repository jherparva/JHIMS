"use client"

import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const STORAGE_KEY = "jhims_inactivity_timeout"
const DEFAULT_TIMEOUT_MINUTES = 30 // Por defecto 30 minutos

/**
 * Hook que cierra la sesión automáticamente tras X minutos de inactividad.
 * El tiempo lo configura el usuario en Ajustes. Si está en 0, está desactivado.
 */
export function useInactivityLogout() {
    const router = useRouter()
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const getTimeoutMs = useCallback(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        const minutes = saved ? parseInt(saved) : DEFAULT_TIMEOUT_MINUTES
        if (minutes === 0) return 0 // 0 = desactivado
        return minutes * 60 * 1000
    }, [])

    const logout = useCallback(async () => {
        try {
            await fetch("/api/autenticacion/logout", { method: "POST" })
        } catch { }
        toast.warning("Sesión cerrada por inactividad", { duration: 4000 })
        router.push("/inicio-sesion")
    }, [router])

    const resetTimer = useCallback(() => {
        const ms = getTimeoutMs()
        if (ms === 0) return // Desactivado

        // Limpiar timers anteriores
        if (timerRef.current) clearTimeout(timerRef.current)
        if (warningRef.current) clearTimeout(warningRef.current)

        // Advertencia 1 minuto antes
        const warningMs = ms - 60_000
        if (warningMs > 0) {
            warningRef.current = setTimeout(() => {
                toast.warning("⚠️ Tu sesión se cerrará en 1 minuto por inactividad", {
                    duration: 10000,
                    id: "inactivity-warning"
                })
            }, warningMs)
        }

        // Cierre de sesión
        timerRef.current = setTimeout(logout, ms)
    }, [getTimeoutMs, logout])

    useEffect(() => {
        const EVENTS = [
            "mousemove", "mousedown", "keypress",
            "touchstart", "scroll", "click"
        ]

        // Activar timers al inicio
        resetTimer()

        // Reiniciar al detectar actividad
        EVENTS.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }))

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            if (warningRef.current) clearTimeout(warningRef.current)
            EVENTS.forEach(evt => window.removeEventListener(evt, resetTimer))
        }
    }, [resetTimer])
}

/**
 * Guarda la preferencia de tiempo de inactividad en localStorage.
 * @param minutes - Minutos hasta cierre. 0 = desactivado.
 */
export function saveInactivityTimeout(minutes: number) {
    localStorage.setItem(STORAGE_KEY, String(minutes))
}

/**
 * Lee la preferencia guardada de tiempo de inactividad.
 */
export function getInactivityTimeout(): number {
    if (typeof window === "undefined") return DEFAULT_TIMEOUT_MINUTES
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? parseInt(saved) : DEFAULT_TIMEOUT_MINUTES
}
