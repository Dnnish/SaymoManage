import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface PetFolder {
  id: string;
  name: string;
  coliseoStatus: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  petCount: number;
}

const PET_FOLDERS_QUERY_KEY = ["pet-folders"] as const;

export function usePetFolders() {
  return useQuery<PetFolder[]>({
    queryKey: PET_FOLDERS_QUERY_KEY,
    queryFn: () => apiClient.get<PetFolder[]>("/api/pet-folders"),
    refetchOnMount: "always",
  });
}

export function useCreatePetFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (): Promise<PetFolder> => apiClient.post<PetFolder>("/api/pet-folders"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PET_FOLDERS_QUERY_KEY });
    },
  });
}

export function useRenamePetFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      folderId,
      name,
    }: {
      folderId: string;
      name: string;
    }): Promise<PetFolder> =>
      apiClient.patch<PetFolder>(`/api/pet-folders/${folderId}`, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PET_FOLDERS_QUERY_KEY });
    },
  });
}

export function useDeletePetFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (folderId: string): Promise<PetFolder> =>
      apiClient.delete<PetFolder>(`/api/pet-folders/${folderId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PET_FOLDERS_QUERY_KEY });
    },
  });
}

export function useTogglePetFolderColiseo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      folderId,
      status,
    }: {
      folderId: string;
      status: boolean;
    }): Promise<PetFolder> =>
      apiClient.patch<PetFolder>(`/api/pet-folders/${folderId}/coliseo`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PET_FOLDERS_QUERY_KEY });
    },
  });
}
