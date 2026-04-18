import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ErrorBoundary } from "@/components/error-boundary";
import { NotFoundPage } from "@/pages/not-found-page";
import { Skeleton } from "@/components/ui/skeleton";

const LoginPage = lazy(() =>
  import("@/pages/login-page").then((m) => ({ default: m.LoginPage })),
);
const ActuacionesPage = lazy(() =>
  import("@/pages/actuaciones-page").then((m) => ({
    default: m.ActuacionesPage,
  })),
);
const ActuacionDetailPage = lazy(() =>
  import("@/pages/actuacion-detail-page").then((m) => ({
    default: m.ActuacionDetailPage,
  })),
);
const PetsPage = lazy(() =>
  import("@/pages/pets-page").then((m) => ({ default: m.PetsPage })),
);
const UsersPage = lazy(() =>
  import("@/pages/users-page").then((m) => ({ default: m.UsersPage })),
);

function PageLoader() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: "/",
    element: (
      <ErrorBoundary>
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      </ErrorBoundary>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/actuaciones" replace />,
      },
      {
        path: "dashboard",
        element: <Navigate to="/actuaciones" replace />,
      },
      {
        path: "actuaciones",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ActuacionesPage />
          </Suspense>
        ),
      },
      {
        path: "actuaciones/:id",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ActuacionDetailPage />
          </Suspense>
        ),
      },
      {
        path: "pets",
        element: (
          <Suspense fallback={<PageLoader />}>
            <PetsPage />
          </Suspense>
        ),
      },
      {
        path: "users",
        element: (
          <ProtectedRoute requiredRole="superadmin">
            <Suspense fallback={<PageLoader />}>
              <UsersPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
