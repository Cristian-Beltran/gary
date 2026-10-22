import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { assignmentService, type AssignedPatient } from '@/modules/Doctors/data/assignment.service';

export default function MyPatientsPage() {
  const [patients, setPatients] = useState<AssignedPatient[]>([]); const [query, setQuery] = useState(''); const [error, setError] = useState('');
  useEffect(() => { void assignmentService.patients().then(setPatients).catch(() => setError('No se pudieron cargar los pacientes asignados.')); }, []);
  const visible = useMemo(() => patients.filter(({ patient }) => `${patient.user.fullname} ${patient.user.ci ?? ''}`.toLowerCase().includes(query.toLowerCase())), [patients, query]);
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold">Mis pacientes</h2><p className="text-muted-foreground">Solo se muestran pacientes con autorización vigente.</p></div>{error && <p className="text-sm text-destructive">{error}</p>}<Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o CI"/><div className="grid gap-4 md:grid-cols-2">{visible.map(({ patient, assignedAt }) => <Card key={patient.id}><CardHeader><CardTitle>{patient.user.fullname}</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-sm text-muted-foreground">CI: {patient.user.ci ?? 'No registrado'}</p><p className="text-sm text-muted-foreground">Asignado: {new Date(assignedAt).toLocaleDateString()}</p></CardContent></Card>)}</div>{!visible.length && <p className="text-muted-foreground">No hay pacientes asignados.</p>}</div>;
}
