import { useRef, useState } from "react";
import { Upload, Image, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { usePets, useUploadPet, useDeletePet } from "@/hooks/use-pets";
import type { Pet } from "@/hooks/use-pets";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ImagePreview } from "@/components/documents/image-preview";

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

function PetUploadZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploadPet = useUploadPet();

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }

    uploadPet.mutate(file, {
      onSuccess: () => {
        toast.success("PET subido correctamente (convertido a JPG)");
      },
      onError: () => {
        toast.error("Error al subir el PET");
      },
    });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleClick() {
    inputRef.current?.click();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <div className="mb-6">
      <div
        role="button"
        tabIndex={0}
        aria-label="Zona de carga de PETs"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
        } ${uploadPet.isPending ? "pointer-events-none opacity-60" : ""}`}
      >
        {uploadPet.isPending ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Subiendo imagen...</p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Haz clic o arrastra una imagen aquí
            </p>
            <p className="text-xs text-muted-foreground">
              Imágenes (se convertirán a JPG automáticamente)
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleInputChange}
        aria-hidden="true"
      />
    </div>
  );
}

interface PetCardProps {
  pet: Pet;
  canDelete: boolean;
}

function PetCard({ pet, canDelete }: PetCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const deletePet = useDeletePet();

  function handleCardClick() {
    setPreviewOpen(true);
  }

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    window.open(`/api/pets/${pet.id}/download`, "_blank");
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setShowDeleteDialog(true);
  }

  function handleDeleteConfirm() {
    deletePet.mutate(pet.id, {
      onSuccess: () => {
        toast.success("PET eliminado correctamente");
        setShowDeleteDialog(false);
      },
      onError: () => {
        toast.error("Error al eliminar el PET");
      },
    });
  }

  // Adapt pet to Document shape for ImagePreview
  const documentLike = {
    id: pet.id,
    actuacionId: "",
    folder: "",
    filename: pet.filename,
    storageKey: pet.storageKey,
    mimeType: pet.mimeType,
    size: pet.size,
    uploadedById: pet.uploadedById,
    uploadedByName: pet.uploadedByName,
    uploadedAt: pet.uploadedAt,
  };

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
        aria-label={`Previsualizar ${pet.filename}`}
      >
        <Image className="h-5 w-5 shrink-0 text-blue-500" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={pet.filename}>
            {pet.filename}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(pet.size)} &middot; Subido por {pet.uploadedByName} &middot;{" "}
            {formatRelativeDate(pet.uploadedAt)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            aria-label={`Descargar ${pet.filename}`}
          >
            <Download className="h-4 w-4" />
          </Button>

          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              aria-label={`Eliminar ${pet.filename}`}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ImagePreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={documentLike}
        downloadUrl={`/api/pets/${pet.id}/download`}
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar PET</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar <strong>{pet.filename}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deletePet.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletePet.isPending}
            >
              {deletePet.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PetsPage() {
  const { user } = useAuth();
  const { data: pets, isLoading } = usePets();

  const canDelete = user?.role === "superadmin" || user?.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PETs</h1>
        <p className="text-sm text-muted-foreground">
          Colección global de imágenes PET. Las imágenes se convierten automáticamente a JPG.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subir imagen</CardTitle>
        </CardHeader>
        <CardContent>
          <PetUploadZone />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Imágenes ({pets?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !pets || pets.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No hay imágenes PET
            </div>
          ) : (
            <div className="space-y-2">
              {pets.map((pet) => (
                <PetCard key={pet.id} pet={pet} canDelete={canDelete} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
