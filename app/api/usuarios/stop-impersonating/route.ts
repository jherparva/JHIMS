import { NextRequest, NextResponse } from "next/server"
import { TOKEN_NAME } from "@/lib/auth"
import { cookies } from "next/headers"

const ORIGINAL_TOKEN_NAME = "jhims-original-token"

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies()
        const originalToken = cookieStore.get(ORIGINAL_TOKEN_NAME)?.value

        if (!originalToken) {
            return NextResponse.json({ error: "No hay una sesión original para restaurar" }, { status: 400 })
        }

        // 1. Restaurar el token original
        cookieStore.set(TOKEN_NAME, originalToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7, // 7 días (vuelve a la duración normal)
            path: "/",
        })

        // 2. Eliminar la cookie de respaldo
        cookieStore.delete(ORIGINAL_TOKEN_NAME)

        return NextResponse.json({ 
            success: true, 
            message: "Has vuelto a tu sesión de administrador",
            redirect: "/usuarios"
        })
    } catch (error: any) {
        console.error("STOP IMPERSONATE ERROR:", error)
        return NextResponse.json({ error: "Error al restaurar sesión" }, { status: 500 })
    }
}
