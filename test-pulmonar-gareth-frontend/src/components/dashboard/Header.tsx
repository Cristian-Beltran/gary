import React from "react";
import { Activity, BadgeCheck, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/auth/useAuth";

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user } = useAuthStore();

  const initials = React.useMemo(() => {
    const name = user?.fullname ?? "Usuario";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }, [user?.fullname]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-gradient-to-r from-primary/15 via-primary/10 to-transparent backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="lg:hidden shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-primary/15 text-primary">
                <Activity className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-semibold text-card-foreground truncate">
                    Bienvenido, {user?.fullname ?? "Usuario"}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    PulmoBiofeedback
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Sistema de Test Pulmonar con Biofeedback en tiempo real
                </p>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-sm">
                <span className="text-sm font-semibold">{initials}</span>
              </div>
              <div className="hidden lg:flex flex-col leading-tight">
                <span className="text-sm font-medium text-card-foreground">
                  {user?.fullname ?? "Usuario"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Conectado
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
