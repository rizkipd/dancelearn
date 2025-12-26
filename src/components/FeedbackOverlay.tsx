import { ScoreResult } from '../types/pose';

interface FeedbackOverlayProps {
  score: ScoreResult | null;
  isActive: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
}


export function FeedbackOverlay({ score, isActive }: FeedbackOverlayProps) {
  if (!isActive || !score) {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
      <div className="flex items-end justify-between gap-6">
        {/* Main Score */}
        <div className="flex items-center gap-4">
          <div className={`text-6xl font-bold ${getScoreColor(score.overallScore)}`}>
            {score.overallScore}
          </div>
          <div className="text-gray-400 text-sm">
            <div>/ 100</div>
            <div>Score</div>
          </div>
        </div>

        {/* Body Part Scores */}
        <div className="flex gap-4">
          <BodyPartScore label="Arms" score={score.bodyParts.arms} />
          <BodyPartScore label="Legs" score={score.bodyParts.legs} />
          <BodyPartScore label="Torso" score={score.bodyParts.torso} />
        </div>

        {/* Timing */}
        {score.timingOffsetMs !== 0 && (
          <div className="text-center">
            <div className={`text-lg font-medium ${score.timingOffsetMs < 0 ? 'text-yellow-400' : 'text-blue-400'}`}>
              {score.timingOffsetMs > 0 ? '+' : ''}{score.timingOffsetMs}ms
            </div>
            <div className="text-xs text-gray-500">
              {score.timingOffsetMs < 0 ? 'Behind' : 'Ahead'}
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      {score.hint && (
        <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <p className="text-blue-300 text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {score.hint}
          </p>
        </div>
      )}
    </div>
  );
}

function BodyPartScore({ label, score }: { label: string; score: number }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-1">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br"
          style={{
            background: `conic-gradient(
              ${score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'} ${score * 3.6}deg,
              #374151 0deg
            )`,
          }}
        >
          <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
            <span className={`text-xs font-bold ${getScoreColor(score)}`}>
              {score}
            </span>
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
