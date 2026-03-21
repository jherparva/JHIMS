"use client"

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function RedirectContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const role = searchParams.get('role')
        const targetUrl = searchParams.get('url') || '/dashboard'

        if (!role) {
            // Si no hay rol, redirigir a login principal
            window.location.href = '/inicio-sesion'
            return
        }

        // Determinar subdominio según el rol
        const isDev = process.env.NODE_ENV !== 'production'
        let baseUrl = ''

        if (role === 'superadmin') {
            baseUrl = isDev ? 'http://admin.localhost:3000' : 'https://admin.jhims.com'
        } else {
            baseUrl = isDev ? 'http://app.localhost:3000' : 'https://app.jhims.com'
        }

        // Redirigir al subdominio correcto con la URL original
        window.location.href = `${baseUrl}${targetUrl}`
    }, [searchParams, router])

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white text-lg">Redirigiendo al portal correcto...</p>
            </div>
        </div>
    )
}

export default function RedirectPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div></div>}>
            <RedirectContent />
        </Suspense>
    )
}
