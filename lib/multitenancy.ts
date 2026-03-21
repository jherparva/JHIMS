import { getSession } from "./auth"

/**
 * Middleware helper para obtener el companyId del usuario autenticado
 * y validar que tiene acceso
 */
export async function getCompanyId(): Promise<string | null> {
    const session = await getSession()

    if (!session) {
        return null
    }

    // Super admin no tiene companyId (puede ver todo)
    if (session.role === 'superadmin') {
        return null
    }

    // Otros usuarios deben tener companyId
    return session.companyId || null
}

/**
 * Valida que el usuario esté autenticado y tenga acceso a una empresa
 * @returns companyId del usuario o lanza error si no está autorizado
 */
export async function requireCompanyAccess(): Promise<string> {
    const session = await getSession()

    if (!session) {
        throw new Error("No autorizado")
    }

    // Super admin puede acceder sin companyId
    if (session.role === 'superadmin') {
        throw new Error("Super admin debe especificar companyId en query params")
    }

    if (!session.companyId) {
        throw new Error("Usuario sin empresa asignada")
    }

    return session.companyId
}

/**
 * Agrega filtro de companyId a un query de Mongoose
 * Si el usuario es superadmin, no filtra por companyId (puede ver todo)
 * Si el usuario es de una empresa, solo puede ver datos de su empresa
 */
export async function addCompanyFilter<T extends Record<string, unknown>>(
    query: T
): Promise<T> {
    const session = await getSession()

    if (!session) {
        throw new Error("No autorizado")
    }

    // Super admin puede ver datos de todas las empresas
    if (session.role === 'superadmin') {
        return query
    }

    // Usuarios normales solo ven datos de su empresa
    if (!session.companyId) {
        throw new Error("Usuario sin empresa asignada")
    }

    return {
        ...query,
        companyId: session.companyId
    }
}
