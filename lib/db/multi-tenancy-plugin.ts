import { Schema } from 'mongoose'
import { getSessionContext } from '../session-context'

/**
 * Plugin de Mongoose para Multi-Tenancy
 * 
 * Este plugin se aplica automáticamente a todos los modelos que tengan el campo `companyId`.
 * Intercepta todas las queries (find, findOne, update, delete, etc.) y agrega automáticamente
 * un filtro por companyId basado en el contexto de la sesión actual.
 */
export function multiTenancyPlugin(schema: Schema) {
    // Solo aplicar el plugin si el schema tiene el campo companyId
    if (!schema.path('companyId')) {
        return
    }

    // Para compatibilidad con indexes
    const companyIdPath = schema.path('companyId')
    if (companyIdPath && !companyIdPath.options.index) {
        companyIdPath.index(true)
    }

    /**
     * Helper para agregar filtro de companyId a una query
     */
    function addCompanyIdFilter(this: any) {
        try {
            // Permitir desactivar el filtro si es necesario (para operaciones especiales)
            if (this.getOptions && this.getOptions().skipTenantFilter) {
                return
            }

            const context = getSessionContext()

            // Si no hay contexto, permitir la query sin filtro
            if (!context) {
                return
            }

            // Superadmin puede acceder a datos de todas las empresas
            if (context.role === 'superadmin') {
                return
            }

            // Si el usuario tiene companyId, filtrar por él
            if (context.companyId) {
                const currentFilter = this.getFilter()

                // Solo agregar el filtro si no está ya presente
                if (!currentFilter.companyId) {
                    this.where({ companyId: context.companyId })
                }
            } else {
                // Usuario sin companyId (que no sea superadmin) no puede acceder a nada
                console.warn('⚠️ Usuario sin companyId intentando hacer query')
                this.where({ companyId: null }) // Esto no devolverá nada
            }
        } catch (error) {
            console.error('Error en addCompanyIdFilter:', error)
            // Si hay error, permitir la query sin filtro para no romper la aplicación
            return
        }
    }

    // Hooks de lectura (queries)
    schema.pre('find', addCompanyIdFilter)
    schema.pre('findOne', addCompanyIdFilter)
    schema.pre('findOneAndUpdate', addCompanyIdFilter)
    schema.pre('findOneAndDelete', addCompanyIdFilter)
    schema.pre('findOneAndReplace', addCompanyIdFilter)
    schema.pre('countDocuments', addCompanyIdFilter)

    // Hook de escritura - agregar companyId automáticamente al crear
    schema.pre('save', function (next) {
        // Si ya tiene companyId, no hacer nada
        if (this.companyId) {
            return next()
        }

        const context = getSessionContext()

        // Superadmin puede crear sin companyId (ej: crear empresas)
        if (context?.role === 'superadmin') {
            return next()
        }

        // Agregar companyId del contexto
        if (context?.companyId) {
            this.companyId = context.companyId as any
        } else {
            console.warn('⚠️ Intentando crear documento sin companyId')
        }

        next()
    })

    // Hook para updateMany, deleteMany (operaciones masivas)
    schema.pre('updateMany', addCompanyIdFilter)
    schema.pre('deleteMany', addCompanyIdFilter)
}

/**
 * Aplicar el plugin a todos los modelos globalmente
 * Llamar esto una vez al inicializar la aplicación
 */
export function applyMultiTenancyPlugin(mongoose: any) {
    mongoose.plugin(multiTenancyPlugin)
    console.log('✅ Multi-tenancy plugin aplicado globalmente')
}
