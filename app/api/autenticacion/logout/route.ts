import { NextResponse } from "next/server"
import { deleteSession } from "@/lib/auth"

export async function POST() {
    // Usar la función mejorada que limpia el sessionToken
    await deleteSession()
    
    const response = NextResponse.json({ message: "Logout exitoso" })
    
    // Limpiar todas las cookies relacionadas con sesiones (todas las variantes)
    response.cookies.delete('jhims-auth-token')
    response.cookies.delete('jhims-browser-session')
    response.cookies.delete('jhims-window-id')
    response.cookies.delete('jhims-browser-session-admin')
    response.cookies.delete('jhims-window-id-admin')
    response.cookies.delete('jhims-browser-session-user')
    response.cookies.delete('jhims-window-id-user')
    
    return response
}
