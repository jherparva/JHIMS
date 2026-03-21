import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import User, { IUser } from "@/lib/db/models/User"
import bcrypt from "bcryptjs"
import { SessionUser, createToken } from "@/lib/auth"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
    try {
        await connectDB()

        const body = await req.json()
        const { username, password, rememberMe } = body

        if (!username || !password) {
            return NextResponse.json(
                { error: "Usuario y contraseña son requeridos" },
                { status: 400 }
            )
        }

        // Buscar usuario (omitir filtro de tenant para el login)
        const user = (await User.findOne({ username })
            .setOptions({ skipTenantFilter: true })
            .select("+password")
            .lean()) as IUser | null

        if (!user || !user.isActive) {
            return NextResponse.json(
                { error: "Credenciales inválidas" },
                { status: 401 }
            )
        }

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password)
        if (!isValidPassword) {
            return NextResponse.json(
                { error: "Credenciales inválidas" },
                { status: 401 }
            )
        }

        // ── SESIÓN ÚNICA ─────────────────────────────────────────────────
        // Generar un token de sesión único para este login.
        // Al guardarlo en la BD, cualquier token anterior queda automáticamente
        // invalidado porque ya no coincidirá con el nuevo valor.
        const sessionToken = randomUUID()

        await User.findByIdAndUpdate(
            user._id,
            {
                sessionToken: sessionToken,
                lastLogin: new Date()
            },
            { setOptions: { skipTenantFilter: true } }
        )
        // ─────────────────────────────────────────────────────────────────

        // ── Duración de sesión según "Recordarme" ─────────────────────
        const sessionDurationSeconds = rememberMe
            ? 60 * 60 * 24 * 7   // 7 días si marcó "Recordarme"
            : 60 * 60 * 24       // 24 horas si NO marcó
        const jwtExpiration = rememberMe ? "7d" : "24h"
        
        console.log(`🔑 LOGIN: Usuario: ${user.username} (${user.role}) - Recordarme: ${rememberMe ? "SÍ" : "NO"} - Sesión: ${jwtExpiration}`)
        // ─────────────────────────────────────────────────────────────────

        // Crear sesión JWT (incluye sessionToken para validación posterior)
        const sessionUser: SessionUser = {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            companyId: user.companyId?.toString(),
            permissions: user.permissions,
            supportPermissions: user.supportPermissions,
        }

        const token = await createToken(sessionUser, sessionToken, jwtExpiration)

        // Respuesta con cookie de sesión
        const response = NextResponse.json({
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
            },
        })

        // Establecer token de autenticación
        response.cookies.set("jhims-auth-token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: sessionDurationSeconds,
            path: "/",
        })

        // Establecer cookie de sesión de navegador para evitar bucles
        const browserSessionId = Math.random().toString(36).substring(2, 15) + 
                               Math.random().toString(36).substring(2, 15)
        
        // No especificamos dominio para que las cookies funcionen en cualquier host (incluido Vercel)
        const sessionCookieName = `jhims-session-${user._id.toString().substring(0, 8)}` // Cookie única por usuario
        response.cookies.set(sessionCookieName, browserSessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // 24 horas
            path: "/",
        })

        // Establecer ID único de ventana para aislar sesiones
        const windowId = 'win_' + Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15) + 
                       '_' + Date.now()
        
        const windowCookieName = `jhims-window-${user._id.toString().substring(0, 8)}` // Cookie única por usuario para ventana
        
        response.cookies.set(windowCookieName, windowId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // 24 horas
            path: "/",
        })

        console.log(`LOGIN: Asignando windowId: ${windowId} para usuario: ${user.username} (${user.role}) - cookie: ${windowCookieName}`)

        return response
    } catch (error: any) {
        console.error("Error en login:", error)
        return NextResponse.json(
            { error: "Error al iniciar sesión" },
            { status: 500 }
        )
    }
}
