import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect } from "vitest";

vi.mock("@/hooks/use-actuacion", () => ({
  useActuacion: vi.fn(),
  useToggleColiseo: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/use-documents", () => ({
  useDocuments: vi.fn(),
  useUploadDocument: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteDocument: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: "test-id" })),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

import { useActuacion, useToggleColiseo } from "@/hooks/use-actuacion";
import { useDocuments } from "@/hooks/use-documents";
import { useAuth } from "@/hooks/use-auth";
import { ActuacionDetailPage } from "@/pages/actuacion-detail-page";

const mockActuacion = {
  id: "test-id",
  name: "Actuación Test",
  createdById: "user-1",
  createdByName: "Ana García",
  coliseoStatus: false,
  createdAt: "2024-03-01T10:00:00.000Z",
  updatedAt: "2024-03-01T10:00:00.000Z",
  folderCounts: { postes: 3, fotos: 1 },
};

const mockDocuments = [
  {
    id: "doc-1",
    actuacionId: "test-id",
    folder: "postes",
    filename: "poste-001.pdf",
    storageKey: "postes/poste-001.pdf",
    mimeType: "application/pdf",
    size: 204800,
    uploadedById: "user-1",
    uploadedByName: "Ana García",
    uploadedAt: "2024-03-15T10:00:00.000Z",
  },
];

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ActuacionDetailPage", () => {
  it("renderiza las 5 carpetas con badge de conteo", () => {
    vi.mocked(useActuacion).mockReturnValue({
      data: mockActuacion,
      isLoading: false,
    } as ReturnType<typeof useActuacion>);

    vi.mocked(useDocuments).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useDocuments>);

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "user-1",
        name: "Admin",
        email: "admin@example.com",
        role: "admin",
      },
      isLoading: false,
      isAuthenticated: true,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<ActuacionDetailPage />);

    // All 5 folder names appear
    expect(screen.getByText("Postes")).toBeInTheDocument();
    expect(screen.getByText("Cámaras")).toBeInTheDocument();
    expect(screen.getByText("Fachadas")).toBeInTheDocument();
    expect(screen.getByText("Fotos")).toBeInTheDocument();
    expect(screen.getByText("Planos")).toBeInTheDocument();

    // PETs is NOT a folder anymore
    expect(screen.queryByText("PETs")).not.toBeInTheDocument();

    // Badges: postes=3, fotos=1, rest=0
    const badges = screen.getAllByText("0");
    expect(badges.length).toBe(3); // camaras, fachadas, planos
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("toggle coliseo solo visible para admin/superadmin", () => {
    vi.mocked(useActuacion).mockReturnValue({
      data: mockActuacion,
      isLoading: false,
    } as ReturnType<typeof useActuacion>);

    vi.mocked(useDocuments).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useDocuments>);

    // Role "user" — toggle NOT visible
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "user-2",
        name: "Regular User",
        email: "user@example.com",
        role: "user",
      },
      isLoading: false,
      isAuthenticated: true,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { unmount } = renderWithProviders(<ActuacionDetailPage />);

    expect(
      screen.queryByRole("button", { name: /pendiente|subido a coliseo/i }),
    ).not.toBeInTheDocument();

    unmount();

    // Role "admin" — toggle IS visible
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "user-1",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
      isLoading: false,
      isAuthenticated: true,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<ActuacionDetailPage />);

    expect(
      screen.getByRole("button", { name: /pendiente/i }),
    ).toBeInTheDocument();
  });

  it("lista de documentos muestra nombre y fecha", async () => {
    const user = userEvent.setup();

    vi.mocked(useActuacion).mockReturnValue({
      data: mockActuacion,
      isLoading: false,
    } as ReturnType<typeof useActuacion>);

    vi.mocked(useDocuments).mockReturnValue({
      data: mockDocuments,
      isLoading: false,
    } as unknown as ReturnType<typeof useDocuments>);

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "user-1",
        name: "Admin",
        email: "admin@example.com",
        role: "admin",
      },
      isLoading: false,
      isAuthenticated: true,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(useToggleColiseo).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useToggleColiseo>);

    renderWithProviders(<ActuacionDetailPage />);

    // Click on Postes folder card
    await user.click(screen.getByText("Postes"));

    // Document filename appears
    expect(screen.getByText("poste-001.pdf")).toBeInTheDocument();

    // Uploader name appears in the document card
    expect(screen.getByText(/Subido por Ana García/i)).toBeInTheDocument();
  });
});
