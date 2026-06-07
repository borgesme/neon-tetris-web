import type { ReactNode } from 'react';

interface DialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ title, open, onClose, children }: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section
        className="dialog-shell"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog-header">
          <h2>{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="dialog-content">{children}</div>
      </section>
    </div>
  );
}
