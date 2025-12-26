import { ScoreResult } from '../types/pose';
import { useRef, useEffect, useState } from 'react';

interface FeedbackOverlayProps {
  score: ScoreResult | null;
  isActive: boolean;
}

// Track score trends for each body part
interface ScoreTrend {
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

function getHintUrgency(score: number): { bg: string; border: string; text: string; icon: string } {
  if (score >= 80) return { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-300', icon: '✓' };
  if (score >= 60) return { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-300', icon: '!' };
  return { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-300', icon: '⚠' };
}

function getTrendIcon(trend: 'up' | 'down' | 'stable'): { icon: string; color: string } {
  switch (trend) {
    case 'up': return { icon: '↑', color: 'text-green-400' };
    case 'down': return { icon: '↓', color: 'text-red-400' };
    default: return { icon: '→', color: 'text-gray-400' };
  }
}


export function FeedbackOverlay({ score, isActive }: FeedbackOverlayProps) {
  const prevScoreRef = useRef<ScoreResult['bodyParts'] | null>(null);
  const [trends, setTrends] = useState<Record<string, 'up' | 'down' | 'stable'>>({
    arms: 'stable',
    legs: 'stable',
    torso: 'stable',
  });

  // Calculate trends based on score changes
  useEffect(() => {
    if (!score) return;

    const prev = prevScoreRef.current;
    if (prev) {
      const threshold = 5; // Need 5+ point change to show trend
      setTrends({
        arms: score.bodyParts.arms > prev.arms + threshold ? 'up' :
              score.bodyParts.arms < prev.arms - threshold ? 'down' : 'stable',
        legs: score.bodyParts.legs > prev.legs + threshold ? 'up' :
              score.bodyParts.legs < prev.legs - threshold ? 'down' : 'stable',
        torso: score.bodyParts.torso > prev.torso + threshold ? 'up' :
               score.bodyParts.torso < prev.torso - threshold ? 'down' : 'stable',
      });
    }
    prevScoreRef.current = { ...score.bodyParts };
  }, [score]);

  if (!isActive || !score) {
    return null;
  }

  // Find the weakest body part for hint coloring
  const weakestScore = Math.min(score.bodyParts.arms, score.bodyParts.legs, score.bodyParts.torso);
  const hintStyle = getHintUrgency(weakestScore);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-6">
        {/* Main Score */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className={`text-4xl sm:text-6xl font-bold transition-colors duration-300 ${getScoreColor(score.overallScore)}`}>
            {score.overallScore}
          </div>
          <div className="text-gray-400 text-xs sm:text-sm">
            <div>/ 100</div>
            <div>Score</div>
          </div>
        </div>

        {/* Body Part Scores with Trends */}
        <div className="flex gap-2 sm:gap-4">
          <BodyPartScore label="Arms" score={score.bodyParts.arms} trend={trends.arms} />
          <BodyPartScore label="Legs" score={score.bodyParts.legs} trend={trends.legs} />
          <BodyPartScore label="Torso" score={score.bodyParts.torso} trend={trends.torso} />
        </div>

        {/* Timing */}
        {score.timingOffsetMs !== 0 && (
          <div className="text-center hidden sm:block">
            <div className={`text-lg font-medium ${score.timingOffsetMs < 0 ? 'text-yellow-400' : 'text-blue-400'}`}>
              {score.timingOffsetMs > 0 ? '+' : ''}{score.timingOffsetMs}ms
            </div>
            <div className="text-xs text-gray-500">
              {score.timingOffsetMs < 0 ? 'Behind' : 'Ahead'}
            </div>
          </div>
        )}
      </div>

      {/* Color-Coded Hint */}
      {score.hint && (
        <div className={`mt-3 sm:mt-4 p-2 sm:p-3 ${hintStyle.bg} border ${hintStyle.border} rounded-lg transition-colors duration-300`}>
          <p className={`${hintStyle.text} text-xs sm:text-sm flex items-center gap-2`}>
            <span className="text-base sm:text-lg">{hintStyle.icon}</span>
            {score.hint}
          </p>
        </div>
      )}
    </div>
  );
}

function BodyPartScore({ label, score, trend }: { label: string; score: number; trend?: 'up' | 'down' | 'stable' }) {
  const trendInfo = trend ? getTrendIcon(trend) : null;

  return (
    <div className="text-center">
      <div className="relative">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-800 flex items-center justify-center">
          <div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300"
            style={{
              background: `conic-gradient(
                ${score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'} ${score * 3.6}deg,
                #374151 0deg
              )`,
            }}
          >
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-900 flex items-center justify-center">
              <span className={`text-[10px] sm:text-xs font-bold transition-colors duration-300 ${getScoreColor(score)}`}>
                {score}
              </span>
            </div>
          </div>
        </div>
        {/* Trend indicator */}
        {trendInfo && trend !== 'stable' && (
          <span className={`absolute -top-1 -right-1 text-xs sm:text-sm font-bold ${trendInfo.color}`}>
            {trendInfo.icon}
          </span>
        )}
      </div>
      <div className="text-[10px] sm:text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
