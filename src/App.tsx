import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { RequireReady, RequireRole, useSession } from "@/lib/session";
import { PageSkeleton } from "@/components/ui";

const SetupPage = lazy(() =>
  import("@/pages/SetupPage").then((m) => ({ default: m.SetupPage })),
);
const LoginPage = lazy(() =>
  import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const UserTickets = lazy(() =>
  import("@/pages/user/UserTickets").then((m) => ({ default: m.UserTickets })),
);
const TicketNew = lazy(() =>
  import("@/pages/user/TicketNew").then((m) => ({ default: m.TicketNew })),
);
const UserTicketDetail = lazy(() =>
  import("@/pages/user/UserTicketDetail").then((m) => ({
    default: m.UserTicketDetail,
  })),
);
const StaffQueue = lazy(() =>
  import("@/pages/staff/StaffQueue").then((m) => ({ default: m.StaffQueue })),
);
const StaffTicketDetail = lazy(() =>
  import("@/pages/staff/StaffTicketDetail").then((m) => ({
    default: m.StaffTicketDetail,
  })),
);
const AdminDashboard = lazy(() =>
  import("@/pages/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })),
);
const AdminSettings = lazy(() =>
  import("@/pages/admin/AdminSettings").then((m) => ({ default: m.AdminSettings })),
);
const AdminAssets = lazy(() =>
  import("@/pages/admin/AdminAssets").then((m) => ({ default: m.AdminAssets })),
);
const AdminPM = lazy(() =>
  import("@/pages/admin/AdminPM").then((m) => ({ default: m.AdminPM })),
);
const NotFound = lazy(() =>
  import("@/pages/NotFound").then((m) => ({ default: m.NotFound })),
);

function HomeRedirect() {
  const { status, user } = useSession();
  if (status === "no-config") return <Navigate to="/setup" replace />;
  if (status !== "ready") return <Navigate to="/login" replace />;
  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  if (user?.role === "staff") return <Navigate to="/staff" replace />;
  return <Navigate to="/app" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireReady>
              <Layout />
            </RequireReady>
          }
        >
          <Route path="/app" element={<UserTickets />} />
          <Route path="/app/new" element={<TicketNew />} />
          <Route path="/app/tickets/:id" element={<UserTicketDetail />} />
          <Route
            path="/staff"
            element={
              <RequireRole role="staff">
                <StaffQueue />
              </RequireRole>
            }
          />
          <Route
            path="/staff/tickets/:id"
            element={
              <RequireRole role="staff">
                <StaffTicketDetail />
              </RequireRole>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RequireRole role="admin">
                <AdminSettings />
              </RequireRole>
            }
          />
          <Route
            path="/admin/assets"
            element={
              <RequireRole role="admin">
                <AdminAssets />
              </RequireRole>
            }
          />
          <Route
            path="/admin/pm"
            element={
              <RequireRole role="admin">
                <AdminPM />
              </RequireRole>
            }
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
