import React from 'react';
import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { 
  Sparkles, 
  BarChart, 
  ShieldCheck, 
  Layers, 
  ArrowRight,
  GraduationCap,
  Users,
  SearchCheck,
  Zap
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const features = [
    {
      icon: <Sparkles className="w-8 h-8 text-primary-500" />,
      title: t('landingFeatureAIGenTitle') || 'AI Generation',
      description: t('landingFeatureAIGenDesc') || 'Generate questions from text or documents instantly using AI.'
    },
    {
      icon: <Layers className="w-8 h-8 text-indigo-500" />,
      title: t('landingFeatureLevelsTitle') || 'Difficulty DNA',
      description: t('landingFeatureLevelsDesc') || 'Dynamic 5-level difficulty system for precise knowledge assessment.'
    },
    {
      icon: <BarChart className="w-8 h-8 text-emerald-500" />,
      title: t('landingFeatureAnalyticsTitle') || 'Deep Analytics',
      description: t('landingFeatureAnalyticsDesc') || 'Track performance with real-time analytics and detailed score reports.'
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-red-500" />,
      title: t('landingFeatureSecurityTitle') || 'Anti-Cheat',
      description: t('landingFeatureSecurityDesc') || 'Browser lock, tab tracking, and secure execution for honest testing.'
    }
  ];

  const steps = [
    {
      icon: <Zap className="w-6 h-6 text-white" />,
      title: t('landingStep1Title') || 'Create',
      description: t('landingStep1Desc') || 'Write or generate test questions in seconds.'
    },
    {
      icon: <Users className="w-6 h-6 text-white" />,
      title: t('landingStep2Title') || 'Share',
      description: t('landingStep2Desc') || 'Send a short link to your students or groups.'
    },
    {
      icon: <SearchCheck className="w-6 h-6 text-white" />,
      title: t('landingStep3Title') || 'Analyze',
      description: t('landingStep3Desc') || 'Review results and grade automatically.'
    }
  ];

  return (
    <div className="min-h-screen bg-surface overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 -tr-translate-x-1/4 translate-y-1/4 w-[800px] h-[800px] bg-primary-400/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute bottom-0 left-0 translate-x-1/4 -translate-y-1/4 w-[600px] h-[600px] bg-indigo-400/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="flex justify-center mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium text-sm">
              <Sparkles className="w-4 h-4" />
              <span>{t('landingBadge') || 'The easiest way to test knowledge'}</span>
            </div>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="text-5xl md:text-7xl font-bold text-dark dark:text-white mb-6 tracking-tight leading-tight"
          >
            {t('landingHeroTitle') || 'Assess with confidence,'} <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">
              {t('landingHeroSubtitle') || 'powered by AI'}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10"
          >
            {t('landingHeroDesc') || 'UniTest is an all-in-one platform for educators to create tests, monitor students, and analyze results seamlessly.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register" className="btn-primary px-8 py-4 rounded-xl text-lg font-semibold flex items-center gap-2 w-full sm:w-auto justify-center group">
              {t('landingStartBtn') || 'Get Started Free'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/login" className="px-8 py-4 rounded-xl text-lg font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto text-center">
              {t('landingLoginBtn') || 'Log in'}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-dark dark:text-white mb-4">
              {t('landingFeaturesHeader') || 'Everything you need to succeed'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              {t('landingFeaturesSubHeader') || 'Powerful tools designed specifically for modern educators and institutions.'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="glass-card-solid p-8 rounded-2xl"
              >
                <div className="mb-6 inline-block p-4 rounded-2xl bg-gray-50 dark:bg-slate-800">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-dark dark:text-white mb-3">{feature.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-dark dark:text-white mb-4">
              {t('landingStepsHeader') || 'How it works'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              {t('landingStepsSubHeader') || 'Create your first test and get results in minutes.'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-1/2 left-10 right-10 h-0.5 bg-gradient-to-r from-primary-100 via-primary-300 to-primary-100 dark:from-slate-800 dark:via-primary-900/50 dark:to-slate-800 -translate-y-1/2 z-0" />
            
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.2 }}
                className="relative z-10 text-center"
              >
                <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-primary-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30 mb-6 rotate-3 hover:rotate-6 transition-transform">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-dark dark:text-white mb-2">{step.title}</h3>
                <p className="text-gray-500 dark:text-gray-400">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 bg-gradient-to-b from-transparent to-primary-50/50 dark:to-primary-900/10 text-center border-t border-gray-100 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <GraduationCap className="w-16 h-16 text-primary-500 mx-auto mb-6" />
          <h2 className="text-3xl md:text-5xl font-bold text-dark dark:text-white mb-6">
            {t('landingCtaHeader') || 'Ready to transform your teaching?'}
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-10">
            {t('landingCtaDesc') || 'Join thousands of educators who are already using UniTest.'}
          </p>
          <Link to="/register" className="btn-primary px-10 py-4 rounded-xl text-lg font-bold shadow-xl shadow-primary-600/20 hover:scale-105 transition-transform inline-block">
            {t('landingCtaBtn') || 'Create Free Account'}
          </Link>
        </div>
      </section>
    </div>
  );
}
