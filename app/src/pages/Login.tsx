import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { homeForRole, useAuth } from '../auth/AuthContext';
import { USE_MOCK } from '../api/client';
import type { Role } from '../api/types';
import { Icon } from '../components/ui';
import { PIURA_CENTER } from '../components/MapView';

type Step = 'phone' | 'code' | 'profile';

const ROLES: { id: Role; label: string; desc: string; note: string; ok: boolean }[] = [
  { id: 'vecino', label: 'Vecino', desc: 'Alerta temprana con GPS, historial de huaicos de tu zona y subir fotos de quebradas y ríos.', note: 'Acceso inmediato', ok: true },
  { id: 'brigadista', label: 'Brigadista', desc: 'Mapa de calor, quebradas activadas, familias impactadas y rutas de acceso.', note: 'Requiere aprobación de una autoridad', ok: false },
  { id: 'autoridad', label: 'Autoridad', desc: 'Tablero priorizado, activar siniestros, SMS masivo y asignar brigadas.', note: 'Requiere aprobación del COER', ok: false },
];

export default function Login() {
  const { requestOtp, verifyOtp, completeProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(USE_MOCK ? '123456' : '');
  const [requestId, setRequestId] = useState('');
  const [role, setRole] = useState<Role>('vecino');
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('Castilla');
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const fullPhone = `+51${phone.replace(/\D/g, '')}`;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      const id = await requestOtp(fullPhone);
      setRequestId(id);
      setStep('code');
    });

  const validate = () =>
    run(async () => {
      const u = await verifyOtp(requestId, code);
      if (u.role && u.status === 'activo') navigate(homeForRole(u.role), { replace: true });
      else if (u.status === 'pendiente_aprobacion') setPending(true);
      else setStep('profile');
    });

  const finish = () =>
    run(async () => {
      const u = await completeProfile({
        role,
        name,
        district,
        lat: PIURA_CENTER[0],
        lon: PIURA_CENTER[1],
        sms_alerts: smsAlerts,
      });
      if (u.status === 'pendiente_aprobacion') setPending(true);
      else navigate(homeForRole(u.role), { replace: true });
    });

  return (
    <div className="app">
      <div className="topbar dark" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '36px 24px 24px', gap: 10 }}>
        <span style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--action)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="warn" size={26} color="#fff" />
        </span>
        <h1 className="brand" style={{ fontSize: 28 }}>Quebrada Alerta</h1>
        <span className="sub" style={{ fontSize: 14 }}>Alerta temprana de huaicos e inundaciones en Piura, con fotos de los vecinos.</span>
      </div>

      {USE_MOCK && (
        <div className="notice info" style={{ margin: '12px 16px 0' }}>
          Modo demo: cualquier celular válido y el código <strong>123456</strong>.
        </div>
      )}

      {pending ? (
        <div className="content center" style={{ justifyContent: 'center' }}>
          <h2 className="title">Cuenta en revisión</h2>
          <p className="muted">Una autoridad debe aprobar tu perfil. Te avisaremos por SMS.</p>
        </div>
      ) : step === 'phone' ? (
        <div className="content" style={{ paddingTop: 24 }}>
          <h2 style={{ fontSize: 20 }}>Ingresa con tu celular</h2>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Te enviaremos un código por SMS. No necesitas contraseña.</p>
          <label className="field">
            Número de celular
            <div className="row">
              <span className="input" style={{ display: 'flex', alignItems: 'center', fontWeight: 600, border: '1px solid var(--line-strong)', borderRadius: 12, padding: '0 14px', minHeight: 52, background: '#fff' }}>+51</span>
              <input className="input" style={{ flex: 1 }} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="987 654 321" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </label>
          <span className="small muted">Usaremos este número para alertas de emergencia en tu zona. Puedes darte de baja respondiendo BAJA.</span>
          {error && <span className="error">{error}</span>}
          <button className="btn primary block" disabled={busy || phone.replace(/\D/g, '').length !== 9} onClick={sendCode}>
            {busy ? 'Enviando…' : 'Enviarme el código'}
          </button>
        </div>
      ) : step === 'code' ? (
        <div className="content" style={{ paddingTop: 24 }}>
          <h2 style={{ fontSize: 20 }}>Escribe el código</h2>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Lo enviamos por SMS al {fullPhone}.</p>
          <label className="field">
            <span className="sr-only">Código de 6 dígitos</span>
            <input className="input" style={{ fontSize: 24, letterSpacing: 10, textAlign: 'center', fontWeight: 700 }} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </label>
          {error && <span className="error">{error}</span>}
          <button className="btn primary block" disabled={busy || code.length !== 6} onClick={validate}>
            {busy ? 'Validando…' : 'Validar código'}
          </button>
          <div className="between">
            <button className="btn link" onClick={() => setStep('phone')}>Cambiar número</button>
            <button className="btn link" disabled={busy} onClick={sendCode}>Reenviar código</button>
          </div>
        </div>
      ) : (
        <div className="content" style={{ paddingTop: 20 }}>
          <h2 style={{ fontSize: 20 }}>¿Cómo vas a usar la plataforma?</h2>
          <div className="stack">
            {ROLES.map((r) => (
              <button key={r.id} className="choice" aria-pressed={role === r.id} onClick={() => setRole(r.id)}>
                <span className="strong" style={{ fontSize: 16 }}>{r.label}</span>
                <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>{r.desc}</span>
                <span className="small strong" style={{ color: r.ok ? 'var(--ok)' : '#9A5B00' }}>{r.note}</span>
              </button>
            ))}
          </div>
          <label className="field">
            Tu nombre
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Rosa Pérez" />
          </label>
          <label className="field">
            Distrito
            <select className="input" value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option>Castilla</option>
              <option>Piura</option>
              <option>Veintiséis de Octubre</option>
              <option>Chulucanas</option>
              <option>Tambogrande</option>
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={smsAlerts} onChange={(e) => setSmsAlerts(e.target.checked)} />
            Quiero recibir alertas de emergencia por SMS
          </label>
          {error && <span className="error">{error}</span>}
          <button className="btn primary block" disabled={busy || !name.trim()} onClick={finish}>
            {busy ? 'Guardando…' : 'Continuar'}
          </button>
        </div>
      )}
    </div>
  );
}
