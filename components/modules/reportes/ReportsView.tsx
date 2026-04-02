"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Calendar, Download, TrendingUp, Package, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const PrintStyles = () => (
    <style dangerouslySetInnerHTML={{ __html: `
        @media print {
            @page {
                margin: 0.5cm;
                size: portrait;
            }
            .print-hidden, [role="tablist"], button, nav, .sonner {
                display: none !important;
            }
            body {
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                font-size: 10pt !important;
            }
            .space-y-6 { margin: 0 !important; gap: 10px !important; }
            
            /* Cuadros de Resumen */
            .grid-cols-1.md\\:grid-cols-3 {
                display: flex !important;
                flex-direction: row !important;
                gap: 5px !important;
                margin-bottom: 10px !important;
            }
            .grid-cols-1.md\\:grid-cols-3 > div {
                flex: 1 !important;
                padding: 5px !important;
                border: 1px solid #eee !important;
            }
            .grid-cols-1.md\\:grid-cols-3 .text-2xl { font-size: 1.25rem !important; }

            /* Ajuste de Secciones */
            section {
                margin-top: 10px !important;
                page-break-inside: avoid;
            }
            .gap-8 { gap: 10px !important; }
            .mb-4 { margin-bottom: 5px !important; }
            .pb-4 { padding-bottom: 5px !important; }
            .mb-6 { margin-bottom: 10px !important; }
            .Card, .card {
                break-inside: avoid !important;
                border: 1px solid #eee !important;
                box-shadow: none !important;
            }
        }
    `}} />
);

// Componentes extraídos para reutilizar en pantalla e impresión
const BalanceCharts = ({ data, formatCurrency, isPrint = false }: any) => {
    const chartContent = (
        <BarChart 
            data={data?.dailySummary || []} 
            width={isPrint ? 750 : undefined} 
            height={isPrint ? 250 : undefined}
            margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
        >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(val) => `$${val / 1000}k`} />
            {!isPrint && <Tooltip formatter={(value: number) => formatCurrency(value)} />}
            <Legend />
            <Bar 
                dataKey="ventas" 
                fill="#10b981" 
                name="Ingresos ($)" 
                radius={[4, 4, 0, 0]} 
                isAnimationActive={false} 
            />
            <Bar 
                dataKey="compras" 
                fill="#ef4444" 
                name="Egresos ($)" 
                radius={[4, 4, 0, 0]} 
                isAnimationActive={false} 
            />
        </BarChart>
    );

    return (
        <div className="w-full">
            <Card className="shadow-sm">
                <CardHeader className={isPrint ? "py-2" : ""}>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-500" />
                        Tendencia de Movimientos
                    </CardTitle>
                </CardHeader>
                <CardContent className={isPrint ? "py-0 pl-2" : "pl-2"}>
                    <div className={isPrint ? "flex justify-center" : "h-[300px]"}>
                        {isPrint ? chartContent : (
                            <ResponsiveContainer width="100%" height="100%">
                                {chartContent}
                            </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const TopProductsList = ({ data }: any) => (
    <Card className="shadow-sm">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-primary" />
                Ranking de Rotación
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data?.topProducts && data.topProducts.length > 0 ? (
                    data.topProducts.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-primary">#{i + 1}</span>
                                <span className="font-medium text-sm">{p.name}</span>
                            </div>
                            <div className="text-right">
                                <span className="font-bold">{p.sold}</span>
                                <span className="text-[10px] text-muted-foreground ml-1 uppercase">Uni</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center py-4 text-muted-foreground">Sin datos.</p>
                )}
            </div>
        </CardContent>
    </Card>
)

export default function ReportsView() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({
        from: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        fetchReports()
    }, [dateRange.from, dateRange.to])

    const fetchReports = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/reportes?from=${dateRange.from}&to=${dateRange.to}`)
            if (res.ok) {
                const json = await res.json()
                setData(json)
            } else {
                toast.error("Error al cargar reportes")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const exportToExcel = () => {
        if (!data || !data.dailySummary) return;

        const totalVentas = data.dailySummary.reduce((acc: number, curr: any) => acc + curr.ventas, 0);
        const totalCompras = data.dailySummary.reduce((acc: number, curr: any) => acc + curr.compras, 0);
        const balance = totalVentas - totalCompras;

        const styles = `
            <style>
                .header-title { font-size: 18pt; font-weight: bold; color: #059669; }
                .subtitle { font-size: 14pt; font-weight: bold; color: #374151; }
                .label { font-weight: bold; background-color: #f3f4f6; }
                .total-ingresos { background-color: #d1fae5; color: #065f46; font-weight: bold; }
                .total-inversion { background-color: #fee2e2; color: #991b1b; font-weight: bold; }
                .total-balance { background-color: #dbeafe; color: #1e40af; font-weight: bold; }
                .table-header { background-color: #1f2937; color: #ffffff; font-weight: bold; }
                .row-even { background-color: #f9fafb; }
                .number { text-align: right; }
                td, th { border: 1px solid #e5e7eb; padding: 5px; }
            </style>
        `;

        const htmlContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8">
                ${styles}
            </head>
            <body>
                <table>
                    <tr><td colspan="5" class="header-title">JHIMS - SISTEMA DE GESTIÓN DE INVENTARIOS</td></tr>
                    <tr><td colspan="5" class="subtitle">REPORTE DE RENDIMIENTO OPERATIVO</td></tr>
                    <tr><td></td></tr>
                    <tr><td colspan="5" class="label">INFORMACIÓN DE LA EMPRESA</td></tr>
                    <tr><td class="label">Empresa:</td><td colspan="4">${data.company?.name || 'N/A'}</td></tr>
                    <tr><td class="label">NIT:</td><td colspan="4">${data.company?.taxId || 'N/A'}</td></tr>
                    <tr><td class="label">Periodo:</td><td colspan="4">${dateRange.from} al ${dateRange.to}</td></tr>
                    <tr><td class="label">Fecha Generación:</td><td colspan="4">${new Date().toLocaleString()}</td></tr>
                    <tr><td></td></tr>
                    <tr><td colspan="5" class="label">RESUMEN FINANCIERO DEL PERIODO</td></tr>
                    <tr><td colspan="2" class="total-ingresos">(+) TOTAL INGRESOS POR VENTAS:</td><td colspan="3" class="total-ingresos number">${Math.round(totalVentas)}</td></tr>
                    <tr><td colspan="2" class="total-inversion">(-) TOTAL INVERSIÓN EN COMPRAS:</td><td colspan="3" class="total-inversion number">${Math.round(totalCompras)}</td></tr>
                    <tr><td colspan="2" class="total-balance">(=) BALANCE OPERATIVO:</td><td colspan="3" class="total-balance number">${Math.round(balance)}</td></tr>
                    <tr><td></td></tr>
                    <tr><td colspan="5" class="label">DESGLOSE DIARIO DETALLADO</td></tr>
                    <tr class="table-header">
                        <th>Fecha</th>
                        <th>Día</th>
                        <th>Ventas ($)</th>
                        <th>Compras ($)</th>
                        <th>Balance ($)</th>
                    </tr>
                    ${data.dailySummary.map((d: any, i: number) => `
                        <tr class="${i % 2 === 0 ? 'row-even' : ''}">
                            <td>${d.fullDate}</td>
                            <td>${d.name.replace(".", "")}</td>
                            <td class="number">${Math.round(d.ventas)}</td>
                            <td class="number">${Math.round(d.compras)}</td>
                            <td class="number">${Math.round(d.ventas - d.compras)}</td>
                        </tr>
                    `).join('')}
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Reporte_JHIMS_${data.company?.name || 'Ventas'}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Excel Profesional generado con éxito");
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Generando análisis...</span>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PrintStyles />
            
            {/* Cabecera solo para Pantalla */}
            <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center print:hidden">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
                    <p className="text-muted-foreground">Análisis de rendimiento y movimientos</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-2 bg-muted/50 p-1 px-3 rounded-lg border">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-sm outline-none cursor-pointer"
                            value={dateRange.from}
                            onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                        />
                        <span className="text-muted-foreground">-</span>
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-sm outline-none cursor-pointer"
                            value={dateRange.to}
                            onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                        />
                    </div>
                    <Button onClick={() => window.print()} variant="outline" className="hidden md:flex">
                        <Download className="mr-2 h-4 w-4" />
                        Imprimir
                    </Button>
                    <Button onClick={() => exportToExcel()} className="bg-emerald-600 hover:bg-emerald-700">
                        <FileText className="mr-2 h-4 w-4" />
                        Exportar Excel
                    </Button>
                </div>
            </div>

            {/* Cabecera Exclusiva para IMPRESIÓN */}
            <div className="hidden print:block border-b-2 border-primary pb-4 mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-primary uppercase">JHIMS - Reporte Gerencial</h1>
                        <p className="text-sm font-bold text-gray-600">EMPRESA: {data?.company?.name || 'N/A'}</p>
                        <p className="text-sm text-gray-500">NIT: {data?.company?.taxId || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold uppercase text-gray-400">Periodo Consultando</p>
                        <p className="text-sm font-medium">{dateRange.from} al {dateRange.to}</p>
                        <p className="text-xs text-gray-400 mt-2">Fecha de emisión: {new Date().toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Tarjetas de Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-emerald-50 border-emerald-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Total Ingresos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-600">
                            {formatCurrency(data?.dailySummary?.reduce((acc: number, curr: any) => acc + curr.ventas, 0) || 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-rose-50 border-rose-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-rose-800 uppercase tracking-wider">Total Inversión</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-rose-600">
                            {formatCurrency(data?.dailySummary?.reduce((acc: number, curr: any) => acc + curr.compras, 0) || 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-blue-800 uppercase tracking-wider">Balance Neto</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-blue-600">
                            {formatCurrency((data?.dailySummary?.reduce((acc: number, curr: any) => acc + curr.ventas, 0) || 0) - (data?.dailySummary?.reduce((acc: number, curr: any) => acc + curr.compras, 0) || 0))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pantalla: Tabs */}
            <Tabs defaultValue="sales" className="space-y-4 print:hidden">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="sales" className="data-[state=active]:bg-white">Balance y Tendencias</TabsTrigger>
                    <TabsTrigger value="products" className="data-[state=active]:bg-white">Ranking de Productos</TabsTrigger>
                </TabsList>
                <TabsContent value="sales">
                    <BalanceCharts data={data} formatCurrency={formatCurrency} />
                </TabsContent>
                <TabsContent value="products">
                    <TopProductsList data={data} />
                </TabsContent>
            </Tabs>

            {/* Impresión: Secciones Secuenciales */}
            <div className="hidden print:flex flex-col gap-8">
                <section>
                    <h2 className="text-xl font-bold mb-4 border-l-4 border-primary pl-2">1. Análisis de Flujo y Categorías</h2>
                    <BalanceCharts data={data} formatCurrency={formatCurrency} isPrint={true} />
                </section>
                <section>
                    <h2 className="text-xl font-bold mb-4 border-l-4 border-primary pl-2">2. Ranking de Productos</h2>
                    <TopProductsList data={data} />
                </section>
                <div className="mt-20 text-center text-[10px] text-gray-400">
                    Este reporte es confidencial y para uso exclusivo de {data?.company?.name}.
                </div>
            </div>
        </div>
    )
}
