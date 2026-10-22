import { useEffect, useState, type FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/auth/auth.interface';
import { profileService } from './profile.service';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  useEffect(() => { void profileService.get().then(setProfile).catch(() => setMessage('No se pudo cargar el perfil.')); }, []);
  const save = async (event: FormEvent) => { event.preventDefault(); if (!profile) return; try { setProfile(await profileService.update(profile)); setMessage('Datos actualizados.'); } catch { setMessage('No se pudo actualizar el perfil.'); } };
  const changePassword = async (event: FormEvent) => { event.preventDefault(); try { await profileService.changePassword(passwords.current, passwords.next); setPasswords({ current: '', next: '' }); setMessage('Contraseña actualizada.'); } catch { setMessage('No se pudo cambiar la contraseña.'); } };
  if (!profile) return <p className="text-muted-foreground">Cargando perfil…</p>;
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold">Mi perfil</h2><p className="text-muted-foreground">Actualice sus datos personales. El rol y CI no se pueden modificar.</p></div>{message && <p className="text-sm">{message}</p>}
    <Card><CardHeader><CardTitle>Datos personales</CardTitle></CardHeader><CardContent><form onSubmit={save} className="grid gap-4 md:grid-cols-2"><Input value={profile.firstName ?? ''} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} placeholder="Nombre"/><Input value={profile.lastName ?? ''} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} placeholder="Apellido"/><Input disabled value={profile.ci ?? ''} placeholder="CI"/><Input disabled value={profile.type}/><Input value={profile.phone ?? ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Celular"/><Input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Correo"/><Button className="md:col-span-2" type="submit">Guardar cambios</Button></form></CardContent></Card>
    <Card><CardHeader><CardTitle>Cambiar contraseña</CardTitle></CardHeader><CardContent><form onSubmit={changePassword} className="grid gap-4 md:grid-cols-2"><Input required minLength={8} type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} placeholder="Contraseña actual"/><Input required minLength={8} type="password" value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} placeholder="Nueva contraseña"/><Button className="md:col-span-2" type="submit">Cambiar contraseña</Button></form></CardContent></Card>
  </div>;
}
