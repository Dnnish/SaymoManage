import { useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Document } from "@/hooks/use-documents";

interface ImagePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document;
  downloadUrl?: string;
}

export function ImagePreview({ open, onOpenChange, document: doc, downloadUrl }: ImagePreviewProps) {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const imageUrl = downloadUrl ?? `/api/documents/${doc.id}/download`;

  function handleDownload() {
    window.open(imageUrl, "_blank");
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setIsLoaded(false);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col gap-0 p-0 bg-background">
        <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-sm font-medium truncate max-w-[60%]" title={doc.filename}>
            {doc.filename}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleDownload} aria-label="Descargar">
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto flex items-center justify-center bg-black/90 p-4">
          {!isLoaded && (
            <Skeleton className="h-64 w-64 rounded-md" />
          )}
          <img
            src={imageUrl}
            alt={doc.filename}
            className={`max-h-full max-w-full object-contain rounded-sm transition-opacity ${isLoaded ? "opacity-100" : "opacity-0 absolute"}`}
            onLoad={() => setIsLoaded(true)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
