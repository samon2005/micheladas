import { useCallback, useEffect, useRef, useState } from 'react';
import { db, isCloud } from './data';
import { Icon } from './ui';
import Sell from './views/Sell';
import Dashboard from './views/Dashboard';
import History from './views/History';
import Expenses from './views/Expenses';
import Products from './views/Products';

const BUSINESS = import.meta.env.VITE_BUSINESS_NAME || 'Mi Negocio';
const PIN = import.meta.env.VITE_APP_PIN || '';

const TABS = [
  { id: 'vender', label: 'Vender', icon: 'sell' },
  { id: 'resumen', label: 'Resumen', icon: 'chart' },
  { id: 'ventas', label: 'Ventas', icon: 'receipt' },
  { id: 'gastos', label: 'Gastos', icon: 'wallet' },
  { id: 'productos', label: 'Productos', icon: 'box' },
];

function readTab() {
  const h = window.location.hash.replace('#', '');
  return TABS.some((t) => t.id === h) ? h : 'vender';
}

function isUnlocked() {
  if (!PIN) return true;
  try {
    return localStorage.getItem('cv_pin') === PIN;
  } catch {
    return false;
  }
}

export default function App() {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;
  return <Main />;
}

function Main() {
  const [tab, setTab] = useState(readTab);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const toast = useCallback((message, opts = {}) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, ...opts }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.duration || 4000);
  }, []);

  const fail = useCallback((e) => {
    console.error(e);
    toast(`Error: ${e?.message || 'no se pudo guardar'}`, { type: 'error', duration: 6000 });
  }, [toast]);

  const load = useCallback(async () => {
    try {
      const [p, s, e] = await Promise.all([db.list('products'), db.list('sales'), db.list('expenses')]);
      setProducts(p);
      setSales(s);
      setExpenses(e);
      setError('');
    } catch (e) {
      console.error(e);
      setError(e?.message || 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Si hay varios dispositivos, recarga al volver a la pestaña
    const onFocus = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [load]);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id) => {
    window.location.hash = id;
    setTab(id);
    window.scrollTo({ top: 0 });
  };

  // ---------- acciones ----------
  const actions = {
    async addProduct(values) {
      try {
        const row = await db.insert('products', values);
        setProducts((p) => [row, ...p]);
        toast(`Producto "${row.name}" creado`);
        return true;
      } catch (e) { fail(e); return false; }
    },
    async updateProduct(id, patch) {
      try {
        const row = await db.update('products', id, patch);
        setProducts((p) => p.map((x) => (x.id === id ? row : x)));
        return true;
      } catch (e) { fail(e); return false; }
    },
    async deleteProduct(id) {
      try {
        await db.remove('products', id);
        setProducts((p) => p.filter((x) => x.id !== id));
        toast('Producto eliminado');
      } catch (e) { fail(e); }
    },
    async addSale(values) {
      try {
        const row = await db.insert('sales', values);
        setSales((s) => [row, ...s]);
        toast(`Venta registrada · ${values.method === 'efectivo' ? 'Efectivo' : 'Transferencia'}`, {
          type: 'success',
          action: { label: 'Deshacer', run: () => actions.deleteSale(row.id, true) },
          duration: 6000,
        });
        return true;
      } catch (e) { fail(e); return false; }
    },
    async deleteSale(id, undo) {
      try {
        await db.remove('sales', id);
        setSales((s) => s.filter((x) => x.id !== id));
        toast(undo ? 'Venta deshecha' : 'Venta eliminada');
      } catch (e) { fail(e); }
    },
    async addExpense(values) {
      try {
        const row = await db.insert('expenses', values);
        setExpenses((s) => [row, ...s].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        toast('Gasto registrado', { type: 'success' });
        return true;
      } catch (e) { fail(e); return false; }
    },
    async deleteExpense(id) {
      try {
        await db.remove('expenses', id);
        setExpenses((s) => s.filter((x) => x.id !== id));
        toast('Gasto eliminado');
      } catch (e) { fail(e); }
    },
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(db.exportAll(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `respaldo-ventas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const importBackup = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!confirm('Esto reemplazará los datos actuales de este dispositivo. ¿Continuar?')) return;
        db.importAll(data);
        load();
        toast('Respaldo restaurado', { type: 'success' });
      } catch {
        toast('Archivo de respaldo inválido', { type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  let view;
  if (loading) view = <div className="loading"><div className="spinner" /> Cargando…</div>;
  else if (error) view = (
    <div className="error-box">
      <h3>No se pudo conectar</h3>
      <p>{error}</p>
      <button className="btn primary" onClick={() => { setLoading(true); load(); }}>Reintentar</button>
    </div>
  );
  else if (tab === 'vender') view = <Sell products={products} onSale={actions.addSale} goProducts={() => go('productos')} />;
  else if (tab === 'resumen') view = <Dashboard sales={sales} expenses={expenses} />;
  else if (tab === 'ventas') view = <History sales={sales} onDelete={actions.deleteSale} />;
  else if (tab === 'gastos') view = <Expenses expenses={expenses} onAdd={actions.addExpense} onDelete={actions.deleteExpense} />;
  else view = <Products products={products} actions={actions} />;

  return (
    <div className={`app tab-${tab}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">
            <svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true">
              <path d="M20 14h24l-3 34a4 4 0 0 1-4 4H27a4 4 0 0 1-4-4z" fill="#fff" />
              <path d="M22.5 26h19l-1.6 19.5h-15.8z" fill="#f5a524" />
            </svg>
          </div>
          <div>
            <strong>{BUSINESS}</strong>
            <span>Control de ventas</span>
          </div>
        </div>
        <nav className="nav">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => go(t.id)}>
              <Icon name={t.icon} size={21} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className={`sync ${isCloud ? 'cloud' : 'local'}`}>
            <Icon name={isCloud ? 'cloud' : 'device'} size={16} />
            {isCloud ? 'Sincronizado en la nube' : 'Guardado en este dispositivo'}
          </div>
          {isCloud ? (
            <button className="btn ghost sm" onClick={() => { load(); toast('Datos actualizados'); }}>
              <Icon name="refresh" size={16} /> Actualizar
            </button>
          ) : (
            <div className="backup">
              <button className="btn ghost sm" onClick={exportBackup}><Icon name="download" size={16} /> Respaldo</button>
              <label className="btn ghost sm">
                <Icon name="upload" size={16} /> Restaurar
                <input type="file" accept="application/json" hidden
                  onChange={(e) => { e.target.files[0] && importBackup(e.target.files[0]); e.target.value = ''; }} />
              </label>
            </div>
          )}
        </div>
      </aside>

      <main className="content">{view}</main>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type || ''}`}>
            {t.type === 'success' && <Icon name="check" size={18} />}
            <span>{t.message}</span>
            {t.action && (
              <button onClick={() => { t.action.run(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PinGate({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [bad, setBad] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (pin === PIN) {
      try { localStorage.setItem('cv_pin', pin); } catch { /* sin almacenamiento */ }
      onUnlock();
    } else {
      setBad(true);
      setPin('');
    }
  };
  return (
    <div className="pin-gate">
      <form className="pin-card" onSubmit={submit}>
        <div className="pin-icon"><Icon name="lock" size={26} /></div>
        <h2>{BUSINESS}</h2>
        <p>Ingresa el PIN para continuar</p>
        <input type="password" inputMode="numeric" autoFocus value={pin}
          onChange={(e) => { setPin(e.target.value); setBad(false); }} placeholder="••••" />
        {bad && <span className="pin-error">PIN incorrecto</span>}
        <button className="btn primary block" type="submit">Entrar</button>
      </form>
    </div>
  );
}
