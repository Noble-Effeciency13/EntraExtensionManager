import { useEffect } from 'react';

/**
 * Global keyboard shortcut dispatcher.
 *
 * Pages register handlers for the page-scoped shortcuts they care about by
 * subscribing to a `CustomEvent` on `window`, while AppShell handles the
 * truly global ones (`?` opens About, `e` toggles edit mode).
 *
 * Shortcuts are ignored while focus is in a text input, textarea, contentEditable
 * region, or any element with role=combobox/listbox/dialog input.
 */
export type ShortcutEventName = 'eem:new' | 'eem:focus-search' | 'eem:about' | 'eem:toggle-mode';

const isTypingTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  const role = el.getAttribute('role');
  if (role === 'combobox' || role === 'textbox' || role === 'searchbox') return true;
  return false;
};

export interface KeyboardShortcutOptions {
  onAbout?: () => void;
  onToggleMode?: () => void;
}

/**
 * Mount once at the app shell. Forwards page-scoped shortcuts as window events.
 */
export function useGlobalKeyboardShortcuts({
  onAbout,
  onToggleMode,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (isTypingTarget(ev.target)) {
        // Allow Escape and `/` while typing to bubble out as needed.
        return;
      }
      switch (ev.key) {
        case '?':
          ev.preventDefault();
          onAbout?.();
          break;
        case 'e':
        case 'E':
          ev.preventDefault();
          onToggleMode?.();
          break;
        case 'n':
        case 'N':
          ev.preventDefault();
          window.dispatchEvent(new CustomEvent('eem:new'));
          break;
        case '/':
          ev.preventDefault();
          window.dispatchEvent(new CustomEvent('eem:focus-search'));
          break;
        default:
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onAbout, onToggleMode]);
}

/**
 * Page-side hook. Subscribes to a single page-scoped shortcut event.
 */
export function usePageShortcut(name: ShortcutEventName, handler: () => void) {
  useEffect(() => {
    const fn = () => handler();
    window.addEventListener(name, fn);
    return () => window.removeEventListener(name, fn);
  }, [name, handler]);
}
