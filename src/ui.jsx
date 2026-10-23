import { useEffect } from 'react';
import { PERIODS, formatInput, parseAmount } from './utils';

const ICONS = {
  sell: ['M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.4L21 8H6.2', 'M9.5 20.5h.01', 'M17.5 20.5h.01'],
  chart: ['M4 20V11', 'M10 20V5', 'M16 20v-6', 'M21 20H3'],
  receipt: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6', 'M9 12h6', 'M9 16h3'],
  wallet: ['M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3', 'M4 7.5v10A2.5 2.5 0 0 0 6.5 20H20V8H6.5A2.5 2.5 0 0 1 4 5.5', 'M16 14h.01'],
  box: ['M21 8l-9-5-9 5 9 5 9-5z', 'M3 8v8.5l9 4.5 9-4.5V8', 'M12 13v8'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  x: ['M6 6l12 12', 'M18 6L6 18'],
  trash: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 13h10l1-13', 'M9 7V4h6v3'],
  edit: ['M4 20h4L19 9l-4-4L4 16z', 'M13.5 6.5l4 4'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
  download: ['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14'],
  upload: ['M12 20V9', 'M7 14l5-5 5 5', 'M5 4h14'],
  eye: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  eyeOff: ['M3 3l18 18', 'M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9', 'M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
  cash: ['M3 6h18v12H3z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M6 9v.01', 'M18 15v.01'],
  phone: ['M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z', 'M11 18h2'],
  refresh: ['M20 11a8 8 0 1 0-2.3 5.7', 'M20 4v7h-7'],
  cloud: ['M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z'],
  device: ['M4 5h16v11H4z', 'M9 20h6', 'M12 16v4'],
  lock: ['M6 11h12v10H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  tag: ['M3 12V4h8l10 10-8 8z', 'M7.5 8.5h.01'],
  users: ['M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1', 'M16 3.5a4 4 0 0 1 0 7', 'M19 14a5 5 0 0 1 3 4.6V21'],
  logout: ['M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4', 'M10 17l-5-5 5-5', 'M5 12h11'],
};

export function Icon({ name, size = 20, stroke = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(ICONS[name] || []).map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

export function Modal({ open, onClose, title, children, footer, size }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size || ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function MoneyInput({ value, onChange, placeholder = '0', autoFocus, id, big }) {
  return (
    <div className={`money-input ${big ? 'big' : ''}`}>
      <span>$</span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        autoFocus={autoFocus}
        value={value ? formatInput(value) : ''}
        onChange={(e) => onChange(parseAmount(e.target.value))}
      />
    </div>
  );
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`segmented ${className}`} role="tablist">
      {options.map(([v, label]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v}
          className={value === v ? 'active' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function MethodPicker({ value, onChange }) {
  return (
    <div className="method-picker">
      <button type="button" className={`method efectivo ${value === 'efectivo' ? 'active' : ''}`}
        onClick={() => onChange('efectivo')}>
        <Icon name="cash" /> Efectivo
      </button>
      <button type="button" className={`method transferencia ${value === 'transferencia' ? 'active' : ''}`}
        onClick={() => onChange('transferencia')}>
        <Icon name="phone" /> Transferencia
      </button>
    </div>
  );
}

export function MethodPill({ method }) {
  return (
    <span className={`pill ${method}`}>
      <Icon name={method === 'efectivo' ? 'cash' : 'phone'} size={14} />
      {method === 'efectivo' ? 'Efectivo' : 'Transferencia'}
    </span>
  );
}

export function Empty({ icon, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={28} /></div>
      <h4>{title}</h4>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function PeriodPicker({ period, setPeriod, custom, setCustom }) {
  return (
    <div className="period">
      <div className="chips scroll">
        {PERIODS.map(([v, label]) => (
          <button key={v} className={`chip ${period === v ? 'active' : ''}`} onClick={() => setPeriod(v)}>
            {label}
          </button>
        ))}
      </div>
      {period === 'rango' && (
        <div className="range">
          <label>Desde <input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></label>
          <label>Hasta <input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></label>
        </div>
      )}
    </div>
  );
}

export function PageHead({ title, subtitle, children }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}
