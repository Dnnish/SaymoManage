import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  type User,
} from "@/hooks/use-users";
import type { CreateUserInput, UpdateUserInput } from "@minidrive/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserForm } from "@/components/users/user-form";
import { DeleteUserDialog } from "@/components/users/delete-user-dialog";
import { z } from "zod";
import { updateUserSchema } from "@minidrive/shared";
import { cn } from "@/lib/utils";

const editUserSchema = updateUserSchema.extend({
  name: z.string().min(1, "El nombre es requerido").max(255),
  email: z.string().email("Email invalido"),
});

type EditUserInput = z.infer<typeof editUserSchema>;

type DialogState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; user: User };

function getRoleBadgeClass(role: User["role"]): string {
  switch (role) {
    case "superadmin":
      return "bg-red-100 text-red-800";
    case "admin":
      return "bg-blue-100 text-blue-800";
    case "user":
      return "bg-green-100 text-green-800";
  }
}

function getRoleLabel(role: User["role"]): string {
  switch (role) {
    case "superadmin":
      return "Superadmin";
    case "admin":
      return "Admin";
    case "user":
      return "Usuario";
  }
}

export function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [dialogState, setDialogState] = useState<DialogState>({
    type: "closed",
  });
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleCreate(values: CreateUserInput) {
    await createUser.mutateAsync(values);
    setDialogState({ type: "closed" });
  }

  async function handleEdit(values: EditUserInput) {
    if (dialogState.type !== "edit") return;
    const { id } = dialogState.user;
    await updateUser.mutateAsync({ id, ...values });
    setDialogState({ type: "closed" });
  }

  function openDeleteDialog(user: User) {
    setDeleteTarget(user);
    setDeleteOpen(true);
  }

  const isDialogOpen = dialogState.type !== "closed";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Button onClick={() => setDialogState({ type: "create" })}>
          <Plus />
          Nuevo usuario
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha de creación</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "border-transparent",
                      getRoleBadgeClass(user.role),
                    )}
                  >
                    {getRoleLabel(user.role)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.deletedAt ? (
                    <Badge className="border-transparent bg-gray-100 text-gray-600">
                      Eliminado
                    </Badge>
                  ) : (
                    <Badge className="border-transparent bg-green-100 text-green-800">
                      Activo
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString("es-ES")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${user.name}`}
                      onClick={() =>
                        setDialogState({ type: "edit", user })
                      }
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Eliminar ${user.name}`}
                      onClick={() => openDeleteDialog(user)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) setDialogState({ type: "closed" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.type === "create"
                ? "Nuevo usuario"
                : "Editar usuario"}
            </DialogTitle>
          </DialogHeader>

          {dialogState.type === "create" && (
            <UserForm
              mode="create"
              onSubmit={(values) => void handleCreate(values)}
              onCancel={() => setDialogState({ type: "closed" })}
              isSubmitting={createUser.isPending}
            />
          )}

          {dialogState.type === "edit" && (
            <UserForm
              mode="edit"
              defaultValues={{
                name: dialogState.user.name,
                email: dialogState.user.email,
                role: dialogState.user.role,
              }}
              onSubmit={(values) => void handleEdit(values as EditUserInput)}
              onCancel={() => setDialogState({ type: "closed" })}
              isSubmitting={updateUser.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteUserDialog
        user={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
