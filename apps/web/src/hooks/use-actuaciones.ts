import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CreateActuacionInput } from "@minidrive/shared";

export interface Actuacion {
  id: string;
  name: string;
  createdById: string;
  createdByName: string;
  coliseoStatus: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ActuacionesResponse {
  data: Actuacion[];
  total: number;
  page: number;
  limit: number;
}

const ACTUACIONES_QUERY_KEY = ["actuaciones"] as const;

export function useActuaciones(
  page: number,
  limit: number,
  search?: string,
  sortBy = "date",
  sortOrder = "desc",
  coliseoStatus = "all",
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder,
    coliseoStatus,
  });
  if (search && search.trim() !== "") {
    params.set("search", search.trim());
  }

  return useQuery<ActuacionesResponse>({
    queryKey: [...ACTUACIONES_QUERY_KEY, { page, limit, search, sortBy, sortOrder, coliseoStatus }],
    queryFn: () =>
      apiClient.get<ActuacionesResponse>(`/api/actuaciones?${params.toString()}`),
    refetchOnMount: "always",
  });
}

export function useCreateActuacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateActuacionInput) =>
      apiClient.post<Actuacion>("/api/actuaciones", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACTUACIONES_QUERY_KEY });
    },
  });
}

export function useRenameActuacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiClient.patch<Actuacion>(`/api/actuaciones/${id}`, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACTUACIONES_QUERY_KEY });
    },
  });
}

export function useDeleteActuacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/api/actuaciones/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACTUACIONES_QUERY_KEY });
    },
  });
}
