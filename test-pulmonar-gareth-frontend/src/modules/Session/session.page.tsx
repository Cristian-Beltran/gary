import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { RotateCcw, Search, CalendarDays, Filter, Activity, Waves } from "lucide-react";
import { DashboardHeader } from "@/components/headerPage";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sessionStore } from "./data/session.store";
import { SessionsTable } from "./components/session-table";
import { SessionCharts } from "./components/session-charts";

export default function SessionPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const { sessions, isLoading, error, fetchByPatient } = sessionStore();

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (patientId) void fetchByPatient(patientId);
  }, [patientId, fetchByPatient]);

  const onReload = () => {
    if (patientId) void fetchByPatient(patientId);
  };

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (statusFilter === "active" && s.endedAt) return false;
      if (statusFilter === "closed" && !s.endedAt) return false;

      const started = new Date(s.startedAt).getTime();
      if (fromDate) {
        const from = new Date(fromDate).getTime();
        if (started < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate + "T23:59:59").getTime();
        if (started > to) return false;
      }

      if (query) {
        const q = query.toLowerCase();
        if (!s.id.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [sessions, statusFilter, fromDate, toDate, query]);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Historial de sesiones"
        description="Analitica por sesion y detalle de lecturas del paciente"
        actions={
          <Button size="icon" variant="outline" onClick={onReload} disabled={isLoading}>
            <RotateCcw />
          </Button>
        }
      />

      <Card className="border-dotted bg-gradient-to-r from-slate-50 to-cyan-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filtros de sesion</CardTitle>
          <CardDescription>Filtra por estado, rango de fecha e identificador</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <select
            className="rounded-md border px-3 py-2 bg-background"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "closed")}
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="closed">Cerradas</option>
          </select>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
            type="date"
            className="rounded-md border pl-9 pr-3 py-2 bg-background w-full"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
            type="date"
            className="rounded-md border pl-9 pr-3 py-2 bg-background w-full"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-2 rounded-md border px-3 py-2 bg-background">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar por ID de sesion"
              className="w-full bg-transparent outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Badge variant="outline" className="gap-1"><Activity className="h-3.5 w-3.5" /> Total: {sessions.length}</Badge>
        <Badge variant="secondary" className="gap-1"><Filter className="h-3.5 w-3.5" /> Filtradas: {filtered.length}</Badge>
        <Badge variant="default" className="gap-1"><Waves className="h-3.5 w-3.5" /> Activas: {filtered.filter((s) => !s.endedAt).length}</Badge>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="charts" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="charts">Graficas</TabsTrigger>
          <TabsTrigger value="table">Sesion y datos</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          <SessionCharts sessions={filtered} />
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <SessionsTable sessions={filtered} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
