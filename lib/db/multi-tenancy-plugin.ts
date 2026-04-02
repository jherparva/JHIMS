import mongoose, { Schema } from 'mongoose'
import { getSessionContext } from '../session-context'

/**
 * Plugin de Mongoose para Multi-Tenancy (Blindado y Complaciente con Vercel)
 */
export function multiTenancyPlugin(schema: Schema) {
    if ((schema as any)._multiTenancyApplied) return
    if (!schema.path('companyId')) return

    (schema as any)._multiTenancyApplied = true

    /**
     * Filtro para Query simple (find, update, delete)
     */
    const addCompanyIdFilter = function(this: any, next: (err?: Error) => void) {
        try {
            if (this.getOptions && this.getOptions().skipTenantFilter) {
                return next()
            }

            const context = getSessionContext()
            // Obtener el nombre del modelo de forma robusta
            const model = this.model || this.constructor;
            const modelName = model ? (model.modelName || model.name) : 'Unknown';
            
            if (!context) {
                // Si no hay sesión, protegemos todos los modelos excepto los globales identificados
                const isGlobalModel = 
                    modelName === 'User' || modelName === 'Company' || 
                    modelName === 'users' || modelName === 'companies' ||
                    modelName === 'Ticket' || modelName === 'tickets';

                if (isGlobalModel) return next()

                console.warn(`⚠️ SEGURIDAD: Bloqueo Query en ${modelName} (Sin sesión)`)
                this.where({ companyId: "000000000000000000000000" }) 
                return next()
            }
            
            // Si el usuario es superadmin, le permitimos ver todo si no especifica un companyId
            if (context.role === 'superadmin') {
                // Si el query ya trae companyId, lo respetamos (ej. filtrando por empresa en el panel)
                const currentQuery = this.getQuery();
                if (currentQuery.companyId) {
                    return next();
                }
                
                // Si es un modelo global, no aplicamos filtro
                const isGlobalModel = 
                    modelName === 'User' || modelName === 'Company' || 
                    modelName === 'users' || modelName === 'companies' ||
                    modelName === 'Ticket' || modelName === 'tickets';
                
                if (isGlobalModel) return next()

                // Para otros modelos (Proveedores, Productos, etc.), si no especificó empresa,
                // NO forzamos companyId: null, de lo contrario no vería nada.
                // Permitimos ver todo.
                return next()
            }

            if (context.companyId) {
                this.where({ companyId: context.companyId })
            } else {
                console.warn(`⚠️ SEGURIDAD: Usuario con rol ${context.role} sin companyId consultando ${modelName}`)
                this.where({ companyId: null })
            }
            next()
        } catch (error: any) {
            console.error('Error in multiTenancyPlugin (Query):', error)
            next(error)
        }
    }

    /**
     * Filtro para Agregaciones (aggregate)
     */
    const addCompanyIdFilterToAggregate = function(this: any, next: (err?: Error) => void) {
        try {
            const options = this.options || {};
            if (options.skipTenantFilter) return next()

            const context = getSessionContext()
            // Obtener el nombre del modelo de forma robusta en agregaciones
            const model = this._model || this.model;
            const modelName = model ? (model.modelName || model.name) : 'Unknown';

            if (!context) {
                const isGlobalModel = 
                    modelName === 'User' || modelName === 'Company' || 
                    modelName === 'users' || modelName === 'companies' ||
                    modelName === 'Ticket' || modelName === 'tickets';

                if (isGlobalModel) return next();

                console.warn(`⚠️ SEGURIDAD: Bloqueo Aggregate en ${modelName} (Sin sesión)`)
                this.pipeline().unshift({ $match: { companyId: "000000000000000000000000" } });
                return next();
            } 
            
            if (context.role === 'superadmin') {
                // Superadmin ve todo en agregaciones por defecto
                return next();
            } 
            
            if (context.companyId) {
                const matchStage = { companyId: new mongoose.Types.ObjectId(context.companyId) };
                this.pipeline().unshift({ $match: matchStage });
            } else {
                this.pipeline().unshift({ $match: { companyId: null } });
            }

            next()
        } catch (error: any) {
            console.error('Error in multiTenancyPlugin (Aggregate):', error)
            next(error)
        }
    }

    // Registrar hooks debidamente con next()
    schema.pre(/^find/, addCompanyIdFilter)
    schema.pre(/^count/, addCompanyIdFilter)
    schema.pre(/^update/, addCompanyIdFilter)
    schema.pre(/^delete/, addCompanyIdFilter)
    
    // Agregación con soporte estricto de next()
    schema.pre('aggregate', function(this: any, next: any) {
        addCompanyIdFilterToAggregate.call(this, next);
    })

    schema.pre('save', function (next) {
        const context = getSessionContext()
        // Solo inyectamos si hay un companyId en el contexto y el documento NO lo tiene
        if (this.isNew && context?.companyId && !this.companyId) {
            this.companyId = context.companyId as any
        }
        next()
    })
}

/**
 * Aplicar el plugin globalmente
 */
export function applyMultiTenancyPlugin(mongooseInstance: any) {
    mongooseInstance.plugin(multiTenancyPlugin)
    console.log('✅ Multi-tenancy plugin blindado aplicado globalmente')
}
