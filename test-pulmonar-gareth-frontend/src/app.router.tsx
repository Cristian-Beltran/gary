import { createBrowserRouter } from "react-router-dom";
import DashboardLayout from "./layouts/dashboard";
import DashboardPage from "./modules/Dashboard/dashboard-page";
import LoginPage from "./pages/login";
import NotFoundPage from "./pages/not-found";
import MonitoringPage from "./modules/Monitoring/monitoring";
import DoctorsPage from "./modules/Doctors/doctors";
import { AuthProvider } from "./auth/ProtectedRoute";
import PatientPage from "./modules/Patient/patient";
import SessionPage from "./modules/Session/session.page";
import TrainingPage from "./modules/Training/training.page";
import { RequireRole } from "./auth/RequireRole";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <AuthProvider>
        <DashboardLayout />
      </AuthProvider>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: "monitoring",
        element: (
          <RequireRole allow={["doctor"]}>
            <MonitoringPage />
          </RequireRole>
        ),
      },
      {
        path: "doctor",
        element: (
          <RequireRole allow={["doctor"]}>
            <DoctorsPage />
          </RequireRole>
        ),
      },
      {
        path: "patients",
        element: (
          <RequireRole allow={["doctor"]}>
            <PatientPage />
          </RequireRole>
        ),
      },
      {
        path: "session/:id",
        element: (
          <RequireRole allow={["doctor", "patient"]}>
            <SessionPage />
          </RequireRole>
        ),
      },
      {
        path: "training",
        element: (
          <RequireRole allow={["patient"]}>
            <TrainingPage />
          </RequireRole>
        ),
      },
      // routes
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
