import { toast } from 'sonner'

export function useInvoicePrinter() {
    const printInvoice = async (saleId: string) => {
        try {
            toast.loading('Generando factura...')

            const res = await fetch('/api/invoices/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ saleId })
            })

            toast.dismiss()

            if (res.ok) {
                const json = await res.json()
                const url: string = json.url

                // Remove previous iframe if exists
                const existingIframe = document.getElementById('print-iframe')
                if (existingIframe) {
                    document.body.removeChild(existingIframe)
                }

                // Use iframe to load invoice and trigger print dialog
                const iframe = document.createElement('iframe')
                iframe.id = 'print-iframe'
                iframe.style.position = 'fixed'
                iframe.style.left = '-10000px'
                iframe.style.width = '0px'
                iframe.style.height = '0px'
                iframe.style.border = '0'
                iframe.src = url
                document.body.appendChild(iframe)

                const onLoad = () => {
                    try {
                        iframe.contentWindow?.focus()
                        iframe.contentWindow?.print()
                    } catch (e) {
                        console.warn('Print failed, opening in new window', e)
                        window.open(url, '_blank')
                    }
                }

                iframe.addEventListener('load', onLoad)

                toast.success('Factura generada')
            } else {
                toast.error('Error al generar la factura')
            }
        } catch (e) {
            console.error('Error generando factura:', e)
            toast.error('Error al generar la factura')
        }
    }

    return { printInvoice }
}
