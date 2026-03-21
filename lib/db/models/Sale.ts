import mongoose, { Schema, Document } from "mongoose"
import { multiTenancyPlugin } from "../multi-tenancy-plugin"

export interface ISaleItem {
    product: mongoose.Types.ObjectId
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
    payments: IPayment[]
    date: Date
    companyId?: mongoose.Types.ObjectId
    ticketNumber?: string
    sequential?: number
}

const SaleItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
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
        payments: [PaymentSchema],
        date: { type: Date, default: Date.now },
        companyId: { type: Schema.Types.ObjectId, ref: "Company" },
        ticketNumber: { type: String, unique: false },
        sequential: { type: Number, default: 1 }
    },
    { timestamps: true }
)

SaleSchema.plugin(multiTenancyPlugin)

export default mongoose.models.Sale || mongoose.model<ISale>("Sale", SaleSchema)
