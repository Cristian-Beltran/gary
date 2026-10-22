import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trainingService } from "./data/training.service";
import type { ExerciseInput, TrainingExercise } from "./training.interface";

const initial: ExerciseInput = { title: "", description: "", instructions: "", level: "Básico", active: true };
export default function ExerciseAdminPage() {
  const [items, setItems] = useState<TrainingExercise[]>([]); const [form, setForm] = useState(initial); const [error, setError] = useState("");
  const load = () => trainingService.getDoctorExercises().then(setItems).catch(() => setError("No se pudo cargar el catálogo."));
  useEffect(() => { load(); }, []);
  const create = async (e: FormEvent) => { e.preventDefault(); try { await trainingService.createExercise(form); setForm(initial); load(); } catch { setError("No se pudo crear el ejercicio."); } };
  const toggle = async (item: TrainingExercise) => { try { await trainingService.updateExercise(item.id, { active: !item.active }); load(); } catch { setError("No se pudo actualizar el ejercicio."); } };
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold">Catálogo de ejercicios</h2><p className="text-muted-foreground">Ejercicios disponibles para los pacientes.</p></div><Card><CardHeader><CardTitle>Nuevo ejercicio</CardTitle></CardHeader><CardContent><form onSubmit={create} className="grid gap-3 md:grid-cols-2"><input required placeholder="Nombre" value={form.title} onChange={e => setForm({...form,title:e.target.value})} className="rounded-md border p-2"/><select value={form.level} onChange={e => setForm({...form,level:e.target.value})} className="rounded-md border p-2"><option>Básico</option><option>Medio</option><option>Avanzado</option></select><textarea required placeholder="Descripción" value={form.description} onChange={e => setForm({...form,description:e.target.value})} className="rounded-md border p-2 md:col-span-2"/><textarea required placeholder="Instrucciones" value={form.instructions} onChange={e => setForm({...form,instructions:e.target.value})} className="rounded-md border p-2 md:col-span-2"/><Button className="w-fit">Crear ejercicio</Button></form>{error && <p className="mt-3 text-sm text-destructive">{error}</p>}</CardContent></Card><div className="grid gap-3 md:grid-cols-2">{items.map(item => <Card key={item.id}><CardHeader><CardTitle className="text-lg">{item.title}</CardTitle><CardDescription>{item.level} · {item.active === false ? "Inactivo" : "Activo"}</CardDescription></CardHeader><CardContent className="space-y-3"><p className="text-sm">{item.description ?? item.goal}</p><Button variant="outline" onClick={() => void toggle(item)}>{item.active === false ? "Activar" : "Desactivar"}</Button></CardContent></Card>)}</div></div>;
}
