import { Empty, Icon, PageHead } from '../ui';
import { fmt } from '../utils';

export default function Team({ profiles, sales, me, actions }) {
  const pending = profiles.filter((p) => !p.active && p.role === 'vendedor');
  const rest = profiles.filter((p) => !pending.includes(p)).sort((a, b) => (a.role === b.role ? a.full_name.localeCompare(b.full_name) : a.role === 'admin' ? -1 : 1));

  const soldBy = (id) => sales.filter((s) => s.seller_id === id).reduce((a, s) => a + s.total, 0);

  const setActive = (p, active) => {
    if (!active && !confirm(`¿Desactivar a ${p.full_name}? No podrá entrar ni vender.`)) return;
    actions.updateProfile(p.id, { active });
  };
  const setRole = (p, role) => {
    const msg = role === 'admin'
      ? `¿Hacer administrador a ${p.full_name}? Podrá ver todas las ventas, gastos y ganancias.`
      : `¿Cambiar a ${p.full_name} a vendedor?`;
    if (confirm(msg)) actions.updateProfile(p.id, { role });
  };

  return (
    <div className="page">
      <PageHead title="Equipo" subtitle="Aprueba vendedores y administra los accesos" />

      <div className="card info-card">
        <Icon name="plus" size={18} />
        <p>
          Para agregar un vendedor: que abra esta app en su celular, toque <strong>Crear cuenta</strong> y regístrese.
          Aparecerá aquí como pendiente para que lo apruebes.
        </p>
      </div>

      {pending.length > 0 && (
        <section className="day-group">
          <div className="day-head"><h3>Pendientes de aprobación</h3><span>{pending.length}</span></div>
          <ul className="list">
            {pending.map((p) => (
              <li key={p.id} className="team-item pending">
                <span className="avatar">{p.full_name.charAt(0).toUpperCase()}</span>
                <div className="li-main">
                  <strong>{p.full_name}</strong>
                  <span className="muted sm">{p.email}</span>
                </div>
                <div className="row gap-s">
                  <button className="btn primary sm" onClick={() => actions.updateProfile(p.id, { active: true })}>
                    <Icon name="check" size={16} /> Aprobar
                  </button>
                  <button className="icon-btn danger" aria-label="Rechazar"
                    onClick={() => confirm(`¿Rechazar la solicitud de ${p.full_name}?`) && actions.deleteProfile(p.id)}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="day-group">
        <div className="day-head"><h3>Miembros</h3><span>{rest.length}</span></div>
        {rest.length === 0 ? (
          <Empty icon="box" title="Sin miembros" />
        ) : (
          <ul className="list">
            {rest.map((p) => (
              <li key={p.id} className={`team-item ${p.active ? '' : 'inactive'}`}>
                <span className={`avatar ${p.role}`}>{p.full_name.charAt(0).toUpperCase()}</span>
                <div className="li-main">
                  <strong>{p.full_name}{p.id === me.id && <span className="muted"> (tú)</span>}</strong>
                  <div className="li-meta">
                    <span className={`role-pill ${p.role}`}>{p.role === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                    {!p.active && <span className="tag">Desactivado</span>}
                    <span className="muted">{p.email}</span>
                  </div>
                </div>
                <div className="team-sold">
                  <span className="muted sm">Ha vendido</span>
                  <strong>{fmt(soldBy(p.id))}</strong>
                </div>
                {p.id !== me.id ? (
                  <div className="team-actions">
                    <button className="btn ghost sm" onClick={() => setRole(p, p.role === 'admin' ? 'vendedor' : 'admin')}>
                      {p.role === 'admin' ? 'Hacer vendedor' : 'Hacer admin'}
                    </button>
                    <button className="btn ghost sm" onClick={() => setActive(p, !p.active)}>
                      {p.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                ) : <div />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
