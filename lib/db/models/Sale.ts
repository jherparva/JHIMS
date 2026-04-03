import mongoose, { Schema, Document } from "mongoose"
import { multiTenancyPlugin } from "../multi-tenancy-plugin"

export interface ISaleItem {
    product: mongoose.Types.ObjectId
    variantId?: string
    variantName?: string
    quantity: number
    price: number
    subtotal: number
}

export interface IPayment {
    amount: number
    date: Date
    paymentMethod: string
}

export interface ISale extends Document {
    customer?: mongoose.Types.ObjectId
    items: ISaleItem[]
    total: number
    paymentMethod: "cash" | "card" | "transfer"
    amountPaid: number
    balance: number
    paymentStatus: "paid" | "partial" | "pending"
    status: "completed" | "cancelled"
    payments: IPayment[]
    date: Date
    companyId?: mongoose.Types.ObjectId
    seller?: mongoose.Types.ObjectId
    ticketNumber?: string
    sequential?: number
}

const SaleItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: String },
    variantName: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 }
})

const PaymentSchema = new Schema({
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    paymentMethod: { type: String, default: "cash" }
})

const SaleSchema = new Schema<ISale>(
    {
        customer: { type: Schema.Types.ObjectId, ref: "Customer" },
        items: [SaleItemSchema],
        total: { type: Number, required: true, min: 0 },
        paymentMethod: {
            type: String,
            enum: ["cash", "card", "transfer"],
            default: "cash"
        },
        amountPaid: { type: Number, default: 0 },
        balance: { type: Number, default: 0 },
        paymentStatus: {
            type: String,
            enum: ["paid", "partial", "pending"],
            default: "paid"
        },
        status: {
            type: String,
            enum: ["completed", "cancelled"],
            default: "completed"
        },
        payments: [PaymentSchema],
        date: { type: Date, default: Date.now },
        companyId: { type: Schema.Types.ObjectId, ref: "Company" },
        seller: { type: Schema.Types.ObjectId, ref: "User" },
        ticketNumber: { type: String, unique: false },
        sequential: { type: Number, default: 1 }
    },
    { timestamps: true }
)

// Índices de Seguridad
SaleSchema.index({ companyId: 1, sequential: 1 }, { unique: true })
SaleSchema.index({ companyId: 1, createdAt: -1 })
SaleSchema.index({ customer: 1 })

SaleSchema.plugin(multiTenancyPlugin)

export default mongoose.models.Sale || mongoose.model<ISale>("Sale", SaleSchema)
