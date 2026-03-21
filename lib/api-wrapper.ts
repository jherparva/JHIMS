import { NextRequest, NextResponse } from 'next/server'
import { getSession } from './auth'
import { runWithSession } from './session-context'

/**
 * Wrapper para API routes que automáticamente establece el contexto de sesión
 * para el plugin de multi-tenancy
 */
export function withSessionContext(
    handler: (request: NextRequest, context: any) => Promise<NextResponse>
) {
    return async (request: NextRequest, context: any) => {
        try {
            // Obtener la sesión actual
            const session = await getSession()

            if (!session) {
                return NextResponse.json(
                    { error: 'No autorizado' },
                    { status: 401 }
                )
            }

            // Sistema de recuperación robusto: Si la sesión no tiene companyId, lo buscamos en la DB
            // PERO SOLO para usuarios que NO sean superadmin
            let finalCompanyId = session.companyId
            let finalRole = session.role

            if (!finalCompanyId && session.id && session.role !== 'superadmin') {
                console.log('RESCATE: Sesión sin companyId. Buscando datos en base de datos...')
                const User = (await import('./db/models/User')).default
                const userInDb = await User.findById(session.id).setOptions({ skipTenantFilter: true }).select('companyId role').lean() as any
                if (userInDb) {
                    finalCompanyId = userInDb.companyId?.toString()
                    finalRole = userInDb.role
                    console.log('RESCATE: Exitosa vinculación a empresa:', finalCompanyId)
                }
            }

            // El superadmin NUNCA debe tener companyId
            if (session.role === 'superadmin') {
                finalCompanyId = undefined
                console.log('RESCATE: Usuario superadmin - sin companyId por diseño')
            }

            // Ejecutar el handler con el contexto de sesión establecido e inyectado en el context
            return await runWithSession(
                {
                    companyId: finalCompanyId,
                    userId: session.id,
                    role: finalRole
                },
                () => handler(request, {
                    ...context,
                    companyId: finalCompanyId,
                    userId: session.id,
                    role: finalRole
                })
            )
        } catch (error) {
            console.error('Error en withSessionContext:', error)
            return NextResponse.json(
                { error: 'Error del servidor' },
                { status: 500 }
            )
        }
    }
}

/**
 * Versión del wrapper que NO requiere autenticación
 * Útil para endpoints públicos que aún así necesitan multi-tenancy
 */
export function withOptionalSessionContext(
    handler: (request: NextRequest, context: any) => Promise<NextResponse>
) {
    return async (request: NextRequest, context: any) => {
        try {
            const session = await getSession()

            if (!session) {
                // Sin sesión, ejecutar sin contexto
                return await handler(request, context)
            }

            // Con sesión, establecer contexto e inyectarlo
            return await runWithSession(
                {
                    companyId: session.companyId,
                    userId: session.id,
                    role: session.role
                },
                () => handler(request, {
                    ...context,
                    companyId: session.companyId,
                    userId: session.id,
                    role: session.role
                })
            )
        } catch (error) {
            console.error('Error en withOptionalSessionContext:', error)
            return NextResponse.json(
                { error: 'Error del servidor' },
                { status: 500 }
            )
        }
    }
}
