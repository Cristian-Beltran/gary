import { useEffect, useMemo, useState } from "react";
import { Activity, Clock3, PlayCircle, Wind, Waves, Gauge } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/auth/useAuth";
import { trainingService } from "./data/training.service";
import type { TrainingExercise } from "./training.interface";

type UiExercise = TrainingExercise & { color: string };
type BreathPhase = "inhale" | "hold" | "exhale" | "rest";

const EXERCISE_COLORS = [
  "from-emerald-50 to-teal-50",
  "from-sky-50 to-cyan-50",
  "from-violet-50 to-fuchsia-50",
];

const FALLBACK_EXERCISES: UiExercise[] = [
  {
    id: "force-1",
    title: "Soplido sostenido",
    goal: "Mejorar fuerza espiratoria",
    durationSec: 20,
    rounds: 5,
    restSec: 20,
    level: "Basico",
    color: "from-emerald-50 to-teal-50",
  },
  {
    id: "flow-1",
    title: "Ritmo 4-4",
    goal: "Mejorar flujo de aire",
    durationSec: 16,
    rounds: 6,
    restSec: 15,
    level: "Basico",
    color: "from-sky-50 to-cyan-50",
  },
  {
    id: "flow-2",
    title: "Diafragmatica guiada",
    goal: "Controlar respiracion",
    durationSec: 30,
    rounds: 4,
    restSec: 25,
    level: "Medio",
    color: "from-violet-50 to-fuchsia-50",
  },
];

export default function TrainingPage() {
  const { user } = useAuthStore();
  const [exercises, setExercises] = useState<UiExercise[]>(FALLBACK_EXERCISES);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [phase, setPhase] = useState<BreathPhase>("inhale");
  const [phaseRemaining, setPhaseRemaining] = useState(4);
  const [round, setRound] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const apiExercises = await trainingService.getPatientExercises();
        const mapped: UiExercise[] = apiExercises.map((ex, idx) => ({
          ...ex,
          rounds: ex.rounds ?? 4,
          restSec: ex.restSec ?? 20,
          level: ex.level ?? "Basico",
          color: EXERCISE_COLORS[idx % EXERCISE_COLORS.length],
        }));
        if (mapped.length) {
          setExercises(mapped);
        }
      } catch {
        // keep fallback
      }
    })();
  }, []);

  const activeExercise = useMemo(
    () => exercises.find((e) => e.id === activeId) ?? null,
    [activeId, exercises],
  );

  const phaseConfig = useMemo(() => {
    if (!activeExercise) return null;
    const exhaleSec = Math.max(4, Math.round(activeExercise.durationSec * 0.4));
    const inhaleSec = Math.max(3, Math.round(activeExercise.durationSec * 0.3));
    const holdSec = Math.max(2, activeExercise.durationSec - exhaleSec - inhaleSec);
    const restSec = activeExercise.restSec ?? 20;
    return { inhaleSec, holdSec, exhaleSec, restSec };
  }, [activeExercise]);

  const phaseLabel: Record<BreathPhase, string> = {
    inhale: "Inhala",
    hold: "Sosten",
    exhale: "Exhala",
    rest: "Descansa",
  };

  const phaseColor: Record<BreathPhase, string> = {
    inhale: "#2563eb",
    hold: "#d97706",
    exhale: "#059669",
    rest: "#6b7280",
  };

  const startExercise = (id: string) => {
    setActiveId(id);
    setRound(1);
    setPhase("inhale");
    setPhaseRemaining(4);
    setIsPaused(false);
  };

  const cancelExercise = () => {
    setActiveId(null);
    setRound(1);
    setPhase("inhale");
    setPhaseRemaining(4);
    setIsPaused(false);
  };

  useEffect(() => {
    if (!activeExercise || !phaseConfig || isPaused) return;

    const phaseDurations: Record<BreathPhase, number> = {
      inhale: phaseConfig.inhaleSec,
      hold: phaseConfig.holdSec,
      exhale: phaseConfig.exhaleSec,
      rest: phaseConfig.restSec,
    };

    if (phaseRemaining <= 0) {
      if (phase === "inhale") {
        setPhase("hold");
        setPhaseRemaining(phaseDurations.hold);
      } else if (phase === "hold") {
        setPhase("exhale");
        setPhaseRemaining(phaseDurations.exhale);
      } else if (phase === "exhale") {
        if (round >= (activeExercise.rounds ?? 1)) {
          void markCompleted(activeExercise);
          return;
        }
        setPhase("rest");
        setPhaseRemaining(phaseDurations.rest);
      } else {
        setRound((r) => r + 1);
        setPhase("inhale");
        setPhaseRemaining(phaseDurations.inhale);
      }
      return;
    }

    const timer = setTimeout(() => {
      setPhaseRemaining((s) => s - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [activeExercise, phase, phaseConfig, phaseRemaining, round, isPaused]);

  useEffect(() => {
    if (!activeExercise || !phaseConfig) return;
    setPhase("inhale");
    setPhaseRemaining(phaseConfig.inhaleSec);
  }, [activeExercise, phaseConfig?.inhaleSec]);

  const markCompleted = async (exercise: UiExercise) => {
    setCompletedToday((prev) =>
      prev.includes(exercise.id) ? prev : [...prev, exercise.id],
    );
    setActiveId(null);
    if (!user) return;

    try {
      await trainingService.createLog({
        patientUserId: user.id,
        source: "patient",
        exerciseId: exercise.id,
        durationSec: exercise.durationSec,
        rounds: exercise.rounds ?? 1,
      });
    } catch {
      // silent fallback for offline flow
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Entrenamiento Respiratorio</h2>
          <p className="text-muted-foreground">
            Rutina simple para mejorar fuerza y flujo de aire.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Activity className="h-3.5 w-3.5" /> Completados hoy: {completedToday.length}/
          {exercises.length}
        </Badge>
      </div>

      <Card className="bg-gradient-to-r from-amber-50 to-lime-50 border-amber-200/70">
        <CardContent className="py-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            Haz una rutina diaria para recuperar mejor capacidad pulmonar.
          </div>
          <Badge variant="secondary">Meta: 10-15 min</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {exercises.map((ex) => {
          const done = completedToday.includes(ex.id);
          return (
            <Card key={ex.id} className={`bg-gradient-to-br ${ex.color} border-dotted`}>
              <CardHeader>
                <CardTitle className="text-lg">{ex.title}</CardTitle>
                <CardDescription>{ex.goal}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Clock3 className="h-3.5 w-3.5" /> {ex.durationSec}s
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Gauge className="h-3.5 w-3.5" /> {ex.rounds} rondas
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Wind className="h-3.5 w-3.5" /> Descanso {ex.restSec}s
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">Nivel: {ex.level}</div>

                {activeId === ex.id ? (
                  <div className="space-y-2">
                    <div className="rounded-md border bg-white/70 p-2 text-xs flex items-center justify-between">
                      <span>
                        En curso: ronda {round}/{ex.rounds}
                      </span>
                      <Badge variant="outline">{phaseLabel[phase]}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setIsPaused((p) => !p)}>
                        {isPaused ? "Reanudar" : "Pausar"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelExercise}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    variant={done ? "outline" : "default"}
                    onClick={() => startExercise(ex.id)}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    {done ? "Repetir ejercicio" : "Iniciar ejercicio"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Waves className="h-5 w-5" /> Consejos rapidos
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <div>- Si te mareas, detente y descansa 1-2 minutos.</div>
          <div>- Mantén espalda recta y hombros relajados.</div>
          <div>- La constancia diaria mejora la recuperacion.</div>
        </CardContent>
      </Card>

      {activeExercise && (
        <Card className="border-emerald-300/60 bg-gradient-to-r from-blue-50 to-emerald-50">
          <CardHeader>
            <CardTitle>Ejercicio actual: {activeExercise.title}</CardTitle>
            <CardDescription>
              {activeExercise.rounds} rondas x {activeExercise.durationSec}s con descanso de {activeExercise.restSec}s
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="flex flex-col items-center gap-4">
              <div
                className="h-44 w-44 rounded-full flex items-center justify-center border-8 shadow-inner transition-all duration-500"
                style={{
                  borderColor: phaseColor[phase],
                  transform:
                    phase === "inhale"
                      ? "scale(1.08)"
                      : phase === "exhale"
                        ? "scale(0.92)"
                        : "scale(1)",
                  background:
                    phase === "inhale"
                      ? "radial-gradient(circle, rgba(37,99,235,0.15), rgba(255,255,255,0.8))"
                      : phase === "hold"
                        ? "radial-gradient(circle, rgba(217,119,6,0.15), rgba(255,255,255,0.8))"
                        : phase === "exhale"
                          ? "radial-gradient(circle, rgba(5,150,105,0.15), rgba(255,255,255,0.8))"
                          : "radial-gradient(circle, rgba(107,114,128,0.12), rgba(255,255,255,0.8))",
                }}
              >
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">{phaseLabel[phase]}</div>
                  <div className="text-4xl font-bold leading-none">{Math.max(phaseRemaining, 0)}</div>
                  <div className="text-xs text-muted-foreground mt-1">segundos</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground text-center">
                Ronda {round}/{activeExercise.rounds} · Sigue el ritmo del reloj respiratorio
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
