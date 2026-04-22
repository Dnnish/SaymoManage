import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronRight, CheckCircle, Circle, Download, Trash2, Pencil, Check, X, LayoutList, LayoutGrid, GripVertical, ExternalLink } from "lucide-react";
import { toast } from "sonner";
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
import { useActuacion, useToggleColiseo, useToggleFolderColiseo } from "@/hooks/use-actuacion";
import { useRenameActuacion } from "@/hooks/use-actuaciones";
import { useDocuments, useBulkDownloadDocuments, useBulkDeleteDocuments, useReorderDocuments } from "@/hooks/use-documents";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileUploadZone } from "@/components/documents/file-upload-zone";
import { DocumentCard } from "@/components/documents/document-card";
import type { Folder } from "@minidrive/shared";

const FOLDERS: Folder[] = ["postes", "camaras", "fachadas", "fotos", "planos", "arquetas"];

const FOLDER_LABELS: Record<Folder, string> = {
  postes: "Postes",
  camaras: "Cámaras",
  fachadas: "Fachadas",
  fotos: "Fotos",
  planos: "Planos",
  arquetas: "Arquetas",
};

function SortableDocumentItem({ doc, canDelete, selected, onToggleSelect }: {
  doc: import("@/hooks/use-documents").Document;
  canDelete: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id });
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
        <DocumentCard
          document={doc}
          canDelete={canDelete}
          selected={selected}
          onToggleSelect={onToggleSelect}
        />
      </div>
    </div>
  );
}

interface DocumentListProps {
  actuacionId: string;
  folder: Folder;
  canDelete: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  viewMode: "list" | "grid";
}

function DocumentList({ actuacionId, folder, canDelete, selectedIds, onToggleSelect, viewMode }: DocumentListProps) {
  const { data, isLoading } = useDocuments(actuacionId, folder);
  const reorder = useReorderDocuments();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !data) return;

    const oldIndex = data.findIndex((d) => d.id === active.id);
    const newIndex = data.findIndex((d) => d.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(data, oldIndex, newIndex);
    const items = reordered.map((d, i) => ({ id: d.id, sortOrder: i }));
    reorder.mutate({ items, actuacionId, folder });
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No hay documentos en esta carpeta
      </div>
    );
  }

  if (viewMode === "grid" && (folder === "fotos" || folder === "arquetas")) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {data.map((doc) => (
          <div
            key={doc.id}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-muted"
            onClick={() => window.open(`/api/documents/${doc.id}/download`, "_blank")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                window.open(`/api/documents/${doc.id}/download`, "_blank");
              }
            }}
          >
            <img
              src={`/api/documents/${doc.id}/download`}
              alt={doc.filename}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
              <p className="truncate text-xs font-medium text-white">{doc.filename}</p>
            </div>
            {onToggleSelect && (
              <input
                type="checkbox"
                checked={selectedIds.has(doc.id)}
                onChange={(e) => { e.stopPropagation(); onToggleSelect(doc.id); }}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-2 top-2 h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                aria-label={`Seleccionar ${doc.filename}`}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={data.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {data.map((doc) => (
            <SortableDocumentItem
              key={doc.id}
              doc={doc}
              canDelete={canDelete}
              selected={selectedIds.has(doc.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function ActuacionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const { data: actuacion, isLoading } = useActuacion(id ?? "");
  const toggleColiseo = useToggleColiseo();
  const toggleFolderColiseo = useToggleFolderColiseo();
  const renameActuacion = useRenameActuacion();
  const bulkDownload = useBulkDownloadDocuments();
  const bulkDelete = useBulkDeleteDocuments();

  function handleToggleSelect(docId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
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
    if (!actuacion || !selectedFolder) return;
    bulkDelete.mutate(
      { ids: Array.from(selectedIds), actuacionId: actuacion.id, folder: selectedFolder },
      {
        onSuccess: (data) => {
          toast.success(`${data.deleted} documento(s) eliminado(s)`);
          setSelectedIds(new Set());
        },
        onError: () => toast.error("Error al eliminar"),
      },
    );
  }

  const canToggleColiseo =
    user?.role === "superadmin" || user?.role === "admin";

  const canDelete =
    user?.role === "superadmin" || user?.role === "admin";

  const canRename =
    user?.role === "superadmin" ||
    user?.role === "admin" ||
    (user?.role === "user" && actuacion?.createdById === user?.id);

  function handleRenameSubmit() {
    if (!actuacion) return;
    const trimmed = editName.trim();
    if (!trimmed || trimmed === actuacion.name) {
      setIsEditingName(false);
      return;
    }
    renameActuacion.mutate(
      { id: actuacion.id, name: trimmed },
      {
        onSuccess: () => {
          toast.success("Actuación renombrada");
          setIsEditingName(false);
        },
        onError: () => {
          toast.error("Error al renombrar");
          setIsEditingName(false);
        },
      },
    );
  }

  function handleColiseoToggle() {
    if (!actuacion) return;
    toggleColiseo.mutate({
      id: actuacion.id,
      status: !actuacion.coliseoStatus,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!actuacion) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Actuación no encontrada
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
        <Link
          to="/actuaciones"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Actuaciones
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        {selectedFolder ? (
          <button
            onClick={() => { setSelectedFolder(null); setSelectedIds(new Set()); }}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {actuacion.name}
          </button>
        ) : (
          <span className="font-medium truncate max-w-[200px] sm:max-w-none">
            {actuacion.name}
          </span>
        )}
        {selectedFolder && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{FOLDER_LABELS[selectedFolder]}</span>
          </>
        )}
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                  if (e.key === "Escape") setIsEditingName(false);
                }}
                className="h-9 text-lg font-bold"
                maxLength={50}
                autoFocus
                disabled={renameActuacion.isPending}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRenameSubmit}
                disabled={renameActuacion.isPending}
                aria-label="Confirmar"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingName(false)}
                disabled={renameActuacion.isPending}
                aria-label="Cancelar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-bold">{actuacion.name}</h1>
              {canRename && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditName(actuacion.name);
                    setIsEditingName(true);
                  }}
                  aria-label="Renombrar actuación"
                  className="h-7 w-7 p-0"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const totalDocs = Object.values(actuacion.folderCounts).reduce((a, b) => a + b, 0);
              if (totalDocs === 0) {
                toast.error("No hay documentos para descargar");
                return;
              }
              window.open(`/api/actuaciones/${actuacion.id}/download`, "_blank");
            }}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Descargar todo</span>
            <span className="sm:hidden">ZIP</span>
          </Button>
        {canToggleColiseo && (
          <Button
            variant={actuacion.coliseoStatus ? "default" : "outline"}
            size="sm"
            onClick={handleColiseoToggle}
            disabled={toggleColiseo.isPending}
            className={
              actuacion.coliseoStatus
                ? "bg-green-600 hover:bg-green-700"
                : "border-red-400 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-950"
            }
          >
            {actuacion.coliseoStatus ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
            {actuacion.coliseoStatus ? "Subido a Coliseo" : "Pendiente"}
          </Button>
        )}
        </div>
      </div>

      {/* Folder grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FOLDERS.map((folder) => {
          const count = actuacion.folderCounts[folder] ?? 0;
          const isSelected = selectedFolder === folder;
          const folderColiseo = actuacion.folderColiseoStatuses?.[folder] ?? false;

          return (
            <Card
              key={folder}
              className={`cursor-pointer transition-colors hover:bg-accent ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : ""
              }`}
              onClick={() => {
                setSelectedFolder(isSelected ? null : folder);
                setSelectedIds(new Set());
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {canToggleColiseo ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFolderColiseo.mutate({
                            actuacionId: actuacion.id,
                            folder,
                            status: !folderColiseo,
                          }, {
                            onSuccess: () => {
                              toast.success(
                                folderColiseo
                                  ? `${FOLDER_LABELS[folder]} marcado como pendiente`
                                  : `${FOLDER_LABELS[folder]} marcado como subido a Coliseo`,
                              );
                            },
                            onError: () => toast.error("Error al actualizar estado"),
                          });
                        }}
                        disabled={toggleFolderColiseo.isPending}
                        title={folderColiseo ? "Subido a Coliseo" : "Pendiente en Coliseo"}
                        aria-label={folderColiseo ? "Subido a Coliseo" : "Pendiente en Coliseo"}
                        className={`h-3 w-3 shrink-0 rounded-full transition-opacity ${
                          folderColiseo ? "bg-green-500" : "bg-red-500"
                        } ${toggleFolderColiseo.isPending ? "opacity-50" : "hover:opacity-80"}`}
                      />
                    ) : (
                      <span
                        title={folderColiseo ? "Subido a Coliseo" : "Pendiente en Coliseo"}
                        className={`h-3 w-3 shrink-0 rounded-full ${
                          folderColiseo ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                    )}
                    {FOLDER_LABELS[folder]}
                  </div>
                  <Badge variant={count > 0 ? "default" : "secondary"}>
                    {count}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Document list */}
      {selectedFolder ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {FOLDER_LABELS[selectedFolder]}
            </CardTitle>
            <div className="flex items-center gap-2">
              {(selectedFolder === "fotos" || selectedFolder === "arquetas") && (
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
              )}
              {(actuacion.folderCounts[selectedFolder] ?? 0) > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    window.open(
                      `/api/actuaciones/${actuacion.id}/documents/download?folder=${selectedFolder}`,
                      "_blank",
                    )
                  }
                >
                  <Download className="h-4 w-4" />
                  Descargar ZIP
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <FileUploadZone actuacionId={actuacion.id} folder={selectedFolder} />

            {selectedFolder === "planos" && (
              <a
                href="https://kmzmap.com/en"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                Abrir visor de KMZ online (kmzmap.com)
              </a>
            )}

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

            <DocumentList
              actuacionId={actuacion.id}
              folder={selectedFolder}
              canDelete={canDelete}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              viewMode={viewMode}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          Selecciona una carpeta
        </div>
      )}
    </div>
  );
}
