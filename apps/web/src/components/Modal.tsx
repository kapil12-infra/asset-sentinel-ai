import { ReactNode, useEffect, useState } from 'react';
import { Icon } from './icons';

/* ---------- Modal ---------- */
export function Modal({
  title, onClose, children, footer, wide,
}: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div id="modalRoot" className="on" role="dialog" aria-modal="true" aria-label={title}>
      <div className="scrim2" onClick={onClose} />
      <div className={`dlg${wide ? ' wide' : ''}`}>
        <div className="dh">
          <h3>{title}</h3>
          <button className="x" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="db">{children}</div>
        {footer && <div className="df">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({
  title, text, confirmLabel = 'Confirm', danger, onConfirm, onClose,
}: { title: string; text: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void | Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost sm" onClick={onClose}>Cancel</button>
          <button
            className={`btn sm ${danger ? 'danger' : 'primary'}`}
            disabled={busy}
            onClick={async () => { setBusy(true); try { await onConfirm(); } finally { onClose(); } }}
          >{confirmLabel}</button>
        </>
      }
    >
      <p>{text}</p>
    </Modal>
  );
}

/** Dialog that lists steps while a long request runs. */
export function ProgressModal({ title, steps, active }: { title: string; steps: string[]; active: number }) {
  return (
    <div id="modalRoot" className="on" role="dialog" aria-modal="true" aria-label={title}>
      <div className="scrim2" />
      <div className="dlg">
        <div className="dh"><h3>{title}</h3></div>
        <div className="db">
          <ul className="stl">
            {steps.map((s, i) => (
              <li key={s} className={i < active ? 'done' : i === active ? 'act' : ''}><i className="sd" />{s}</li>
            ))}
          </ul>
        </div>
        <div className="df" />
      </div>
    </div>
  );
}

/** Advances a step index on a timer while `running` is true. */
export function useStepper(count: number, running: boolean, everyMs = 1200): number {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!running) { setI(0); return; }
    const t = window.setInterval(() => setI((n) => Math.min(n + 1, count - 1)), everyMs);
    return () => window.clearInterval(t);
  }, [running, count, everyMs]);
  return i;
}
