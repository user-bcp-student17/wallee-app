type LandingProps = {
  busy: boolean;
  message: string;
  onStart: () => void;
};

const how = [
  { title: 'Cuéntanos quién eres', text: 'Tu nombre y tu número de celular para identificarte.' },
  { title: 'Confirma tu identidad', text: 'Ingresa tu documento para continuar con tu registro.' },
  { title: 'Activa tu wallet', text: 'Verifica tu código y deja tu wallet lista para usar.' },
];

const benefits = [
  { title: 'Simple', text: 'Un registro de tres pasos, sin formularios eternos.' },
  { title: 'A tu ritmo', text: 'Ves siempre en qué paso estás y qué falta para terminar.' },
  { title: 'Claro', text: 'Mensajes concretos cuando algo necesita corregirse.' },
];

export default function Landing({ busy, message, onStart }: LandingProps) {
  return (
    <div className="layout landing">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Wallee, inicio"><span className="brand-mark">w</span> wallee<span className="brand-dot">.</span></a>
        <nav aria-label="Secciones" className="landing-nav">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#beneficios">Beneficios</a>
        </nav>
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow"><span /> TU WALLET DIGITAL</div>
            <h1 id="hero-title">Tu dinero,<br /><em>a tu manera.</em></h1>
            <p>Crea tu wallet en unos pasos y ten todo listo para lo que viene.</p>
            {message && <div className="form-error" role="alert">{message}</div>}
            <div className="hero-actions">
              <button className="primary" disabled={busy} onClick={onStart}>{busy ? 'Iniciando...' : 'Crear mi wallet'} <span aria-hidden="true">→</span></button>
              <a className="ghost" href="#como-funciona">Ver cómo funciona</a>
            </div>
            {busy && <p role="status">Iniciando...</p>}
          </div>
          <div className="hero-card" aria-hidden="true">
            <div className="card-top"><span className="brand-mark">w</span><span>WALLEE</span></div>
            <div className="card-balance">S/ 0.00</div>
            <div className="card-bottom"><span>Wallet demo</span><span>•••• 0001</span></div>
          </div>
        </section>

        <section className="band" id="como-funciona" aria-labelledby="how-title">
          <div className="band-inner">
            <div className="small-label">CÓMO FUNCIONA</div>
            <h2 id="how-title">Tres pasos y listo.</h2>
            <ol className="how">
              {how.map((item, index) => (
                <li key={item.title}><span className="step-number">0{index + 1}</span><h3>{item.title}</h3><p>{item.text}</p></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="band alt" id="beneficios" aria-labelledby="benefits-title">
          <div className="band-inner">
            <div className="small-label">POR QUÉ WALLEE</div>
            <h2 id="benefits-title">Hecho para avanzar.</h2>
            <ul className="benefits">
              {benefits.map((item) => <li key={item.title}><h3>{item.title}</h3><p>{item.text}</p></li>)}
            </ul>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <span>DEMO · DATOS TEMPORALES</span>
        <span>La verificación de identidad es simulada y no se conecta a proveedores externos.</span>
      </footer>
    </div>
  );
}
