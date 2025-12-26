import { SessionResult } from '../types/pose';

interface SessionReportProps {
  result: SessionResult;
  onRestart: () => void;
  onNewSession: () => void;
}

function getScoreGrade(score: number): { letter: string; color: string } {
  if (score >= 90) return { letter: 'A+', color: 'text-green-400' };
  if (score >= 80) return { letter: 'A', color: 'text-green-400' };
  if (score >= 70) return { letter: 'B', color: 'text-blue-400' };
  if (score >= 60) return { letter: 'C', color: 'text-yellow-400' };
  if (score >= 50) return { letter: 'D', color: 'text-orange-400' };
  return { letter: 'F', color: 'text-red-400' };
}

export function SessionReport({ result, onRestart, onNewSession }: SessionReportProps) {
  const grade = getScoreGrade(result.overallScore);

  const handleExport = () => {
    const data = JSON.stringify(result, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dance-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Session Complete!
        </h1>

        {/* Main Score Card */}
        <div className="bg-gray-800 rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className={`text-8xl font-bold ${grade.color}`}>
                {grade.letter}
              </div>
              <div className="text-gray-500 mt-2">Grade</div>
            </div>
            <div className="h-24 w-px bg-gray-700" />
            <div className="text-center">
              <div className="text-6xl font-bold text-white">
                {result.overallScore}
              </div>
              <div className="text-gray-500 mt-2">Overall Score</div>
            </div>
          </div>
        </div>

        {/* Body Part Breakdown */}
        <div className="bg-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Performance Breakdown</h2>
          <div className="grid grid-cols-3 gap-6">
            <ScoreBar label="Arms" score={result.bodyParts.arms} icon="💪" />
            <ScoreBar label="Legs" score={result.bodyParts.legs} icon="🦵" />
            <ScoreBar label="Torso" score={result.bodyParts.torso} icon="🧍" />
          </div>
        </div>

        {/* Weak Sections */}
        {result.weakSections.length > 0 && (
          <div className="bg-gray-800 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Areas to Practice</h2>
            <div className="space-y-3">
              {result.weakSections.map((section, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gray-700/50 rounded-lg p-4"
                >
                  <div>
                    <span className="text-gray-300">
                      {formatTime(section.start)} - {formatTime(section.end)}
                    </span>
                  </div>
                  <div className="text-red-400 font-medium">
                    Score: {Math.round(section.score)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score Timeline Preview */}
        {result.scoreTimeline.length > 0 && (
          <div className="bg-gray-800 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Score Timeline</h2>
            <div className="h-32 flex items-end gap-0.5">
              {result.scoreTimeline.slice(0, 100).map((point, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t"
                  style={{ height: `${point.score}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Start</span>
              <span>End</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onRestart}
            className="flex-1 py-4 px-6 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-semibold transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onNewSession}
            className="flex-1 py-4 px-6 bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300 font-semibold transition-colors"
          >
            New Video
          </button>
          <button
            onClick={handleExport}
            className="py-4 px-6 bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300 font-semibold transition-colors"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, score, icon }: { label: string; score: number; icon: string }) {
  const getBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-gray-300 font-medium">{label}</span>
      </div>
      <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor(score)} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="text-right text-sm text-gray-500 mt-1">{score}%</div>
    </div>
  );
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
