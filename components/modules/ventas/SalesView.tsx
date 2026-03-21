"use client"

import { useState, useEffect } from "react"
import Link from 'next/link'
import styles from './sales.module.css'
import { Plus, Search, FileText, Printer, CheckCircle2 } from 'lucide-react'
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/useDebounce"
import { Calendar } from "lucide-react"

interface ISale {
    _id: string
    total: number
    paymentMethod: string
    date: string
    createdAt: string
    items: any[]
}

export default function SalesView() {
    const [sales, setSales] = useState<ISale[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const debouncedSearch = useDebounce(searchTerm, 400)
    const [selectedSale, setSelectedSale] = useState<ISale | null>(null)
    const [isThermalPrint, setIsThermalPrint] = useState(false)
    const [companyInfo, setCompanyInfo] = useState<any>(null)
    
    // Filtros de fecha
    const getLocalDateString = (date: Date = new Date()) => {
        const d = new Date(date)
        const offset = d.getTimezoneOffset()
        const localDate = new Date(d.getTime() - (offset * 60 * 1000))
        return localDate.toISOString().split('T')[0]
    }

    const [dateRange, setDateRange] = useState({
        from: getLocalDateString(new Date(new Date().setDate(new Date().getDate() - 7))),
        to: getLocalDateString()
    })

    useEffect(() => {
        fetchSales()
        fetchCompanyInfo()
    }, [])

    const fetchCompanyInfo = async () => {
        try {
            const res = await fetch('/api/empresa/profile')
            if (res.ok) {
                const data = await res.json()
                setCompanyInfo(data)
            }
        } catch (error) {
            console.error("Error al cargar info de empresa", error)
        }
    }

    const fetchSales = async () => {
        try {
            const response = await fetch('/api/ventas')
            if (response.ok) {
                const data = await response.json()
                setSales(data.sales || [])
            }
        } catch (error) {
            console.error("Error al cargar ventas", error)
        } finally {
            setLoading(false)
        }
    }

    // Calcular estadísticas (Independiente del filtro visual)
    const todayStr = getLocalDateString()
    let salesTodayTotal = 0
    let ordersToday = 0

    // Primero procesamos todas para las estadísticas de "Hoy"
    sales.forEach(sale => {
        const saleDateStr = getLocalDateString(new Date(sale.createdAt || sale.date))
        if (saleDateStr === todayStr) {
            salesTodayTotal += sale.total
            ordersToday++
        }
    })

    const filteredSales = sales.filter((sale) => {
        const saleDateStr = getLocalDateString(new Date(sale.createdAt || sale.date))
        
        // Filtro de rango de fechas
        if (saleDateStr < dateRange.from || saleDateStr > dateRange.to) return false

        // Búsqueda debounced por ID o método
        if (debouncedSearch && 
            !sale._id.toLowerCase().includes(debouncedSearch.toLowerCase()) && 
            !sale.paymentMethod.toLowerCase().includes(debouncedSearch.toLowerCase())) {
            return false
        }
        return true
    })

    const totalPeriod = filteredSales.reduce((acc, curr) => acc + curr.total, 0)
    const countPeriod = filteredSales.length

    const averageToday = ordersToday > 0 ? (salesTodayTotal / ordersToday) : 0

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const translatePaymentMethod = (method: string) => {
        switch (method) {
            case 'cash': return 'Efectivo'
            case 'card': return 'Tarjeta'
            case 'transfer': return 'Transferencia'
            default: return method
        }
    }

    const handlePrint = (thermal: boolean) => {
        setIsThermalPrint(thermal);
        setTimeout(() => {
            window.print();
        }, 100);
    }

    return (
        <div className={styles.container}>
            {/* Estilos específicos para impresión */}
            <style jsx global>{`
                @media print {
                    @page {
                        margin: ${isThermalPrint ? '0' : '0.5cm'};
                        size: ${isThermalPrint ? '80mm auto' : 'auto'};
                    }
                    body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    /* Ocultar el contenido principal del sitio al imprimir */
                    header, footer, nav, aside, .print\\:hidden,
                    main > div:not([data-radix-portal]),
                    .${styles.container} > div:not([data-radix-portal]),
                    div#root > *:not([data-radix-portal]) {
                        display: none !important;
                    }

                    /* Asegurar que el portal del modal sea visible */
                    [data-radix-portal] {
                        display: block !important;
                        position: static !important;
                    }

                    /* Estilo base del modal/ticket impreso */
                    [role="dialog"] {
                        display: flex !important;
                        flex-direction: column !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: ${isThermalPrint ? '80mm' : '100%'} !important;
                        max-width: ${isThermalPrint ? '80mm' : '100%'} !important;
                        min-height: ${isThermalPrint ? 'auto' : '26cm'} !important;
                        margin: 0 !important;
                        padding: ${isThermalPrint ? '10px 5px 0 5px' : '1.5cm'} !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        transform: none !important;
                        visibility: visible !important;
                        overflow: visible !important;
                    }

                    ${isThermalPrint ? `
                        /* Optimizaciones exclusivas para MiniPrinter térmica */
                        * {
                            font-family: 'Courier New', Courier, monospace !important;
                            color: black !important;
                        }
                        
                        /* Simplificar la tabla */
                        table {
                            font-size: 10px !important;
                            line-height: 1.2 !important;
                            border-collapse: collapse !important;
                        }

                        th, td {
                            padding: 2px 0 !important;
                        }

                        /* Remover estilos visuales innecesarios en térmico */
                        .lucide, .bg-gray-50, .shadow-sm, .rounded-xl, .bg-primary\\/5 {
                            background: transparent !important;
                            border: none !important;
                            box-shadow: none !important;
                        }

                        h2, .text-4xl { font-size: 14px !important; text-align: center !important; }
                        .text-sm { font-size: 10px !important; }
                        .text-2xl { font-size: 14px !important; text-align: right !important; font-weight: bold !important; }

                        /* Ajustar el footer térmico */
                        .print-footer-final {
                            margin-top: 15px !important;
                            padding-top: 5px !important;
                            border-top: 1px dashed black !important;
                            margin-bottom: 25px !important;
                        }
                    ` : ''}

                    /* Contenedor de contenido para empujar el footer */
                    .print-content-wrapper {
                        flex: 1 !important;
                        display: block !important;
                    }

                    /* Pie de página al final absoluto */
                    .print-footer-final {
                        display: block !important;
                        margin-top: auto !important;
                        padding-top: ${isThermalPrint ? '15px' : '1.5cm'} !important;
                        text-align: center !important;
                        border-top: 1px dashed #eee !important;
                        break-inside: avoid !important;
                    }

                    /* Quitar el fondo oscuro (overlay) del modal */
                    [data-state="open"] > [class*="overlay"] {
                        display: none !important;
                    }

                    /* Limpieza de elementos UI */
                    button[aria-label="Close"], .lucide, button:not(.print-visible) {
                        display: none !important;
                    }

                    /* Forzar color negro */
                    * {
                        color: black !important;
                        border-color: #ddd !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                }
            `}</style>
            <div className={`${styles.header} print:hidden`}>
                <h1 className={styles.title}>Gestión de Ventas</h1>
                <Link href="/punto-de-venta" className="bg-primary text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors">
                    <Plus size={20} />
                    Nueva Venta
                </Link>
            </div>

            <div className={`${styles.grid} print:hidden`}>
                <div className="bg-white p-6 rounded-lg shadow border">
                    <h3 className="font-semibold text-gray-500 text-sm uppercase tracking-wider mb-2">Ventas Hoy</h3>
                    <p className="text-3xl font-bold text-gray-800">{formatCurrency(salesTodayTotal)}</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border">
                    <h3 className="font-semibold text-gray-500 text-sm uppercase tracking-wider mb-2">Pedidos Hoy</h3>
                    <p className="text-3xl font-bold text-blue-600">{ordersToday}</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border">
                    <h3 className="font-semibold text-gray-500 text-sm uppercase tracking-wider mb-2">Promedio Hoy</h3>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(averageToday)}</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow border mt-8 print:hidden">
                <div className="p-4 border-b flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <h2 className="font-bold text-lg text-gray-800">Historial de Ventas</h2>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="font-bold text-emerald-600">{countPeriod}</span> ventas encontradas • Total: <span className="font-bold text-gray-800">{formatCurrency(totalPeriod)}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex items-center gap-2 bg-muted/50 p-1 px-3 rounded-lg border">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <input 
                                type="date" 
                                className="bg-transparent border-none text-xs outline-none cursor-pointer"
                                value={dateRange.from}
                                onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                            />
                            <span className="text-muted-foreground">-</span>
                            <input 
                                type="date" 
                                className="bg-transparent border-none text-xs outline-none cursor-pointer"
                                value={dateRange.to}
                                onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                            />
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar ID o método..."
                                className="pl-9 pr-4 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/50 w-48"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b text-sm text-gray-500 uppercase tracking-wider">
                                <th className="p-4 font-medium">ID Venta</th>
                                <th className="p-4 font-medium">Fecha</th>
                                <th className="p-4 font-medium">Método Pago</th>
                                <th className="p-4 font-medium">Artículos</th>
                                <th className="p-4 font-medium">Total</th>
                                <th className="p-4 font-medium text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        Cargando historial de ventas...
                                    </td>
                                </tr>
                            ) : filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        No se encontraron ventas registradas
                                    </td>
                                </tr>
                            ) : (
                                filteredSales.map((sale) => (
                                    <tr key={sale._id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-mono text-sm text-gray-600">
                                            #{sale._id.slice(-6).toUpperCase()}
                                        </td>
                                        <td className="p-4 text-sm text-gray-700">
                                            {formatDate(sale.createdAt || sale.date)}
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {translatePaymentMethod(sale.paymentMethod)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-700">
                                            {sale.items?.length || 0} items
                                        </td>
                                        <td className="p-4 font-semibold text-gray-900">
                                            {formatCurrency(sale.total)}
                                        </td>
                                        <td className="p-4 flex justify-center">
                                            <button 
                                                onClick={() => setSelectedSale(sale)}
                                                className="text-gray-400 hover:text-primary transition-colors p-1" 
                                                title="Ver Detalles"
                                            >
                                                <FileText size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalles de Venta */}
            <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
                <DialogContent className="max-w-2xl bg-white print:max-w-none print:w-full print:border-0 print:shadow-none print:p-0 print:m-0 print:static print:transform-none !print:bg-white">
                    <DialogHeader className="print:block print:mb-6">
                                <DialogTitle className="flex justify-between items-start gap-4 border-b pb-6 print:border-b-2 print:border-black">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <div className="print:hidden flex items-center gap-2 text-emerald-600 font-bold">
                                                <CheckCircle2 className="h-5 w-5" /> ¡Venta Exitosa!
                                            </div>
                                            <span className="print:hidden text-black font-bold hidden [:not(.text-emerald-600)>&]:inline">Detalle de Venta #{selectedSale?._id.slice(-6).toUpperCase()}</span>
                                            <span className="hidden print:block text-4xl font-black uppercase text-black tracking-tighter">{companyInfo?.name || 'LA TIENDA DE LUCHO'}</span>
                                        </div>
                                        <span className="hidden print:block text-sm font-bold text-gray-700">NIT: {companyInfo?.taxId || 'N/A'}</span>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <span className="hidden print:block text-xs font-bold italic text-black mb-1">FACTURA ORIGINAL</span>
                                        <span className="hidden print:block text-sm text-black font-mono font-bold">ID VENTA: #{selectedSale?._id.toUpperCase()}</span>
                                    </div>
                                </DialogTitle>
                    </DialogHeader>

                    {selectedSale && (
                        <div className="py-4 print-content-wrapper flex flex-col h-full">
                            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                                <div className="bg-gray-50 p-3 rounded-lg border">
                                    <p className="text-gray-500 font-bold uppercase text-[10px] mb-1">Información General</p>
                                    <div className="space-y-1">
                                        <p><strong>Fecha:</strong> {formatDate(selectedSale.createdAt || selectedSale.date)}</p>
                                        <p><strong>Método:</strong> {translatePaymentMethod(selectedSale.paymentMethod)}</p>
                                    </div>
                                </div>
                                <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 text-right">
                                    <p className="text-primary font-bold uppercase text-[10px] mb-1">Total Venta</p>
                                    <p className="text-2xl font-black text-primary">{formatCurrency(selectedSale.total)}</p>
                                </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="p-3 text-left font-bold">Producto</th>
                                            <th className="p-3 text-center font-bold">Cant.</th>
                                            <th className="p-3 text-right font-bold">Precio</th>
                                            <th className="p-3 text-right font-bold">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedSale.items?.map((item: any, idx: number) => (
                                            <tr key={idx} className="border-b last:border-0 hover:bg-gray-50/50">
                                                <td className="p-3">
                                                    <p className="font-bold text-gray-800">{item.product?.name || 'Producto eliminado'}</p>
                                                    <p className="text-[10px] text-gray-500 font-mono">{item.product?.sku}</p>
                                                </td>
                                                <td className="p-3 text-center font-medium">{item.quantity}</td>
                                                <td className="p-3 text-right text-gray-600">{formatCurrency(item.price)}</td>
                                                <td className="p-3 text-right font-bold text-gray-900">{formatCurrency(item.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-8 flex flex-col sm:flex-row gap-3 print:hidden">
                                <Button 
                                    variant="outline" 
                                    className="flex-1 h-12 rounded-xl font-bold gap-2 border-gray-300"
                                    onClick={() => setSelectedSale(null)}
                                >
                                    Cerrar
                                </Button>
                                <Button 
                                    type="button"
                                    className="flex-1 h-12 rounded-xl font-bold bg-gray-800 text-white hover:bg-gray-700 shadow-lg gap-2"
                                    onClick={() => handlePrint(true)}
                                >
                                    <Printer className="h-5 w-5" />
                                    MiniPrinter (80mm)
                                </Button>
                                <Button 
                                    type="button"
                                    className="flex-1 h-12 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 shadow-lg gap-2"
                                    onClick={() => handlePrint(false)}
                                >
                                    <FileText className="h-5 w-5" />
                                    Factura (A4)
                                </Button>
                            </div>

                            {/* Footer para Impresión - SOLO APARECE AL FINAL DE TODAS LAS HOJAS */}
                            <div className="hidden print:block print-footer-final text-center">
                                <p className="text-sm font-black text-gray-800 mb-1">JHIMS INVENTORY</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Sistema de Gestión y Control de Inventarios</p>
                                <p className="text-[8px] mt-2 text-gray-400">Generado el {new Date().toLocaleString()}</p>
                                {/* Detalle decorativo al final */}
                                <div className="hidden print:flex justify-center mt-6">
                                    <div className="h-1.5 w-24 bg-gray-200 rounded-full" />
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
