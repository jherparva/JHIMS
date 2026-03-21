//jhims-inventory\lib\auth.ts//

import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const SECRET_KEY = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "jhims-secret-key-2025")
export const TOKEN_NAME = "jhims-auth-token"

export interface SessionUser {
  id: string
  username: string
  email: string
  role: "admin" | "seller" | "superadmin" | "support"
  fullName: string
  permissions?: string[] // Permisos personalizados para vendedores
  companyId?: string // ID de la empresa (null para superadmin)
  impersonatedBy?: string // ID del usuario que está suplantando
  supportPermissions?: {
    canViewTickets: boolean
    canReplyTickets: boolean
    canCloseTickets: boolean
    canViewCompanies: boolean
    canApproveCompanies: boolean
    canRejectCompanies: boolean
    canChangePlans: boolean
    canSuspendCompanies: boolean
    canManageUsers: boolean
  }
}

// Crear token JWT
export async function createToken(user: SessionUser, sessionToken?: string, expiresIn: string = "7d"): Promise<string> {
  const jwtPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    permissions: JSON.stringify(user.permissions || []),
    companyId: user.companyId || null,
    impersonatedBy: user.impersonatedBy || null,
    supportPermissions: JSON.stringify(user.supportPermissions || {}),
    // Token de sesión única (para invalidar sesiones anteriores)
    ...(sessionToken ? { sessionToken } : {})
  }

  return await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SECRET_KEY)
}

// Verificar token JWT con validación de sessionToken
export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)

    let permissions: string[] = []
    if (typeof payload.permissions === 'string') {
      try {
        permissions = JSON.parse(payload.permissions)
      } catch (e) {
        permissions = []
      }
    } else if (Array.isArray(payload.permissions)) {
      permissions = payload.permissions as string[]
    }

    let supportPermissions: SessionUser['supportPermissions'] = undefined
    if (typeof payload.supportPermissions === 'string') {
      try {
        supportPermissions = JSON.parse(payload.supportPermissions)
      } catch (e) {
        supportPermissions = undefined
      }
    }

    // Si el token incluye sessionToken, validar contra la BD
    if (payload.sessionToken && payload.id) {
      try {
        const { connectDB } = await import('./db/mongodb')
        const User = await import('./db/models/User').then(m => m.default)
        
        await connectDB()
        
        const user = await User.findById(payload.id)
          .select('sessionToken isActive')
          .setOptions({ skipTenantFilter: true })
          .lean()
        
        // Si el usuario no existe, está inactivo, o el sessionToken no coincide
        if (!user || Array.isArray(user) || !user.isActive || user.sessionToken !== payload.sessionToken) {
          console.log("Token inválido: sessionToken no coincide o usuario inactivo")
          return null
        }
      } catch (dbError) {
        console.error("Error al validar sessionToken en BD:", dbError)
        // En caso de error de BD, permitimos el token (fallback)
      }
    }

    return {
      ...payload,
      id: (payload.id || payload.userId) as string, // Soporte para tokens antiguos y nuevos
      permissions,
      companyId: payload.companyId as string | undefined,
      impersonatedBy: payload.impersonatedBy as string | undefined,
      supportPermissions
    } as unknown as SessionUser
  } catch (error) {
    console.error("Error al verificar el token de acceso:", error)
    return null
  }
}

// Obtener sesión actual
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_NAME)?.value

  if (!token) return null

  return await verifyToken(token)
}

// Guardar sesión
export async function setSession(user: SessionUser): Promise<void> {
  const token = await createToken(user)
  const cookieStore = await cookies()

  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: "/",
  })
}

// Eliminar sesión y limpiar sessionToken
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_NAME)?.value
  
  // Si hay token, limpiar el sessionToken del usuario
  if (token) {
    try {
      const { jwtVerify } = await import('jose')
      const SECRET_KEY = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "jhims-secret-key-2025")
      
      const { payload } = await jwtVerify(token, SECRET_KEY)
      
      if (payload.id) {
        const { connectDB } = await import('./db/mongodb')
        const User = await import('./db/models/User').then(m => m.default)
        
        await connectDB()
        
        // Limpiar el sessionToken para invalidar todas las sesiones
        await User.findByIdAndUpdate(
          payload.id,
          { $unset: { sessionToken: 1 } },
          { setOptions: { skipTenantFilter: true } }
        )
      }
    } catch (error) {
      console.error("Error al limpiar sessionToken en logout:", error)
    }
  }
  
  cookieStore.delete(TOKEN_NAME)
}
