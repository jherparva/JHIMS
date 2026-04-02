import mongoose, { Schema, Document } from "mongoose"
import { multiTenancyPlugin } from "../multi-tenancy-plugin"

export interface ICashSession extends Document {
    companyId: mongoose.Types.ObjectId
    userId: mongoose.Types.ObjectId
    openingAmount: number
    closingAmount?: number
    expectedAmount?: number
    difference?: number
    status: 'open' | 'closed'
    openingDate: Date
    closingDate?: Date
    notes?: string
    
    // Resumen de ventas durante la sesión
    totalSales: number
    totalCashSales: number
    totalCardSales: number
    totalTransferSales: number
}

const CashSessionSchema = new Schema<ICashSession>({
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    openingAmount: { type: Number, required: true, min: 0 },
    closingAmount: { type: Number, min: 0 },
    expectedAmount: { type: Number, default: 0 },
    difference: { type: Number, default: 0 },
    status: { 
        type: String, 
        enum: ['open', 'closed'], 
        default: 'open' 
    },
    openingDate: { type: Date, default: Date.now },
    closingDate: { type: Date },
    notes: { type: String },
    
    totalSales: { type: Number, default: 0 },
    totalCashSales: { type: Number, default: 0 },
    totalCardSales: { type: Number, default: 0 },
    totalTransferSales: { type: Number, default: 0 }
}, {
    timestamps: true
})

CashSessionSchema.plugin(multiTenancyPlugin)

// Índice para buscar sesión activa por usuario y empresa
CashSessionSchema.index({ companyId: 1, userId: 1, status: 1 })

export default mongoose.models.CashSession || mongoose.model<ICashSession>("CashSession", CashSessionSchema)
