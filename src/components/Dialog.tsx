import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface DialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ title, open, onClose, children }: DialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

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
          <button ref={closeButtonRef} type="button" aria-label="Close dialog" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="dialog-content">{children}</div>
      </section>
    </div>
  );
}
