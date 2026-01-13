import { useTranslation } from 'react-i18next';
import { SessionResult } from '../types/pose';
import { ConfettiAnimation } from './ConfettiAnimation';
import { useState, useEffect } from 'react';

interface SessionReportProps {
  result: SessionResult;
  onRestart: () => void;
  onNewSession: () => void;
}

// Get session mood based on overall experience (not score)
function getSessionMood(score: number): 'great' | 'awesome' | 'fun' {
  if (score >= 70) return 'great';
  if (score >= 50) return 'awesome';
  return 'fun';
}

// Format duration from milliseconds to friendly string
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0 && seconds > 0) {
    return `${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes} min`;
  } else {
    return `${seconds} sec`;
  }
}

export function SessionReport({ result, onRestart, onNewSession }: SessionReportProps) {
  const { t } = useTranslation(['feedback', 'training', 'common']);
  const [showConfetti, setShowConfetti] = useState(true);

  const sessionMood = getSessionMood(result.overallScore);
  const { arms, legs, torso } = result.bodyParts;

  // Calculate duration from timeline
  const duration = result.scoreTimeline.length > 0
    ? result.scoreTimeline[result.scoreTimeline.length - 1].timestamp - result.scoreTimeline[0].timestamp
    : 0;

  // Determine highlights based on body parts (pick the best ones)
  const highlights: string[] = [];
  const sortedParts = [
    { name: 'arms', score: arms },
    { name: 'legs', score: legs },
    { name: 'torso', score: torso }
  ].sort((a, b) => b.score - a.score);

  // Add positive highlights for better-performing areas
  if (sortedParts[0].score >= 50) {
    if (sortedParts[0].name === 'arms') highlights.push(t('session.armsFlowing'));
    if (sortedParts[0].name === 'legs') highlights.push(t('session.niceFootwork'));
    if (sortedParts[0].name === 'torso') highlights.push(t('session.goodBodyMovement'));
  }
  if (sortedParts[1].score >= 50) {
    if (sortedParts[1].name === 'arms') highlights.push(t('session.armsFlowing'));
    if (sortedParts[1].name === 'legs') highlights.push(t('session.niceFootwork'));
    if (sortedParts[1].name === 'torso') highlights.push(t('session.goodBodyMovement'));
  }
  // Always add energy highlight if they danced
  if (result.scoreTimeline.length > 5) {
    highlights.push(t('session.greatEnergy'));
  }
  if (result.overallScore >= 60) {
    highlights.push(t('session.stayedWithBeat'));
  }
  // Limit to 3 highlights max
  const displayHighlights = highlights.slice(0, 3);

  // Suggestions for next time (based on weakest area, framed positively)
  const suggestions: string[] = [];
  const weakest = sortedParts[sortedParts.length - 1];
  if (weakest.score < 60) {
    if (weakest.name === 'arms') suggestions.push(t('session.tryArmMovements'));
    if (weakest.name === 'legs') suggestions.push(t('session.focusOnLegs'));
    if (weakest.name === 'torso') suggestions.push(t('session.feelTheRhythm'));
  }
  // Only show 1-2 gentle suggestions
  const displaySuggestions = suggestions.slice(0, 2);

  // Hide confetti after a moment
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

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
      {/* Celebration Confetti */}
      <ConfettiAnimation isActive={showConfetti} particleCount={80} duration={3000} />

      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Celebration Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="text-6xl mb-4">
            {sessionMood === 'great' ? '🎉' : sessionMood === 'awesome' ? '🌟' : '💃'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            {sessionMood === 'great' && t('session.greatSession')}
            {sessionMood === 'awesome' && t('session.awesomeSession')}
            {sessionMood === 'fun' && t('session.funSession')}
          </h1>

          {/* Duration message */}
          <p className="text-xl text-gray-300">
            {duration > 0
              ? t('session.youDanced', { duration: formatDuration(duration) })
              : t('session.keptMoving')
            }
          </p>
        </div>

        {/* Highlights Section */}
        {displayHighlights.length > 0 && (
          <div className="glass rounded-2xl p-5 sm:p-8 mb-6 card-hover">
            <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              {t('session.highlights')}
            </h2>
            <div className="space-y-3">
              {displayHighlights.map((highlight, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 glass rounded-xl p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                    <span className="text-lg">
                      {idx === 0 ? '⭐' : idx === 1 ? '✨' : '💫'}
                    </span>
                  </div>
                  <span className="text-gray-200 font-medium">{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions Section - Only show if there are suggestions */}
        {displaySuggestions.length > 0 && (
          <div className="glass rounded-2xl p-5 sm:p-8 mb-6 card-hover">
            <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-3">
              <span className="text-2xl">💡</span>
              {t('session.nextTimeTry')}
            </h2>
            <div className="space-y-3">
              {displaySuggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 glass rounded-xl p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center">
                    <span className="text-lg">💪</span>
                  </div>
                  <span className="text-gray-200 font-medium">{suggestion}</span>
                </div>
              ))}
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

