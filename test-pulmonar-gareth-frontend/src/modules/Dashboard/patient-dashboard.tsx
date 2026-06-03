import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Droplets,
  Heart,
  TrendingDown,
  TrendingUp,
  Wind,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { sessionService } from "@/modules/Session/data/session.service";
import { patientService } from "@/modules/Patient/data/patient.service";
import { trainingService } from "@/modules/Training/data/training.service";
import type { Session } from "@/modules/Session/session.interface";
import type { Profile } from "@/auth/auth.interface";
import type { TrainingLog } from "@/modules/Training/training.interface";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  user: Profile;
};

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sessionAverages(session: Session) {
  const recs = session.records ?? [];
  return {
    pulse: avg(recs.map((r) => r.pulse)),
    spo2: avg(recs.map((r) => r.oxygenSaturation)),
    pressure: avg(recs.map((r) => r.lungCapacity)),
    flow: avg(recs.map((r) => r.airFlow)),
  };
}

function compareTrend(current: number, previous: number, higherIsBetter = true) {
  if (!previous) return "estable";
  const diff = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(diff) < 3) return "estable";
  if (higherIsBetter) return diff > 0 ? "mejorando" : "revisar";
  return diff < 0 ? "mejorando" : "revisar";
}

export function PatientDashboard({ user }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [error, setError] = useState<string | null>(null);
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const patients = await patientService.findAll();
      const ownPatient = patients.find((p) => p.user.id === user.id);
      if (!ownPatient) {
        setSessions([]);
        setActiveSession(null);
        setError("No se encontro el perfil de paciente.");
        return;
      }

      const [history, active] = await Promise.all([
        sessionService.findByPatient(ownPatient.id),
        sessionService.getActive(),
      ]);

      const logs = await trainingService.getLogsByPatientUser(user.id);

      setSessions(history ?? []);
      setTrainingLogs(logs ?? []);
      if (active?.patient?.id === ownPatient.id) {
        setActiveSession(active);
      } else {
        setActiveSession(null);
      }
    } catch {
      setError("No se pudo cargar tu informacion de sesiones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user.id]);

  const filteredSessions = useMemo(() => {
    const days = Number(range);
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
    return sessions.filter((s) => new Date(s.startedAt).getTime() >= threshold);
  }, [sessions, range]);

  const latest = filteredSessions[0];
  const previous = filteredSessions[1];
  const latestAvg = latest ? sessionAverages(latest) : null;
  const previousAvg = previous ? sessionAverages(previous) : null;

  const globalTrend = useMemo(() => {
    if (!latestAvg || !previousAvg) return "estable";
    const spo2Trend = compareTrend(latestAvg.spo2, previousAvg.spo2, true);
    const pulseTrend = compareTrend(latestAvg.pulse, previousAvg.pulse, false);
    const pressureTrend = compareTrend(latestAvg.pressure, previousAvg.pressure, true);
    if (spo2Trend === "mejorando" || pulseTrend === "mejorando" || pressureTrend === "mejorando") {
      return "mejorando";
    }
    if (spo2Trend === "revisar" && pulseTrend === "revisar") {
      return "revisar";
    }
    return "estable";
  }, [latestAvg, previousAvg]);

  const trendData = useMemo(() => {
    return [...filteredSessions]
      .reverse()
      .slice(-10)
      .map((s, i) => {
        const m = sessionAverages(s);
        return {
          label: `S${i + 1}`,
          spo2: Number(m.spo2.toFixed(1)),
          pulse: Number(m.pulse.toFixed(1)),
          pressure: Number(m.pressure.toFixed(2)),
          flow: Number(m.flow.toFixed(1)),
        };
      });
  }, [filteredSessions]);

  const adherence = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const uniqueDays = new Set(
      trainingLogs
        .filter((log) => new Date(log.completedAt) >= start)
        .map((log) => new Date(log.completedAt).toLocaleDateString("es-ES")),
    );

    const days = uniqueDays.size;
    if (days >= 5) return { label: "Excelente", color: "default" as const, value: `${days}/7` };
    if (days >= 3) return { label: "Bien", color: "secondary" as const, value: `${days}/7` };
    return { label: "Baja", color: "outline" as const, value: `${days}/7` };
  }, [trainingLogs]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mi Progreso</h2>
          <p className="text-muted-foreground">Hola {user.fullname}, aqui puedes ver como vas.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <Card className={activeSession ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300" : "bg-gradient-to-r from-slate-50 to-sky-50"}>
        <CardContent className="py-5 flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Estado actual</div>
            <div className="text-xl font-semibold">
              {activeSession ? "Tienes una sesion activa" : "No tienes sesion activa"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {activeSession
                ? `Iniciada: ${new Date(activeSession.startedAt).toLocaleString("es-ES")}`
                : "Cuando tu doctor inicie terapia, aparecera aqui."}
            </div>
          </div>
          <Badge variant={activeSession ? "default" : "outline"} className="gap-1 text-sm">
            <Activity className="h-4 w-4" /> {activeSession ? "En terapia" : "En espera"}
          </Badge>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/70">
        <CardContent className="py-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Entrenamiento respiratorio diario</div>
            <div className="text-xs text-muted-foreground">
              Haz ejercicios por tiempo para mejorar fuerza y flujo de aire.
            </div>
          </div>
          <Button asChild>
            <Link to="/training">Ir a entrenamiento</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-6">
        <Kpi title="Pulso prom." value={latestAvg ? `${latestAvg.pulse.toFixed(0)} bpm` : "-"} icon={<Heart className="h-4 w-4" />} />
        <Kpi title="SpO2 prom." value={latestAvg ? `${latestAvg.spo2.toFixed(0)} %` : "-"} icon={<Droplets className="h-4 w-4" />} />
        <Kpi title="Presion prom." value={latestAvg ? `${latestAvg.pressure.toFixed(2)} kPa` : "-"} icon={<Wind className="h-4 w-4" />} />
        <Kpi title="Flujo prom." value={latestAvg ? `${latestAvg.flow.toFixed(1)} SLM` : "-"} icon={<Wind className="h-4 w-4" />} />
        <Kpi
          title="Tendencia"
          value={globalTrend === "mejorando" ? "Mejorando" : globalTrend === "revisar" ? "Revisar" : "Estable"}
          icon={globalTrend === "mejorando" ? <TrendingUp className="h-4 w-4" /> : globalTrend === "revisar" ? <TrendingDown className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        />
        <Card className="bg-gradient-to-br from-amber-50 to-lime-50">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Adherencia semanal</div>
              <div className="text-lg font-semibold">{adherence.value}</div>
              <div className="text-xs text-muted-foreground">{adherence.label}</div>
            </div>
            <Badge variant={adherence.color}>{adherence.label}</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Historial de sesiones</CardTitle>
              <CardDescription>Visual simple para entender si mejoras o no.</CardDescription>
            </div>
            <div className="flex gap-2">
              <RangeBtn value="7" current={range} onClick={setRange} />
              <RangeBtn value="30" current={range} onClick={setRange} />
              <RangeBtn value="90" current={range} onClick={setRange} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line dataKey="spo2" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                <Line dataKey="pulse" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                <Line dataKey="pressure" stroke="#059669" strokeWidth={2.5} dot={false} />
                <Line dataKey="flow" stroke="#7c3aed" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {filteredSessions.slice(0, 8).map((s) => {
              const m = sessionAverages(s);
              return (
                <div key={s.id} className="rounded-xl border p-3 bg-card/60 flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {new Date(s.startedAt).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock3 className="h-3.5 w-3.5" />
                      {s.endedAt
                        ? `${Math.max(0, (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000).toFixed(1)} min`
                        : "Sesion en curso"}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div>SpO2: {m.spo2.toFixed(0)}%</div>
                    <div>Pulso: {m.pulse.toFixed(0)} bpm</div>
                    <div>Presion: {m.pressure.toFixed(2)} kPa</div>
                    <div>Flujo: {m.flow.toFixed(1)} SLM</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <Card className="bg-gradient-to-br from-white to-slate-50">
      <CardContent className="py-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
        <Badge variant="outline">{icon}</Badge>
      </CardContent>
    </Card>
  );
}

function RangeBtn({
  value,
  current,
  onClick,
}: {
  value: "7" | "30" | "90";
  current: "7" | "30" | "90";
  onClick: (v: "7" | "30" | "90") => void;
}) {
  return (
    <Button variant={current === value ? "default" : "outline"} size="sm" onClick={() => onClick(value)}>
      {value}d
    </Button>
  );
}
