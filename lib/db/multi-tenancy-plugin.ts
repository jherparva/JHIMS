import mongoose, { Schema } from 'mongoose'
import { getSessionContext } from '../session-context'

/**
 * Plugin de Mongoose para Multi-Tenancy (Blindado)
 */
export function multiTenancyPlugin(schema: Schema) {
    // Solo aplicar el plugin si el schema tiene el campo companyId
    if (!schema.path('companyId')) {
        return
    }

    /**
     * Filtro para Query simple (find, update, delete)
     */
    const addCompanyIdFilter = function(this: any) {
        try {
            // Permitir desactivar el filtro si es necesario
            if (this.getOptions && this.getOptions().skipTenantFilter) {
                return
            }

            const context = getSessionContext()
            const modelName = this.model?.modelName || this.mongooseCollection?.name;
            
            if (!context) {
                const isGlobalModel = modelName === 'User' || modelName === 'Company' || 
                                     modelName === 'users' || modelName === 'companies';
                if (isGlobalModel) return

                console.warn(`⚠️ SEGURIDAD QUERY: Bloqueo en ${modelName || 'Unknown'} (Sin contexto)`)
                this.where({ companyId: "000000000000000000000000" }) 
                return
            }
            
            if (context.role === 'superadmin') {
                const isGlobalModel = modelName === 'User' || modelName === 'Ticket' || 
                                      modelName === 'Company';
                if (!isGlobalModel && !this.getQuery().companyId) {
                    this.where({ companyId: null });
                }
                return;
            }

            if (context.companyId) {
                this.where({ companyId: context.companyId })
            } else {
                this.where({ companyId: null })
            }
        } catch (error) {
            console.error('Error in multiTenancyPlugin (Query):', error)
        }
    }

    /**
     * Filtro para Agregaciones (aggregate) - CRÍTICO para reportes y dashboard
     */
    const addCompanyIdFilterToAggregate = function(this: any) {
        try {
            if (this.options && this.options.skipTenantFilter) {
                return
            }

            const context = getSessionContext()
            const modelName = this.model()?.modelName;
            const matchStage: any = { companyId: null };

            if (!context) {
                const isGlobalModel = modelName === 'User' || modelName === 'Company';
                if (isGlobalModel) return;
                matchStage.companyId = "000000000000000000000000";
            } else if (context.role === 'superadmin') {
                const isGlobalModel = modelName === 'User' || modelName === 'Ticket' || modelName === 'Company';
                if (isGlobalModel) return;
                matchStage.companyId = null;
            } else if (context.companyId) {
                matchStage.companyId = new mongoose.Types.ObjectId(context.companyId);
            }

            this.pipeline().unshift({ $match: matchStage });
        } catch (error) {
            console.error('Error in multiTenancyPlugin (Aggregate):', error)
        }
    }

    // Registrar hooks
    schema.pre(/^(find|findOne|count|countDocuments|updateOne|updateMany|deleteOne|deleteMany)$/, addCompanyIdFilter)
    schema.pre('aggregate', addCompanyIdFilterToAggregate)

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
