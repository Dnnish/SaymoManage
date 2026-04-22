import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createActuacionSchema } from "@minidrive/shared";
import type { CreateActuacionInput } from "@minidrive/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateActuacion } from "@/hooks/use-actuaciones";

interface CreateActuacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateActuacionDialog({
  open,
  onOpenChange,
}: CreateActuacionDialogProps) {
  const createActuacion = useCreateActuacion();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateActuacionInput>({
    resolver: zodResolver(createActuacionSchema),
  });

  async function onSubmit(values: CreateActuacionInput) {
    await createActuacion.mutateAsync(values);
    reset();
    onOpenChange(false);
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva actuación</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              placeholder="Nombre de la actuación"
              maxLength={50}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createActuacion.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createActuacion.isPending}>
              {createActuacion.isPending ? "Creando..." : "Crear actuación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
