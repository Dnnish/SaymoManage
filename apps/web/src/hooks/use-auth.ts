import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type UserRole = "superadmin" | "admin" | "user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface MeResponse {
  user: AuthUser;
}

interface SignInResponse {
  user: AuthUser;
}

const ME_QUERY_KEY = ["auth", "me"] as const;

export function useAuth() {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
  } = useQuery<AuthUser | null>({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await apiClient.get<MeResponse>("/api/auth/me");
        return response.user;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const isAuthenticated = data != null;
  const user = data ?? null;

  async function login(email: string, password: string): Promise<AuthUser> {
    const response = await apiClient.post<SignInResponse>(
      "/api/auth/sign-in/email",
      { email, password },
    );
    queryClient.setQueryData(ME_QUERY_KEY, response.user);
    return response.user;
  }

  async function logout(): Promise<void> {
    await apiClient.post("/api/auth/sign-out");
    queryClient.setQueryData(ME_QUERY_KEY, null);
    await queryClient.invalidateQueries();
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    login,
    logout,
  };
}
