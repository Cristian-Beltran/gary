import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/auth/useAuth';
import type { RegisterDto, UserType } from '@/auth/auth.interface';

const initial: RegisterDto = { firstName: '', lastName: '', ci: '', phone: '', email: '', password: '', role: 'patient' };

export default function RegisterPage() {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState('');
  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();
  const update = (key: keyof RegisterDto, value: string) => setValues((old) => ({ ...old, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    try { await register(values); navigate('/'); }
    catch { setError('No se pudo crear la cuenta. Revise CI y correo.'); }
  };
  return <main className="min-h-screen grid place-items-center bg-background p-6"><Card className="w-full max-w-lg"><CardHeader><CardTitle>Crear cuenta</CardTitle><CardDescription>Registre una cuenta de paciente o doctor.</CardDescription></CardHeader><CardContent>
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Input required placeholder="Nombre" value={values.firstName} onChange={(e) => update('firstName', e.target.value)} />
      <Input required placeholder="Apellido" value={values.lastName} onChange={(e) => update('lastName', e.target.value)} />
      <Input required placeholder="Número de CI" value={values.ci} onChange={(e) => update('ci', e.target.value)} />
      <Input required placeholder="Celular" value={values.phone} onChange={(e) => update('phone', e.target.value)} />
      <Input required className="sm:col-span-2" type="email" placeholder="Correo electrónico" value={values.email} onChange={(e) => update('email', e.target.value)} />
      <Input required className="sm:col-span-2" minLength={8} type="password" placeholder="Contraseña (mínimo 8 caracteres)" value={values.password} onChange={(e) => update('password', e.target.value)} />
      <select value={values.role} onChange={(e) => update('role', e.target.value as UserType)} className="h-10 rounded-md border bg-background px-3 sm:col-span-2"><option value="patient">Paciente</option><option value="doctor">Doctor</option></select>
      {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <Button className="sm:col-span-2" type="submit">Crear cuenta</Button>
    </form>
    <p className="mt-4 text-sm text-muted-foreground">¿Ya tiene cuenta? <Link className="text-primary underline" to="/login">Inicie sesión</Link></p>
  </CardContent></Card></main>;
}
