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
    description: "JHIMS Inventory Management System",
    manifest: "/manifest.json",
    icons: {
        icon: [
            { url: '/icon1.png', sizes: '32x32' },
            { url: '/icon1.png', sizes: '192x192' },
        ],
        shortcut: '/icon1.png',
        apple: '/icon1.png',
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
                    <Toaster position="top-center" richColors />
                    
                    {/* Registro de Service Worker para Modo Offline y App en PC */}
                    <script dangerouslySetInnerHTML={{
                        __html: `
                        // Capturar el prompt de instalación de forma global e inmediata
                        window.addEventListener('beforeinstallprompt', (e) => {
                            e.preventDefault();
                            window.deferredPrompt = e;
                            console.log('Capture installer event');
                            // Disparar un evento personalizado para que React se entere
                            window.dispatchEvent(new CustomEvent('pwa-installable'));
                        });

                        if ('serviceWorker' in navigator) {
                            window.addEventListener('load', function() {
                                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                                    console.log('SW registrado con éxito:', registration.scope);
                                }, function(err) {
                                    console.log('Fallo registro SW:', err);
                                });
                            });
                        }
                        `
                    }} />
                </ThemeProvider>
            </body>
        </html>
    );
}
