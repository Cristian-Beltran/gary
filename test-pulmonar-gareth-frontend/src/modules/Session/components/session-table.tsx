import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Session } from "../session.interface";

type Props = {
  sessions: Session[];
};

export function SessionsTable({ sessions }: Props) {
  if (!sessions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sesiones filtradas</CardTitle>
          <CardDescription>No hay resultados con los filtros actuales</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((s) => {
        const records = s.records ?? [];
        const duration = s.endedAt
          ? Math.max(
              0,
              (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000,
            )
          : null;

        return (
          <Card key={s.id} className="border-dotted">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Sesion {s.id.slice(0, 8)}...</CardTitle>
                  <CardDescription>
                    Inicio {new Date(s.startedAt).toLocaleString("es-ES")}
                    {s.endedAt ? ` · Fin ${new Date(s.endedAt).toLocaleString("es-ES")}` : ""}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={s.endedAt ? "outline" : "default"}>
                    {s.endedAt ? "Cerrada" : "Activa"}
                  </Badge>
                  <Badge variant="secondary">{records.length} lecturas</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-4 text-sm">
                <Stat label="Duracion" value={duration == null ? "En curso" : `${duration.toFixed(1)} min`} />
                <Stat
                  label="Pulso prom"
                  value={`${avg(records.map((r) => r.pulse)).toFixed(1)} bpm`}
                />
                <Stat
                  label="SpO2 prom"
                  value={`${avg(records.map((r) => r.oxygenSaturation)).toFixed(1)} %`}
                />
                <Stat
                  label="Presion prom"
                  value={`${avg(records.map((r) => r.lungCapacity)).toFixed(2)} kPa`}
                />
              </div>

              <div className="overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left p-2">Hora</th>
                      <th className="text-left p-2">Pulso</th>
                      <th className="text-left p-2">SpO2</th>
                      <th className="text-left p-2">Presion respiratoria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(-15).map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2">{new Date(r.recordedAt).toLocaleTimeString("es-ES")}</td>
                        <td className="p-2">{r.pulse}</td>
                        <td className="p-2">{r.oxygenSaturation}</td>
                        <td className="p-2">{r.lungCapacity.toFixed(2)} kPa</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function avg(list: number[]) {
  if (!list.length) return 0;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 bg-card/50">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
