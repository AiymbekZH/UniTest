import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Sparkles, Shield, Zap, Brain, 
  ChevronRight, Activity, Globe 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Landing() {
  const { t } = useLanguage();
  const { scrollY } = useScroll();
  
  // Parallax effects for background orbs
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.3]);

  const features = [
    { 
      icon: <Brain className="w-6 h-6 text-indigo-400" />, 
      title: t('landingFeatureAIGenTitle') || 'AI Generation', 
      desc: t('landingFeatureAIGenDesc') || 'Generate questions instantly'
    },
    { 
      icon: <Shield className="w-6 h-6 text-emerald-400" />, 
      title: t('landingFeatureSecurityTitle') || 'Anti-Cheat Protection', 
      desc: t('landingFeatureSecurityDesc') || 'Browser lock, tab tracking, and secure execution for honest testing.'
    },
    { 
      icon: <Activity className="w-6 h-6 text-rose-400" />, 
      title: t('landingFeatureAnalyticsTitle') || 'Deep Analytics', 
      desc: t('landingFeatureAnalyticsDesc') || 'Track performance with real-time analytics and detailed score reports.'
    },
    { 
      icon: <Globe className="w-6 h-6 text-cyan-400" />, 
      title: t('landingFeatureLanguageTitle') || 'Multilingual', 
      desc: t('landingFeatureLanguageDesc') || 'Work globally'
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#030014] text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* --- Ambient Background Effects (Glassmorphism & Lights) --- */}
      <motion.div 
        style={{ y: y1, opacity }}
        className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none"
      />
      <motion.div 
        style={{ y: y2, opacity }}
        className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none"
      />
      <div className="absolute top-[40%] left-[50%] translate-x-[-50%] w-[80vw] h-[20vw] bg-emerald-500/10 blur-[150px] pointer-events-none rounded-full" />
      
      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />

      {/* --- Navigation Bar --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#030014]/50 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            SynapseTest
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link 
            to="/login" 
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            {t('landingLoginBtn') || 'Log in'}
          </Link>
          <Link 
            to="/register" 
            className="px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-full backdrop-blur-md transition-all shadow-[0_4px_14px_0_rgba(255,255,255,0.1)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.15)] flex items-center gap-2"
          >
            {t('landingCtaBtn') || 'Sign Up'}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* --- Main Hero Section --- */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-20 text-center">
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 text-sm border rounded-full border-indigo-500/30 bg-indigo-500/10 text-indigo-300 backdrop-blur-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span>{t('landingBadge') || 'Next Generation Testing Platform'}</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="max-w-4xl mb-6 text-5xl font-extrabold tracking-tight md:text-7xl lg:text-8xl"
        >
          <span className="text-white">{t('landingHeroTitle') || 'Assess with confidence,'}</span> <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
            {t('landingHeroSubtitle') || 'powered by AI'}
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-2xl mb-10 text-lg md:text-xl text-slate-400"
        >
          {t('landingHeroDesc') || 'UniTest is an all-in-one platform for educators to create tests, monitor students, and analyze results seamlessly.'}
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col items-center gap-4 sm:flex-row"
        >
          <Link 
            to="/register" 
            className="group relative px-8 py-4 text-base font-semibold text-white bg-indigo-600 rounded-full overflow-hidden transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(99,102,241,0.6)]"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] skew-x-[30deg] group-hover:translate-x-[150%] transition-transform duration-700 ease-out" />
            <span className="relative flex items-center justify-center gap-2">
              {t('landingStartBtn') || 'Get Started Free'} <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
          <Link 
            to="/login"
            className="px-8 py-4 text-base font-semibold text-white border rounded-full border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors"
          >
            {t('landingLoginBtn') || 'View Live Demo'}
          </Link>
        </motion.div>
      </main>

      {/* --- Features Grid (Glassmorphism Cards) --- */}
      <div className="relative z-10 px-6 pb-32 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
            {t('landingFeaturesHeader') || 'Powered by Advanced Tech.'}
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            {t('landingFeaturesSubHeader') || 'Everything you need to run secure, intelligent, and scalable assessments.'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent border border-white/5 backdrop-blur-xl group hover:border-white/20 transition-colors"
            >
              <div className="h-full p-6 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 mb-4 rounded-lg bg-[#030014]/50 flex items-center justify-center border border-white/10 shadow-inner">
                  {item.icon}
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
    </div>
  );
}
