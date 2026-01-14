import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { SEO } from '../components/SEO';

export function PrivacyPage() {
  const { t } = useTranslation(['privacy', 'common']);

  const dataCollectionItems = t('sections.dataCollection.items', { returnObjects: true }) as string[];
  const localStorageItems = t('sections.localStorage.items', { returnObjects: true }) as string[];

  return (
    <>
      <SEO
        title="Privacy Policy"
        description="DanceTwin privacy policy. All AI processing runs locally in your browser. No video uploads, no tracking, 100% private."
        canonical="https://www.dancetwin.com/privacy"
        noindex={true}
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
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('title')}
            </h1>
            <p className="text-gray-400 text-lg">
              {t('subtitle')}
            </p>
            <p className="text-gray-500 text-sm mt-2">{t('lastUpdated')}</p>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Overview */}
            <div className="glass rounded-2xl p-6 sm:p-8 border border-green-500/30">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                {t('sections.overview.title')}
              </h2>
              <p className="text-white text-lg font-medium">
                {t('sections.overview.content')}
              </p>
            </div>

            {/* Data Collection */}
            <div className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </span>
                {t('sections.dataCollection.title')}
              </h2>
              <p className="text-gray-300 mb-4">{t('sections.dataCollection.content')}</p>
              <ul className="space-y-2">
                {dataCollectionItems.map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-gray-400">
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Local Storage */}
            <div className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                {t('sections.localStorage.title')}
              </h2>
              <p className="text-gray-300 mb-4">{t('sections.localStorage.content')}</p>
              <ul className="space-y-2">
                {localStorageItems.map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-gray-400">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Processing */}
            <div className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </span>
                {t('sections.processing.title')}
              </h2>
              <p className="text-gray-300 leading-relaxed">
                {t('sections.processing.content')}
              </p>
            </div>

            {/* Third Party */}
            <div className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </span>
                {t('sections.thirdParty.title')}
              </h2>
              <p className="text-gray-300 leading-relaxed">
                {t('sections.thirdParty.content')}
              </p>
            </div>

            {/* Cookies */}
            <div className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                {t('sections.cookies.title')}
              </h2>
              <p className="text-gray-300 leading-relaxed">
                {t('sections.cookies.content')}
              </p>
            </div>

            {/* Contact */}
            <div className="glass rounded-2xl p-6 sm:p-8 text-center">
              <h2 className="text-xl font-semibold text-white mb-4">{t('sections.contact.title')}</h2>
              <p className="text-gray-400 mb-4">
                {t('sections.contact.content')}
              </p>
              <a
                href={`mailto:${t('sections.contact.email')}`}
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {t('sections.contact.email')}
              </a>
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
