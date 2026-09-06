import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NavBar } from '../../components/layout/NavBar';
import { Spinner } from '../../components/shared/Spinner';
import { API } from '../../api';
import { User } from '../../types';

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [err,  setErr ] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const body = new URLSearchParams({ username: form.username, password: form.password });
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail ?? 'Login failed'); }
      const data = await res.json() as { access_token: string; user: User };
      login(data.access_token, data.user);
      nav('/');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <><NavBar /><div className="auth-page"><div className="auth-card">
      <h1>Welcome back</h1><p>Sign in to submit solutions and track your progress.</p>
      <form onSubmit={submit}>
        <div className="form-group"><label className="form-label">Username</label><input className="form-input" type="text" required value={form.username} onChange={e=>setForm({...form,username:e.target.value})} /></div>
        <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} /></div>
        {err && <div className="form-error">{err}</div>}
        <button className="btn btn-primary form-submit" type="submit" disabled={busy}>{busy ? <Spinner sz={14}/> : 'Sign in'}</button>
      </form>
      <div className="auth-footer">Don't have an account? <Link to="/register">Sign up</Link></div>
    </div></div></>
  );
}
