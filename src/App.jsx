import { useCallback, useEffect, useRef, useState } from 'react';
import { auth, db, normalize, supabase, upsertRow } from './data';
import { Icon } from './ui';
import Login, { BUSINESS, Logo, Pending } from './views/Login';
import Sell from './views/Sell';
import Dashboard from './views/Dashboard';
import History from './views/History';
import Expenses from './views/Expenses';
import Products from './views/Products';
import Team from './views/Team';

const ADMIN_TABS = [
  { id: 'vender', label: 'Vender', icon: 'sell' },
  { id: 'resumen', label: 'Resumen', icon: 'chart' },
  { id: 'ventas', label: 'Ventas', icon: 'receipt' },
  { id: 'gastos', label: 'Gastos', icon: 'wallet' },
  { id: 'productos', label: 'Productos', icon: 'box' },
  { id: 'equipo', label: 'Equipo', icon: 'users' },
];

const SELLER_TABS = [
  { id: 'vender', label: 'Vender', icon: 'sell' },
  { id: 'resumen', label: 'Mi resumen', icon: 'chart' },
  { id: 'ventas', label: 'Mis ventas', icon: 'receipt' },
  { id: 'productos', label: 'Productos', icon: 'box' },
];

function readTab(tabs) {
  const h = window.location.hash.replace('#', '');
  return tabs.some((t) => t.id === h) ? h : 'vender';
}

// ---------- sesión y perfil ----------
export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;

  const loadProfile = useCallback(async () => {
    if (!session) return;
    try {
      setError('');
      setProfile(await auth.ensureProfile(session.user.user_metadata?.full_name));
    } catch (e) {
      console.error(e);
      setError(e?.message || 'No se pudo cargar tu perfil');
    }
  }, [session]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Mientras espera aprobación, escucha su propio perfil en tiempo real
  useEffect(() => {
    if (!profile || profile.active) return;
    const ch = supabase
      .channel('mic-mi-perfil')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mic_profiles', filter: `id=eq.${profile.id}` },
        ({ new: row }) => setProfile(row))
      .subscribe();
    const t = setInterval(loadProfile, 20000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [profile, loadProfile]);

  if (session === undefined) return <Splash />;
  if (!session) return <Login />;
  if (error) {
    return (
      <div className="error-box">
        <h3>No se pudo cargar tu perfil</h3>
        <p>{error}</p>
        <div className="row gap-s">
          <button className="btn primary" onClick={loadProfile}>Reintentar</button>
          <button className="btn ghost" onClick={() => auth.signOut()}>Cerrar sesión</button>
        </div>
      </div>
    );
  }
  if (!profile) return <Splash />;
  if (!profile.active) return <Pending profile={profile} onRefresh={loadProfile} />;
  return <Main key={profile.id + profile.role} me={profile} setMe={setProfile} />;
}

function Splash() {
  return <div className="loading"><div className="spinner" /> Cargando…</div>;
}

// ---------- app principal ----------
function Main({ me, setMe }) {
  const isAdmin = me.role === 'admin';
  const tabs = isAdmin ? ADMIN_TABS : SELLER_TABS;
  const [tab, setTab] = useState(() => readTab(tabs));
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
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
      const [p, s, e, pr] = await Promise.all([
        db.list('products'),
        db.list('sales'),
        isAdmin ? db.list('expenses') : Promise.resolve([]),
        isAdmin ? db.list('profiles') : Promise.resolve([]),
      ]);
      setProducts(p);
      setSales(s);
      setExpenses(e);
      setProfiles(pr);
      setError('');
    } catch (e) {
      console.error(e);
      setError(e?.message || 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  // Tiempo real: aplica los cambios que hagan otros dispositivos
  useEffect(() => {
    const setters = { products: setProducts, sales: setSales, expenses: setExpenses, profiles: setProfiles };
    let wasLive = false;
    return db.subscribe(
      (table, payload) => {
        if (table === 'profiles' && payload.new?.id === me.id) {
          const p = payload.new;
          if (!p.active || p.role !== me.role) setMe(p);
        }
        if (table === 'expenses' && !isAdmin) return;
        if (table === 'profiles' && !isAdmin) return;
        const set = setters[table];
        if (payload.eventType === 'DELETE') set((l) => l.filter((x) => x.id !== payload.old.id));
        else set((l) => upsertRow(l, normalize(table, payload.new)));
      },
      (status) => {
        const ok = status === 'SUBSCRIBED';
        setLive(ok);
        if (ok && wasLive) load(); // tras reconectar, recarga lo que se pudo perder
        if (ok) wasLive = true;
      }
    );
  }, [me.id, me.role, isAdmin, setMe, load]);

  useEffect(() => {
    const onHash = () => setTab(readTab(tabs));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [tabs]);

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
        setProducts((p) => upsertRow(p, row));
        toast(`Producto "${row.name}" creado`);
        return true;
      } catch (e) { fail(e); return false; }
    },
    async updateProduct(id, patch) {
      try {
        const row = await db.update('products', id, patch);
        setProducts((p) => upsertRow(p, row));
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
        setSales((s) => upsertRow(s, row));
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
        setExpenses((s) => upsertRow(s, row));
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
    async updateProfile(id, patch) {
      try {
        const row = await db.update('profiles', id, patch);
        setProfiles((p) => upsertRow(p, row));
        toast('Equipo actualizado', { type: 'success' });
      } catch (e) { fail(e); }
    },
    async deleteProfile(id) {
      try {
        await db.remove('profiles', id);
        setProfiles((p) => p.filter((x) => x.id !== id));
        toast('Solicitud rechazada');
      } catch (e) { fail(e); }
    },
  };

  const pendingCount = profiles.filter((p) => !p.active && p.role === 'vendedor').length;

  let view;
  if (loading) view = <Splash />;
  else if (error) view = (
    <div className="error-box">
      <h3>No se pudo conectar</h3>
      <p>{error}</p>
      <button className="btn primary" onClick={() => { setLoading(true); load(); }}>Reintentar</button>
    </div>
  );
  else if (tab === 'vender') view = <Sell products={products} onSale={actions.addSale} goProducts={() => go('productos')} />;
  else if (tab === 'resumen') view = <Dashboard sales={sales} expenses={expenses} isAdmin={isAdmin} profiles={profiles} me={me} />;
  else if (tab === 'ventas') view = <History sales={sales} onDelete={actions.deleteSale} isAdmin={isAdmin} me={me} />;
  else if (tab === 'gastos' && isAdmin) view = <Expenses expenses={expenses} onAdd={actions.addExpense} onDelete={actions.deleteExpense} />;
  else if (tab === 'equipo' && isAdmin) view = <Team profiles={profiles} sales={sales} me={me} actions={actions} />;
  else view = <Products products={products} actions={actions} isAdmin={isAdmin} me={me} />;

  return (
    <div className={`app tab-${tab} ${isAdmin ? 'is-admin' : 'is-seller'}`}>
      <aside className="sidebar">
        <div className="brand">
          <Logo />
          <div>
            <strong>{BUSINESS}</strong>
            <span>Control de ventas</span>
          </div>
        </div>
        <nav className="nav">
          {tabs.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => go(t.id)}>
              <span className="nav-icon">
                <Icon name={t.icon} size={21} />
                {t.id === 'equipo' && pendingCount > 0 && <i className="nav-badge">{pendingCount}</i>}
              </span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className={`sync ${live ? 'cloud' : 'local'}`}>
            <i className={`live-dot ${live ? 'on' : ''}`} />
            {live ? 'En vivo · sincronizado' : 'Conectando…'}
          </div>
          <div className="me">
            <span className={`avatar ${me.role}`}>{me.full_name.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{me.full_name}</strong>
              <span>{isAdmin ? 'Administrador' : 'Vendedor'}</span>
            </div>
            <button className="icon-btn" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={() => auth.signOut()}>
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="mobile-top">
        <div className="row gap-s">
          <i className={`live-dot ${live ? 'on' : ''}`} />
          <span><strong>{me.full_name}</strong> · {isAdmin ? 'Admin' : 'Vendedor'}</span>
        </div>
        <button className="btn ghost sm" onClick={() => auth.signOut()}><Icon name="logout" size={15} /> Salir</button>
      </div>

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
