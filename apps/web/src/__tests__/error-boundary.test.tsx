import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { ErrorBoundary } from "@/components/error-boundary";
import { ActuacionesPage } from "@/pages/actuaciones-page";

// ── mocks for ActuacionesPage tests ─────────────────────────────────────────

vi.mock("@/hooks/use-actuaciones", () => ({
  useActuaciones: vi.fn(),
  useCreateActuacion: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteActuacion: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});

import { useActuaciones } from "@/hooks/use-actuaciones";
import { useAuth } from "@/hooks/use-auth";

// ── helpers ──────────────────────────────────────────────────────────────────

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function mockAuthUser() {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      role: "admin",
    },
    isLoading: false,
    isAuthenticated: true,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  });
}

// ── component that always throws ─────────────────────────────────────────────

function BrokenComponent(): never {
  throw new Error("Error de prueba intencional");
}

// ── tests ────────────────────────────────────────────────────────────────────

describe("ErrorBoundary", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress the expected console.error noise from React and ErrorBoundary
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("ErrorBoundary captura errores y muestra fallback", () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
    expect(
      screen.getByText("Error de prueba intencional"),
    ).toBeInTheDocument();
  });
});

describe("ActuacionesPage — estados de carga y vacío", () => {
  it("estado vacio muestra mensaje correcto", () => {
    vi.mocked(useActuaciones).mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 20 },
      isLoading: false,
    } as ReturnType<typeof useActuaciones>);

    mockAuthUser();

    renderWithQueryClient(<ActuacionesPage />);

    expect(
      screen.getByText("No se encontraron actuaciones"),
    ).toBeInTheDocument();
  });

  it("skeleton loader se muestra mientras isLoading es true", () => {
    vi.mocked(useActuaciones).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useActuaciones>);

    mockAuthUser();

    renderWithQueryClient(<ActuacionesPage />);

    // The skeleton items rendered while loading; check at least one exists
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
