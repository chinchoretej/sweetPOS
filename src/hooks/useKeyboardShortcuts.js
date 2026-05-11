import { useEffect } from 'react';

/**
 * Bind keyboard shortcuts.
 * @param {Array<{combo: string, handler: (e: KeyboardEvent) => void}>} bindings
 *   combo example: 'alt+n', 'ctrl+shift+p', 'escape'
 */
export default function useKeyboardShortcuts(bindings, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const onKey = (e) => {
      const target = e.target;
      const isEditing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      bindings.forEach(({ combo, handler, allowInInputs = false }) => {
        if (isEditing && !allowInInputs && !combo.startsWith('escape')) return;

        const parts = combo.toLowerCase().split('+');
        const key = parts[parts.length - 1];
        const needAlt = parts.includes('alt');
        const needCtrl = parts.includes('ctrl');
        const needShift = parts.includes('shift');
        const needMeta = parts.includes('meta');

        const eventKey = (e.key || '').toLowerCase();
        if (eventKey !== key) return;
        if (needAlt !== e.altKey) return;
        if (needCtrl !== e.ctrlKey) return;
        if (needShift !== e.shiftKey) return;
        if (needMeta !== e.metaKey) return;

        e.preventDefault();
        handler(e);
      });
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bindings, enabled]);
}
