import { useMemo, useState } from 'react';
import { Empty, Icon, MethodPicker, MethodPill, MoneyInput, PageHead, PeriodPicker } from '../ui';
import { EXPENSE_CATEGORIES, addDays, dayKey, downloadCSV, fmt, fmtDayLabel, fromInputDate, inRange, periodRange } from '../utils';

export default function Expenses({ expenses, onAdd, onDelete }) {
  const [period, setPeriod] = useState('mes');
  const [custom, setCustom] = useState({ from: dayKey(addDays(new Date(), -6)), to: dayKey(new Date()) });

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState('Insumos');
  const [method, setMethod] = useState('efectivo');
  const [date, setDate] = useState(dayKey(new Date()));
  const [saving, setSaving] = useState(false);

  const range = useMemo(() => periodRange(period, custom), [period, custom]);
  const list = useMemo(() => expenses.filter((x) => inRange(x.created_at, range)), [expenses, range]);
  const total = list.reduce((a, x) => a + x.amount, 0);
  const cash = list.filter((x) => x.method === 'efectivo').reduce((a, x) => a + x.amount, 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!amount || !description.trim() || saving) return;
    setSaving(true);
    let when = new Date();
    if (date !== dayKey(when)) {
      when = fromInputDate(date);
      when.setHours(12);
    }
    const ok = await onAdd({ description: description.trim(), amount, category, method, created_at: when.toISOString() });
    setSaving(false);
    if (ok) {
      setDescription('');
      setAmount(0);
      setDate(dayKey(new Date()));
    }
  };

  const exportCSV = () =>
    downloadCSV(`gastos-${dayKey(new Date())}.csv`, [
      ['Fecha', 'Descripción', 'Categoría', 'Método', 'Valor'],
      ...list.map((x) => [dayKey(x.created_at), x.description, x.category, x.method, x.amount]),
    ]);

  return (
    <div className="page">
      <PageHead title="Gastos" subtitle="Los gastos en efectivo se descuentan de lo que debería haber en caja">
        <button className="btn ghost" onClick={exportCSV} disabled={!list.length}>
          <Icon name="download" size={18} /> Exportar
        </button>
      </PageHead>

      <div className="expenses-layout">
        <form className="card form" onSubmit={submit}>
          <h3>Registrar gasto</h3>
          <label className="field">
            <span>Valor</span>
            <MoneyInput value={amount} onChange={setAmount} big />
          </label>
          <label className="field">
            <span>Descripción</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Compra de limones y sal" />
          </label>
          <div className="field">
            <span>Categoría</span>
            <div className="chips wrap">
              {EXPENSE_CATEGORIES.map((c) => (
                <button type="button" key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Pagado con</span>
            <MethodPicker value={method} onChange={setMethod} />
          </div>
          <label className="field">
            <span>Fecha</span>
            <input type="date" value={date} max={dayKey(new Date())} onChange={(e) => setDate(e.target.value || dayKey(new Date()))} />
          </label>
          <button className="btn primary block" disabled={!amount || !description.trim() || saving}>
            <Icon name="plus" size={18} /> Guardar gasto
          </button>
        </form>

        <div>
          <PeriodPicker period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} />
          <div className="kpis small">
            <div className="kpi"><span className="kpi-label">Total gastos</span><strong className="kpi-value">{fmt(total)}</strong></div>
            <div className="kpi"><span className="kpi-label">En efectivo</span><strong className="kpi-value">{fmt(cash)}</strong></div>
            <div className="kpi"><span className="kpi-label">Por transferencia</span><strong className="kpi-value">{fmt(total - cash)}</strong></div>
          </div>
          {list.length === 0 ? (
            <Empty icon="wallet" title="Sin gastos" text="No hay gastos registrados en este periodo." />
          ) : (
            <ul className="list card flush">
              {list.map((x) => (
                <li key={x.id} className="list-item">
                  <div className="li-time">{fmtDayLabel(x.created_at)}</div>
                  <div className="li-main">
                    <strong>{x.description}</strong>
                    <div className="li-meta">
                      <span className="tag">{x.category}</span>
                      <MethodPill method={x.method} />
                    </div>
                  </div>
                  <strong className="li-amount neg">−{fmt(x.amount)}</strong>
                  <button className="icon-btn danger" aria-label="Eliminar gasto"
                    onClick={() => confirm(`¿Eliminar el gasto "${x.description}"?`) && onDelete(x.id)}>
                    <Icon name="trash" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
