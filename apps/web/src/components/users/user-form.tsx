import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createUserSchema, updateUserSchema } from "@minidrive/shared";
import type { CreateUserInput } from "@minidrive/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Edit mode schema: same as updateUserSchema but name and code are required
const editUserSchema = updateUserSchema.extend({
  name: z.string().min(1, "El nombre es requerido").max(20, "El nombre no puede superar 20 caracteres"),
  code: z.string().regex(/^\d{7,15}$/, "El código debe tener entre 7 y 15 dígitos"),
});

type EditUserInput = z.infer<typeof editUserSchema>;

type UserRole = "superadmin" | "admin" | "user";

interface CreateModeProps {
  mode: "create";
  defaultValues?: Partial<CreateUserInput>;
  onSubmit: (values: CreateUserInput) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface EditModeProps {
  mode: "edit";
  defaultValues?: Partial<EditUserInput>;
  onSubmit: (values: EditUserInput) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

type UserFormProps = CreateModeProps | EditModeProps;

export function UserForm(props: UserFormProps) {
  const { mode, defaultValues, onCancel, isSubmitting } = props;

  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema) as any,
    defaultValues: mode === "create" ? defaultValues : undefined,
  });

  const editForm = useForm<EditUserInput>({
    resolver: zodResolver(editUserSchema),
    defaultValues: mode === "edit" ? defaultValues : undefined,
  });

  if (mode === "create") {
    const {
      register,
      handleSubmit,
      setValue,
      watch,
      formState: { errors },
    } = createForm;

    const roleValue = watch("role");

    return (
      <form
        onSubmit={handleSubmit((values) => {
          (props as CreateModeProps).onSubmit(values);
        })}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            placeholder="Nombre completo"
            maxLength={20}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Código</Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            placeholder="0167271325"
            {...register("code")}
          />
          {errors.code && (
            <p className="text-sm text-destructive">{errors.code.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Rol</Label>
          <Select
            value={roleValue ?? "user"}
            onValueChange={(val) => {
              setValue("role", val as UserRole);
            }}
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="Seleccionar rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="superadmin">Superadmin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">Usuario</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-sm text-destructive">{errors.role.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Crear usuario"}
          </Button>
        </div>
      </form>
    );
  }

  // Edit mode
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = editForm;

  const roleValue = watch("role");

  return (
    <form
      onSubmit={handleSubmit((values) => {
        (props as EditModeProps).onSubmit(values);
      })}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          placeholder="Nombre completo"
          maxLength={20}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">Código</Label>
        <Input
          id="code"
          type="text"
          inputMode="numeric"
          placeholder="0167271325"
          {...register("code")}
        />
        {errors.code && (
          <p className="text-sm text-destructive">{errors.code.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Rol</Label>
        <Select
          value={roleValue ?? "user"}
          onValueChange={(val) => {
            setValue("role", val as UserRole);
          }}
        >
          <SelectTrigger id="role">
            <SelectValue placeholder="Seleccionar rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="superadmin">Superadmin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">Usuario</SelectItem>
          </SelectContent>
        </Select>
        {errors.role && (
          <p className="text-sm text-destructive">{errors.role.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
