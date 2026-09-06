import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NavBar } from '../../components/layout/NavBar';
import { Spinner } from '../../components/shared/Spinner';
import { api } from '../../api';
import { User } from '../../types';

export function RegisterPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [err,  setErr ] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const data = await api<{ access_token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(form) });
      login(data.access_token, data.user); nav('/');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <><NavBar /><div className="auth-page"><div className="auth-card">
      <h1>Create account</h1><p>Join your classmates and start practising competitive programming.</p>
      <form onSubmit={submit}>
        <div className="form-group"><label className="form-label">Username</label><input className="form-input" type="text" minLength={3} required value={form.username} onChange={e=>setForm({...form,username:e.target.value})} /></div>
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
        <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" minLength={6} required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} /></div>
        {err && <div className="form-error">{err}</div>}
        <button className="btn btn-primary form-submit" type="submit" disabled={busy}>{busy ? <Spinner sz={14}/> : 'Create account'}</button>
      </form>
      <div className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></div>
    </div></div></>
  );
}
