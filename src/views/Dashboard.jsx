import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Empty, Icon, PageHead, PeriodPicker } from '../ui';
import { addDays, dayKey, downloadCSV, fmt, fmtShort, inRange, periodRange, startOfDay } from '../utils';

const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

export default function Dashboard({ sales, expenses, isAdmin, profiles = [] }) {
  const [period, setPeriod] = useState('hoy');
  const [custom, setCustom] = useState({ from: dayKey(addDays(new Date(), -6)), to: dayKey(new Date()) });
  const [view, setView] = useState('chart');
  const [seller, setSeller] = useState('');

  const range = useMemo(() => periodRange(period, custom), [period, custom]);
  const periodSales = useMemo(() => sales.filter((x) => inRange(x.created_at, range)), [sales, range]);
  const s = useMemo(() => (seller ? periodSales.filter((x) => x.seller_id === seller) : periodSales), [periodSales, seller]);
  // Al filtrar por un vendedor se muestra solo lo que él recaudó (sin gastos)
  const e = useMemo(
    () => (seller ? [] : expenses.filter((x) => inRange(x.created_at, range))),
    [expenses, range, seller]
  );
  const showExpenses = isAdmin && !seller;

  const sellers = useMemo(() => {
    const names = new Map(profiles.map((p) => [p.id, p.full_name]));
    sales.forEach((x) => x.seller_id && !names.has(x.seller_id) && names.set(x.seller_id, x.seller_name || 'Sin nombre'));
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [profiles, sales]);

  const bySeller = useMemo(() => {
    const map = new Map();
    periodSales.forEach((x) => {
      const k = x.seller_id || 'none';
      const cur = map.get(k) || { id: k, name: x.seller_name || 'Sin nombre', count: 0, cash: 0, transfer: 0 };
      cur.count += 1;
      if (x.method === 'efectivo') cur.cash += x.total;
      else cur.transfer += x.total;
      map.set(k, cur);
    });
    return [...map.values()].sort((a, b) => b.cash + b.transfer - (a.cash + a.transfer));
  }, [periodSales]);

  const stats = useMemo(() => {
    const cash = sum(s.filter((x) => x.method === 'efectivo'), (x) => x.total);
    const transfer = sum(s.filter((x) => x.method === 'transferencia'), (x) => x.total);
    const expCash = sum(e.filter((x) => x.method === 'efectivo'), (x) => x.amount);
    const expTransfer = sum(e.filter((x) => x.method === 'transferencia'), (x) => x.amount);
    const income = cash + transfer;
    const exp = expCash + expTransfer;
    return {
      income, cash, transfer, exp, expCash, expTransfer,
      net: income - exp,
      count: s.length,
      avg: s.length ? income / s.length : 0,
      items: sum(s, (x) => sum(x.items, (i) => i.qty)),
    };
  }, [s, e]);

  const buckets = useMemo(() => buildBuckets(s, range, sales), [s, range, sales]);

  const top = useMemo(() => {
    const map = new Map();
    s.forEach((sale) =>
      sale.items.forEach((i) => {
        const k = i.name;
        const cur = map.get(k) || { name: k, qty: 0, revenue: 0 };
        cur.qty += i.qty;
        cur.revenue += i.qty * i.price;
        map.set(k, cur);
      })
    );
    return [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);
  }, [s]);

  const expByCat = useMemo(() => {
    const map = new Map();
    e.forEach((x) => map.set(x.category || 'Otros', (map.get(x.category || 'Otros') || 0) + x.amount));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [e]);

  const cashPct = stats.income ? Math.round((stats.cash / stats.income) * 100) : 0;
  const topMax = Math.max(1, ...top.map((t) => t.qty));
  const expMax = Math.max(1, ...expByCat.map((t) => t[1]));

  return (
    <div className="page">
      <PageHead
        title={isAdmin ? 'Resumen' : 'Mi resumen'}
        subtitle={isAdmin ? 'Ingresos, gastos y cuánto debería haber en caja' : 'Lo que has vendido y cuánto debes entregar'}
      />
      <PeriodPicker period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} />
      {isAdmin && sellers.length > 0 && (
        <div className="chips scroll seller-filter">
          <span className="chips-label">Vendedor:</span>
          <button className={`chip ${!seller ? 'active' : ''}`} onClick={() => setSeller('')}>Todos</button>
          {sellers.map(([id, name]) => (
            <button key={id} className={`chip ${seller === id ? 'active' : ''}`} onClick={() => setSeller(id)}>{name}</button>
          ))}
        </div>
      )}

      {/* Cuadre de caja */}
      <section className="balance">
        <div className="balance-card efectivo">
          <div className="balance-top">
            <span className="balance-icon"><Icon name="cash" size={20} /></span>
            <span>{showExpenses ? 'Debería haber en efectivo' : 'Efectivo recibido'}</span>
          </div>
          <strong>{fmt(stats.cash - stats.expCash)}</strong>
          <div className="balance-detail">
            <span>Ventas {fmt(stats.cash)}</span>
            {showExpenses && <span>Gastos −{fmt(stats.expCash)}</span>}
          </div>
        </div>
        <div className="balance-card transferencia">
          <div className="balance-top">
            <span className="balance-icon"><Icon name="phone" size={20} /></span>
            <span>{showExpenses ? 'Debería haber en transferencias' : 'Transferencias recibidas'}</span>
          </div>
          <strong>{fmt(stats.transfer - stats.expTransfer)}</strong>
          <div className="balance-detail">
            <span>Ventas {fmt(stats.transfer)}</span>
            {showExpenses && <span>Gastos −{fmt(stats.expTransfer)}</span>}
          </div>
        </div>
      </section>

      <section className="kpis">
        <Kpi label={showExpenses ? 'Ingresos totales' : 'Total vendido'} value={fmt(stats.income)} hint={`${stats.count} ${stats.count === 1 ? 'venta' : 'ventas'}`} />
        {showExpenses && <Kpi label="Gastos" value={fmt(stats.exp)} hint={`${e.length} ${e.length === 1 ? 'registro' : 'registros'}`} />}
        {showExpenses && <Kpi label="Ganancia neta" value={fmt(stats.net)} tone={stats.net < 0 ? 'neg' : 'pos'} hint="Ingresos − gastos" />}
        <Kpi label="Ticket promedio" value={fmt(stats.avg)} hint={`${stats.items} productos vendidos`} />
        {!showExpenses && <Kpi label="Productos vendidos" value={stats.items} hint="Unidades" />}
      </section>

      {isAdmin && !seller && bySeller.length > 0 && (
        <section className="card">
          <div className="card-head"><h3>Ventas por vendedor</h3></div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Vendedor</th><th className="num">Ventas</th><th className="num">Efectivo</th><th className="num">Transferencia</th><th className="num">Total</th></tr>
              </thead>
              <tbody>
                {bySeller.map((v) => (
                  <tr key={v.id} className="clickable" onClick={() => v.id !== 'none' && setSeller(v.id)}>
                    <td><strong>{v.name}</strong></td>
                    <td className="num">{v.count}</td>
                    <td className="num">{fmt(v.cash)}</td>
                    <td className="num">{fmt(v.transfer)}</td>
                    <td className="num"><strong>{fmt(v.cash + v.transfer)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {stats.income > 0 && (
        <section className="card">
          <div className="card-head">
            <h3>Forma de pago</h3>
          </div>
          <div className="split-bar" role="img" aria-label={`Efectivo ${cashPct}%, transferencia ${100 - cashPct}%`}>
            {stats.cash > 0 && <div className="seg efectivo" style={{ flexGrow: stats.cash }} />}
            {stats.transfer > 0 && <div className="seg transferencia" style={{ flexGrow: stats.transfer }} />}
          </div>
          <div className="legend">
            <span><i className="dot efectivo" /> Efectivo <strong>{fmt(stats.cash)}</strong> <em>{cashPct}%</em></span>
            <span><i className="dot transferencia" /> Transferencia <strong>{fmt(stats.transfer)}</strong> <em>{100 - cashPct}%</em></span>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h3>Ventas {buckets.unit === 'hora' ? 'por hora' : buckets.unit === 'mes' ? 'por mes' : 'por día'}</h3>
          <div className="row gap-s">
            <div className="legend inline">
              <span><i className="dot efectivo" /> Efectivo</span>
              <span><i className="dot transferencia" /> Transferencia</span>
            </div>
            <div className="mini-toggle">
              <button className={view === 'chart' ? 'active' : ''} onClick={() => setView('chart')}>Gráfico</button>
              <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>Tabla</button>
            </div>
          </div>
        </div>
        {!stats.income ? (
          <Empty icon="chart" title="Sin ventas en este periodo" text="Cuando registres ventas verás aquí su evolución." />
        ) : view === 'chart' ? (
          <StackedBars data={buckets.data} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{buckets.unit === 'hora' ? 'Hora' : buckets.unit === 'mes' ? 'Mes' : 'Día'}</th><th className="num">Efectivo</th><th className="num">Transferencia</th><th className="num">Total</th></tr></thead>
              <tbody>
                {buckets.data.filter((d) => d.efectivo + d.transferencia > 0).map((d) => (
                  <tr key={d.key}><td>{d.tip}</td><td className="num">{fmt(d.efectivo)}</td><td className="num">{fmt(d.transferencia)}</td><td className="num"><strong>{fmt(d.efectivo + d.transferencia)}</strong></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Productos vendidos</h3>
          {top.length > 0 && (
            <div className="row gap-s">
              <span className="muted sm">{top.length} {top.length === 1 ? 'producto' : 'productos'} · {stats.items} unidades</span>
              <button className="btn ghost sm" onClick={() => downloadCSV(`productos-vendidos-${dayKey(new Date())}.csv`, [
                ['Producto', 'Unidades', 'Total vendido'],
                ...top.map((t) => [t.name, t.qty, t.revenue]),
              ])}>
                <Icon name="download" size={16} /> Exportar
              </button>
            </div>
          )}
        </div>
        {top.length === 0 ? (
          <p className="muted">No se vendieron productos en este periodo.</p>
        ) : (
          <div className="table-wrap">
            <table className="table sold">
              <thead>
                <tr><th>Producto</th><th className="num">Unidades</th><th className="num">Total vendido</th></tr>
              </thead>
              <tbody>
                {top.map((t) => (
                  <tr key={t.name}>
                    <td>
                      <strong>{t.name}</strong>
                      <div className="rank-bar"><div style={{ width: `${(t.qty / topMax) * 100}%` }} /></div>
                    </td>
                    <td className="num"><strong>{t.qty}</strong></td>
                    <td className="num">{fmt(t.revenue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td>Total</td><td className="num">{stats.items}</td><td className="num">{fmt(stats.income)}</td></tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {showExpenses && (
        <section className="card">
          <div className="card-head"><h3>Gastos por categoría</h3></div>
          {expByCat.length === 0 ? (
            <p className="muted">Sin gastos en este periodo.</p>
          ) : (
            <ul className="rank">
              {expByCat.map(([c, v]) => (
                <li key={c}>
                  <div className="rank-body">
                    <div className="rank-row"><strong>{c}</strong><span>{fmt(v)}</span></div>
                    <div className="rank-bar exp"><div style={{ width: `${(v / expMax) * 100}%` }} /></div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function Kpi({ label, value, hint, tone }) {
  return (
    <div className={`kpi ${tone || ''}`}>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {hint && <span className="kpi-hint">{hint}</span>}
    </div>
  );
}

// ---------- agrupación ----------
const monthFmt = new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit' });
const longDay = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

function buildBuckets(sales, range, allSales) {
  let from = range.from;
  if (!from) {
    const first = allSales.length ? allSales[allSales.length - 1].created_at : new Date();
    from = startOfDay(first);
  }
  const days = Math.max(1, Math.round((range.to - from) / 864e5));
  const add = (b, sale) => { b[sale.method] += sale.total; };

  if (days <= 1) {
    const hours = sales.map((x) => new Date(x.created_at).getHours());
    const start = Math.min(8, ...hours);
    const end = Math.max(20, ...hours);
    const data = [];
    for (let h = start; h <= end; h++) {
      data.push({ key: `h${h}`, label: `${h}h`, tip: `${h}:00 – ${h}:59`, efectivo: 0, transferencia: 0 });
    }
    sales.forEach((x) => add(data[new Date(x.created_at).getHours() - start], x));
    return { unit: 'hora', data };
  }

  if (days <= 62) {
    const data = [];
    const idx = {};
    for (let d = new Date(from); d < range.to; d = addDays(d, 1)) {
      idx[dayKey(d)] = data.length;
      data.push({ key: dayKey(d), label: fmtShort(d), tip: longDay.format(d), efectivo: 0, transferencia: 0 });
    }
    sales.forEach((x) => {
      const i = idx[dayKey(x.created_at)];
      if (i !== undefined) add(data[i], x);
    });
    return { unit: 'dia', data };
  }

  const data = [];
  const idx = {};
  for (let d = new Date(from.getFullYear(), from.getMonth(), 1); d < range.to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    idx[k] = data.length;
    data.push({ key: k, label: monthFmt.format(d), tip: monthFmt.format(d), efectivo: 0, transferencia: 0 });
  }
  sales.forEach((x) => {
    const d = new Date(x.created_at);
    const i = idx[`${d.getFullYear()}-${d.getMonth()}`];
    if (i !== undefined) add(data[i], x);
  });
  return { unit: 'mes', data };
}

// ---------- gráfico ----------
function niceMax(v) {
  if (v <= 0) return 1000;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

const compact = (v) => {
  if (v >= 1e6) return `$${+(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${+(v / 1e3).toFixed(0)}k`;
  return `$${v}`;
};

function topRoundedRect(x, y, w, h, r) {
  if (h <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function StackedBars({ data }) {
  const ref = useRef(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 240, padL = 48, padR = 8, padT = 12, padB = 28;
  const innerW = w - padL - padR;
  const innerH = H - padT - padB;
  const max = niceMax(Math.max(0, ...data.map((d) => d.efectivo + d.transferencia)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const band = innerW / data.length;
  const barW = Math.max(4, Math.min(40, band * 0.66));
  const every = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(innerW / 52))));
  const y = (v) => padT + innerH - (v / max) * innerH;

  const hd = hover !== null ? data[hover] : null;

  return (
    <div className="chart" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg width={w} height={H} role="img" aria-label="Ventas por periodo, efectivo y transferencia">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis' : 'grid'} />
            <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tick">{compact(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + i * band + (band - barW) / 2;
          const hE = (d.efectivo / max) * innerH;
          const hT = (d.transferencia / max) * innerH;
          const gap = hE > 0 && hT > 0 ? 2 : 0;
          const base = padT + innerH;
          return (
            <g key={d.key} className={hover !== null && hover !== i ? 'dim' : ''}>
              {hE > 0 && (hT > 0
                ? <rect x={x} y={base - hE} width={barW} height={hE} className="bar efectivo" />
                : <path d={topRoundedRect(x, base - hE, barW, hE, 4)} className="bar efectivo" />)}
              {hT > 0 && <path d={topRoundedRect(x, base - hE - gap - hT, barW, hT, 4)} className="bar transferencia" />}
              {i % every === 0 && (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="tick">{d.label}</text>
              )}
              <rect x={padL + i * band} y={padT} width={band} height={innerH} fill="transparent"
                onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
            </g>
          );
        })}
      </svg>
      {hd && (
        <div className="tooltip" style={{ left: Math.min(Math.max(padL + hover * band + band / 2, 90), w - 90), top: 4 }}>
          <strong>{hd.tip}</strong>
          <span><i className="dot efectivo" /> Efectivo <b>{fmt(hd.efectivo)}</b></span>
          <span><i className="dot transferencia" /> Transferencia <b>{fmt(hd.transferencia)}</b></span>
          <span className="tt-total">Total <b>{fmt(hd.efectivo + hd.transferencia)}</b></span>
        </div>
      )}
    </div>
  );
}
