import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="h-10 w-10 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <p className="text-7xl font-bold tracking-tight">404</p>
        <h1 className="text-2xl font-semibold">Página no encontrada</h1>
        <p className="text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
      </div>

      <Button asChild>
        <Link to="/actuaciones">Volver al inicio</Link>
      </Button>
    </div>
  );
}
