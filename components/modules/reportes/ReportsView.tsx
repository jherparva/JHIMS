"use client"

import { useState, useEffect } from "react"
import * as XLSX from 'xlsx'
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

        // --- HOJA 1: RESUMEN EJECUTIVO ---
        const rowsSummary = [
            ["JHIMS - REPORTE GERENCIAL DE RENDIMIENTO"],
            [`EMPRESA: ${data.company?.name || "N/A"}`],
            [`NIT: ${data.company?.taxId || "N/A"}`],
            [`PERIODO: ${dateRange.from} AL ${dateRange.to}`],
            [`FECHA GENERACIÓN: ${new Date().toLocaleString()}`],
            [],
            ["--- RESUMEN FINANCIERO ---"],
            ["CONCEPTO", "VALOR ($)"],
            ["(+) TOTAL INGRESOS (VENTAS)", totalVentas],
            ["(-) TOTAL INVERSIONES (COMPRAS)", totalCompras],
            ["(=) BALANCE OPERATIVO", balance],
            [],
            ["--- RENDIMIENTO POR VENDEDOR ---"],
            ["VENDEDOR", "Nº VENTAS", "TOTAL FACTURADO ($)"]
        ];

        (data.salesByVendor || []).forEach((v: any) => {
            rowsSummary.push([v.name, v.count, v.total]);
        });

        rowsSummary.push([], ["--- TRÁFICO DIARIO ---"], ["FECHA", "DÍA", "INGRESOS ($)", "EGRESOS ($)", "DIFERENCIA ($)"]);

        data.dailySummary.forEach((d: any) => {
            rowsSummary.push([d.fullDate, d.name.replace(".", "").toUpperCase(), d.ventas, d.compras, d.ventas - d.compras]);
        });

        // --- HOJA 2: DETALLE DE VENTAS (MÁXIMO DETALLE) ---
        const rowsSales = [
            ["LISTADO DETALLADO DE VENTAS - JHIMS"],
            ["PERIODO:", `${dateRange.from} AL ${dateRange.to}`],
            [],
            ["TICKET #", "FECHA", "HORA", "VENDEDOR", "CLIENTE", "MÉTODO PAGO", "TOTAL ($)", "RECIBIDO ($)", "SALDO ($)"]
        ];

        (data.rawSales || []).forEach((s: any) => {
            const date = new Date(s.createdAt);
            rowsSales.push([
                s.ticketNumber || s._id.slice(-6).toUpperCase(),
                date.toLocaleDateString(),
                date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                s.seller?.fullName || "N/A",
                s.customer?.name || "CONSUMIDOR FINAL",
                s.paymentMethod === 'cash' ? 'EFECTIVO' : (s.paymentMethod === 'transfer' ? 'TRANSFERENCIA / QR' : 'TARJETA'),
                s.total,
                s.amountPaid || 0,
                (s.total - (s.amountPaid || 0))
            ]);
        });

        // --- HOJA 3: DETALLE DE COMPRAS ---
        const rowsPurchases = [
            ["REGISTRO DE COMPRAS E INGRESOS A INVENTARIO"],
            ["PERIODO:", `${dateRange.from} AL ${dateRange.to}`],
            [],
            ["ID / FACTURA", "FECHA", "PROVEEDOR", "PRODUCTOS", "TOTAL INVERTIDO ($)"]
        ];

        (data.rawPurchases || []).forEach((p: any) => {
            rowsPurchases.push([
                p.invoiceNumber || p._id.slice(-6).toUpperCase(),
                new Date(p.createdAt).toLocaleDateString(),
                p.supplier?.name || "N/A",
                p.items?.length || 0,
                p.total
            ]);
        });

        // 3. Crear Libro y Hojas
        const workbook = XLSX.utils.book_new();
        
        // Crear hojas de cálculo
        const wsSummary = XLSX.utils.aoa_to_sheet(rowsSummary);
        const wsSales = XLSX.utils.aoa_to_sheet(rowsSales);
        const wsPurchases = XLSX.utils.aoa_to_sheet(rowsPurchases);

        // 4. APLICAR FORMATOS Y AUTOMATIZACIONES A TODAS LAS HOJAS
        [wsSummary, wsSales, wsPurchases].forEach(ws => {
            // Aplicar formato de moneda a todas las celdas numéricas
            const ref = ws['!ref'];
            if (ref) {
                const range = XLSX.utils.decode_range(ref);
                for (let R = range.s.r; R <= range.e.r; ++R) {
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const cell = ws[XLSX.utils.encode_cell({ c: C, r: R })];
                        if (cell && typeof cell.v === 'number') {
                            cell.t = 'n';
                            cell.z = '$#,##0';
                        }
                    }
                }
            }
        });

        // Ajustar anchos (Auto-fit)
        wsSummary['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
        wsSales['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        wsPurchases['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 20 }];

        // Filtros (Hoja de ventas empieza tabla en fila 4 [index 3])
        wsSales['!autofilter'] = { ref: `A4:I${rowsSales.length}` };

        // 5. Ensamblar y Descargar
        XLSX.utils.book_append_sheet(workbook, wsSummary, "Resumen General");
        XLSX.utils.book_append_sheet(workbook, wsSales, "Ventas Detalladas");
        XLSX.utils.book_append_sheet(workbook, wsPurchases, "Compras Detalladas");

        const fileName = `JHIMS_REPORT_DETALLADO_${(data.company?.name || "VENTAS").replace(/\s/g, "_")}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        
        toast.success("Excel Multi-Pestaña Generado con éxito");
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
