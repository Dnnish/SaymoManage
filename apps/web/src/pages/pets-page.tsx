import { useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Upload,
  Image,
  Download,
  Trash2,
  FolderOpen,
  FolderPlus,
  ArrowLeft,
  Pencil,
  Check,
  X,
  LayoutList,
  LayoutGrid,
  Clock,
  GripVertical,
  CheckCircle,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { usePets, useUploadPet, useDeletePet, useTogglePetColiseo, useBulkDownloadPets, useBulkDeletePets, useReorderPets } from "@/hooks/use-pets";
import type { Pet } from "@/hooks/use-pets";
import {
  usePetFolders,
  useCreatePetFolder,
  useDeletePetFolder,
  useRenamePetFolder,
  useTogglePetFolderColiseo,
} from "@/hooks/use-pet-folders";
import type { PetFolder } from "@/hooks/use-pet-folders";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ImagePreview } from "@/components/documents/image-preview";

// ─── Utilities ──────────────────────────────────────────────────────────────

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
  if (diffMinutes < 60)
    return `hace ${diffMinutes} minuto${diffMinutes !== 1 ? "s" : ""}`;
  if (diffHours < 24)
    return `hace ${diffHours} hora${diffHours !== 1 ? "s" : ""}`;
  if (diffDays < 30)
    return `hace ${diffDays} día${diffDays !== 1 ? "s" : ""}`;

  return date.toLocaleDateString("es-ES");
}

function isOlderThanOneMonth(dateStr: string): boolean {
  const date = new Date(dateStr);
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return date < oneMonthAgo;
}

// ─── Coliseo Indicator ───────────────────────────────────────────────────────

interface ColiseoIndicatorProps {
  status: boolean;
  canToggle: boolean;
  onToggle: () => void;
  isPending?: boolean;
}

function ColiseoIndicator({
  status,
  canToggle,
  onToggle,
  isPending,
}: ColiseoIndicatorProps) {
  const colorClass = status ? "bg-green-500" : "bg-red-500";
  const title = status ? "Subido a Coliseo" : "Pendiente en Coliseo";

  if (canToggle) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        disabled={isPending}
        title={title}
        aria-label={title}
        className={`h-3 w-3 shrink-0 rounded-full transition-opacity ${colorClass} ${isPending ? "opacity-50" : "hover:opacity-80"}`}
      />
    );
  }

  return (
    <span
      title={title}
      aria-label={title}
      className={`h-3 w-3 shrink-0 rounded-full ${colorClass}`}
    />
  );
}

// ─── Upload Zone ─────────────────────────────────────────────────────────────

interface PetUploadZoneProps {
  folderId: string;
}

function PetUploadZone({ folderId }: PetUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploadPet = useUploadPet();

  function handleFiles(files: FileList | File[]) {
    const valid: File[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`Solo se permiten imágenes: ${file.name}`);
      } else {
        valid.push(file);
      }
    }

    for (const file of valid) {
      uploadPet.mutate(
        { file, folderId },
        {
          onSuccess: () => {
            toast.success(`${file.name} subido (convertido a JPG)`);
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : `Error al subir ${file.name}`);
          },
        },
      );
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) handleFiles(files);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
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
              Haz clic o arrastra imágenes aquí
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
        multiple
        onChange={handleInputChange}
        aria-hidden="true"
      />
    </div>
  );
}

// ─── Pet Row ─────────────────────────────────────────────────────────────────

interface PetRowProps {
  pet: Pet;
  canDelete: boolean;
  canToggleColiseo: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function PetRow({ pet, canDelete, canToggleColiseo, selected, onToggleSelect }: PetRowProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const deletePet = useDeletePet();
  const toggleColiseo = useTogglePetColiseo();

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

  function handleColiseoToggle() {
    toggleColiseo.mutate(
      { id: pet.id, status: !pet.coliseoStatus },
      {
        onSuccess: () => {
          toast.success(
            pet.coliseoStatus
              ? "Marcado como pendiente en Coliseo"
              : "Marcado como subido a Coliseo",
          );
        },
        onError: () => {
          toast.error("Error al actualizar estado Coliseo");
        },
      },
    );
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
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(pet.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 shrink-0 rounded border-gray-300 dark:border-gray-600"
            aria-label={`Seleccionar ${pet.filename}`}
          />
        )}
        <ColiseoIndicator
          status={pet.coliseoStatus}
          canToggle={canToggleColiseo}
          onToggle={handleColiseoToggle}
          isPending={toggleColiseo.isPending}
        />

        <img
          src={`/api/pets/${pet.id}/download`}
          alt={pet.filename}
          className="h-10 w-10 shrink-0 rounded object-cover bg-muted"
          loading="lazy"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={pet.filename}>
            {pet.filename}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(pet.size)} &middot; Subido por {pet.uploadedByName}{" "}
            &middot; {formatRelativeDate(pet.uploadedAt)}
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
              ¿Estás seguro de que deseas eliminar{" "}
              <strong>{pet.filename}</strong>? Esta acción no se puede deshacer.
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

function SortablePetItem({ pet, canDelete, canToggleColiseo, selected, onToggleSelect }: PetRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pet.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      <button
        className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <PetRow
          pet={pet}
          canDelete={canDelete}
          canToggleColiseo={canToggleColiseo}
          selected={selected}
          onToggleSelect={onToggleSelect}
        />
      </div>
    </div>
  );
}

// ─── Folder Detail View ─────────���───────────────────────────────────────��────

interface FolderDetailProps {
  folder: PetFolder;
  onBack: () => void;
  canDelete: boolean;
  canToggleColiseo: boolean;
}

function FolderDetail({
  folder,
  onBack,
  canDelete,
  canToggleColiseo,
}: FolderDetailProps) {
  const { data: pets, isLoading } = usePets(folder.id);
  const toggleFolderColiseo = useTogglePetFolderColiseo();
  const renameFolder = useRenamePetFolder();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const bulkDownload = useBulkDownloadPets();
  const bulkDelete = useBulkDeletePets();
  const reorderPets = useReorderPets();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !pets) return;

    const oldIndex = pets.findIndex((p) => p.id === active.id);
    const newIndex = pets.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(pets, oldIndex, newIndex);
    const items = reordered.map((p, i) => ({ id: p.id, sortOrder: i }));
    reorderPets.mutate({ items, folderId: folder.id });
  }

  function handleToggleSelect(petId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(petId)) next.delete(petId);
      else next.add(petId);
      return next;
    });
  }

  function handleBulkDownload() {
    bulkDownload.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        toast.success("Descarga iniciada");
        setSelectedIds(new Set());
      },
      onError: () => toast.error("Error al descargar"),
    });
  }

  function handleBulkDelete() {
    bulkDelete.mutate(
      { ids: Array.from(selectedIds), folderId: folder.id },
      {
        onSuccess: (data) => {
          toast.success(`${data.deleted} PET(s) eliminado(s)`);
          setSelectedIds(new Set());
        },
        onError: () => toast.error("Error al eliminar"),
      },
    );
  }

  function handleRenameSubmit() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === folder.name) {
      setIsEditingName(false);
      setEditName(folder.name);
      return;
    }
    renameFolder.mutate(
      { folderId: folder.id, name: trimmed },
      {
        onSuccess: () => {
          toast.success("Carpeta renombrada");
          setIsEditingName(false);
        },
        onError: () => {
          toast.error("Error al renombrar");
          setEditName(folder.name);
          setIsEditingName(false);
        },
      },
    );
  }

  function handleFolderColiseoToggle() {
    toggleFolderColiseo.mutate(
      { folderId: folder.id, status: !folder.coliseoStatus },
      {
        onSuccess: () => {
          toast.success(
            folder.coliseoStatus
              ? "Carpeta marcada como pendiente en Coliseo"
              : "Carpeta marcada como subida a Coliseo",
          );
        },
        onError: () => {
          toast.error("Error al actualizar estado Coliseo");
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Carpetas
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit();
                    if (e.key === "Escape") {
                      setIsEditingName(false);
                      setEditName(folder.name);
                    }
                  }}
                  className="h-9 text-lg font-bold"
                  maxLength={50}
                  autoFocus
                  disabled={renameFolder.isPending}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRenameSubmit}
                  disabled={renameFolder.isPending}
                  aria-label="Confirmar"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingName(false);
                    setEditName(folder.name);
                  }}
                  disabled={renameFolder.isPending}
                  aria-label="Cancelar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{folder.name}</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditName(folder.name);
                    setIsEditingName(true);
                  }}
                  aria-label="Renombrar carpeta"
                  className="h-7 w-7 p-0"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open(`/api/pet-folders/${folder.id}/download`, "_blank")}
            disabled={!pets || pets.length === 0}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Descargar ZIP</span>
            <span className="sm:hidden">ZIP</span>
          </Button>
          {canToggleColiseo && (
            <Button
              variant={folder.coliseoStatus ? "default" : "outline"}
              size="sm"
              onClick={handleFolderColiseoToggle}
              disabled={toggleFolderColiseo.isPending}
              className={
                folder.coliseoStatus
                  ? "bg-green-600 hover:bg-green-700"
                  : "border-red-400 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-950"
              }
            >
              {folder.coliseoStatus ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              {folder.coliseoStatus ? "Subido a Coliseo" : "Pendiente"}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subir imagen</CardTitle>
        </CardHeader>
        <CardContent>
          <PetUploadZone folderId={folder.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Imágenes ({pets?.length ?? 0})
          </CardTitle>
          <div className="flex items-center rounded-md border p-0.5">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("list")}
              aria-label="Vista de lista"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("grid")}
              aria-label="Vista de cuadrícula"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.size > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 p-3">
              <span className="text-sm font-medium">
                {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleBulkDownload}
                disabled={bulkDownload.isPending}
              >
                <Download className="h-3.5 w-3.5" />
                {bulkDownload.isPending ? "Descargando..." : "Descargar"}
              </Button>
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1"
                  onClick={handleBulkDelete}
                  disabled={bulkDelete.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {bulkDelete.isPending ? "Eliminando..." : "Eliminar"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Cancelar
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !pets || pets.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No hay imágenes en esta carpeta
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {pets.map((pet) => (
                <div
                  key={pet.id}
                  className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-muted"
                  onClick={() => window.open(`/api/pets/${pet.id}/download`, "_blank")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      window.open(`/api/pets/${pet.id}/download`, "_blank");
                    }
                  }}
                >
                  <img
                    src={`/api/pets/${pet.id}/download`}
                    alt={pet.filename}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                    <p className="truncate text-xs font-medium text-white">{pet.filename}</p>
                  </div>
                  <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                    <ColiseoIndicator
                      status={pet.coliseoStatus}
                      canToggle={canToggleColiseo}
                      onToggle={() => {}}
                      isPending={false}
                    />
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(pet.id)}
                    onChange={(e) => { e.stopPropagation(); handleToggleSelect(pet.id); }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-2 top-2 h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                    aria-label={`Seleccionar ${pet.filename}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={pets.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {pets.map((pet) => (
                    <SortablePetItem
                      key={pet.id}
                      pet={pet}
                      canDelete={canDelete}
                      canToggleColiseo={canToggleColiseo}
                      selected={selectedIds.has(pet.id)}
                      onToggleSelect={handleToggleSelect}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Folder Card ─────────────────────────────────────────────────────────────

interface FolderCardProps {
  folder: PetFolder;
  canDelete: boolean;
  canToggleColiseo: boolean;
  onOpen: (folder: PetFolder) => void;
}

function FolderCard({
  folder,
  canDelete,
  canToggleColiseo,
  onOpen,
}: FolderCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const deleteFolder = useDeletePetFolder();
  const renameFolder = useRenamePetFolder();
  const toggleFolderColiseo = useTogglePetFolderColiseo();

  function handleDeleteConfirm() {
    deleteFolder.mutate(folder.id, {
      onSuccess: () => {
        toast.success("Carpeta eliminada correctamente");
        setShowDeleteDialog(false);
      },
      onError: () => {
        toast.error("Error al eliminar la carpeta");
      },
    });
  }

  function handleColiseoToggle() {
    toggleFolderColiseo.mutate(
      { folderId: folder.id, status: !folder.coliseoStatus },
      {
        onSuccess: () => {
          toast.success(
            folder.coliseoStatus
              ? "Carpeta marcada como pendiente en Coliseo"
              : "Carpeta marcada como subida a Coliseo",
          );
        },
        onError: () => {
          toast.error("Error al actualizar estado Coliseo");
        },
      },
    );
  }

  function handleRenameSubmit() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === folder.name) {
      setIsEditing(false);
      setEditName(folder.name);
      return;
    }
    renameFolder.mutate(
      { folderId: folder.id, name: trimmed },
      {
        onSuccess: () => {
          toast.success("Carpeta renombrada");
          setIsEditing(false);
        },
        onError: () => {
          toast.error("Error al renombrar la carpeta");
          setEditName(folder.name);
          setIsEditing(false);
        },
      },
    );
  }

  return (
    <>
      <div
        className="flex cursor-pointer items-center gap-3 rounded-md border p-4 transition-colors hover:bg-muted/30"
        onClick={() => !isEditing && onOpen(folder)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!isEditing && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onOpen(folder);
          }
        }}
        aria-label={`Abrir carpeta ${folder.name}`}
      >
        <ColiseoIndicator
          status={folder.coliseoStatus}
          canToggle={canToggleColiseo}
          onToggle={handleColiseoToggle}
          isPending={toggleFolderColiseo.isPending}
        />

        <FolderOpen className="h-5 w-5 shrink-0 text-yellow-500" />

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                  if (e.key === "Escape") {
                    setIsEditing(false);
                    setEditName(folder.name);
                  }
                }}
                className="h-7 text-sm"
                maxLength={50}
                autoFocus
                disabled={renameFolder.isPending}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRenameSubmit}
                disabled={renameFolder.isPending}
                aria-label="Confirmar"
                className="h-7 w-7 p-0"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditName(folder.name);
                }}
                disabled={renameFolder.isPending}
                aria-label="Cancelar"
                className="h-7 w-7 p-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <>
              <p className="truncate text-sm font-medium" title={folder.name}>
                {folder.name}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>
                  {folder.petCount} imagen{folder.petCount !== 1 ? "es" : ""} &middot;{" "}
                  {formatRelativeDate(folder.createdAt)}
                </span>
                {isOlderThanOneMonth(folder.createdAt) && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    title="Carpeta con más de 1 mes"
                  >
                    <Clock className="h-2.5 w-2.5" />
                    +1 mes
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setEditName(folder.name);
              }}
              aria-label={`Renombrar carpeta ${folder.name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {folder.petCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/api/pet-folders/${folder.id}/download`, "_blank");
              }}
              aria-label={`Descargar carpeta ${folder.name}`}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
              aria-label={`Eliminar carpeta ${folder.name}`}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar carpeta</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la carpeta{" "}
              <strong>{folder.name}</strong> y todas sus imágenes? Esta acción
              no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteFolder.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteFolder.isPending}
            >
              {deleteFolder.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Folder List View ─────────────────────────────────────────────────────────

interface FolderListProps {
  canDelete: boolean;
  canToggleColiseo: boolean;
  onOpenFolder: (folder: PetFolder) => void;
}

function FolderList({
  canDelete,
  canToggleColiseo,
  onOpenFolder,
}: FolderListProps) {
  const { data: folders, isLoading } = usePetFolders();
  const createFolder = useCreatePetFolder();

  function handleCreate() {
    createFolder.mutate(undefined, {
      onSuccess: (folder) => {
        toast.success(`Carpeta "${folder.name}" creada`);
        onOpenFolder(folder);
      },
      onError: () => {
        toast.error("Error al crear la carpeta");
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PETs</h1>
          <p className="text-sm text-muted-foreground">
            Colección global de carpetas PET. Las imágenes se convierten
            automáticamente a JPG.
          </p>
        </div>
        <Button onClick={handleCreate} disabled={createFolder.isPending} className="gap-2">
          <FolderPlus className="h-4 w-4" />
          {createFolder.isPending ? "Creando..." : "Nueva carpeta"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Carpetas ({folders?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !folders || folders.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No hay carpetas PET. Crea una para empezar.
            </div>
          ) : (
            <div className="space-y-2">
              {folders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  canDelete={canDelete}
                  canToggleColiseo={canToggleColiseo}
                  onOpen={onOpenFolder}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page Root ────────────────────────────────────────────────────────────────

export function PetsPage() {
  const { user } = useAuth();
  const { data: folders } = usePetFolders();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const canDelete = user?.role === "superadmin" || user?.role === "admin";
  const canToggleColiseo = user?.role === "superadmin" || user?.role === "admin";

  // Resolve the folder from the latest query data so renames are reflected
  const selectedFolder = selectedFolderId
    ? folders?.find((f) => f.id === selectedFolderId) ?? null
    : null;

  if (selectedFolder) {
    return (
      <FolderDetail
        folder={selectedFolder}
        onBack={() => setSelectedFolderId(null)}
        canDelete={canDelete}
        canToggleColiseo={canToggleColiseo}
      />
    );
  }

  return (
    <FolderList
      canDelete={canDelete}
      canToggleColiseo={canToggleColiseo}
      onOpenFolder={(folder) => setSelectedFolderId(folder.id)}
    />
  );
}
