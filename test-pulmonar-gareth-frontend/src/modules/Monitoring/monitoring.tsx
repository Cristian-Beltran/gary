import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import mqtt from "mqtt";
import type { MqttClient } from "mqtt";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { sessionService } from "@/modules/Session/data/session.service";
import { patientService } from "@/modules/Patient/data/patient.service";
import { trainingService } from "@/modules/Training/data/training.service";
import type { Session } from "@/modules/Session/session.interface";
import type { Patient } from "@/modules/Patient/patient.interface";
import type { TrainingExercise } from "@/modules/Training/training.interface";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, Activity, Droplets, Wind } from "lucide-react";
import { useAuthStore } from "@/auth/useAuth";

const MQTT_BROKER_URL = "ws://broker.hivemq.com:8000/mqtt";
const MQTT_TOPIC = "gary/device/telemetry";

type RealtimeRow = {
  timestamp: string;
  pulse: number;
  oxygenSaturation: number;
  lungCapacity: number;
  state?: string;
};

function fmtTime(iso?: string) {
  return iso
    ? new Date(iso).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "-";
}

function parseGaryPayload(raw: string): RealtimeRow | null {
  const message = raw.trim();
  if (!message || !message.startsWith("{") || !message.endsWith("}")) {
    return null;
  }

  try {
    const obj = JSON.parse(message) as Record<string, unknown>;
    const pulse = Number(obj.pulse ?? obj.heartRateBpm ?? obj.bpm);
    const oxygenSaturation = Number(
      obj.oxygenSaturation ?? obj.spo2 ?? obj.spo2Filtered,
    );
    const lungCapacity = Number(
      obj.lungCapacity ?? obj.lungPressureKpa ?? obj.pressure,
    );

    if (
      Number.isFinite(pulse) &&
      Number.isFinite(oxygenSaturation) &&
      Number.isFinite(lungCapacity)
    ) {
      return {
        pulse,
        oxygenSaturation,
        lungCapacity,
        state: typeof obj.state === "string" ? obj.state : undefined,
        timestamp:
          typeof obj.timestamp === "string"
            ? obj.timestamp
            : new Date().toISOString(),
      };
    }
  } catch {
    return null;
  }

  return null;
}

export default function MonitoringPage() {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [realtime, setRealtime] = useState<RealtimeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [doctorExercises, setDoctorExercises] = useState<TrainingExercise[]>([]);
  const [appliedExerciseIds, setAppliedExerciseIds] = useState<string[]>([]);
  const [appliedCount, setAppliedCount] = useState(0);
  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [patientsData, activeSession] = await Promise.all([
          patientService.findAll(),
          sessionService.getActive(),
        ]);
        setPatients(patientsData ?? []);
        setSession(activeSession);
        if (activeSession?.patient?.id) {
          setPatientId(activeSession.patient.id);
        }
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "No se pudo cargar la vista de terapia.";
        setError(message);
      }
    })();
  }, []);

  useEffect(() => {
    if (user?.type === "patient") return;
    (async () => {
      try {
        const data = await trainingService.getDoctorExercises();
        setDoctorExercises(data ?? []);
      } catch {
        setDoctorExercises([]);
      }
    })();
  }, [user?.type]);

  useEffect(() => {
    if (!session?.id || user?.type === "patient") {
      setAppliedCount(0);
      return;
    }

    (async () => {
      try {
        const logs = await trainingService.getLogsBySession(session.id);
        setAppliedCount(logs.length);
      } catch {
        setAppliedCount(0);
      }
    })();
  }, [session?.id, user?.type]);

  const markDoctorExercise = async (ex: TrainingExercise) => {
    const isApplied = appliedExerciseIds.includes(ex.id);
    if (isApplied) {
      setAppliedExerciseIds((prev) => prev.filter((id) => id !== ex.id));
      return;
    }

    setAppliedExerciseIds((prev) => [...prev, ex.id]);

    if (!session?.id || !user?.id) {
      return;
    }

    const patientUserId = patients.find((p) => p.id === session.patient.id)?.user.id;
    if (!patientUserId) {
      return;
    }

    try {
      await trainingService.createLog({
        patientUserId,
        doctorUserId: user.id,
        sessionId: session.id,
        source: "doctor",
        exerciseId: ex.id,
        durationSec: ex.durationSec,
        rounds: ex.rounds ?? 1,
      });
      setAppliedCount((prev) => prev + 1);
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER_URL, {
      reconnectPeriod: 3000,
      clean: true,
      clientId: `gary-frontend-${Math.random().toString(16).slice(2, 10)}`,
    });

    clientRef.current = client;

    client.on("connect", () => {
      setMqttConnected(true);
      client.subscribe(MQTT_TOPIC);
    });

    client.on("reconnect", () => setMqttConnected(false));
    client.on("close", () => setMqttConnected(false));
    client.on("error", () => setMqttConnected(false));

    client.on("message", (_topic, payload) => {
      const reading = parseGaryPayload(payload.toString());
      if (!reading) {
        return;
      }
      setRealtime((prev) => [...prev, reading].slice(-200));
    });

    return () => {
      client.end(true);
      clientRef.current = null;
    };
  }, []);

  const handleCreateSession = async () => {
    if (!patientId || session) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const created = await sessionService.create({ patientId });
      setSession(created);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No se pudo iniciar la terapia.";
      setError(message);
      const active = await sessionService.getActive();
      if (active) {
        setSession(active);
        setPatientId(active.patient.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async () => {
    if (!session?.id) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await sessionService.close(session.id);
      setSession(null);
      setPatientId("");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "No se pudo cerrar la sesion.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const last = realtime.at(-1);
  const canCreate = !!patientId && !session && !loading;
  const canClose = !!session && !loading;

  const chartData = useMemo(
    () =>
      realtime.slice(-30).map((row) => ({
        time: fmtTime(row.timestamp),
        pulse: row.pulse,
        spo2: row.oxygenSaturation,
        pressure: row.lungCapacity,
      })),
    [realtime],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Terapia Respiratoria</h2>
          <p className="text-muted-foreground">
            Monitoreo en vivo por MQTT y guardado en backend cada 1 minuto
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={mqttConnected ? "default" : "secondary"}>
            MQTT {mqttConnected ? "conectado" : "desconectado"}
          </Badge>
          <Badge variant={session ? "default" : "outline"}>
            {session ? "Sesion activa" : "Sin sesion activa"}
          </Badge>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className={session ? "border-amber-500/50" : ""}>
        <CardHeader>
          <CardTitle>Sesion de terapia global</CardTitle>
          <CardDescription>
            Solo puede existir una sesion activa para todo el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-50/40 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Ya existe una sesion activa
              </div>
              <div className="mt-1 text-muted-foreground">
                Paciente ID: {session.patient.id} · Inicio: {fmtTime(session.startedAt)}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-green-500/40 bg-green-50/40 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Check className="h-4 w-4" />
                No hay sesion activa, puedes iniciar terapia.
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <select
              className="w-full rounded-md border px-3 py-2 bg-background"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              disabled={!!session || loading}
            >
              <option value="">- Selecciona paciente -</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.fullname}
                </option>
              ))}
            </select>
            <Button onClick={handleCreateSession} disabled={!canCreate}>
              Iniciar terapia
            </Button>
            <Button variant="destructive" onClick={handleCloseSession} disabled={!canClose}>
              Finalizar terapia
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lecturas en vivo (Gary)</CardTitle>
          <CardDescription>
            Estado: {last?.state ?? "SIN DATO"} · Ultima lectura: {fmtTime(last?.timestamp)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Metric title="Pulso" value={last?.pulse} unit="bpm" icon={<Activity className="h-4 w-4" />} />
            <Metric title="SpO2" value={last?.oxygenSaturation} unit="%" icon={<Droplets className="h-4 w-4" />} />
            <Metric
              title="Presion respiratoria"
              value={last?.lungCapacity}
              unit="kPa"
              icon={<Wind className="h-4 w-4" />}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Graficas de terapia</CardTitle>
          <CardDescription>Ultimos 30 puntos recibidos por MQTT</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <GraphCard title="Pulso (bpm)" dataKey="pulse" data={chartData} color="#ef4444" />
          <GraphCard title="SpO2 (%)" dataKey="spo2" data={chartData} color="#2563eb" />
          <GraphCard
            title="Presion respiratoria (kPa)"
            dataKey="pressure"
            data={chartData}
            color="#059669"
          />
        </CardContent>
      </Card>

      {user?.type !== "patient" && (
        <Card className="border-dotted bg-gradient-to-r from-rose-50 to-orange-50">
          <CardHeader>
            <CardTitle>Ejercicios guiados para aplicar en medicion</CardTitle>
            <CardDescription>
              Sugerencias rapidas para mejorar tecnica del paciente durante la terapia.
            </CardDescription>
            <Badge variant="outline" className="w-fit">Aplicados en sesion: {appliedCount}</Badge>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {doctorExercises.map((ex) => {
              const applied = appliedExerciseIds.includes(ex.id);
              return (
                <div key={ex.id} className="rounded-xl border p-3 bg-white/70 space-y-2">
                  <div className="font-medium">{ex.title}</div>
                  <div className="text-xs text-muted-foreground">{ex.cue ?? "Ejercicio de apoyo"}</div>
                  <div className="text-xs">Duracion sugerida: {ex.durationSec}s</div>
                  <Button
                    size="sm"
                    variant={applied ? "outline" : "default"}
                    className="w-full"
                    onClick={() => void markDoctorExercise(ex)}
                  >
                    {applied ? "Aplicado" : "Marcar como aplicado"}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({
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
  const v = Number.isFinite(value) ? Number(value) : null;
  return (
    <div className="rounded-xl border p-3 bg-card/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Badge variant="outline" className="font-mono text-[11px]">
          {v === null ? "-" : `${v.toFixed(1)} ${unit}`}
        </Badge>
      </div>
    </div>
  );
}

function GraphCard({
  title,
  dataKey,
  data,
  color,
}: {
  title: string;
  dataKey: string;
  data: Array<Record<string, string | number>>;
  color: string;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="time" hide />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
