import { useEffect } from 'react';

type KeyCombo = {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  callback: (e: KeyboardEvent) => void;
};

export function useKeyPress(combos: KeyCombo[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in input, textarea, or select
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      );

      // We only allow Alt combo shortcuts if the user is typing in an input
      combos.forEach(combo => {
        const keyMatch = event.key.toLowerCase() === combo.key.toLowerCase();
        const altMatch = combo.altKey ? event.altKey : true;
        const ctrlMatch = combo.ctrlKey ? event.ctrlKey : true;
        const shiftMatch = combo.shiftKey ? event.shiftKey : true;

        if (keyMatch) {
          // If we are typing in an input, ONLY trigger if Alt/Ctrl is required
          if (isInput && !combo.altKey && !combo.ctrlKey) {
            return;
          }

          // Exact match on modifier states
          const matchesModifiers = 
            (combo.altKey === undefined || combo.altKey === event.altKey) &&
            (combo.ctrlKey === undefined || combo.ctrlKey === event.ctrlKey) &&
            (combo.shiftKey === undefined || combo.shiftKey === event.shiftKey);

          if (matchesModifiers) {
            event.preventDefault();
            combo.callback(event);
          }
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [combos]);
}
