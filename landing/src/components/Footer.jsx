const footerLinks = {
  'Платформа': [
    { label: 'Возможности', href: '#features' },
    { label: 'Как это работает', href: '#demo' },
    { label: 'Для кого', href: '#reviews' },
  ],
  'Поддержка': [
    { label: 'Обратная связь', href: 'mailto:support@unitest.page' },
  ],
  'Приложение': [
    { label: 'Войти', href: 'https://unitest.page' },
    { label: 'Регистрация', href: 'https://unitest.page/register' },
  ],
};

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="container-main" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
          gap: 32,
          marginBottom: 40,
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M3 10L8 15L17 6" stroke="#ededed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#ededed' }}>UniTest</span>
            </div>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, maxWidth: 200 }}>
              Платформа онлайн-тестирования для преподавателей и студентов.
            </p>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 style={{
                fontSize: 12, fontWeight: 500, color: '#888',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16,
              }}>
                {title}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      style={{ fontSize: 13, color: '#555', textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={(e) => (e.target.style.color = '#ededed')}
                      onMouseLeave={(e) => (e.target.style.color = '#555')}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{
          paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontSize: 12, color: '#333' }}>
            &copy; {new Date().getFullYear()} UniTest
          </p>
          <p style={{ fontSize: 12, color: '#333' }}>
            Казахстан
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          footer [style*="grid-template-columns: 1.5fr"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
