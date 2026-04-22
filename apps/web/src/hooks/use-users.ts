import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CreateUserInput, UpdateUserInput } from "@minidrive/shared";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "superadmin" | "admin" | "user";
  createdAt: string;
  deletedAt: string | null;
}

const USERS_QUERY_KEY = ["users"] as const;

export function useUsers() {
  return useQuery<User[]>({
    queryKey: USERS_QUERY_KEY,
    queryFn: () => apiClient.get<User[]>("/api/users"),
    refetchOnMount: "always",
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserInput) =>
      apiClient.post<User>("/api/users", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUserInput & { id: string }) =>
      apiClient.patch<User>(`/api/users/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/users/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}
