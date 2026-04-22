import { useState } from "react";
import { FileText, Image, File, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteDocument } from "@/hooks/use-documents";
import { PdfViewer } from "@/components/documents/pdf-viewer";
import { ImagePreview } from "@/components/documents/image-preview";
import type { Document } from "@/hooks/use-documents";

interface DocumentCardProps {
  document: Document;
  canDelete: (doc: Document) => boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "hace un momento";
  if (diffMinutes < 60) return `hace ${diffMinutes} minuto${diffMinutes !== 1 ? "s" : ""}`;
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours !== 1 ? "s" : ""}`;
  if (diffDays < 30) return `hace ${diffDays} día${diffDays !== 1 ? "s" : ""}`;

  return date.toLocaleDateString("es-ES");
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf") {
    return <FileText className="h-5 w-5 shrink-0 text-red-500" />;
  }
  if (mimeType.startsWith("image/")) {
    return <Image className="h-5 w-5 shrink-0 text-blue-500" />;
  }
  return <File className="h-5 w-5 shrink-0 text-muted-foreground" />;
}

type PreviewType = "pdf" | "image" | null;

function resolvePreviewType(mimeType: string): PreviewType {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  return null;
}

export function DocumentCard({ document: doc, canDelete, selected, onToggleSelect }: DocumentCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const deleteDocument = useDeleteDocument();

  const previewType = resolvePreviewType(doc.mimeType);

  function handleCardClick() {
    if (previewType !== null) {
      setPreviewOpen(true);
    } else {
      window.open(`/api/documents/${doc.id}/download`, "_blank");
    }
  }

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    window.open(`/api/documents/${doc.id}/download`, "_blank");
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setShowDeleteDialog(true);
  }

  function handleDeleteConfirm() {
    deleteDocument.mutate(
      { id: doc.id, actuacionId: doc.actuacionId, folder: doc.folder },
      {
        onSuccess: () => {
          toast.success("Documento eliminado correctamente");
          setShowDeleteDialog(false);
        },
        onError: () => {
          toast.error("Error al eliminar el documento");
        },
      },
    );
  }

  return (
    <>
      <div
        className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/30"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        aria-label={`Previsualizar ${doc.filename}`}
      >
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(doc.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 shrink-0 rounded border-gray-300 dark:border-gray-600"
            aria-label={`Seleccionar ${doc.filename}`}
          />
        )}
        {doc.mimeType.startsWith("image/") ? (
          <img
            src={`/api/documents/${doc.id}/download`}
            alt={doc.filename}
            className="h-10 w-10 shrink-0 rounded object-cover bg-muted"
            loading="lazy"
          />
        ) : (
          <FileIcon mimeType={doc.mimeType} />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={doc.filename}>
            {doc.filename}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(doc.size)} &middot; Subido por {doc.uploadedByName} &middot;{" "}
            {formatRelativeDate(doc.uploadedAt)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            aria-label={`Descargar ${doc.filename}`}
          >
            <Download className="h-4 w-4" />
          </Button>

          {canDelete(doc) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              aria-label={`Eliminar ${doc.filename}`}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {previewType === "pdf" && (
        <PdfViewer open={previewOpen} onOpenChange={setPreviewOpen} document={doc} />
      )}

      {previewType === "image" && (
        <ImagePreview open={previewOpen} onOpenChange={setPreviewOpen} document={doc} />
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar documento</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar <strong>{doc.filename}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteDocument.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteDocument.isPending}
            >
              {deleteDocument.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
