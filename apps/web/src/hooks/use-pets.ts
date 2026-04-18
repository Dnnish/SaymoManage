import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Pet {
  id: string;
  filename: string;
  storageKey: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;
}

const PETS_QUERY_KEY = ["pets"] as const;

export function usePets() {
  return useQuery<Pet[]>({
    queryKey: PETS_QUERY_KEY,
    queryFn: () => apiClient.get<Pet[]>("/api/pets"),
  });
}

export function useUploadPet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<Pet> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/pets", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        let message = response.statusText;
        try {
          const data = (await response.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }

      return response.json() as Promise<Pet>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PETS_QUERY_KEY });
    },
  });
}

export function useDeletePet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string): Promise<Pet> =>
      apiClient.delete<Pet>(`/api/pets/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PETS_QUERY_KEY });
    },
  });
}
