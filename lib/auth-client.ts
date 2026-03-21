import { SignJWT, jwtVerify } from "jose"

const SECRET_KEY = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "jhims-secret-key-2025")
const TOKEN_NAME = "jhims-auth-token"

export interface SessionUser {
  id: string
  username: string
  email: string
  role: "admin" | "seller" | "superadmin" | "support"
  fullName: string
  permissions?: string[]
  companyId?: string
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

// Verificar token JWT (versión cliente)
export async function verifyTokenClient(token: string): Promise<SessionUser | null> {
  try {
    console.log("🔍 Auth Client: Verificando token:", token.substring(0, 20) + "...")
    
    const { payload } = await jwtVerify(token, SECRET_KEY)
    console.log("🔍 Auth Client: Payload decodificado:", payload)

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

    const user = {
      ...payload,
      id: (payload.id || payload.userId) as string,
      permissions,
      companyId: payload.companyId as string | undefined,
      supportPermissions
    } as unknown as SessionUser
    
    console.log("🔍 Auth Client: Usuario procesado:", user.username, "role:", user.role)
    return user
  } catch (error) {
    console.error("Error al verificar el token de acceso:", error)
    return null
  }
}

// Obtener sesión actual (versión cliente)
export async function getSessionClient(): Promise<SessionUser | null> {
  // Obtener token de las cookies del cliente
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift()
      return cookieValue || null
    }
    return null
  }

  const token = getCookie(TOKEN_NAME)
  console.log("🔍 Auth Client: Token encontrado:", token ? "SÍ" : "NO")

  if (!token) {
    console.log("🔍 Auth Client: No hay token, redirigiendo a login")
    return null
  }

  try {
    const user = await verifyTokenClient(token)
    console.log("🔍 Auth Client: Usuario verificado:", user?.username)
    return user
  } catch (error) {
    console.error("🔍 Auth Client: Error al verificar token:", error)
    return null
  }
}
