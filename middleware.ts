import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'jhims-secret-key-2025'
)

// Rutas que solo puede acceder el administrador de empresa
const ADMIN_ONLY_PATHS = [
    '/usuarios',
    '/configuracion',
    '/reportes',
    '/entrada-inventario',
    '/proveedores',
    '/categorias',
    '/inventario',
]

// Rutas exclusivas del superadmin (dueño de la plataforma)
const SUPERADMIN_PATHS = ['/super-administrador']

// Rutas públicas (solo las que realmente no requieren autenticación)
const PUBLIC_PATHS = ['/inicio-sesion', '/olvide-contrasena', '/api/autenticacion/login', '/api/autenticacion/recuperar-password', '/api/seed', '/api/test-db', '/api/seed-data']

// Redirecciones de rutas en inglés → español (rutas antiguas que pudieron quedar en el historial)
const RUTAS_REDIRECCION: Record<string, string> = {
    '/login': '/inicio-sesion',
    '/register': '/inicio-sesion',
    '/dashboard': '/dashboard',
    '/inventory': '/inventario',
    '/categories': '/categorias',
    '/suppliers': '/proveedores',
    '/products': '/inventario',
    '/sales': '/ventas',
    '/customers': '/clientes',
    '/users': '/usuarios',
    '/reports': '/reportes',
    '/settings': '/configuracion',
    '/help': '/ayuda',
    '/point-of-sale': '/punto-de-venta',
    '/stock-entry': '/entrada-inventario',
    '/notifications': '/notificaciones',
    '/profile': '/perfil',
    '/super-admin': '/super-administrador',
}

// Función para verificar si es una nueva ventana/pestaña
function isNewWindowSession(request: NextRequest): boolean {
    // Verificar si hay cookies de sesión (cualquier cookie que comience con jhims-session-)
    const allCookies = request.cookies.getAll()
    const sessionCookies = allCookies.filter(cookie => cookie.name.startsWith('jhims-session-'))
    
    // Si no hay cookies de sesión, es una nueva ventana/pestaña
    if (sessionCookies.length === 0) {
        return true
    }
    
    // Si hay cookies de sesión, no es nueva ventana
    return false
}

// Función para generar un ID único de ventana
function generateWindowId(): string {
    return 'win_' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) + 
           '_' + Date.now()
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Redirigir rutas en inglés a sus equivalentes en español (301 permanente)
    const rutaEspanol = RUTAS_REDIRECCION[pathname]
    if (rutaEspanol && rutaEspanol !== pathname) {
        return NextResponse.redirect(new URL(rutaEspanol, request.url), { status: 301 })
    }

    // Permitir rutas públicas permanentemente
    const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path))
    if (isPublicPath) {
        return NextResponse.next()
    }

    // 1. Obtención del token
    const token = request.cookies.get('jhims-auth-token')?.value
    if (!token) {
        // Si no hay token en absoluto, mandamos al login
        return NextResponse.redirect(new URL('/inicio-sesion', request.url))
    }

    try {
        // 2. Verificación de identidad inmediata
        const { payload } = await jwtVerify(token, JWT_SECRET)
        const role = payload.role as string
        const userId = payload.id as string

        // 3. Sistema de sesión robusto (Post-Autenticación)
        // En lugar de redirigir, si el token es válido permitimos el paso
        // y opcionalmente regeneramos los indicadores de sesión si faltan.
        const response = NextResponse.next()
        
        // Verificación opcional de ID de ventana (informativo en producción para no bloquear)
        const windowCookieName = `jhims-window-${userId.substring(0, 8)}`
        let windowId = request.cookies.get(windowCookieName)?.value
        
        if (!windowId && !pathname.startsWith('/api')) {
            windowId = generateWindowId()
            response.cookies.set(windowCookieName, windowId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24,
                path: "/",
            })
            console.log(`MIDDLEWARE [INFO]: Recuperando windowId para usuario autenticado: ${userId}`)
        }

        // 4. Lógica de acceso por Rol
        const isSuperAdminPath = SUPERADMIN_PATHS.some(p => pathname.startsWith(p))
        
        if (role === 'superadmin') {
            // El superadmin debe estar en su panel, o en las APIs
            if (!isSuperAdminPath && !pathname.startsWith('/api')) {
                return NextResponse.redirect(new URL('/super-administrador', request.url))
            }
            return response
        }

        // Restricción de acceso a panel superadmin para otros roles
        if (isSuperAdminPath) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        // Verificación acceso a rutas exclusivas del admin de empresa
        const isAdminOnlyPath = ADMIN_ONLY_PATHS.some(path => pathname.startsWith(path))
        if (isAdminOnlyPath && role !== 'admin' && role !== 'superadmin') {
            return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
        }

        return response
    } catch (e) {
        // Token inválido o expirado → Limpieza y vuelta al login
        console.error("MIDDLEWARE: Error de token, limpiando sesión", e)
        const response = NextResponse.redirect(new URL('/inicio-sesion', request.url))
        response.cookies.delete('jhims-auth-token')
        // No borramos las de sesión para no cerrar pestañas legítimas si fue un error momentáneo
        return response
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
    ],
}
