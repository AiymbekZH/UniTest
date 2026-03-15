import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const links = [
  { label: 'Возможности', href: '#features' },
  { label: 'Как это работает', href: '#demo' },
  { label: 'Для кого', href: '#reviews' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <motion.nav
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: 'background 0.4s, border-color 0.4s',
        background: scrolled ? 'rgba(0,0,0,0.7)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      }}
    >
      <div className="container-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 10L8 15L17 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#ededed', letterSpacing: '-0.02em' }}>
            UniTest
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center" style={{ gap: 28 }}>
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{
                fontSize: 13,
                color: '#888',
                textDecoration: 'none',
                transition: 'color 0.2s',
                position: 'relative',
              }}
              onMouseEnter={(e) => (e.target.style.color = '#ededed')}
              onMouseLeave={(e) => (e.target.style.color = '#888')}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center" style={{ gap: 16 }}>
          <a
            href="https://unitest.page"
            style={{ fontSize: 13, color: '#888', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={(e) => (e.target.style.color = '#ededed')}
            onMouseLeave={(e) => (e.target.style.color = '#888')}
          >
            Войти
          </a>
          <a
            href="https://unitest.page/register"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#000',
              background: '#ededed',
              padding: '7px 16px',
              borderRadius: 8,
              textDecoration: 'none',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.target.style.background = '#fff')}
            onMouseLeave={(e) => (e.target.style.background = '#ededed')}
          >
            Попробовать
          </a>
        </div>

        {/* Mobile */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden"
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 4 }}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.95)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div style={{ padding: '12px 24px 20px' }}>
              {links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                  style={{ display: 'block', padding: '10px 0', fontSize: 15, color: '#888', textDecoration: 'none' }}>
                  {l.label}
                </a>
              ))}
              <div style={{ paddingTop: 12, marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <a href="https://unitest.page/register"
                  style={{ display: 'block', padding: '12px', fontSize: 14, fontWeight: 500, color: '#000', background: '#ededed', borderRadius: 8, textAlign: 'center', textDecoration: 'none' }}>
                  Попробовать
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
