// =============================================================================
// MIDDLEWARE - JHIMS Inventory
// =============================================================================
// Autenticación y autorización centralizada
// =============================================================================
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// =============================================================================
// CONFIGURACIÓN
// =============================================================================
// Clave secreta para tokens JWT
// RECOMENDADO: Eliminar el fallback para forzar el uso de variables de entorno seguras
const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
    console.error("MIDDLEWARE [CRITICAL]: No JWT secret found in production environment!");
}

const JWT_SECRET = new TextEncoder().encode(secret || 'jhims-temporary-development-key');

// =============================================================================
// RUTAS POR ROL
// =============================================================================

// Rutas solo para admin de empresa
const ADMIN_ONLY_PATHS = [
    '/usuarios',           // Gestión usuarios
    '/configuracion',      // Configuración sistema
    '/reportes',          // Reportes
    '/entrada-inventario', // Entrada inventario
    '/proveedores',       // Gestión proveedores
    '/categorias',        // Gestión categorías
    '/inventario',        // Gestión inventario
]

// Rutas exclusivas del superadmin
const SUPERADMIN_PATHS = ['/super-administrador']

// Rutas públicas (sin autenticación)
// SEGURIDAD: Eliminadas las rutas de semilla (seed) y pruebas de base de datos
const PUBLIC_PATHS = [
    '/inicio-sesion',                           // Login
    '/olvide-contrasena',                      // Recuperar contraseña
    '/api/autenticacion/login',                // API login
    '/api/autenticacion/recuperar-password',   // API recuperación
]

// =============================================================================
// REDIRECCIONES (INGLÉS → ESPAÑOL)
// =============================================================================
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

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

// Detecta si es nueva ventana/pestaña
function isNewWindowSession(request: NextRequest): boolean {
    const allCookies = request.cookies.getAll()
    const sessionCookies = allCookies.filter(cookie => cookie.name.startsWith('jhims-session-'))
    return sessionCookies.length === 0
}

// Genera ID único para ventana
function generateWindowId(): string {
    return 'win_' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) + 
           '_' + Date.now()
}

// =============================================================================
// FUNCIÓN PRINCIPAL
// =============================================================================
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // =============================================================================
    // 1. REDIRECCIONES DE IDIOMA
    // =============================================================================
    const rutaEspanol = RUTAS_REDIRECCION[pathname]
    if (rutaEspanol && rutaEspanol !== pathname) {
        return NextResponse.redirect(new URL(rutaEspanol, request.url), { status: 301 })
    }

    // =============================================================================
    // 2. PERMITIR RUTAS PÚBLICAS
    // =============================================================================
    const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path))
    if (isPublicPath) {
        return NextResponse.next()
    }

    // =============================================================================
    // 3. VERIFICAR TOKEN
    // =============================================================================
    const token = request.cookies.get('jhims-auth-token')?.value
    if (!token) {
        return NextResponse.redirect(new URL('/inicio-sesion', request.url))
    }

    try {
        // =============================================================================
        // 4. VERIFICAR JWT
        // =============================================================================
        const { payload } = await jwtVerify(token, JWT_SECRET)
        const role = payload.role as string    // Rol usuario
        const userId = payload.id as string    // ID usuario

        // =============================================================================
        // 5. SESIÓN POR VENTANA
        // =============================================================================
        const response = NextResponse.next()
        
        const windowCookieName = `jhims-window-${userId.substring(0, 8)}`
        let windowId = request.cookies.get(windowCookieName)?.value
        
        if (!windowId && !pathname.startsWith('/api')) {
            windowId = generateWindowId()
            response.cookies.set(windowCookieName, windowId, {
                httpOnly: true,                    // Solo servidor
                secure: process.env.NODE_ENV === "production", // HTTPS
                sameSite: "lax",                   // Anti CSRF
                maxAge: 60 * 60 * 24,             // 24 horas
                path: "/",
            })
        }

        // =============================================================================
        // 6. ACCESO POR ROL
        // =============================================================================

        const isSuperAdminPath = SUPERADMIN_PATHS.some(p => pathname.startsWith(p))
        
        if (role === 'superadmin') {
            // Superadmin: solo su panel o APIs
            if (!isSuperAdminPath && !pathname.startsWith('/api')) {
                return NextResponse.redirect(new URL('/super-administrador', request.url))
            }
            return response
        }

        // Restringir panel superadmin a otros roles
        if (isSuperAdminPath) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        // Verificar rutas de admin
        const isAdminOnlyPath = ADMIN_ONLY_PATHS.some(path => pathname.startsWith(path))
        if (isAdminOnlyPath && role !== 'admin' && role !== 'superadmin') {
            return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
        }

        return response

    } catch (e: any) {
        // =============================================================================
        // 7. MANEJO DE ERRORES DE AUTENTICACIÓN
        // =============================================================================
        // SEGURIDAD: Eliminado el bloque de recuperación vía decodeJwt de forma insegura.
        // Si el token es inválido o ha expirado, debe re-autenticarse.
        
        console.error("MIDDLEWARE [AUTH ERROR]:", e.message)
        const response = NextResponse.redirect(new URL('/inicio-sesion', request.url))
        response.cookies.delete('jhims-auth-token')
        return response
    }
}


// =============================================================================
// CONFIGURACIÓN DE RUTAS A INTERCEPTAR
// =============================================================================
// Excluye: archivos estáticos, imágenes, fonts, etc.
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
    ],
}
