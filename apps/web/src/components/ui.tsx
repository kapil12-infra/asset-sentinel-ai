import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ProjectStatus } from '@asset-sentinel/shared';
import { Icon } from './icons';
export { Modal, ConfirmModal, ProgressModal, useStepper } from './Modal';
export { LineChart } from './Charts';

/* ---------- Toast ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const timer = useRef<number>();
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(''), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className={`toast${msg ? ' show' : ''}`} role="status" aria-live="polite">{msg}</div>
    </ToastCtx.Provider>
  );
}

/* ---------- Data loading ---------- */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    fn()
      .then((d) => { if (live) { setData(d); setError(null); } })
      .catch((e: Error) => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, loading, reload: () => setTick((n) => n + 1), setData };
}

export function Loading({ error }: { error?: string | null }) {
  return <p className="empty">{error ? `Could not load: ${error}` : 'Loading…'}</p>;
}

/* ---------- Small pieces ---------- */
const STATUS: Record<ProjectStatus, { cls: string; label: string }> = {
  none: { cls: 'none', label: 'Not tested' },
  pass: { cls: 'pass', label: 'Passed' },
  warn: { cls: 'warn', label: 'Needs attention' },
};

export function StatusChip({ status }: { status: ProjectStatus }) {
  const s = STATUS[status];
  return <span className={`status ${s.cls}`}>{status === 'pass' && <Icon name="check" />}{s.label}</span>;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="fl"><label>{label}</label>{children}</div>;
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} className={`sw${on ? ' on' : ''}`} onClick={() => onChange(!on)} />;
}

export function download(name: string, content: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
