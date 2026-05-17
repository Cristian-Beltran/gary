import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, Heart, Droplets, Wind, Router, Wifi, WifiOff, Clock3, UserRound } from "lucide-react";
import { useAuthStore } from "@/auth/useAuth";
import { sessionService } from "@/modules/Session/data/session.service";
import { trainingService } from "@/modules/Training/data/training.service";
import type { Profile } from "@/auth/auth.interface";
import type {
  DeviceStatus,
  RealtimeTelemetry,
  Session,
} from "@/modules/Session/session.interface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PatientDashboard } from "./patient-dashboard";

type LivePoint = {
  time: string;
  pulse: number;
  spo2: number;
  pressure: number;
};

function fmtTime(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function patientLabel(session: Session | null) {
  if (!session) return "Sin paciente";
  const withUser = session as Session & {
    patient?: { id?: string; firstName?: string; lastName?: string; user?: { fullname?: string } };
  };
  return (
    withUser.patient?.user?.fullname ||
    `${withUser.patient?.firstName ?? ""} ${withUser.patient?.lastName ?? ""}`.trim() ||
    withUser.patient?.id ||
    "Paciente"
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (user?.type?.toLowerCase() === "patient") {
    return <PatientDashboard user={user} />;
  }

  return <ClinicianDashboard user={user} />;
}

function ClinicianDashboard({ user }: { user: Profile | null }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [latestTelemetry, setLatestTelemetry] = useState<RealtimeTelemetry | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [live, setLive] = useState<LivePoint[]>([]);
  const [appliedBySession, setAppliedBySession] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [allSessions, active, latest, status] = await Promise.all([
        sessionService.findAll(),
        sessionService.getActive(),
        sessionService.getLatestTelemetry(),
        sessionService.getDeviceStatus(),
      ]);
      setSessions(allSessions ?? []);
      setActiveSession(active);
      setLatestTelemetry(latest);
      setDeviceStatus(status);
      if (latest) {
        setLive((prev) => {
          if (prev.length && prev[prev.length - 1]?.time === fmtTime(latest.timestamp)) {
            return prev;
          }
          return [
            ...prev,
            {
              time: fmtTime(latest.timestamp),
              pulse: latest.pulse,
              spo2: latest.oxygenSaturation,
              pressure: latest.lungCapacity,
            },
          ].slice(-60);
        });
      }

      const recentSessionIds = (allSessions ?? []).slice(0, 8).map((s) => s.id);
      if (recentSessionIds.length) {
        const logsPerSession = await Promise.all(
          recentSessionIds.map(async (sessionId) => {
            try {
              const logs = await trainingService.getLogsBySession(sessionId);
              return [sessionId, logs.length] as const;
            } catch {
              return [sessionId, 0] as const;
            }
          }),
        );

        setAppliedBySession(
          Object.fromEntries(logsPerSession),
        );
      } else {
        setAppliedBySession({});
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const sessionsToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return sessions.filter((s) => new Date(s.startedAt) >= start).length;
  }, [sessions]);

  const appliedToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return sessions
      .filter((s) => new Date(s.startedAt) >= start)
      .reduce((acc, s) => acc + (appliedBySession[s.id] ?? 0), 0);
  }, [sessions, appliedBySession]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Panel de Terapia</h2>
          <p className="text-muted-foreground">Hola, {user?.fullname ?? "Doctor"}</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <InfoCard title="Sesion actual" value={activeSession ? "Activa" : "Sin sesion"} icon={<Activity className="h-4 w-4" />} />
        <InfoCard title="Paciente actual" value={patientLabel(activeSession)} icon={<UserRound className="h-4 w-4" />} />
        <InfoCard title="Sesiones hoy" value={String(sessionsToday)} icon={<Router className="h-4 w-4" />} />
        <InfoCard title="Ejercicios hoy" value={String(appliedToday)} icon={<Activity className="h-4 w-4" />} />
        <InfoCard
          title="ESP MQTT"
          value={deviceStatus?.online ? "Conectado" : "Desconectado"}
          icon={deviceStatus?.online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        />
      </div>

      <Card className="bg-gradient-to-r from-sky-50 to-emerald-50 border-sky-200/70">
        <CardContent className="py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Seguimiento en vivo de terapia</div>
            <div className="text-xs text-muted-foreground">
              Ultima actualizacion: {fmtTime(latestTelemetry?.timestamp)}
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Clock3 className="h-3.5 w-3.5" /> 5s refresh
          </Badge>
        </CardContent>
      </Card>

      <Card className="border-dotted">
        <CardHeader>
          <CardTitle>Estado del ESP</CardTitle>
          <CardDescription>Conectividad del dispositivo con broker MQTT</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Badge variant={deviceStatus?.wifiConnected ? "default" : "outline"}>
            WiFi: {deviceStatus?.wifiConnected ? "OK" : "OFF"}
          </Badge>
          <Badge variant={deviceStatus?.mqttConnected ? "default" : "outline"}>
            MQTT: {deviceStatus?.mqttConnected ? "OK" : "OFF"}
          </Badge>
          <Badge variant="outline">IP: {deviceStatus?.ip ?? "-"}</Badge>
          <Badge variant="outline">RSSI: {deviceStatus?.rssi ?? "-"}</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <MetricCard title="Pulso" value={latestTelemetry?.pulse} unit="bpm" icon={<Heart className="h-4 w-4" />} />
        <MetricCard title="SpO2" value={latestTelemetry?.oxygenSaturation} unit="%" icon={<Droplets className="h-4 w-4" />} />
        <MetricCard
          title="Presion respiratoria"
          value={latestTelemetry?.lungCapacity}
          unit="kPa"
          icon={<Wind className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tiempo real</CardTitle>
          <CardDescription>Ultimos valores recibidos por MQTT</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <MiniLine data={live} dataKey="pulse" color="#ef4444" title="Pulso" />
          <MiniLine data={live} dataKey="spo2" color="#2563eb" title="SpO2" />
          <MiniLine data={live} dataKey="pressure" color="#059669" title="Presion respiratoria" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ejercicios aplicados por sesion</CardTitle>
          <CardDescription>Resumen rapido de apoyo terapeutico reciente</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {sessions.slice(0, 8).map((s) => (
            <div key={s.id} className="rounded-lg border p-3 bg-card/60">
              <div className="text-xs text-muted-foreground">Sesion {s.id.slice(0, 8)}...</div>
              <div className="text-lg font-semibold">{appliedBySession[s.id] ?? 0}</div>
              <div className="text-xs text-muted-foreground">ejercicios aplicados</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <Card className="bg-gradient-to-br from-white to-slate-50 border-dotted">
      <CardContent className="py-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="font-semibold">{value}</div>
        </div>
        <Badge variant="outline">{icon}</Badge>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  title,
  value,
  unit,
  icon,
}: {
  title: string;
  value?: number;
  unit: string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{Number.isFinite(value) ? `${Number(value).toFixed(1)} ${unit}` : "-"}</div>
      </CardContent>
    </Card>
  );
}

function MiniLine({
  data,
  dataKey,
  color,
  title,
}: {
  data: LivePoint[];
  dataKey: "pulse" | "spo2" | "pressure";
  color: string;
  title: string;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="time" hide />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
