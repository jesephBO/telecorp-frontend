export default function Brand({ small = false }) {
  return <div className={`brand ${small ? 'brand-small' : ''}`}><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 25c5-9 10 9 15 0s10 9 15 0 7-2 8 0"/><circle cx="24" cy="24" r="21"/><path className="brand-core" d="M24 13v22M13 24h22"/></svg><span>telecorp<span className="brand-dot">.</span><small>NETWORK INTELLIGENCE</small></span></div>;
}
