import type React from "react";
import { Wind } from "lucide-react";

const gradients =
  "bg-[radial-gradient(ellipse_at_top_left,theme(colors.primary/25),transparent_50%),radial-gradient(ellipse_at_bottom_right,theme(colors.secondary/25),transparent_50%)]";

const AuthHero: React.FC = () => {
  return (
    <div
      className={`hidden lg:flex relative items-center justify-center p-10 ${gradients} overflow-hidden`}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-60 select-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(transparent 0 0), radial-gradient(circle at 20% 30%, rgba(255,255,255,.06) 0 40%, transparent 41%), radial-gradient(circle at 80% 70%, rgba(255,255,255,.05) 0 35%, transparent 36%)",
        }}
      />
      <div className="relative z-10 max-w-md text-left">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-foreground/80 bg-background/60 backdrop-blur">
          <Activity className="h-3.5 w-3.5" />
          PulmoBiofeedback · Test en tiempo real
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight">
          Sistema de Test Pulmonar con Biofeedback
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Evalúa capacidad pulmonar (FEV1/FEV6, SpO₂, ritmo respiratorio) y
          ofrece retroalimentación en vivo para mejorar la adherencia
          terapéutica.
        </p>
        <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
          <Wind className="h-4 w-4" />
          Compatible con un único dispositivo conectado.
        </div>
      </div>
    </div>
  );
};

// ==============================
// PARTE 2 — LoginPage.tsx (sin AuthLayout, full-screen responsive)
// ==============================
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/auth/useAuth";

const formSchema = z.object({
  email: z.string().email({
    message: "Por favor ingrese un correo electrónico válido.",
  }),
  password: z.string().min(6, {
    message: "La contraseña debe tener al menos 6 caracteres.",
  }),
});

export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setServerError("");
    try {
      await login({ email: values.email, password: values.password });
      navigate("/");
    } catch (e) {
      if (e) {
        form.setError("email", { type: "server", message: " " });
        form.setError("password", { type: "server", message: " " });
        setServerError("Credenciales inválidas o sesión no autorizada.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </div>
      </div>
    );
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Panel Hero (izquierda) */}
      <AuthHero />

      {/* Panel Form (derecha) */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Branding compacto */}
          <div className="mb-6 flex items-center gap-2 text-foreground/80">
            <div className="p-2 rounded-lg bg-primary/15 text-primary">
              <Activity className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-medium">PulmoBiofeedback</p>
              <p className="text-xs text-muted-foreground">
                Test pulmonar con biofeedback
              </p>
            </div>
          </div>

          <Card className="border-border/80 bg-card/95 backdrop-blur">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl text-card-foreground">
                Bienvenido de vuelta
              </CardTitle>
              <CardDescription>
                Ingresa tus credenciales para continuar
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  {serverError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{serverError}</AlertDescription>
                    </Alert>
                  )}

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80 font-medium">
                          Correo electrónico
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="admin@pulmo.app"
                              className="pl-10 h-12 rounded-lg border-input/60 focus-visible:ring-2 focus-visible:ring-primary/40"
                              autoComplete="email"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-foreground/80 font-medium">
                            Contraseña
                          </FormLabel>
                          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                            <ShieldCheck className="h-3.5 w-3.5" /> Acceso
                            seguro
                          </div>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="pl-10 pr-10 h-12 rounded-lg border-input/60 focus-visible:ring-2 focus-visible:ring-primary/40"
                              autoComplete="current-password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowPassword((v) => !v)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              <span className="sr-only">
                                {showPassword
                                  ? "Ocultar contraseña"
                                  : "Mostrar contraseña"}
                              </span>
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-lg text-base font-medium transition-all duration-200 hover:shadow-md"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando…
                      </>
                    ) : (
                      "Iniciar sesión"
                    )}
                  </Button>

                  <div className="text-xs text-muted-foreground text-center">
                    Al continuar, aceptas nuestras políticas de privacidad.
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
