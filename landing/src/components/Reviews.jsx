import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Building2, ChevronRight } from 'lucide-react';
import SpotlightCard from './SpotlightCard';
import { FadeUp, Stagger, StaggerChild } from './Animations';

const personas = [
  {
    icon: BookOpen,
    title: 'Преподавателям',
    desc: 'Создавайте тесты за минуты, а не часы. ИИ генерирует вопросы, античит следит за честностью, аналитика показывает слабые места студентов.',
    points: ['ИИ-генерация из любого материала', 'Билетная система — каждому свой вариант', 'Аналитика по каждому вопросу'],
    visual: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Mini test creation UI */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M5 2V8M2 5H8" stroke="#ededed" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </div>
          <span style={{ fontSize: 11, color: '#888' }}>Новый тест</span>
          <div style={{ marginLeft: 'auto', fontSize: 10, color: '#555', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }}>ИИ</div>
        </div>
        {[85, 72, 93].map((v, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
            <div style={{ width: 60, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ width: `${v}%`, height: '100%', borderRadius: 2, background: v > 80 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)' }} />
            </div>
            <span style={{ fontSize: 10, color: '#555', fontVariantNumeric: 'tabular-nums' }}>{v}%</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: GraduationCap,
    title: 'Студентам',
    desc: 'Проходите тесты с любого устройства. Моментальные результаты, тренировочный режим для подготовки, понятная статистика прогресса.',
    points: ['Тест по ссылке — без регистрации', 'Результат сразу после сдачи', 'Тренировочный режим для подготовки'],
    visual: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Mini test-taking UI */}
        <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Вопрос 3 из 10</div>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: '10%' }}
            whileInView={{ width: '30%' }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 2, background: 'rgba(255,255,255,0.2)' }}
          />
        </div>
        {['Фотосинтез', 'Хемосинтез', 'Гидролиз'].map((a, i) => (
          <div key={i} style={{
            padding: '6px 10px', borderRadius: 6, fontSize: 11,
            border: `1px solid rgba(255,255,255,${i === 0 ? '0.15' : '0.04'})`,
            background: i === 0 ? 'rgba(255,255,255,0.04)' : 'transparent',
            color: i === 0 ? '#ededed' : '#555',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              border: `1.5px solid rgba(255,255,255,${i === 0 ? '0.4' : '0.1'})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {i === 0 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ededed' }} />}
            </div>
            {a}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Building2,
    title: 'Организациям',
    desc: 'Тестирование сотрудников, аттестация, проверка знаний. Группы, назначения, детальные отчёты — всё в одном месте.',
    points: ['Группы и назначения тестов', 'Детальные отчёты по каждому', 'Поддержка KZ/RU/EN'],
    visual: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Mini org dashboard */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: '#888' }}>Группы</span>
          <span style={{ fontSize: 10, color: '#555' }}>3 активных</span>
        </div>
        {['Отдел продаж', 'Бухгалтерия', 'IT-отдел'].map((g, i) => (
          <div key={i} style={{
            padding: '6px 10px', borderRadius: 6, fontSize: 11,
            border: '1px solid rgba(255,255,255,0.04)',
            background: i === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
            color: '#888',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>{g}</span>
            <span style={{ fontSize: 10, color: '#555' }}>{[12, 8, 15][i]} чел.</span>
          </div>
        ))}
      </div>
    ),
  },
];

export default function Reviews() {
  return (
    <section id="reviews" style={{ position: 'relative', padding: '120px 0', overflow: 'hidden' }}>
      <div className="container-main" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <FadeUp>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Для кого
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: '#ededed', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              Создан для каждого
              <br />
              <span style={{ color: '#555' }}>участника процесса</span>
            </h2>
          </FadeUp>
        </div>

        <Stagger stagger={0.1} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          alignItems: 'start',
        }}>
          {personas.map((p) => (
            <StaggerChild key={p.title}>
              <SpotlightCard style={{ padding: 0, overflow: 'hidden' }}>
                {/* Visual preview */}
                <div style={{
                  padding: '20px 20px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  minHeight: 140,
                }}>
                  {p.visual}
                </div>
                {/* Content */}
                <div style={{ padding: '20px 24px 28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(255,255,255,0.03)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <p.icon size={16} color="#ededed" />
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 600, color: '#ededed' }}>
                      {p.title}
                    </h3>
                  </div>
                  <p style={{ fontSize: 14, color: '#888', lineHeight: 1.65, marginBottom: 16 }}>
                    {p.desc}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {p.points.map((pt) => (
                      <li key={pt} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#888' }}>
                        <ChevronRight size={12} color="#555" style={{ flexShrink: 0 }} />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </SpotlightCard>
            </StaggerChild>
          ))}
        </Stagger>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #reviews [style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
