// =============================================================================
// LAYOUT PRINCIPAL - JHIMS Inventory
// =============================================================================
// Layout raíz con tema, metadatos y notificaciones globales
// =============================================================================
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Fuente tipográfica para la aplicación
const inter = Inter({ subsets: ["latin"] });

// =============================================================================
// METADATOS
// =============================================================================
export const metadata: Metadata = {
    title: "JHIMS Inventory",
    description: "Sistema de Gestión de Inventario",
    icons: {
        icon: '/icon1.png',        // Icono pestaña navegador
        shortcut: '/icon1.png',    // Icono acceso directo
        apple: '/icon1.png',       // Icono dispositivos Apple
    }
};

// =============================================================================
// COMPONENTES
// =============================================================================
import { ThemeProvider } from "@/components/theme-provider";  // Tema claro/oscuro
import { Toaster } from "sonner";                              // Notificaciones

// =============================================================================
// LAYOUT RAÍZ
// =============================================================================
// Props: children - Contenido de las páginas
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body className={inter.className}>
                {/* 
                  ThemeProvider: Gestiona tema claro/oscuro
                  - defaultTheme="light": Tema por defecto
                  - enableSystem=false: No detecta tema del sistema
                */}
                <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    enableSystem={false}
                    disableTransitionOnChange
                >
                    {/* children: Contenido dinámico de cada página */}
                    {children}
                    
                    {/* 
                      Toaster: Sistema de notificaciones emergentes
                      - position="top-center": Notificaciones arriba centro
                      - richColors: Colores vibrantes
                    */}
                    <Toaster position="top-center" richColors />
                </ThemeProvider>
            </body>
        </html>
    );
}
