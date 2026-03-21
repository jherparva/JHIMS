import { AsyncLocalStorage } from 'async_hooks'

/**
 * AsyncLocalStorage para mantener el contexto de la sesión a través de llamadas asíncronas
 * Esto permite que el plugin de Mongoose acceda al companyId sin pasarlo explícitamente
 */
export const sessionContext = new AsyncLocalStorage<{
    companyId?: string
    userId?: string
    role?: string
}>()

/**
 * Helper para ejecutar código con contexto de sesión
 * Uso: await runWithSession({ companyId: '123' }, async () => { ... })
 */
export function runWithSession<T>(
    context: { companyId?: string; userId?: string; role?: string },
    callback: () => Promise<T>
): Promise<T> {
    return sessionContext.run(context, callback)
}

/**
 * Obtener el contexto actual de la sesión
 */
export function getSessionContext() {
    return sessionContext.getStore()
}
