import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { SEO } from '../components/SEO';

export function AboutPage() {
  const { t } = useTranslation(['about', 'common']);

  return (
    <>
      <SEO
        title="About DanceTwin"
        description="DanceTwin is an AI-powered dance training app that helps you learn any dance by practicing side-by-side with videos. Privacy-first, browser-based."
        canonical="https://www.dancetwin.com/about"
      />
      <div className="min-h-screen flex flex-col overflow-hidden relative">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <Header />

      <main className="relative z-10 flex-1 p-4 sm:p-6 overflow-auto">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('title')}
            </h1>
            <p className="text-gray-400 text-lg">
              {t('subtitle')}
            </p>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Mission */}
            <div className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </span>
                {t('mission.title')}
              </h2>
              <p className="text-gray-300 leading-relaxed">
                {t('mission.description')}
              </p>
            </div>

            {/* How It Works */}
            <div className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </span>
                {t('howItWorks.title')}
              </h2>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold flex-shrink-0 mt-0.5">1</span>
                  <div>
                    <strong className="text-white">{t('howItWorks.step1.title')}</strong>
                    <p className="text-gray-400 mt-1">{t('howItWorks.step1.description')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold flex-shrink-0 mt-0.5">2</span>
                  <div>
                    <strong className="text-white">{t('howItWorks.step2.title')}</strong>
                    <p className="text-gray-400 mt-1">{t('howItWorks.step2.description')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 text-sm font-bold flex-shrink-0 mt-0.5">3</span>
                  <div>
                    <strong className="text-white">{t('howItWorks.step3.title')}</strong>
                    <p className="text-gray-400 mt-1">{t('howItWorks.step3.description')}</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Privacy */}
            <div className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                {t('privacy.title')}
              </h2>
              <p className="text-gray-300 leading-relaxed">
                {t('privacy.description')}
              </p>
            </div>

            {/* Contact */}
            <div className="glass rounded-2xl p-6 sm:p-8 text-center">
              <h2 className="text-xl font-semibold text-white mb-4">{t('contact.title')}</h2>
              <p className="text-gray-400 mb-4">
                {t('contact.description')}
              </p>
              <a
                href={`mailto:${t('contact.email')}`}
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {t('contact.email')}
              </a>
            </div>

            {/* Version */}
            <div className="glass rounded-2xl p-6 sm:p-8 text-center">
              <p className="text-gray-400">
                Version <span className="text-white font-mono">1.0.0</span>
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {t('team.description')}
              </p>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-8 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 btn-secondary rounded-xl text-white font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('common:buttons.backToHome')}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
    </>
  );
}
