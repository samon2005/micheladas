import { useState } from 'react';
import { auth, authErrorMessage } from '../data';
import { Icon, Segmented } from '../ui';

export const BUSINESS = import.meta.env.VITE_BUSINESS_NAME || 'Mi Negocio';

export function Logo({ size = 26 }) {
  return (
    <div className="logo">
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <path d="M20 14h24l-3 34a4 4 0 0 1-4 4H27a4 4 0 0 1-4-4z" fill="#fff" />
        <path d="M22.5 26h19l-1.6 19.5h-15.8z" fill="#f5a524" />
      </svg>
    </div>
  );
}

export default function Login() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await auth.signIn(email.trim(), password);
      } else {
        if (!name.trim()) throw new Error('Escribe tu nombre');
        const data = await auth.signUp(name.trim(), email.trim(), password);
        if (!data.session) {
          setInfo('Cuenta creada. Te enviamos un correo para confirmarla; después inicia sesión aquí.');
          setMode('login');
          setPassword('');
        }
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <Logo size={30} />
          <div>
            <h2>{BUSINESS}</h2>
            <p>Control de ventas</p>
          </div>
        </div>

        <Segmented
          className="full"
          value={mode}
          onChange={(m) => { setMode(m); setError(''); setInfo(''); }}
          options={[['login', 'Ingresar'], ['signup', 'Crear cuenta']]}
        />

        {mode === 'signup' && (
          <label className="field">
            <span>Tu nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Laura" autoComplete="name" />
          </label>
        )}
        <label className="field">
          <span>Correo</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" autoComplete="email" />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>

        {error && <div className="alert error">{error}</div>}
        {info && <div className="alert info">{info}</div>}

        <button className="btn primary block" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
        </button>

        {mode === 'signup' && (
          <p className="auth-note">
            Las cuentas nuevas quedan como <strong>vendedor</strong> y el administrador debe aprobarlas antes de poder vender.
          </p>
        )}
      </form>
    </div>
  );
}

export function Pending({ profile, onRefresh }) {
  return (
    <div className="auth-screen">
      <div className="auth-card center">
        <div className="pin-icon"><Icon name="lock" size={26} /></div>
        <h2>Hola, {profile.full_name}</h2>
        <p className="muted">
          Tu cuenta está pendiente de aprobación. Pídele al administrador que te active desde la sección <strong>Equipo</strong>.
          Esta pantalla se actualizará sola cuando te aprueben.
        </p>
        <div className="row gap-s">
          <button className="btn ghost" onClick={onRefresh}><Icon name="refresh" size={16} /> Revisar</button>
          <button className="btn ghost" onClick={() => auth.signOut()}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}
