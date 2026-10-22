import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { assignmentService, type AvailableDoctor, type DoctorAssignment } from './data/assignment.service';

export default function MyDoctorsPage() {
  const [query, setQuery] = useState('');
  const [available, setAvailable] = useState<AvailableDoctor[]>([]);
  const [assigned, setAssigned] = useState<DoctorAssignment[]>([]);
  const [message, setMessage] = useState('');
  const load = async () => {
    const [all, mine] = await Promise.all([assignmentService.available(query), assignmentService.mine()]);
    setAvailable(all); setAssigned(mine);
  };
  useEffect(() => { void load().catch(() => setMessage('No se pudieron cargar los doctores.')); }, []);
  const assignedIds = new Set(assigned.map((item) => item.doctor.id));
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold">Mis doctores</h2><p className="text-muted-foreground">Seleccione varios profesionales para su seguimiento respiratorio.</p></div>
    {message && <p className="text-sm text-destructive">{message}</p>}
    <Card><CardHeader><CardTitle>Buscar profesionales</CardTitle><CardDescription>Busque por nombre o apellido.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre o apellido"/><Button onClick={() => void load()}>Buscar</Button></div><div className="grid gap-3 md:grid-cols-2">{available.map((doctor) => <div key={doctor.id} className="rounded border p-3"><p className="font-medium">{doctor.user.fullname}</p><p className="text-sm text-muted-foreground">{doctor.specialty ?? 'Profesional registrado'} · {doctor.user.email}</p><Button className="mt-3" size="sm" disabled={assignedIds.has(doctor.id)} onClick={() => void assignmentService.assign(doctor.id).then(load).catch(() => setMessage('No se pudo asignar el doctor.'))}>{assignedIds.has(doctor.id) ? 'Asignado' : 'Asignar'}</Button></div>)}</div></CardContent></Card>
    <Card><CardHeader><CardTitle>Profesionales asignados</CardTitle></CardHeader><CardContent className="space-y-3">{assigned.length === 0 ? <p className="text-sm text-muted-foreground">Aún no tiene doctores asignados.</p> : assigned.map((item) => <div key={item.id} className="flex items-center justify-between rounded border p-3"><div><p className="font-medium">{item.doctor.user.fullname}</p><p className="text-sm text-muted-foreground">Asignado el {new Date(item.assignedAt).toLocaleDateString()}</p></div><Button variant="destructive" size="sm" onClick={() => void assignmentService.remove(item.doctor.id).then(load).catch(() => setMessage('No se pudo finalizar la asignación.'))}>Quitar</Button></div>)}</CardContent></Card>
  </div>;
}
