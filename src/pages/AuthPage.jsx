import Brand from '../components/common/Brand.jsx';
import { completeNewPassword, confirmSignUp, resendConfirmation, signIn, signUp } from '../services/authService.js';
import { useState } from 'react';


export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [challenge, setChallenge] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', dni: '', phone: '', code: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const update = (key) => (event) => setForm((old) => ({ ...old, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      if (mode === 'login') {
        const result = await signIn(form.email, form.password);
        if (result.challenge) { setChallenge(result); setMode('new-password'); }
        else window.location.reload();
      } else if (mode === 'signup') {
        await signUp(form); setMode('confirm'); setMessage('Te enviamos un código de verificación a tu correo.');
      } else if (mode === 'confirm') {
        await confirmSignUp(form.email, form.code); setMode('login'); setMessage('Cuenta confirmada. Ya puedes iniciar sesión.');
      } else if (mode === 'new-password') {
        await completeNewPassword(challenge, form.newPassword); window.location.reload();
      }
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const title = mode === 'login' ? 'Vuelve a estar en línea.' : mode === 'signup' ? 'Conecta con soporte.' : mode === 'confirm' ? 'Confirma tu correo.' : 'Actualiza tu acceso.';
  return <main className="auth-shell"><div className="auth-art"><div className="auth-top"><Brand/><span className="live-label"><i/> RED OPERATIVA</span></div><div className="orbital"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><div className="orbital-core"><span>TC</span><i/></div><b className="node node-a"/><b className="node node-b"/><b className="node node-c"/></div><div className="auth-claim"><span className="eyebrow">TU RED, EN TIEMPO REAL</span><h1>Una señal.<br/><em>Una ciudad.</em><br/>Siempre conectados.</h1><p>Reporta una incidencia y sigue su evolución con información clara, desde el primer aviso hasta el restablecimiento.</p></div><div className="auth-footer"><span>TELECORP / OPERACIONES</span><span>01 — 24 · LIMA</span></div></div>
    <div className="auth-panel"><div className="mobile-brand"><Brand/></div><div className="auth-card"><span className="eyebrow">PORTAL DE SERVICIO <b>●</b></span><h2>{title}</h2><p className="muted">Accede a tu espacio de conectividad.</p><form onSubmit={submit}>
      {mode !== 'new-password' && <label>Correo electrónico<input type="email" autoComplete="email" required value={form.email} onChange={update('email')} placeholder="tu@correo.com"/></label>}
      {mode === 'signup' && <><label>DNI <span className="optional">OPCIONAL</span><input value={form.dni} onChange={update('dni')} placeholder="Número de documento"/></label><label>Celular <span className="optional">OPCIONAL</span><input type="tel" value={form.phone} onChange={update('phone')} placeholder="+51 999 000 000"/></label></>}
      {mode === 'login' && <label>Contraseña<input type="password" autoComplete="current-password" required value={form.password} onChange={update('password')} placeholder="Tu contraseña"/></label>}
      {mode === 'signup' && <label>Contraseña<input type="password" autoComplete="new-password" required minLength="8" value={form.password} onChange={update('password')} placeholder="Mínimo 8 caracteres"/></label>}
      {mode === 'confirm' && <label>Código de verificación<input required value={form.code} onChange={update('code')} placeholder="Código recibido por correo"/></label>}
      {mode === 'new-password' && <label>Nueva contraseña<input type="password" autoComplete="new-password" required minLength="8" value={form.newPassword} onChange={update('newPassword')} placeholder="Elige una contraseña segura"/></label>}
      {message && <div className={message.includes('Te enviamos') || message.includes('confirmada') ? 'notice success' : 'notice error'}>{message}</div>}
      <button className="primary-button" disabled={busy}>{busy ? 'Procesando…' : mode === 'login' ? 'Entrar al portal' : mode === 'signup' ? 'Crear cuenta' : mode === 'confirm' ? 'Confirmar cuenta' : 'Guardar contraseña'}<span>↗</span></button>
    </form><div className="auth-links">{mode === 'login' ? <button onClick={() => { setMode('signup'); setMessage(''); }}>¿Nuevo en Telecorp? <b>Crear cuenta</b></button> : <button onClick={() => { setMode('login'); setMessage(''); }}>← Volver a iniciar sesión</button>}{mode === 'confirm' && <button onClick={async () => { try { await resendConfirmation(form.email); setMessage('Solicitamos un nuevo código.'); } catch (e) { setMessage(e.message); } }}>Reenviar código</button>}</div><div className="secure-note"><span>◈</span> Acceso protegido por Amazon Cognito</div></div><span className="auth-copyright">© TELECORP · CENTRO DE EXPERIENCIA DIGITAL</span></div></main>;
}
