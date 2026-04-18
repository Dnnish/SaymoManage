import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect } from "vitest";

vi.mock("@/hooks/use-pets", () => ({
  usePets: vi.fn(),
  useUploadPet: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeletePet: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

import { usePets } from "@/hooks/use-pets";
import { useAuth } from "@/hooks/use-auth";
import { PetsPage } from "@/pages/pets-page";

const mockPets = [
  {
    id: "pet-1",
    filename: "foto-poste.jpg",
    storageKey: "pets/1234-foto-poste.jpg",
    mimeType: "image/jpeg",
    size: 102400,
    uploadedById: "user-1",
    uploadedByName: "Ana García",
    uploadedAt: "2024-03-15T10:00:00.000Z",
  },
  {
    id: "pet-2",
    filename: "camara-norte.jpg",
    storageKey: "pets/1235-camara-norte.jpg",
    mimeType: "image/jpeg",
    size: 204800,
    uploadedById: "user-1",
    uploadedByName: "Ana García",
    uploadedAt: "2024-03-16T10:00:00.000Z",
  },
];

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PetsPage", () => {
  it("muestra título y zona de carga", () => {
    vi.mocked(usePets).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof usePets>);

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1", name: "User", email: "u@t.com", role: "user" },
      isLoading: false,
      isAuthenticated: true,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<PetsPage />);

    expect(screen.getByText("PETs")).toBeInTheDocument();
    expect(screen.getByText("Subir imagen")).toBeInTheDocument();
    expect(screen.getByText(/Haz clic o arrastra una imagen aquí/)).toBeInTheDocument();
  });

  it("muestra lista de PETs con nombre y uploader", () => {
    vi.mocked(usePets).mockReturnValue({
      data: mockPets,
      isLoading: false,
    } as unknown as ReturnType<typeof usePets>);

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1", name: "Admin", email: "a@t.com", role: "admin" },
      isLoading: false,
      isAuthenticated: true,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<PetsPage />);

    expect(screen.getByText("foto-poste.jpg")).toBeInTheDocument();
    expect(screen.getByText("camara-norte.jpg")).toBeInTheDocument();
    expect(screen.getAllByText(/Subido por Ana García/)).toHaveLength(2);
    expect(screen.getByText("Imágenes (2)")).toBeInTheDocument();
  });

  it("muestra mensaje vacío cuando no hay PETs", () => {
    vi.mocked(usePets).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof usePets>);

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1", name: "User", email: "u@t.com", role: "user" },
      isLoading: false,
      isAuthenticated: true,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<PetsPage />);

    expect(screen.getByText("No hay imágenes PET")).toBeInTheDocument();
  });

  it("botón eliminar visible para admin, oculto para user", () => {
    vi.mocked(usePets).mockReturnValue({
      data: mockPets,
      isLoading: false,
    } as unknown as ReturnType<typeof usePets>);

    // Role "user" — no delete buttons
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-2", name: "User", email: "u@t.com", role: "user" },
      isLoading: false,
      isAuthenticated: true,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { unmount } = renderWithProviders(<PetsPage />);

    expect(screen.queryByLabelText(/Eliminar/)).not.toBeInTheDocument();

    unmount();

    // Role "admin" — delete buttons visible
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1", name: "Admin", email: "a@t.com", role: "admin" },
      isLoading: false,
      isAuthenticated: true,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<PetsPage />);

    const deleteButtons = screen.getAllByLabelText(/Eliminar/);
    expect(deleteButtons.length).toBe(2);
  });

  it("muestra skeletons cuando está cargando", () => {
    vi.mocked(usePets).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof usePets>);

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1", name: "User", email: "u@t.com", role: "user" },
      isLoading: false,
      isAuthenticated: true,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<PetsPage />);

    // Should not show empty state or pet cards
    expect(screen.queryByText("No hay imágenes PET")).not.toBeInTheDocument();
  });
});
