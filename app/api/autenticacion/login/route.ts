// =============================================================================
// API AUTENTICACIÓN - LOGIN
// =============================================================================
// Inicia sesión de usuarios con JWT y cookies
// =============================================================================
import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import User, { IUser } from "@/lib/db/models/User"
import bcrypt from "bcryptjs"
import { SessionUser, createToken } from "@/lib/auth"
import { randomUUID } from "crypto"

// =============================================================================
// POST /api/autenticacion/login
// =============================================================================
// Recibe: username, password, rememberMe
// Retorna: Token JWT y datos del usuario
export async function POST(req: NextRequest) {
    try {
        await connectDB()

        const body = await req.json()
        
        // =============================================================================
        // 1. VALIDAR CAMPOS CON ZOD
        // =============================================================================
        const { loginSchema } = await import("@/lib/validations/auth")
        const validation = loginSchema.safeParse(body)
        
        if (!validation.success) {
            return NextResponse.json(
                { 
                    error: "Datos de entrada inválidos", 
                    details: validation.error.format() 
                },
                { status: 400 }
            )
        }

        const { username, password, rememberMe } = validation.data

        // =============================================================================
        // 2. BUSCAR USUARIO
        // =============================================================================
        // skipTenantFilter: Permite login global (sin filtro de empresa)
        const user = (await User.findOne({ username })
            .setOptions({ skipTenantFilter: true })
            .select("+password")  // Incluir campo password
            .lean()) as IUser | null

        if (!user || !user.isActive) {
            return NextResponse.json(
                { error: "Credenciales inválidas" },
                { status: 401 }
            )
        }

        // =============================================================================
        // 3. VERIFICAR CONTRASEÑA
        // =============================================================================
        const isValidPassword = await bcrypt.compare(password, user.password)
        if (!isValidPassword) {
            return NextResponse.json(
                { error: "Credenciales inválidas" },
                { status: 401 }
            )
        }

        // =============================================================================
        // 4. SESIÓN ÚNICA
        // =============================================================================
        // Genera token único e invalida sesiones anteriores
        const sessionToken = randomUUID()

        await User.findByIdAndUpdate(
            user._id,
            {
                sessionToken: sessionToken,
                lastLogin: new Date()
            },
            { setOptions: { skipTenantFilter: true } }
        )

        // =============================================================================
        // 5. DURACIÓN DE SESIÓN
        // =============================================================================
        const sessionDurationSeconds = rememberMe
            ? 60 * 60 * 24 * 7   // 7 días con "Recordarme"
            : 60 * 60 * 24       // 24 horas normal
        const jwtExpiration = rememberMe ? "7d" : "24h"
        
        console.log(`🔑 LOGIN: ${user.username} (${user.role}) - Recordarme: ${rememberMe ? "SÍ" : "NO"}`)

        // =============================================================================
        // 6. CREAR TOKEN JWT
        // =============================================================================
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

        // =============================================================================
        // 7. RESPUESTA Y COOKIES
        // =============================================================================
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

        // Cookie principal de autenticación
        response.cookies.set("jhims-auth-token", token, {
            httpOnly: true,                    // Solo servidor
            secure: process.env.NODE_ENV === "production", // HTTPS
            sameSite: "lax",                   // Anti CSRF
            maxAge: sessionDurationSeconds,
            path: "/",
        })

        // Cookie de sesión (evita bucles)
        const browserSessionId = Math.random().toString(36).substring(2, 15)
        const sessionCookieName = `jhims-session-${user._id.toString().substring(0, 8)}`
        
        response.cookies.set(sessionCookieName, browserSessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // 24 horas
            path: "/",
        })

        // Cookie de ID de ventana (aisla sesiones)
        const windowId = 'win_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now()
        const windowCookieName = `jhims-window-${user._id.toString().substring(0, 8)}`
        
        response.cookies.set(windowCookieName, windowId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24,
            path: "/",
        })

        console.log(`LOGIN: WindowId ${windowId} para ${user.username}`)

        return response

    } catch (error: any) {
        // =============================================================================
        // 8. ERROR
        // =============================================================================
        console.error("Error en login:", error)
        return NextResponse.json(
            { error: "Error al iniciar sesión" },
            { status: 500 }
        )
    }
}
