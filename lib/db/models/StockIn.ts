import mongoose, { Schema, type Document } from "mongoose"

export interface IStockInItem {
    product: mongoose.Types.ObjectId
    quantity: number
    unitCost: number
    subtotal: number
}

export interface IStockIn extends Document {
    companyId: mongoose.Types.ObjectId
    supplier: mongoose.Types.ObjectId
    items: IStockInItem[]
    total: number
    referenceNumber?: string
    notes?: string
    date: Date
    createdAt: Date
    updatedAt: Date
}

const StockInItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 }
})

const StockInSchema = new Schema<IStockIn>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: false,
            index: true,
        },
        supplier: {
            type: Schema.Types.ObjectId,
            ref: "Supplier",
            required: [true, "El proveedor es requerido"],
        },
        items: [StockInItemSchema],
        total: {
            type: Number,
            required: true,
            min: 0,
        },
        referenceNumber: {
            type: String,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
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

StockInSchema.index({ companyId: 1, date: -1 })
StockInSchema.index({ supplier: 1 })

export default mongoose.models.StockIn || mongoose.model<IStockIn>("StockIn", StockInSchema)
