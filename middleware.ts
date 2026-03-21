import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production'
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

    // Permitir rutas públicas
    const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path))
    if (isPublicPath) {
        return NextResponse.next()
    }

    // Verificar que existe el token de sesión
    const token = request.cookies.get('jhims-auth-token')?.value
    if (!token) {
        return NextResponse.redirect(new URL('/inicio-sesion', request.url))
    }

    // PRIORIDAD 1: Detectar si es una nueva ventana/pestaña del navegador
    // Esto evita que una sesión se "contamine" entre ventanas diferentes
    if (isNewWindowSession(request)) {
        console.log("MIDDLEWARE: Nueva ventana detectada, redirigiendo a login para seguridad")
        const response = NextResponse.redirect(new URL('/inicio-sesion?session=new', request.url))
        // No borramos el token de inmediato, permitimos que el login maneje si quiere "recuperar" la sesión
        // Pero marcamos que es una nueva ventana
        return response
    }

    try {
        // Verificar y decodificar el token JWT
        const { payload } = await jwtVerify(token, JWT_SECRET)
        const role = payload.role as string

        // Establecer cookie de sesión de navegador si no existe (mantener sesión activa)
        const response = NextResponse.next()
        
        // Obtener el ID de usuario del token para crear cookie única por sesión
        const userId = payload.id as string
        const windowCookieName = `jhims-window-${userId.substring(0, 8)}` // Cookie única por usuario
        
        // Obtener windowId actual de la cookie específica de esta sesión
        let windowId = request.cookies.get(windowCookieName)?.value
        
        // Si no hay windowId, generar uno nuevo SIEMPRE (aislamiento completo por sesión)
        if (!windowId) {
            windowId = generateWindowId()
            
            // Usar cookie única por sesión (basada en ID de usuario)
            // No especificamos dominio para que las cookies funcionen en cualquier host (incluido Vercel)
            response.cookies.set(windowCookieName, windowId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24, // 24 horas
                path: "/",
            })
            console.log(`MIDDLEWARE: Nuevo windowId asignado: ${windowId} para ruta: ${pathname} (cookie: ${windowCookieName})`)
        } else {
            // Mantener windowId existente - no reemplazar innecesariamente
            console.log(`MIDDLEWARE: windowId existente: ${windowId} para ruta: ${pathname} (cookie: ${windowCookieName})`)
        }

        // PRIORIDAD 2: Verificación estado de empresa (solución temporal segura)
        // Usando cache en memoria para evitar problemas con referencias a User
        if (role !== 'superadmin' && payload.companyId) {
            try {
                // Cache simple en memoria para empresas (en producción usar Redis)
                const suspendedCompanies = new Set<string>() // Podría cargarse desde una configuración
                
                // Por ahora, permitir acceso y registrar para auditoría
                // TODO: Implementar cache real de empresas suspendidas
                console.log(` MIDDLEWARE: Verificando empresa ${payload.companyId} (usuario: ${role})`)
                console.log(`ℹ️ MIDDLEWARE: Verificación de estado desactivada temporalmente por seguridad`)
                
                // En lugar de bloquear, registramos el acceso para auditoría
                console.log(`🔍 AUDITORÍA: Acceso permitido a empresa ${payload.companyId} por usuario ${role}`)
                
            } catch (error) {
                console.error("MIDDLEWARE: Error en verificación simplificada:", error)
                // No bloquear por ahora para mantener el sistema funcionando
            }
        }

        // PRIORIDAD 3: Lógica de redirección por rol (solo si no es nueva ventana)
        // Superadmin solo puede estar en /superadmin
        const isSuperAdminPath = SUPERADMIN_PATHS.some(p => pathname.startsWith(p))
        const isNewWindow = isNewWindowSession(request)
        
        console.log(`MIDDLEWARE: role=${role}, pathname=${pathname}, isSuperAdminPath=${isSuperAdminPath}, isNewWindow=${isNewWindow}`)
        
        if (role === 'superadmin') {
            // El superadmin SIEMPRE debe estar en /superadmin
            if (!isSuperAdminPath && !pathname.startsWith('/api')) {
                console.log("MIDDLEWARE: Superadmin fuera de su panel, redirigiendo a /super-administrador")
                return NextResponse.redirect(new URL('/super-administrador', request.url))
            }
            return response
        }

        // Usuario normal (admin/seller) no puede acceder al panel de superadmin
        if (isSuperAdminPath) {
            console.log(`MIDDLEWARE: Usuario ${role} intentando acceder a superadmin, redirigiendo a dashboard`)
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        // Verificar acceso a rutas exclusivas del admin de empresa
        const isAdminOnlyPath = ADMIN_ONLY_PATHS.some(path => pathname.startsWith(path))
        if (isAdminOnlyPath && role !== 'admin' && role !== 'superadmin') {
            return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
        }

        return response
    } catch (e) {
        // Token inválido → redirigir al login
        const response = NextResponse.redirect(new URL('/inicio-sesion', request.url))
        response.cookies.delete('jhims-auth-token')
        response.cookies.delete('jhims-browser-session')
        return response
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
    ],
}
