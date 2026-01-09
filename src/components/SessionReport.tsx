import { useTranslation } from 'react-i18next';
import { SessionResult } from '../types/pose';

interface SessionReportProps {
  result: SessionResult;
  onRestart: () => void;
  onNewSession: () => void;
}

function getScoreGrade(score: number): { letter: string; color: string; bgColor: string; glowColor: string } {
  if (score >= 90) return { letter: 'A+', color: 'text-emerald-400', bgColor: 'from-emerald-500/20 to-emerald-500/5', glowColor: 'shadow-emerald-500/20' };
  if (score >= 80) return { letter: 'A', color: 'text-emerald-400', bgColor: 'from-emerald-500/20 to-emerald-500/5', glowColor: 'shadow-emerald-500/20' };
  if (score >= 70) return { letter: 'B', color: 'text-blue-400', bgColor: 'from-blue-500/20 to-blue-500/5', glowColor: 'shadow-blue-500/20' };
  if (score >= 60) return { letter: 'C', color: 'text-yellow-400', bgColor: 'from-yellow-500/20 to-yellow-500/5', glowColor: 'shadow-yellow-500/20' };
  if (score >= 50) return { letter: 'D', color: 'text-orange-400', bgColor: 'from-orange-500/20 to-orange-500/5', glowColor: 'shadow-orange-500/20' };
  return { letter: 'F', color: 'text-red-400', bgColor: 'from-red-500/20 to-red-500/5', glowColor: 'shadow-red-500/20' };
}

export function SessionReport({ result, onRestart, onNewSession }: SessionReportProps) {
  const { t } = useTranslation(['training', 'common']);
  const grade = getScoreGrade(result.overallScore);

  const handleExport = () => {
    const data = JSON.stringify(result, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dancetwin-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            {t('session.complete')}
          </h1>
          <p className="text-gray-400">{t('session.howYouDid')}</p>
        </div>

        {/* Main Score Card */}
        <div className={`glass rounded-3xl p-6 sm:p-10 mb-6 card-hover shadow-2xl ${grade.glowColor}`}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
            {/* Grade Circle */}
            <div className="relative">
              <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br ${grade.bgColor} flex items-center justify-center border border-white/10`}>
                <span className={`text-6xl sm:text-7xl font-black ${grade.color}`}>
                  {grade.letter}
                </span>
              </div>
              {/* Animated ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-white/5"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={`${result.overallScore * 2.89} 289`}
                  strokeLinecap="round"
                  className={grade.color}
                  style={{ transition: 'stroke-dasharray 1s ease-out' }}
                />
              </svg>
            </div>

            {/* Divider */}
            <div className="hidden sm:block h-32 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />

            {/* Score Number */}
            <div className="text-center">
              <div className="text-6xl sm:text-8xl font-black text-white tracking-tight">
                {result.overallScore}
              </div>
              <div className="text-gray-400 mt-2 text-lg">{t('session.overallScore')}</div>
            </div>
          </div>
        </div>

        {/* Body Part Breakdown */}
        <div className="glass rounded-2xl p-5 sm:p-8 mb-6 card-hover">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            {t('session.breakdown')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <ScoreCard label={t('common:labels.arms')} score={result.bodyParts.arms} icon={<ArmsIcon />} />
            <ScoreCard label={t('common:labels.legs')} score={result.bodyParts.legs} icon={<LegsIcon />} />
            <ScoreCard label={t('common:labels.torso')} score={result.bodyParts.torso} icon={<TorsoIcon />} />
          </div>
        </div>

        {/* Weak Sections */}
        {result.weakSections.length > 0 && (
          <div className="glass rounded-2xl p-5 sm:p-8 mb-6 card-hover">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              {t('session.areasToPractice')}
            </h2>
            <div className="space-y-3">
              {result.weakSections.map((section, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between glass rounded-xl p-4 hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <span className="text-gray-300 font-medium">
                      {formatTime(section.start)} - {formatTime(section.end)}
                    </span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    section.score < 40 ? 'bg-red-500/20 text-red-400' :
                    section.score < 60 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {Math.round(section.score)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score Timeline */}
        {result.scoreTimeline.length > 0 && (
          <div className="glass rounded-2xl p-5 sm:p-8 mb-6 card-hover">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              {t('session.timeline')}
            </h2>
            <div className="h-32 sm:h-40 flex items-end gap-0.5 sm:gap-1">
              {result.scoreTimeline.slice(0, 60).map((point, idx) => (
                <div
                  key={idx}
                  className="flex-1 rounded-t-sm transition-all duration-300 hover:opacity-80"
                  style={{
                    height: `${point.score}%`,
                    background: point.score >= 80
                      ? 'linear-gradient(to top, #10b981, #34d399)'
                      : point.score >= 60
                      ? 'linear-gradient(to top, #f59e0b, #fbbf24)'
                      : 'linear-gradient(to top, #ef4444, #f87171)',
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-3">
              <span>{t('session.start')}</span>
              <span>{t('session.end')}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={onRestart}
            className="flex-1 py-4 px-6 btn-primary rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('common:buttons.tryAgain')}
          </button>
          <button
            onClick={onNewSession}
            className="flex-1 py-4 px-6 btn-secondary rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('common:buttons.newVideo')}
          </button>
          <button
            onClick={handleExport}
            className="py-4 px-6 btn-secondary rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('common:buttons.export')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const getBarColor = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-emerald-400';
    if (score >= 60) return 'from-yellow-500 to-yellow-400';
    return 'from-red-500 to-red-400';
  };

  const getTextColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="glass rounded-xl p-4 sm:p-5 hover:bg-white/5 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
          {icon}
        </div>
        <span className="text-gray-300 font-medium">{label}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full bg-gradient-to-r ${getBarColor(score)} rounded-full transition-all duration-1000`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className={`text-2xl font-bold ${getTextColor(score)}`}>
        {score}%
      </div>
    </div>
  );
}

function ArmsIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 12h2m12 0h2M6 12l4-4m0 0l2 2m-2-2v8m8-4l-4-4m0 0l-2 2m2-2v8" />
    </svg>
  );
}

function LegsIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v4m0 0l-3 8m3-8l3 8m-6 0l-2 4m5-4l2 4" />
    </svg>
  );
}

function TorsoIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4a2 2 0 100-4 2 2 0 000 4zm0 0v4m-4 4v8m8-8v8m-8-8h8" />
    </svg>
  );
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
