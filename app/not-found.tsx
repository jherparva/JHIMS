import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MoveLeft, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-card rounded-full p-8 mb-8">
          <HelpCircle className="w-24 h-24 text-primary animate-pulse" />
        </div>
      </div>
      
      <h1 className="text-9xl font-extrabold text-primary mb-4 tracking-tighter drop-shadow-sm">
        404
      </h1>
      
      <h2 className="text-3xl font-bold mb-4 text-foreground">
        ¡Vaya! Algo no salió como esperábamos
      </h2>
      
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        El error que estás viendo (404) indica que el recurso o la página que buscas no está disponible. 
        Esto puede deberse a que el enlace ha cambiado o que la función ha sido desactivada por seguridad.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/inicio-sesion">
          <Button variant="default" size="lg" className="px-8 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
            <MoveLeft className="mr-2 h-4 w-4" />
            Volver al Inicio
          </Button>
        </Link>
        <Link href="/ayuda">
          <Button variant="outline" size="lg" className="px-8">
            Necesito Ayuda
          </Button>
        </Link>
      </div>

      <div className="mt-16 text-sm text-muted-foreground/50">
        &copy; {new Date().getFullYear()} JHIMS Inventory Management System
      </div>
    </div>
  );
}
