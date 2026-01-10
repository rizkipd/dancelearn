import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileVideoLoader } from '../components/FileVideoLoader';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { ShareButtons } from '../components/ShareButtons';
import { useWebcam } from '../hooks/useWebcam';

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: 'cyan' | 'purple' | 'pink' }) {
  const colorClasses = {
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 glow-cyan',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400 glow-purple',
    pink: 'from-pink-500/20 to-pink-500/5 text-pink-400 glow-pink',
  };

  return (
    <div className="glass rounded-2xl p-5 sm:p-6 card-hover text-center">
      <div className={`w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
        {icon}
      </div>
      <h4 className="text-base sm:text-lg font-semibold text-white mb-2">{title}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['home', 'common']);
  const [teacherVideoUrl, setTeacherVideoUrl] = useState<string | null>(null);
  const [, setTeacherVideoFile] = useState<File | null>(null);
  const [options, setOptions] = useState({
    mirrored: true,
    showSkeleton: false,
  });

  const {
    devices,
    selectedDevice,
    selectDevice,
    error: cameraError,
  } = useWebcam({ mirrored: options.mirrored });

  const handleVideoLoaded = useCallback((file: File, url: string) => {
    setTeacherVideoFile(file);
    setTeacherVideoUrl(url);
  }, []);

  const handleStartSession = useCallback(() => {
    if (!teacherVideoUrl) return;
    navigate('/training', {
      state: {
        teacherVideoUrl,
        options,
      },
    });
  }, [teacherVideoUrl, options, navigate]);

  return (
    <div className="min-h-screen flex flex-col overflow-hidden relative">
      {/* Background Video */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute w-full h-full object-cover opacity-20"
        >
          <source src="/DanceTwin-Video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <Header />

      <main className="relative z-10 flex-1 p-4 sm:p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="mb-2">
              <img
                src="/DanceTwin-Logo-Transparent.png"
                alt="DanceTwin"
                className="h-64 sm:h-80 w-auto mx-auto drop-shadow-2xl"
              />
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-3 leading-tight">
              {t('hero.title')}{' '}
              <span className="gradient-text">{t('hero.titleHighlight')}</span>
            </h2>
            <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto">
              {t('hero.subtitle')}
            </p>
          </div>

          {/* Steps Container */}
          <div className="space-y-5">
            {/* Step 1: Video Upload */}
            <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-8 card-hover">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-lg glow-cyan">
                  1
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white">
                    {t('step1.title')}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500">{t('step1.subtitle')}</p>
                </div>
              </div>
              {teacherVideoUrl ? (
                <div className="relative rounded-xl overflow-hidden">
                  <video
                    src={teacherVideoUrl}
                    className="w-full rounded-xl"
                    controls
                  />
                  <button
                    onClick={() => {
                      setTeacherVideoUrl(null);
                      setTeacherVideoFile(null);
                    }}
                    className="absolute top-3 right-3 p-2.5 bg-red-500/80 hover:bg-red-500 backdrop-blur-sm rounded-full text-white transition-all hover:scale-110"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <FileVideoLoader onVideoLoaded={handleVideoLoaded} />
              )}
            </div>

            {/* Step 2: Options */}
            <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-8 card-hover">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-lg glow-purple">
                  2
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white">
                    {t('step2.title')}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500">{t('step2.subtitle')}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                {/* Camera Select */}
                {devices.length > 0 && (
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('common:labels.camera')}
                    </label>
                    <select
                      value={selectedDevice}
                      onChange={(e) => selectDevice(e.target.value)}
                      className="w-full glass rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 transition-all"
                    >
                      {devices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId} className="bg-gray-900">
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Mirror Toggle */}
                <label className="flex items-center gap-3 cursor-pointer group glass rounded-xl px-4 py-3 hover:bg-white/10 transition-all">
                  <input
                    type="checkbox"
                    checked={options.mirrored}
                    onChange={(e) => setOptions(prev => ({ ...prev, mirrored: e.target.checked }))}
                  />
                  <span className="text-gray-300 group-hover:text-white transition-colors">{t('common:labels.mirrorMode')}</span>
                </label>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartSession}
              disabled={!teacherVideoUrl}
              className={`
                w-full py-4 sm:py-5 rounded-2xl font-semibold text-lg sm:text-xl transition-all
                ${teacherVideoUrl
                  ? 'btn-primary text-white'
                  : 'glass text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {teacherVideoUrl ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('common:buttons.start')}
                </span>
              ) : (
                t('uploadPrompt')
              )}
            </button>

            {cameraError && (
              <div className="glass rounded-xl p-4 border border-red-500/30">
                <p className="text-center text-red-400">{cameraError}</p>
              </div>
            )}
          </div>

          {/* Features Section */}
          <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <FeatureCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              }
              title={t('features.sideBySide.title')}
              description={t('features.sideBySide.description')}
              color="cyan"
            />
            <FeatureCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              title={t('features.liveScoring.title')}
              description={t('features.liveScoring.description')}
              color="purple"
            />
            <FeatureCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
              title={t('features.private.title')}
              description={t('features.private.description')}
              color="pink"
            />
          </div>

          {/* YouTube Video Section */}
          <div className="mt-12 sm:mt-16">
            <div className="glass rounded-2xl p-6 sm:p-8">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 text-center">
                {t('watchHowItWorks')}
              </h3>
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-xl"
                  src="https://www.youtube.com/embed/s4bEeWXafrc"
                  title="DanceTwin Demo"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>

          {/* Share Section */}
          <div className="mt-12 sm:mt-16">
            <div className="glass rounded-2xl p-6 sm:p-8">
              <ShareButtons />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
