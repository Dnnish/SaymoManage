import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect } from "vitest";

vi.mock("@/hooks/use-documents", () => ({
  useDocuments: vi.fn(),
  useUploadDocument: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteDocument: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
  Toaster: () => null,
}));

import { FileUploadZone } from "@/components/documents/file-upload-zone";
import { DocumentCard } from "@/components/documents/document-card";
import { useUploadDocument } from "@/hooks/use-documents";
import { toast } from "sonner";
import type { Document } from "@/hooks/use-documents";

const mockDocument: Document = {
  id: "doc-1",
  actuacionId: "act-1",
  folder: "postes",
  filename: "plano-001.pdf",
  storageKey: "postes/plano-001.pdf",
  mimeType: "application/pdf",
  size: 204800,
  uploadedById: "user-1",
  uploadedByName: "Ana García",
  uploadedAt: new Date().toISOString(),
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("FileUploadZone", () => {
  it("dropzone muestra el formato correcto para carpeta postes", () => {
    renderWithProviders(
      <FileUploadZone actuacionId="act-1" folder="postes" />,
    );

    expect(screen.getByText("Solo archivos PDF")).toBeInTheDocument();
  });

  it("dropzone muestra el formato correcto para carpeta fotos", () => {
    renderWithProviders(
      <FileUploadZone actuacionId="act-1" folder="fotos" />,
    );

    expect(
      screen.getByText("Imágenes (JPG, PNG, WEBP, etc.)"),
    ).toBeInTheDocument();
  });

  it("carpeta planos muestra el aviso de PDF y KMZ", () => {
    renderWithProviders(
      <FileUploadZone actuacionId="act-1" folder="planos" />,
    );

    expect(
      screen.getByText("Archivos PDF y KMZ"),
    ).toBeInTheDocument();
  });

  it("dropzone rechaza archivos de formato incorrecto para la carpeta", async () => {
    const mutateMock = vi.fn();
    vi.mocked(useUploadDocument).mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    } as unknown as ReturnType<typeof useUploadDocument>);

    renderWithProviders(
      <FileUploadZone actuacionId="act-1" folder="postes" />,
    );

    const dropzone = screen.getByRole("button", { name: /zona de carga/i });

    // Simulate dropping an image file (not allowed in postes — PDF only)
    const imageFile = new File(["content"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [imageFile] },
    });

    expect(toast.error).toHaveBeenCalledWith("Formato no permitido para esta carpeta");
    expect(mutateMock).not.toHaveBeenCalled();
  });
});

describe("DocumentCard", () => {
  it("boton eliminar NO visible cuando canDelete es false", () => {
    renderWithProviders(
      <DocumentCard document={mockDocument} canDelete={false} />,
    );

    expect(
      screen.queryByRole("button", { name: /eliminar/i }),
    ).not.toBeInTheDocument();
  });

  it("boton eliminar SI visible cuando canDelete es true", () => {
    renderWithProviders(
      <DocumentCard document={mockDocument} canDelete={true} />,
    );

    expect(
      screen.getByRole("button", { name: /eliminar/i }),
    ).toBeInTheDocument();
  });
});
