import type React from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import {
  Activity,
  LogOut,
  X,
  Moon,
  Sun,
  Home,
  UsersRound,
  User,
  Wifi,
  Dumbbell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../../lib/utils";
import { useAuthStore } from "@/auth/useAuth";
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  const role = user?.type?.toLowerCase();
  const isPatient = role === "patient";
  const isDoctor = role !== "patient";

  const navigationItems = [
    { name: "Dashboard", href: "/", icon: Home, show: true },
    { name: "Doctores", href: "/doctor", icon: UsersRound, show: isDoctor },
    {
      name: "Pacientes",
      href: "/patients",
      icon: User,
      show: isDoctor,
    },
    {
      name: "Datos en tiempo real",
      href: "/monitoring",
      icon: Wifi,
      show: isDoctor,
    },
    {
      name: "Entrenamiento",
      href: "/training",
      icon: Dumbbell,
      show: isPatient,
    },
  ].filter((item) => item.show);

  const handleLogout = () => {
    logout();
    onClose();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sidebar-primary/10 rounded-xl text-sidebar-primary">
                <Activity className="h-6 w-6" />
              </div>
              <div className="leading-tight">
                <span className="block text-base font-bold text-sidebar-foreground">
                  PulmoBiofeedback
                </span>
                <span className="block text-[11px] text-sidebar-foreground/70">
                  Test pulmonar · Biofeedback
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border space-y-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              onClick={toggleTheme}
              className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              {theme === "light" ? "Modo oscuro" : "Modo claro"}
            </Button>

            {/* User Info */}
            {user && (
              <div className="px-3 py-2 bg-sidebar-accent/50 rounded-lg">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.fullname}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {/* {user.email} */}
                </p>
              </div>
            )}

            {/* Logout */}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
