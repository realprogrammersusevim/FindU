import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { MobileLayout } from "./components/layout/MobileLayout";
import { MapPage } from "./pages/MapPage";
import { FriendsPage } from "./pages/FriendsPage";
import { GroupsPage } from "./pages/GroupsPage";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { ProfilePage } from "./pages/ProfilePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { useApp } from "./store/AppContext";

function ProtectedRoute() {
  const { isAuthenticated } = useApp();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  { path: "login", Component: LoginPage },
  { path: "register", Component: RegisterPage },
  {
    path: "/",
    Component: ProtectedRoute,
    children: [
      {
        Component: MobileLayout,
        children: [
          { index: true, element: <Navigate to="/map" replace /> },
          { path: "map", Component: MapPage },
          { path: "friends", Component: FriendsPage },
          { path: "groups", Component: GroupsPage },
          { path: "groups/:groupId", Component: GroupDetailPage },
          { path: "privacy", Component: PrivacyPage },
          { path: "profile", Component: ProfilePage },
          { path: "*", element: <Navigate to="/map" replace /> },
        ],
      },
    ],
  },
]);
