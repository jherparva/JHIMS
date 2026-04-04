import mongoose, { Schema, type Document } from "mongoose"
import { multiTenancyPlugin } from "../multi-tenancy-plugin"

export interface IKardex extends Document {
    companyId: mongoose.Types.ObjectId
    productId: mongoose.Types.ObjectId
    variantId?: string
    variantName?: string
    type: "in" | "out" | "adjustment"
    quantity: number
    balanceAfter: number
    reason: string // "Venta", "Compra", "Ingreso Rápido", "Devolución", "Ajuste Manual", "Anulación"
    referenceId?: string // ID de la venta, compra, etc.
    referenceTicket?: string // Número de ticket visible
    date: Date
    createdAt: Date
    updatedAt: Date
}

const KardexSchema = new Schema<IKardex>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },
        variantId: {
            type: String,
        },
        variantName: {
            type: String,
        },
        type: {
            type: String,
            enum: ["in", "out", "adjustment"],
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
        balanceAfter: {
            type: Number,
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        referenceId: {
            type: String,
        },
        referenceTicket: {
            type: String,
        },
        date: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    },
)

// Aplicar plugin de multi-tenancy
KardexSchema.plugin(multiTenancyPlugin)

// Índices para búsquedas rápidas por producto y fecha
KardexSchema.index({ companyId: 1, productId: 1, date: -1 })
KardexSchema.index({ companyId: 1, type: 1 })

export default mongoose.models.Kardex || mongoose.model<IKardex>("Kardex", KardexSchema)
