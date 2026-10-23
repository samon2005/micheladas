import { useMemo, useState } from 'react';
import { Empty, Icon, Modal, MoneyInput, PageHead } from '../ui';
import { PRODUCT_COLORS, fmt } from '../utils';

const EMPTY = { name: '', price: 0, category: '', icon: '', color: PRODUCT_COLORS[0] };

export default function Products({ products, actions, isAdmin, me }) {
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [query, setQuery] = useState('');

  const sorted = useMemo(
    () => [...products].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [products]
  );
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(), [products]);
  const visible = sorted.filter((p) =>
    `${p.name} ${p.category || ''}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="page">
      <PageHead title="Productos" subtitle="Crea y edita los productos que vendes">
        <button className="btn primary" onClick={() => setEditing('new')}>
          <Icon name="plus" size={18} /> Nuevo producto
        </button>
      </PageHead>

      {products.length === 0 ? (
        <Empty
          icon="box"
          title="Crea tu primer producto"
          text="Solo necesitas el nombre y el precio. Luego aparecerá en la pantalla de Vender."
          action={<button className="btn primary" onClick={() => setEditing('new')}><Icon name="plus" size={18} /> Nuevo producto</button>}
        />
      ) : (
        <>
          <div className="search wide">
            <Icon name="search" size={18} />
            <input placeholder="Buscar producto…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <ul className="product-list">
            {visible.map((p) => (
              <li key={p.id} className={p.active === false ? 'inactive' : ''}>
                <span className="pl-icon" style={{ '--c': p.color || PRODUCT_COLORS[0] }}>
                  {p.icon || p.name.charAt(0).toUpperCase()}
                </span>
                <div className="pl-main">
                  <strong>{p.name}</strong>
                  <span className="muted sm">
                    {p.category || 'Sin categoría'}{p.active === false && ' · Oculto en Vender'}
                  </span>
                </div>
                <strong className="pl-price">{fmt(p.price)}</strong>
                <div className="pl-actions">
                  <button className="icon-btn" title={p.active === false ? 'Mostrar en Vender' : 'Ocultar de Vender'}
                    aria-label={p.active === false ? 'Mostrar en Vender' : 'Ocultar de Vender'}
                    onClick={() => actions.updateProduct(p.id, { active: p.active === false })}>
                    <Icon name={p.active === false ? 'eyeOff' : 'eye'} size={18} />
                  </button>
                  <button className="icon-btn" aria-label="Editar" onClick={() => setEditing(p)}>
                    <Icon name="edit" size={18} />
                  </button>
                  {(isAdmin || p.created_by === me.id) && (
                    <button className="icon-btn danger" aria-label="Eliminar"
                      onClick={() => confirm(`¿Eliminar "${p.name}"? Las ventas ya registradas no se borran.`) && actions.deleteProduct(p.id)}>
                      <Icon name="trash" size={18} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && (
        <ProductForm
          initial={editing === 'new' ? EMPTY : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            const ok = editing === 'new'
              ? await actions.addProduct({ ...values, active: true })
              : await actions.updateProduct(editing.id, values);
            if (ok) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ProductForm({ initial, categories, onClose, onSave }) {
  const [v, setV] = useState({
    name: initial.name,
    price: initial.price,
    category: initial.category || '',
    icon: initial.icon || '',
    color: initial.color || PRODUCT_COLORS[0],
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (val) => setV((x) => ({ ...x, [k]: val }));
  const isNew = !initial.id;

  const submit = async (e) => {
    e.preventDefault();
    if (!v.name.trim() || saving) return;
    setSaving(true);
    await onSave({
      name: v.name.trim(),
      price: v.price,
      category: v.category.trim() || null,
      icon: v.icon.trim() || null,
      color: v.color,
    });
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title={isNew ? 'Nuevo producto' : 'Editar producto'}>
      <form className="form" onSubmit={submit}>
        <div className="preview-tile">
          <span className="product-tile static" style={{ '--c': v.color }}>
            <span className="tile-icon">{v.icon || (v.name ? v.name.charAt(0).toUpperCase() : '?')}</span>
            <span className="tile-name">{v.name || 'Nombre del producto'}</span>
            <span className="tile-price">{fmt(v.price)}</span>
          </span>
        </div>
        <label className="field">
          <span>Nombre</span>
          <input autoFocus value={v.name} onChange={(e) => set('name')(e.target.value)} placeholder="Ej: Michelada clásica" />
        </label>
        <label className="field">
          <span>Precio</span>
          <MoneyInput value={v.price} onChange={set('price')} big />
        </label>
        <label className="field">
          <span>Categoría (opcional)</span>
          <input list="cats" value={v.category} onChange={(e) => set('category')(e.target.value)} placeholder="Ej: Bebidas" />
          <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <div className="field-row">
          <label className="field">
            <span>Ícono (emoji opcional)</span>
            <input value={v.icon} maxLength={4} onChange={(e) => set('icon')(e.target.value)} placeholder="🍺" />
          </label>
          <div className="field">
            <span>Color</span>
            <div className="colors">
              {PRODUCT_COLORS.map((c) => (
                <button type="button" key={c} className={`swatch ${v.color === c ? 'active' : ''}`}
                  style={{ background: c }} onClick={() => set('color')(c)} aria-label={`Color ${c}`} />
              ))}
            </div>
          </div>
        </div>
        <button className="btn primary block" disabled={!v.name.trim() || saving}>
          {isNew ? 'Crear producto' : 'Guardar cambios'}
        </button>
      </form>
    </Modal>
  );
}
