import { useCallback, useEffect, useRef } from 'react';

export default function useAntiCheat({ enabled, onViolation }) {
  const violationsRef = useRef([]);
  const onViolationRef = useRef(onViolation);

  // Keep the callback ref always in sync without re-running effects
  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  const addViolation = useCallback((type, details = '') => {
    const violation = { type, timestamp: new Date().toISOString(), details };
    violationsRef.current.push(violation);
    if (onViolationRef.current) onViolationRef.current(violation, violationsRef.current.length);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const cleanup = [];

    // === НАРУШЕНИЕ: только уход со страницы ===
    const handleVisibility = () => {
      if (document.hidden) {
        addViolation('tab-switch', 'Пользователь покинул страницу теста');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    cleanup.push(() => document.removeEventListener('visibilitychange', handleVisibility));

    // === БЛОКИРОВКА (без нарушения): копирование/вставка/вырезка ===
    const blockCopy = (e) => e.preventDefault();
    const blockPaste = (e) => {
      if (e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
    };
    document.addEventListener('copy', blockCopy, true);
    document.addEventListener('cut', blockCopy, true);
    document.addEventListener('paste', blockPaste, true);
    cleanup.push(() => {
      document.removeEventListener('copy', blockCopy, true);
      document.removeEventListener('cut', blockCopy, true);
      document.removeEventListener('paste', blockPaste, true);
    });

    // === БЛОКИРОВКА: правый клик ===
    const blockContext = (e) => e.preventDefault();
    document.addEventListener('contextmenu', blockContext, true);
    cleanup.push(() => document.removeEventListener('contextmenu', blockContext, true));

    // === БЛОКИРОВКА: выделение текста (CSS + JS + мобилка) ===
    const style = document.createElement('style');
    style.id = 'anti-cheat-styles';
    style.textContent = `
      *, *::before, *::after {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      textarea, input[type="text"], input[type="number"] {
        -webkit-user-select: text !important;
        user-select: text !important;
      }
      @media print {
        body * { display: none !important; }
        body::after {
          content: "Печать заблокирована";
          display: block; font-size: 24px; text-align: center; padding: 50px;
        }
      }
    `;
    document.head.appendChild(style);
    cleanup.push(() => style.remove());

    // === БЛОКИРОВКА: selectstart (предотвращает выделение на мобилке) ===
    const blockSelect = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      e.preventDefault();
    };
    document.addEventListener('selectstart', blockSelect, true);
    cleanup.push(() => document.removeEventListener('selectstart', blockSelect, true));

    // === БЛОКИРОВКА: долгое нажатие на мобилке (предотвращает контекстное меню) ===
    let touchTimer = null;
    const blockLongPress = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' ||
          e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO') return;
      touchTimer = setTimeout(() => {
        e.preventDefault();
      }, 300);
    };
    const clearLongPress = () => {
      if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
    };
    document.addEventListener('touchstart', blockLongPress, { passive: false, capture: true });
    document.addEventListener('touchend', clearLongPress, true);
    document.addEventListener('touchmove', clearLongPress, true);
    cleanup.push(() => {
      document.removeEventListener('touchstart', blockLongPress, true);
      document.removeEventListener('touchend', clearLongPress, true);
      document.removeEventListener('touchmove', clearLongPress, true);
    });

    // === БЛОКИРОВКА: горячие клавиши (Ctrl+C/V/X, PrintScreen, F12, Ctrl+P) ===
    const handleKeyDown = (e) => {
      if (e.ctrlKey && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
        if (e.target.tagName === 'TEXTAREA' && e.key.toLowerCase() === 'v') return;
        e.preventDefault();
      }
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        navigator.clipboard?.writeText?.('').catch(() => {});
      }
      if (e.key === 's' && e.shiftKey && e.metaKey) {
        e.preventDefault();
      }
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    cleanup.push(() => document.removeEventListener('keydown', handleKeyDown, true));

    // === БЛОКИРОВКА: PrintScreen через keyup ===
    const handleKeyUp = (e) => {
      if (e.key === 'PrintScreen') {
        navigator.clipboard?.writeText?.('').catch(() => {});
      }
    };
    document.addEventListener('keyup', handleKeyUp, true);
    cleanup.push(() => document.removeEventListener('keyup', handleKeyUp, true));

    // === БЛОКИРОВКА: печать ===
    const handleBeforePrint = (e) => { e.preventDefault?.(); };
    window.addEventListener('beforeprint', handleBeforePrint);
    cleanup.push(() => window.removeEventListener('beforeprint', handleBeforePrint));

    return () => cleanup.forEach(fn => fn());
  }, [enabled, addViolation]);

  return { violations: violationsRef.current };
}
