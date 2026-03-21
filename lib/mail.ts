import nodemailer from "nodemailer"

// ─── Configuración del transporter de correo ───────────────────────────
// Usa Gmail con App Password (gratuito, hasta 500 emails/día)
// Para configurar:
// 1. Ve a tu cuenta de Gmail → Seguridad → Verificación en 2 pasos (activar)
// 2. Ve a https://myaccount.google.com/apppasswords
// 3. Crea una contraseña de aplicación para "Correo" / "Otro"
// 4. Copia la contraseña generada (16 caracteres sin espacios)
// 5. Agrégala en .env.local como GMAIL_APP_PASSWORD
// ────────────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
})

// Nombre de la app que aparece en los correos
const APP_NAME = "JHIMS"
const FROM_NAME = `${APP_NAME} - Sistema de Inventarios`

/**
 * Verificar que el servicio de correo está configurado
 */
export function isMailConfigured(): boolean {
    return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}

/**
 * Enviar correo genérico
 */
export async function sendMail({
    to,
    subject,
    html,
}: {
    to: string
    subject: string
    html: string
}) {
    if (!isMailConfigured()) {
        console.warn("⚠️ MAIL: Servicio de correo no configurado. Agrega GMAIL_USER y GMAIL_APP_PASSWORD en .env.local")
        return { success: false, error: "Servicio de correo no configurado" }
    }

    try {
        const info = await transporter.sendMail({
            from: `"${FROM_NAME}" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html,
        })

        console.log(`✅ MAIL: Correo enviado a ${to} — ID: ${info.messageId}`)
        return { success: true, messageId: info.messageId }
    } catch (error: any) {
        console.error(`❌ MAIL: Error al enviar correo a ${to}:`, error.message)
        return { success: false, error: error.message }
    }
}

/**
 * Enviar código de recuperación de contraseña
 */
export async function sendPasswordRecoveryEmail({
    to,
    fullName,
    code,
    expiresInMinutes = 15,
}: {
    to: string
    fullName: string
    code: string
    expiresInMinutes?: number
}) {
    const subject = `🔐 ${APP_NAME} — Código de recuperación de contraseña`

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7; padding:40px 0;">
            <tr>
                <td align="center">
                    <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                        
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding:32px 40px; text-align:center;">
                                <h1 style="color:#ffffff; margin:0; font-size:28px; font-weight:700; letter-spacing:-0.5px;">
                                    🔐 ${APP_NAME}
                                </h1>
                                <p style="color:rgba(255,255,255,0.85); margin:8px 0 0; font-size:14px;">
                                    Sistema de Gestión de Inventarios
                                </p>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:40px;">
                                <p style="color:#374151; font-size:16px; margin:0 0 8px;">
                                    Hola <strong>${fullName}</strong>,
                                </p>
                                <p style="color:#6b7280; font-size:14px; margin:0 0 28px; line-height:1.6;">
                                    Recibimos una solicitud para restablecer la contraseña de tu cuenta.
                                    Usa el siguiente código de verificación:
                                </p>

                                <!-- Código -->
                                <div style="background-color:#f0f4ff; border:2px dashed #2563eb; border-radius:12px; padding:24px; text-align:center; margin:0 0 28px;">
                                    <p style="color:#6b7280; font-size:12px; margin:0 0 8px; text-transform:uppercase; letter-spacing:1px;">
                                        Tu código de verificación
                                    </p>
                                    <p style="color:#2563eb; font-size:36px; font-weight:800; margin:0; letter-spacing:8px; font-family:monospace;">
                                        ${code}
                                    </p>
                                </div>

                                <p style="color:#6b7280; font-size:13px; margin:0 0 8px; line-height:1.5;">
                                    ⏰ Este código expira en <strong>${expiresInMinutes} minutos</strong>.
                                </p>
                                <p style="color:#6b7280; font-size:13px; margin:0 0 0; line-height:1.5;">
                                    Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no será modificada.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color:#f9fafb; padding:24px 40px; border-top:1px solid #e5e7eb;">
                                <p style="color:#9ca3af; font-size:11px; margin:0; text-align:center; line-height:1.5;">
                                    Este es un correo automático de ${APP_NAME}. Por favor no respondas a este mensaje.
                                    <br>
                                    © ${new Date().getFullYear()} ${APP_NAME}. Todos los derechos reservados.
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `

    return await sendMail({ to, subject, html })
}
