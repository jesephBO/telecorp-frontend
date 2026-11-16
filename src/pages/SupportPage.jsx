import PageTitle from '../components/common/PageTitle.jsx';


export default function SupportPage({ chatReply, chatText, sendChat, setChatText }) {
  return <><PageTitle eyebrow="ASISTENCIA" title="Centro de ayuda" subtitle="Consulta sobre una incidencia o cuéntanos qué necesitas."/><section className="panel support-panel"><div className="support-mark">✳</div><h2>¿En qué podemos ayudarte?</h2><p className="muted">El asistente utiliza el endpoint de soporte configurado para orientar tu consulta.</p><form className="chat-form" onSubmit={sendChat}><input required value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Escribe tu consulta…"/><button className="primary-button compact">Enviar ↗</button></form>{chatReply && <div className="chat-reply">{chatReply}</div>}</section></>;
}
