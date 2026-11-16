import { STATES } from '../../models/networkModel.js';
import { api } from '../../api/client.js';
import { useEffect, useRef, useState } from 'react';


export default function Analyst({ antennas, alerts, impact, token }) {
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(null);
  useEffect(() => {
    active.current?.abort(); setReply(''); setError(''); setBusy(false);
    return () => active.current?.abort();
  }, [antennas, alerts, impact, token]);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError(''); setReply('');
    const controller = new AbortController(); active.current = controller;
    const evidence = { area_consultada: true, antenas_visibles: antennas.length,
      estados: Object.fromEntries(Object.keys(STATES).map(state => [state, antennas.filter(a => a.state === state).length])),
      muestra: antennas.slice(0, 5).map(a => ({ id: a.id, zona: a.zone, estado: a.status || 'SIN_INFORMACION' })),
      alertas_cargadas: alerts.length,
      ...(impact ? { impacto: { zonas: impact.affected_zones?.map(z => z.zone_id), area_km2: impact.estimated_affected_area_km2 } } : {}) };
    const mensaje = `Usa exclusivamente esta instantánea real del área consultada. No representa toda la red. No inventes causas, predicciones ni diagnósticos; explica límites y datos faltantes.\n${JSON.stringify(evidence)}\nConsulta: ${question}`;
    if (mensaje.length > 2000) { setError('Reduce la consulta o filtra menos antenas para enviar el contexto al asistente.'); setBusy(false); return; }
    try {
      const result = await api('incidents', '/soporte/chat', { token, signal: controller.signal, method: 'POST', body: { mensaje } });
      if (typeof result.respuesta !== 'string') throw new Error('El asistente no devolvió una respuesta válida.');
      setReply(result.respuesta);
    } catch (err) { if (!controller.signal.aborted) setError(err.message); } finally { if (!controller.signal.aborted) setBusy(false); }
  };
  return <section className="panel network-analyst"><span className="eyebrow">ASISTENCIA CON CONTEXTO REAL</span><h3>Analista de Red (IA)</h3>
    <p>Consulta al asistente de soporte sobre las antenas filtradas y las alertas cargadas. El backend ofrece orientación conversacional; sus respuestas requieren revisión y no son diagnósticos verificados.</p>
    <form className="chat-form" onSubmit={submit}><input aria-label="Consulta al analista de red" maxLength={400} required value={question} onChange={e => setQuestion(e.target.value)} placeholder="¿Qué información falta para revisar estas fallas?"/><button className="primary-button compact" disabled={busy || !antennas.length}>{busy ? 'Consultando…' : 'Consultar ↗'}</button></form>
    {error && <p className="notice error" role="alert">{error}</p>}{reply && <div className="chat-reply" aria-live="polite">{reply}</div>}
  </section>;
}
