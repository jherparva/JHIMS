import mongoose, { Schema } from 'mongoose'
import { getSessionContext } from '../session-context'

/**
 * Plugin de Mongoose para Multi-Tenancy (Blindado y Complaciente con Vercel)
 */
export function multiTenancyPlugin(schema: Schema) {
    if (!schema.path('companyId')) return

    /**
     * Filtro para Query simple (find, update, delete)
     */
    const addCompanyIdFilter = function(this: any, next: (err?: Error) => void) {
        try {
            if (this.getOptions && this.getOptions().skipTenantFilter) {
                return next()
            }

            const context = getSessionContext()
            const modelName = this.model ? this.model.modelName : (this.mongooseCollection ? this.mongooseCollection.name : 'Unknown');
            
            if (!context) {
                const isGlobalModel = modelName === 'User' || modelName === 'Company' || 
                                     modelName === 'users' || modelName === 'companies';
                if (isGlobalModel) return next()

                console.warn(`⚠️ SEGURIDAD: Bloqueo Query en ${modelName} (Sin sesión)`)
                this.where({ companyId: "000000000000000000000000" }) 
                return next()
            }
            
            if (context.role === 'superadmin') {
                const isGlobalModel = modelName === 'User' || modelName === 'Ticket' || modelName === 'Company';
                if (!isGlobalModel && !this.getQuery().companyId) {
                    this.where({ companyId: null });
                }
                return next()
            }

            if (context.companyId) {
                this.where({ companyId: context.companyId })
            } else {
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
            const modelName = model ? model.modelName : 'Unknown';
            const matchStage: any = { companyId: null };

            if (!context) {
                const isGlobalModel = modelName === 'User' || modelName === 'Company';
                if (isGlobalModel) return next();

                console.warn(`⚠️ SEGURIDAD: Bloqueo Aggregate en ${modelName} (Sin sesión)`)
                matchStage.companyId = "000000000000000000000000";
            } else if (context.role === 'superadmin') {
                const isGlobalModel = modelName === 'User' || modelName === 'Ticket' || modelName === 'Company';
                if (isGlobalModel) return next();
                matchStage.companyId = null;
            } else if (context.companyId) {
                matchStage.companyId = new mongoose.Types.ObjectId(context.companyId);
            }

            this.pipeline().unshift({ $match: matchStage });
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
