import mongoose, { Schema, Document } from "mongoose"

export interface IPlan {
    id: string
    name: string
    price: number
    limits: {
        maxUsers: number
        maxProducts: number
        maxSalesPerMonth: number
        maxStorageGB: number
    }
    features: string[]
}

// Planes colombianos - Importar desde constants
export const PLANS: Record<string, IPlan> = {
    free: {
        id: 'free',
        name: 'Gratis',
        price: 0,
        limits: {
            maxUsers: 1,
            maxProducts: 100,
            maxSalesPerMonth: 50,
            maxStorageGB: 0.5
        },
        features: [
            'basic_reports',
            'support_tickets',
            'email_support'
        ]
    },
    basic: {
        id: 'basic',
        name: 'Básico',
        price: 50000, // COP
        limits: {
            maxUsers: 10,
            maxProducts: 1000,
            maxSalesPerMonth: 500,
            maxStorageGB: 5
        },
        features: [
            'basic_reports',
            'advanced_reports',
            'invoices',
            'support_tickets',
            'priority_email_support'
        ]
    },
    pro: {
        id: 'pro',
        name: 'Profesional',
        price: 100000, // COP
        limits: {
            maxUsers: 30,
            maxProducts: 10000,
            maxSalesPerMonth: 5000,
            maxStorageGB: 50
        },
        features: [
            'all_reports',
            'invoices',
            'api_access',
            'webhooks',
            'support_tickets',
            'priority_support',
            'phone_support'
        ]
    }
}

export interface ICompany extends Document {
    // Identificación
    slug: string
    name: string
    email: string
    phone: string
    businessType: 'tienda' | 'ferreteria' | 'restaurante' | 'otro'

    // Plan y facturación
    plan: 'free' | 'basic' | 'pro'
    status: 'pending' | 'active' | 'suspended' | 'cancelled' | 'trial'

    // Usuarios adicionales
    additionalUsers: number

    // Suscripción
    subscriptionStart: Date
    subscriptionEnd?: Date
    trialEndsAt?: Date

    // Límites actuales según plan
    limits: {
        maxUsers: number
        maxProducts: number
        maxSalesPerMonth: number
        maxStorageGB: number
    }

    // Uso actual
    usage: {
        currentUsers: number
        currentProducts: number
        currentSalesThisMonth: number
        currentStorageGB: number
        lastResetDate: Date
    }

    // Configuración
    logo?: string
    digitalSignature?: string
    taxId?: string
    address?: string
    paymentQR?: string
    paymentInfo?: string

    // Soporte
    supportPriority: 'standard' | 'priority' | 'vip'

    // Aprobación por super-admin
    // approvedBy?: mongoose.Types.ObjectId // Temporalmente comentado para evitar errores
    approvedAt?: Date
    rejectionReason?: string

    // Auditoría
    createdAt: Date
    updatedAt: Date
    isActive: boolean

    // Métodos
    updateLimitsFromPlan: () => void
    isWithinLimits: (limitType: 'users' | 'products' | 'sales') => boolean
    resetMonthlySales: () => void
}

const CompanySchema = new Schema<ICompany>({
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, unique: true },
    phone: { type: String, required: false, trim: true },
    businessType: { 
        type: String, 
        enum: ['tienda', 'ferreteria', 'restaurante', 'otro'], 
        default: 'tienda' 
    },

    plan: {
        type: String,
        enum: ['free', 'basic', 'pro'],
        required: true,
        default: 'free'
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended', 'cancelled', 'trial'],
        required: true,
        default: 'pending'
    },

    additionalUsers: { type: Number, required: true, default: 0 },

    subscriptionStart: { type: Date, required: true, default: Date.now },
    subscriptionEnd: { type: Date },
    trialEndsAt: { type: Date },

    limits: {
        maxUsers: { type: Number, required: true },
        maxProducts: { type: Number, required: true },
        maxSalesPerMonth: { type: Number, required: true },
        maxStorageGB: { type: Number, required: true }
    },

    usage: {
        currentUsers: { type: Number, required: true, default: 0 },
        currentProducts: { type: Number, required: true, default: 0 },
        currentSalesThisMonth: { type: Number, required: true, default: 0 },
        currentStorageGB: { type: Number, required: true, default: 0 },
        lastResetDate: { type: Date, required: true, default: Date.now }
    },

    logo: { type: String },
    digitalSignature: { type: String },
    taxId: { type: String },
    address: { type: String },
    paymentQR: { type: String }, // Nueva: URL de imagen de QR (Nequi/Daviplata/etc)
    paymentInfo: { type: String }, // Nueva: Texto libre con instrucciones de pago

    supportPriority: {
        type: String,
        enum: ['standard', 'priority', 'vip'],
        default: 'standard'
    },

    // approvedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Temporalmente comentado para evitar errores
    approvedAt: { type: Date },
    rejectionReason: { type: String },

    isActive: { type: Boolean, required: true, default: true }
}, {
    timestamps: true
})

// Índices (slug y email ya tienen unique:true, no necesitan index adicional)
CompanySchema.index({ status: 1 })
CompanySchema.index({ plan: 1 })

// Método para obtener límites según plan
CompanySchema.methods.updateLimitsFromPlan = function () {
    const planConfig = PLANS[this.plan]
    if (planConfig) {
        this.limits = planConfig.limits
    }
}

// Método para verificar si está dentro de límites
CompanySchema.methods.isWithinLimits = function (limitType: 'users' | 'products' | 'sales') {
    const { limits, usage } = this

    switch (limitType) {
        case 'users':
            return limits.maxUsers === -1 || usage.currentUsers < limits.maxUsers
        case 'products':
            return limits.maxProducts === -1 || usage.currentProducts < limits.maxProducts
        case 'sales':
            return limits.maxSalesPerMonth === -1 || usage.currentSalesThisMonth < limits.maxSalesPerMonth
        default:
            return true
    }
}

// Método para resetear contador mensual de ventas
CompanySchema.methods.resetMonthlySales = function () {
    const now = new Date()
    const lastReset = new Date(this.usage.lastResetDate)

    // Si es un nuevo mes, resetear
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        this.usage.currentSalesThisMonth = 0
        this.usage.lastResetDate = now
    }
}

// MÉTODO ESTÁTICO: Incrementar uso de forma segura
CompanySchema.statics.incrementUsage = async function(companyId, type: 'users' | 'products' | 'sales', amount: number = 1) {
    const fieldMap = {
        'users': 'usage.currentUsers',
        'products': 'usage.currentProducts',
        'sales': 'usage.currentSalesThisMonth'
    };
    
    const updateField = fieldMap[type];
    if (!updateField) return null;

    return await this.findByIdAndUpdate(
        companyId,
        { $inc: { [updateField]: amount } },
        { new: true }
    ).setOptions({ skipTenantFilter: true });
}

export default mongoose.models.Company || mongoose.model<ICompany>("Company", CompanySchema)
