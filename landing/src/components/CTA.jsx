import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { FadeUp } from './Animations';

export default function CTA() {
  return (
    <section style={{ position: 'relative', padding: '120px 0' }}>
      <div className="container-narrow" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <FadeUp>
          <div className="gradient-border" style={{ display: 'inline-block', width: '100%' }}>
            <div style={{
              background: '#0a0a0a',
              borderRadius: 16,
              padding: '64px 40px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Radial glow inside */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 500,
                height: 300,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 60%)',
                pointerEvents: 'none',
              }} />

              <h2 style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                fontWeight: 700,
                color: '#ededed',
                letterSpacing: '-0.04em',
                lineHeight: 1.1,
                marginBottom: 16,
                position: 'relative',
              }}>
                Готовы начать?
              </h2>
              <p style={{
                fontSize: 16,
                color: '#888',
                lineHeight: 1.65,
                maxWidth: 380,
                margin: '0 auto 36px',
                position: 'relative',
              }}>
                Создайте первый тест за 5&nbsp;минут. Бесплатно, без кредитной карты.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', position: 'relative' }}>
                <a
                  href="https://unitest.page/register"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '12px 28px', fontSize: 14, fontWeight: 500,
                    color: '#000', background: '#ededed', borderRadius: 10,
                    textDecoration: 'none', transition: 'background 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 24px rgba(255,255,255,0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ededed'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  Создать аккаунт
                  <ArrowRight size={15} />
                </a>
                <a
                  href="https://unitest.page"
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '12px 28px', fontSize: 14, fontWeight: 500,
                    color: '#888', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                    textDecoration: 'none', transition: 'color 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ededed'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                  Войти
                </a>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
