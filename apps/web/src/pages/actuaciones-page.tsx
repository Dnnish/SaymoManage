import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Trash2, Pencil, Check, X, ChevronLeft, ChevronRight, ArrowUpDown, Filter } from "lucide-react";
import {
  useActuaciones,
  useDeleteActuacion,
  useRenameActuacion,
  type Actuacion,
} from "@/hooks/use-actuaciones";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { CreateActuacionDialog } from "@/components/actuaciones/create-actuacion-dialog";

const PAGE_LIMIT = 20;

interface ColiseoIndicatorProps {
  status: boolean;
}

function ColiseoIndicator({ status }: ColiseoIndicatorProps) {
  return (
    <div
      title={status ? "Subido a Coliseo" : "Pendiente de Coliseo"}
      className={`h-3 w-3 rounded-full ${status ? "bg-green-500" : "bg-red-500"}`}
      aria-label={status ? "Subido a Coliseo" : "Pendiente de Coliseo"}
    />
  );
}

interface DeleteActuacionDialogProps {
  actuacion: Actuacion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DeleteActuacionDialog({
  actuacion,
  open,
  onOpenChange,
}: DeleteActuacionDialogProps) {
  const deleteActuacion = useDeleteActuacion();

  async function handleConfirm() {
    if (!actuacion) return;
    await deleteActuacion.mutateAsync(actuacion.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar actuación</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que quieres eliminar la actuación{" "}
            <span className="font-medium text-foreground">
              {actuacion?.name}
            </span>
            ? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteActuacion.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={deleteActuacion.isPending}
          >
            {deleteActuacion.isPending ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ActuacionCardProps {
  actuacion: Actuacion;
  canRename: boolean;
  canDelete: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function ActuacionCard({ actuacion, canRename, canDelete, onClick, onDelete }: ActuacionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(actuacion.name);
  const renameActuacion = useRenameActuacion();

  function handleRenameSubmit() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === actuacion.name) {
      setIsEditing(false);
      setEditName(actuacion.name);
      return;
    }
    renameActuacion.mutate(
      { id: actuacion.id, name: trimmed },
      {
        onSuccess: () => {
          toast.success("Actuación renombrada");
          setIsEditing(false);
        },
        onError: () => {
          toast.error("Error al renombrar");
          setEditName(actuacion.name);
          setIsEditing(false);
        },
      },
    );
  }

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-colors hover:bg-accent"
      onClick={() => !isEditing && onClick()}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <ColiseoIndicator status={actuacion.coliseoStatus} />
            {isEditing ? (
              <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit();
                    if (e.key === "Escape") {
                      setIsEditing(false);
                      setEditName(actuacion.name);
                    }
                  }}
                  className="h-7 text-sm font-semibold"
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
                  className="h-7 w-7 p-0"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(actuacion.name);
                  }}
                  disabled={renameActuacion.isPending}
                  aria-label="Cancelar"
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <CardTitle className="truncate text-base">{actuacion.name}</CardTitle>
            )}
          </div>
          <div className="hidden sm:flex shrink-0 items-center gap-1">
            {!isEditing && canRename && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Renombrar ${actuacion.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditName(actuacion.name);
                  setIsEditing(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Eliminar ${actuacion.name}`}
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex gap-4">
            <span>Creado por: {actuacion.createdByName}</span>
            <span>
              {new Date(actuacion.createdAt).toLocaleDateString("es-ES")}
            </span>
          </div>
          <div className="flex sm:hidden shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {!isEditing && canRename && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Renombrar ${actuacion.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditName(actuacion.name);
                  setIsEditing(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Eliminar ${actuacion.name}`}
                onClick={(e) => { e.stopPropagation(); onDelete(e); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ActuacionesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [coliseoFilter, setColiseoFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Actuacion | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading } = useActuaciones(page, PAGE_LIMIT, debouncedSearch, sortBy, sortOrder, coliseoFilter);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_LIMIT)) : 1;

  const canCreate = user?.role === "superadmin" || user?.role === "admin";

  function canDelete(actuacion: Actuacion): boolean {
    if (!user) return false;
    if (user.role === "superadmin") return true;
    if (user.role === "admin") return actuacion.createdById === user.id;
    return false;
  }

  function canRename(actuacion: Actuacion): boolean {
    if (!user) return false;
    if (user.role === "superadmin" || user.role === "admin") return true;
    return actuacion.createdById === user.id;
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(1);
  }

  function openDelete(actuacion: Actuacion, e: React.MouseEvent) {
    e.stopPropagation();
    setDeleteTarget(actuacion);
    setDeleteOpen(true);
  }

  function handleCardClick(id: string) {
    void navigate(`/actuaciones/${id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Actuaciones</h1>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Nueva actuación
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar actuaciones..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border p-1">
            <Filter className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
            <Button
              variant={coliseoFilter === "all" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setColiseoFilter("all"); setPage(1); }}
            >
              Todos
            </Button>
            <Button
              variant={coliseoFilter === "false" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setColiseoFilter("false"); setPage(1); }}
            >
              Pendientes
            </Button>
            <Button
              variant={coliseoFilter === "true" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setColiseoFilter("true"); setPage(1); }}
            >
              Subidos
            </Button>
          </div>

          <div className="flex items-center gap-1 rounded-md border p-1">
            <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
            <Button
              variant={sortBy === "date" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setSortBy("date"); setPage(1); }}
            >
              Fecha
            </Button>
            <Button
              variant={sortBy === "name" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setSortBy("name"); setPage(1); }}
            >
              Nombre
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setSortOrder(sortOrder === "desc" ? "asc" : "desc"); setPage(1); }}
            >
              {sortOrder === "desc" ? "↓" : "↑"}
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No se encontraron actuaciones
        </div>
      ) : (
        <div className="space-y-3">
          {data?.data.map((actuacion) => (
            <ActuacionCard
              key={actuacion.id}
              actuacion={actuacion}
              canRename={canRename(actuacion)}
              canDelete={canDelete(actuacion)}
              onClick={() => handleCardClick(actuacion.id)}
              onDelete={(e) => openDelete(actuacion, e)}
            />
          ))}
        </div>
      )}

      {!isLoading && (data?.total ?? 0) > 0 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <CreateActuacionDialog open={createOpen} onOpenChange={setCreateOpen} />

      <DeleteActuacionDialog
        actuacion={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
