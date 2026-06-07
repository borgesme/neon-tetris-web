import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  if (!promptEvent) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await promptEvent.prompt();
          await promptEvent.userChoice;
        } catch {
          // Browsers may reject if the install prompt is no longer available.
        } finally {
          setPromptEvent(null);
        }
      }}
    >
      Install
    </button>
  );
}
