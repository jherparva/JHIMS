import mongoose, { Schema, Document } from "mongoose"
import { multiTenancyPlugin } from "../multi-tenancy-plugin"

export interface IExpense extends Document {
    companyId: mongoose.Types.ObjectId
    createdBy: mongoose.Types.ObjectId
    description: string
    category: 'Servicios' | 'Nómina' | 'Insumos' | 'Transporte' | 'Mantenimiento' | 'Otros'
    amount: number
    date: Date
    reference?: string
    notes?: string
}

const ExpenseSchema = new Schema<IExpense>({
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true, trim: true },
    category: { 
        type: String, 
        required: true,
        enum: ['Servicios', 'Nómina', 'Insumos', 'Transporte', 'Mantenimiento', 'Otros'],
        default: 'Otros'
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true }
}, {
    timestamps: true
})

ExpenseSchema.plugin(multiTenancyPlugin)

ExpenseSchema.index({ companyId: 1, date: -1 })

export default mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema)
