import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import User from "@/lib/db/models/User"
import bcrypt from "bcryptjs"

export async function GET() {
    try {
        await connectDB()

        // Check if user exists
        const existingUser = await User.findOne({ username: "admin" })
        if (existingUser) {
            existingUser.password = "admin1234"
            await existingUser.save()
            return NextResponse.json({ message: "Usuario admin actualizado. Contraseña: admin1234" })
        }

        // Create default user
        // Password hashing is handled by the model pre-save hook, 
        // but let's confirm if I need to hash it here or if the model does it.
        // Looking at User.ts: "UserSchema.pre('save', ...)" handles hashing. 
        // So I just pass plain text password if I use .create() or .save().

        const user = await User.create({
            username: "admin",
            email: "admin@jhims.com",
            password: "admin1234", // Will be hashed by pre-save hook
            fullName: "Administrador Sistema",
            role: "superadmin",
            isActive: true
        })

        return NextResponse.json({
            message: "Usuario creado exitosamente",
            user: {
                username: user.username,
                password: "admin (hashed)",
                role: user.role
            }
        })
    } catch (error: any) {
        console.error("Seed error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
