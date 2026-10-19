import { useMemo, useState } from 'react';
import { Empty, Icon, Modal, MoneyInput } from '../ui';
import { fmt } from '../utils';

export default function Sell({ products, onSale, goProducts }) {
  const [lines, setLines] = useState([]); // { key, productId, name, price, qty }
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('');
  const [received, setReceived] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);

  const active = useMemo(
    () => products.filter((p) => p.active !== false).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [products]
  );
  const categories = useMemo(
    () => [...new Set(active.map((p) => p.category).filter(Boolean))].sort(),
    [active]
  );
  const visible = active.filter(
    (p) => (!cat || p.category === cat) && p.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const qtyOf = (id) => lines.find((l) => l.key === id)?.qty || 0;

  const add = (p) =>
    setLines((ls) => {
      const found = ls.find((l) => l.key === p.id);
      if (found) return ls.map((l) => (l.key === p.id ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { key: p.id, productId: p.id, name: p.name, price: p.price, qty: 1 }];
    });

  const change = (key, delta) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0));

  const clear = () => {
    setLines([]);
    setReceived(0);
    setNote('');
  };

  const charge = async (method) => {
    if (!lines.length || saving) return;
    setSaving(true);
    const ok = await onSale({
      items: lines.map(({ productId, name, price, qty }) => ({ product_id: productId, name, price, qty })),
      total,
      method,
      note: note.trim() || null,
    });
    setSaving(false);
    if (ok) {
      clear();
      setSheet(false);
    }
  };

  if (!products.length) {
    return (
      <div className="page">
        <Empty
          icon="box"
          title="Aún no hay productos"
          text="Crea tus productos con su precio y luego podrás registrar ventas con un solo toque."
          action={<button className="btn primary" onClick={goProducts}><Icon name="plus" size={18} /> Crear productos</button>}
        />
      </div>
    );
  }

  const changeDue = received > 0 ? received - total : null;

  return (
    <div className="sell">
      <section className="sell-main">
        <div className="sell-toolbar">
          <div className="search">
            <Icon name="search" size={18} />
            <input placeholder="Buscar producto…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && <button className="icon-btn sm" onClick={() => setQuery('')} aria-label="Limpiar"><Icon name="x" size={16} /></button>}
          </div>
          {categories.length > 0 && (
            <div className="chips scroll">
              <button className={`chip ${!cat ? 'active' : ''}`} onClick={() => setCat('')}>Todos</button>
              {categories.map((c) => (
                <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>
          )}
        </div>

        <div className="product-grid">
          {visible.map((p) => {
            const q = qtyOf(p.id);
            return (
              <button key={p.id} className={`product-tile ${q ? 'in-cart' : ''}`} style={{ '--c': p.color || '#e2442f' }}
                onClick={() => add(p)}>
                {q > 0 && <span className="qty-badge">{q}</span>}
                <span className="tile-icon">{p.icon || p.name.charAt(0).toUpperCase()}</span>
                <span className="tile-name">{p.name}</span>
                <span className="tile-price">{fmt(p.price)}</span>
              </button>
            );
          })}
          <button className="product-tile custom" onClick={() => setCustomOpen(true)}>
            <span className="tile-icon"><Icon name="plus" size={22} /></span>
            <span className="tile-name">Otro valor</span>
            <span className="tile-price">Monto libre</span>
          </button>
        </div>
        {!visible.length && <p className="muted center pad">No hay productos que coincidan.</p>}
      </section>

      {/* Barra inferior móvil */}
      {count > 0 && (
        <button className="cart-bar" onClick={() => setSheet(true)}>
          <span className="cart-count">{count}</span>
          <span>Ver venta</span>
          <strong>{fmt(total)}</strong>
        </button>
      )}

      <aside className={`cart ${sheet ? 'open' : ''}`}>
        <div className="cart-backdrop" onClick={() => setSheet(false)} />
        <div className="cart-panel">
          <div className="cart-head">
            <h2>Venta actual</h2>
            <div className="row gap-s">
              {lines.length > 0 && <button className="btn ghost sm" onClick={clear}>Vaciar</button>}
              <button className="icon-btn only-mobile" onClick={() => setSheet(false)} aria-label="Cerrar"><Icon name="x" /></button>
            </div>
          </div>

          {lines.length === 0 ? (
            <div className="cart-empty">
              <Icon name="sell" size={30} stroke={1.6} />
              <p>Toca un producto para agregarlo</p>
            </div>
          ) : (
            <ul className="cart-lines">
              {lines.map((l) => (
                <li key={l.key}>
                  <div className="line-info">
                    <strong>{l.name}</strong>
                    <span>{fmt(l.price)} c/u</span>
                  </div>
                  <div className="stepper">
                    <button onClick={() => change(l.key, -1)} aria-label="Quitar uno"><Icon name="minus" size={16} /></button>
                    <span>{l.qty}</span>
                    <button onClick={() => change(l.key, 1)} aria-label="Agregar uno"><Icon name="plus" size={16} /></button>
                  </div>
                  <strong className="line-total">{fmt(l.price * l.qty)}</strong>
                </li>
              ))}
            </ul>
          )}

          <div className="cart-foot">
            <div className="cart-total">
              <span>Total</span>
              <strong>{fmt(total)}</strong>
            </div>

            {lines.length > 0 && (
              <details className="cart-extra">
                <summary>Calcular cambio / nota</summary>
                <label className="field">
                  <span>Recibido en efectivo</span>
                  <MoneyInput value={received} onChange={setReceived} />
                </label>
                <div className="chips">
                  {[total, 10000, 20000, 50000, 100000].filter((v, i, a) => v >= total && a.indexOf(v) === i).slice(0, 4).map((v) => (
                    <button key={v} className="chip" onClick={() => setReceived(v)}>{fmt(v)}</button>
                  ))}
                </div>
                {changeDue !== null && (
                  <div className={`change ${changeDue < 0 ? 'neg' : ''}`}>
                    {changeDue < 0 ? 'Faltan' : 'Cambio'} <strong>{fmt(Math.abs(changeDue))}</strong>
                  </div>
                )}
                <label className="field">
                  <span>Nota (opcional)</span>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: mesa 3, domicilio…" />
                </label>
              </details>
            )}

            <p className="pay-label">Cobrar con:</p>
            <div className="pay-buttons">
              <button className="pay efectivo" disabled={!lines.length || saving} onClick={() => charge('efectivo')}>
                <Icon name="cash" size={22} />
                <span>Efectivo</span>
              </button>
              <button className="pay transferencia" disabled={!lines.length || saving} onClick={() => charge('transferencia')}>
                <Icon name="phone" size={22} />
                <span>Transferencia</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <CustomItem
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onAdd={(name, price) => {
          setLines((ls) => [...ls, { key: `custom-${Date.now()}`, productId: null, name, price, qty: 1 }]);
          setCustomOpen(false);
        }}
      />
    </div>
  );
}

function CustomItem({ open, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const submit = (e) => {
    e.preventDefault();
    if (!price) return;
    onAdd(name.trim() || 'Otro', price);
    setName('');
    setPrice(0);
  };
  return (
    <Modal open={open} onClose={onClose} title="Agregar monto libre">
      <form onSubmit={submit} className="form">
        <label className="field">
          <span>Valor</span>
          <MoneyInput value={price} onChange={setPrice} autoFocus big />
        </label>
        <label className="field">
          <span>Descripción (opcional)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Adición de queso" />
        </label>
        <button className="btn primary block" disabled={!price}>Agregar a la venta</button>
      </form>
    </Modal>
  );
}
