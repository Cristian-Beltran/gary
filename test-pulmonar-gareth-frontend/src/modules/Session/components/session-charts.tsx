import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Session } from "../session.interface";

type Props = {
  sessions: Session[];
};

export function SessionCharts({ sessions }: Props) {
  const perSession = useMemo(() => {
    return sessions.map((s, idx) => {
      const recs = s.records ?? [];
      const pulse = recs.map((r) => r.pulse);
      const spo2 = recs.map((r) => r.oxygenSaturation);
      const pressure = recs.map((r) => r.lungCapacity);
      const flow = recs.map((r) => r.airFlow);
      const avg = (arr: number[]) =>
        arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const durationMin = s.endedAt
        ? (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000
        : 0;
      return {
        key: `S${idx + 1}`,
        date: new Date(s.startedAt).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
        }),
        avgPulse: Number(avg(pulse).toFixed(1)),
        avgSpo2: Number(avg(spo2).toFixed(1)),
        avgPressure: Number(avg(pressure).toFixed(2)),
        avgFlow: Number(avg(flow).toFixed(1)),
        durationMin: Number(durationMin.toFixed(1)),
      };
    });
  }, [sessions]);

  const timeline = useMemo(() => {
    const points: Array<{ time: string; pulse: number; spo2: number; pressure: number; flow: number }> = [];
    sessions.forEach((s) => {
      (s.records ?? []).forEach((r) => {
        points.push({
          time: new Date(r.recordedAt).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          pulse: r.pulse,
          spo2: r.oxygenSaturation,
          pressure: r.lungCapacity,
          flow: r.airFlow,
        });
      });
    });
    return points.slice(-120);
  }, [sessions]);

  if (!sessions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analitica de sesiones</CardTitle>
          <CardDescription>No hay sesiones para graficar</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="border-dotted">
        <CardHeader>
          <CardTitle>Promedios por sesion</CardTitle>
          <CardDescription>Pulso, SpO2, presion respiratoria y flujo</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={perSession}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
              <XAxis dataKey="key" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgPulse" stroke="#ef4444" dot={false} />
              <Line type="monotone" dataKey="avgSpo2" stroke="#2563eb" dot={false} />
              <Line type="monotone" dataKey="avgPressure" stroke="#059669" dot={false} />
              <Line type="monotone" dataKey="avgFlow" stroke="#7c3aed" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Duracion por sesion</CardTitle>
          <CardDescription>Minutos de terapia por registro</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perSession}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="durationMin" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Linea de tiempo de lecturas</CardTitle>
          <CardDescription>Ultimos 120 puntos de sesiones filtradas</CardDescription>
        </CardHeader>
        <CardContent className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
              <XAxis dataKey="time" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="pulse" stroke="#ef4444" dot={false} />
              <Line type="monotone" dataKey="spo2" stroke="#2563eb" dot={false} />
              <Line type="monotone" dataKey="pressure" stroke="#059669" dot={false} />
              <Line type="monotone" dataKey="flow" stroke="#7c3aed" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
