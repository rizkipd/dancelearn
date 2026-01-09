import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

export function HowToUsePage() {
  const { t } = useTranslation(['howto', 'common']);

  const steps = [
    {
      number: 1,
      titleKey: 'steps.step1.title',
      descriptionKey: 'steps.step1.description',
      tipsKey: 'steps.step1.tips',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      color: 'cyan',
    },
    {
      number: 2,
      titleKey: 'steps.step2.title',
      descriptionKey: 'steps.step2.description',
      tipsKey: 'steps.step2.tips',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'purple',
    },
    {
      number: 3,
      titleKey: 'steps.step3.title',
      descriptionKey: 'steps.step3.description',
      tipsKey: 'steps.step3.tips',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'pink',
    },
    {
      number: 4,
      titleKey: 'steps.step4.title',
      descriptionKey: 'steps.step4.description',
      tipsKey: 'steps.step4.tips',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'cyan',
    },
  ];

  const colorClasses = {
    cyan: 'from-cyan-500 to-cyan-400 glow-cyan',
    purple: 'from-purple-500 to-violet-500 glow-purple',
    pink: 'from-pink-500 to-rose-500 glow-pink',
  };

  return (
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
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('title')}
            </h1>
            <p className="text-gray-400 text-lg">
              {t('subtitle')}
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-12">
            {steps.map((step) => {
              const tips = t(step.tipsKey, { returnObjects: true }) as string[];
              return (
                <div key={step.number} className="glass rounded-2xl p-6 sm:p-8 card-hover">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[step.color as keyof typeof colorClasses]} flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0`}>
                      {step.number}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-gray-400">{step.icon}</span>
                        <h3 className="text-lg font-semibold text-white">{t(step.titleKey)}</h3>
                      </div>
                      <p className="text-gray-400 leading-relaxed mb-3">{t(step.descriptionKey)}</p>
                      {tips && tips.length > 0 && (
                        <ul className="space-y-1">
                          {tips.map((tip, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-500">
                              <span className="text-cyan-400 mt-1">-</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scoring Guide */}
          <div className="glass rounded-2xl p-6 sm:p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">{t('scoringGuide.title')}</h2>
            <p className="text-gray-400 mb-4">{t('scoringGuide.description')}</p>
            <div className="grid gap-3 mb-6">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
                <span className="text-gray-300">{t('scoringGuide.bodyParts.arms')}</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <span className="w-3 h-3 rounded-full bg-purple-400"></span>
                <span className="text-gray-300">{t('scoringGuide.bodyParts.legs')}</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <span className="w-3 h-3 rounded-full bg-pink-400"></span>
                <span className="text-gray-300">{t('scoringGuide.bodyParts.torso')}</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-3">{t('scoringGuide.grades.title')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              <span className="px-3 py-2 rounded-lg bg-green-500/20 text-green-400">{t('scoringGuide.grades.aPlus')}</span>
              <span className="px-3 py-2 rounded-lg bg-green-500/10 text-green-300">{t('scoringGuide.grades.a')}</span>
              <span className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400">{t('scoringGuide.grades.b')}</span>
              <span className="px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-400">{t('scoringGuide.grades.c')}</span>
              <span className="px-3 py-2 rounded-lg bg-orange-500/20 text-orange-400">{t('scoringGuide.grades.d')}</span>
              <span className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400">{t('scoringGuide.grades.f')}</span>
            </div>
          </div>

          {/* Supported Formats */}
          <div className="glass rounded-2xl p-6 sm:p-8 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Supported Video Formats</h2>
            <div className="flex flex-wrap gap-2">
              {['MP4', 'WebM', 'MOV', 'AVI', 'MKV'].map((format) => (
                <span key={format} className="px-4 py-2 rounded-lg bg-white/10 text-gray-300 font-mono text-sm">
                  .{format.toLowerCase()}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-8 py-4 btn-primary rounded-xl text-white font-semibold text-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('common:buttons.start')}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
