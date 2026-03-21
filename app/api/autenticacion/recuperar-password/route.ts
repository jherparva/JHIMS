import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import User from "@/lib/db/models/User"
import { randomUUID } from "crypto"
import { sendPasswordRecoveryEmail, isMailConfigured } from "@/lib/mail"

// Almacén temporal de códigos de recuperación (en producción usar Redis)
// Clave: identifier (username/email), Valor: { code, token, expires, attempts, verified }
const recoveryStore = new Map<string, {
    code: string
    token: string
    expires: number
    attempts: number
    verified: boolean
}>()

// Limpiar entradas expiradas
function cleanExpired() {
    const now = Date.now()
    Array.from(recoveryStore.entries()).forEach(([key, value]) => {
        if (now > value.expires) {
            recoveryStore.delete(key)
        }
    })
}

// Generar código de 6 dígitos
function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
    try {
        await connectDB()
        cleanExpired()

        const body = await req.json()
        const { action, identifier } = body

        if (!action || !identifier) {
            return NextResponse.json(
                { error: "Campos requeridos faltantes" },
                { status: 400 }
            )
        }

        const normalizedId = identifier.trim().toLowerCase()

        switch (action) {
            // ═══════════════════════════════════════════════════════════
            // PASO 1: Solicitar código de recuperación
            // ═══════════════════════════════════════════════════════════
            case "request": {
                // Buscar usuario por username o email
                const user = await User.findOne({
                    $or: [
                        { username: normalizedId },
                        { email: normalizedId }
                    ]
                })
                    .setOptions({ skipTenantFilter: true })
                    .select("username email fullName isActive")
                    .lean() as any

                if (!user || !user.isActive) {
                    // Por seguridad, no revelamos si el usuario existe o no
                    return NextResponse.json({
                        message: "Si el correo está registrado, recibirás un código de verificación.",
                        resetToken: randomUUID(), // Token ficticio para no revelar info
                    })
                }

                // Verificar si ya hay un código activo (rate limiting básico)
                const existing = recoveryStore.get(normalizedId)
                if (existing && Date.now() < existing.expires - (14 * 60 * 1000)) {
                    // Si quedan más de 14 minutos (se generó hace menos de 1 min), rate limit
                    return NextResponse.json(
                        { error: "Ya se envió un código recientemente. Espera un momento antes de solicitar otro." },
                        { status: 429 }
                    )
                }

                // Generar código y token
                const code = generateCode()
                const token = randomUUID()

                recoveryStore.set(normalizedId, {
                    code,
                    token,
                    expires: Date.now() + 15 * 60 * 1000, // 15 minutos
                    attempts: 0,
                    verified: false,
                })

                // ── Enviar código por correo electrónico ──────────────────
                if (isMailConfigured()) {
                    const emailResult = await sendPasswordRecoveryEmail({
                        to: user.email,
                        fullName: user.fullName,
                        code,
                        expiresInMinutes: 15,
                    })

                    if (emailResult.success) {
                        // Ocultar parcialmente el correo para mostrar al usuario
                        const maskedEmail = maskEmail(user.email)
                        console.log(`📧 Código de recuperación enviado a: ${user.email} para usuario: ${user.username}`)

                        return NextResponse.json({
                            message: `Código de verificación enviado a ${maskedEmail}`,
                            resetToken: token,
                            emailSent: true,
                        })
                    } else {
                        console.error(`❌ Error al enviar correo a ${user.email}:`, emailResult.error)
                        // Fallback: mostrar en consola
                        logCodeToConsole(user, code)

                        return NextResponse.json({
                            message: "No se pudo enviar el correo. Contacta al administrador para obtener tu código.",
                            resetToken: token,
                            emailSent: false,
                        })
                    }
                } else {
                    // Mail no configurado: mostrar en consola como fallback
                    logCodeToConsole(user, code)

                    return NextResponse.json({
                        message: "Código generado. El servicio de correo no está configurado — contacta al administrador para obtener tu código.",
                        resetToken: token,
                        emailSent: false,
                    })
                }
            }

            // ═══════════════════════════════════════════════════════════
            // PASO 2: Verificar código
            // ═══════════════════════════════════════════════════════════
            case "verify": {
                const { code, resetToken } = body

                if (!code || !resetToken) {
                    return NextResponse.json(
                        { error: "Código y token son requeridos" },
                        { status: 400 }
                    )
                }

                const recovery = recoveryStore.get(normalizedId)

                if (!recovery) {
                    return NextResponse.json(
                        { error: "No hay solicitud de recuperación activa. Solicita un nuevo código." },
                        { status: 400 }
                    )
                }

                // Verificar expiración
                if (Date.now() > recovery.expires) {
                    recoveryStore.delete(normalizedId)
                    return NextResponse.json(
                        { error: "El código ha expirado. Solicita uno nuevo." },
                        { status: 400 }
                    )
                }

                // Verificar intentos (max 5)
                if (recovery.attempts >= 5) {
                    recoveryStore.delete(normalizedId)
                    return NextResponse.json(
                        { error: "Demasiados intentos fallidos. Solicita un nuevo código." },
                        { status: 429 }
                    )
                }

                // Verificar token
                if (recovery.token !== resetToken) {
                    return NextResponse.json(
                        { error: "Token de recuperación inválido" },
                        { status: 400 }
                    )
                }

                // Verificar código
                if (recovery.code !== code.trim()) {
                    recovery.attempts++
                    return NextResponse.json(
                        { error: `Código incorrecto. Te quedan ${5 - recovery.attempts} intentos.` },
                        { status: 400 }
                    )
                }

                // Código verificado - generar nuevo token para el paso de reset
                const newToken = randomUUID()
                recovery.verified = true
                recovery.token = newToken

                return NextResponse.json({
                    message: "Código verificado correctamente",
                    resetToken: newToken,
                })
            }

            // ═══════════════════════════════════════════════════════════
            // PASO 3: Establecer nueva contraseña
            // ═══════════════════════════════════════════════════════════
            case "reset": {
                const { newPassword, resetToken } = body

                if (!newPassword || !resetToken) {
                    return NextResponse.json(
                        { error: "Contraseña y token son requeridos" },
                        { status: 400 }
                    )
                }

                if (newPassword.length < 8) {
                    return NextResponse.json(
                        { error: "La contraseña debe tener al menos 8 caracteres" },
                        { status: 400 }
                    )
                }

                const recovery = recoveryStore.get(normalizedId)

                if (!recovery || !recovery.verified) {
                    return NextResponse.json(
                        { error: "Solicitud de recuperación inválida o no verificada" },
                        { status: 400 }
                    )
                }

                if (recovery.token !== resetToken) {
                    return NextResponse.json(
                        { error: "Token inválido" },
                        { status: 400 }
                    )
                }

                if (Date.now() > recovery.expires) {
                    recoveryStore.delete(normalizedId)
                    return NextResponse.json(
                        { error: "La solicitud ha expirado. Inicia el proceso de nuevo." },
                        { status: 400 }
                    )
                }

                // Buscar usuario y actualizar contraseña
                const user = await User.findOne({
                    $or: [
                        { username: normalizedId },
                        { email: normalizedId }
                    ]
                }).setOptions({ skipTenantFilter: true })

                if (!user) {
                    return NextResponse.json(
                        { error: "Usuario no encontrado" },
                        { status: 404 }
                    )
                }

                // Actualizar contraseña (el pre-save hook la hasheará)
                user.password = newPassword
                await user.save()

                // Limpiar el recovery store
                recoveryStore.delete(normalizedId)

                console.log(`✅ CONTRASEÑA ACTUALIZADA: ${user.username} (${user.email})`)

                return NextResponse.json({
                    message: "Contraseña actualizada exitosamente",
                })
            }

            default:
                return NextResponse.json(
                    { error: "Acción no válida" },
                    { status: 400 }
                )
        }
    } catch (error: any) {
        console.error("Error en recuperación de contraseña:", error)
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        )
    }
}

// ── Utilidades ──────────────────────────────────────────────────────────

/** Ocultar parcialmente un email: j***n@gmail.com */
function maskEmail(email: string): string {
    const [local, domain] = email.split("@")
    if (local.length <= 2) return `${local[0]}***@${domain}`
    return `${local[0]}${local[1]}***${local[local.length - 1]}@${domain}`
}

/** Imprimir código en consola del servidor (fallback sin correo) */
function logCodeToConsole(user: any, code: string) {
    console.log(`\n`)
    console.log(`══════════════════════════════════════════════════════`)
    console.log(`  🔑 CÓDIGO DE RECUPERACIÓN DE CONTRASEÑA`)
    console.log(`──────────────────────────────────────────────────────`)
    console.log(`  Usuario:  ${user.username}`)
    console.log(`  Email:    ${user.email}`)
    console.log(`  Nombre:   ${user.fullName}`)
    console.log(`  Código:   ${code}`)
    console.log(`  Expira:   ${new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString()}`)
    console.log(`══════════════════════════════════════════════════════`)
    console.log(`\n`)
}
