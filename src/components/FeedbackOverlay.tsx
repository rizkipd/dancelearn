import { ScoreResult } from '../types/pose';
import { useRef, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfettiAnimation } from './ConfettiAnimation';
import { useCelebration, CelebrationType } from '../hooks/useCelebration';

interface FeedbackOverlayProps {
  score: ScoreResult | null;
  isActive: boolean;
  isMoving: boolean;
  celebrationEnabled?: boolean;
  soundEnabled?: boolean;
}

// Get confidence level based on internal score (not shown to user)
function getConfidenceLevel(score: number): 'onFire' | 'niceMoves' | 'keepItUp' | 'dancing' {
  if (score >= 75) return 'onFire';
  if (score >= 60) return 'niceMoves';
  if (score >= 45) return 'keepItUp';
  return 'dancing';
}

// Get warmth bar gradient based on confidence
function getWarmthGradient(level: string): string {
  switch (level) {
    case 'onFire':
      return 'linear-gradient(90deg, #f97316, #ef4444, #ec4899)'; // Orange to pink (hot!)
    case 'niceMoves':
      return 'linear-gradient(90deg, #8b5cf6, #a855f7, #ec4899)'; // Purple to pink
    case 'keepItUp':
      return 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)'; // Indigo to purple
    default:
      return 'linear-gradient(90deg, #06b6d4, #6366f1, #8b5cf6)'; // Cyan to purple
  }
}

// Get CSS class for celebration effect
function getCelebrationClass(type: CelebrationType): string {
  switch (type) {
    case 'onFire': return 'celebration-on-fire';
    case 'niceMoves': return 'celebration-nice-moves';
    case 'keepItUp': return 'celebration-keep-it-up';
    default: return '';
  }
}

export function FeedbackOverlay({
  score,
  isActive,
  isMoving,
  celebrationEnabled = true,
  soundEnabled = true
}: FeedbackOverlayProps) {
  const { t } = useTranslation(['feedback', 'common']);
  const lastMessageIndexRef = useRef<Record<string, number>>({});
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const lastLevelRef = useRef<string>('');
  const levelStartTimeRef = useRef<number>(0);

  const { celebrationType, isActive: isCelebrating, checkScore, clearCelebration } = useCelebration({
    effectsEnabled: celebrationEnabled,
    soundEnabled: soundEnabled,
  });

  // Get a random message from the array, avoiding repetition
  const getRandomMessage = useMemo(() => {
    return (level: string): string => {
      const messages = t(`encouragement.${level}`, { returnObjects: true }) as string[];
      if (!Array.isArray(messages) || messages.length === 0) {
        return t('encouragement.dancing.0') || 'Keep dancing!';
      }

      // Get a different index than last time
      const lastIndex = lastMessageIndexRef.current[level] ?? -1;
      let newIndex = Math.floor(Math.random() * messages.length);
      if (messages.length > 1 && newIndex === lastIndex) {
        newIndex = (newIndex + 1) % messages.length;
      }
      lastMessageIndexRef.current[level] = newIndex;

      return messages[newIndex];
    };
  }, [t]);

  // Update message when confidence level changes (with debounce)
  useEffect(() => {
    if (!score) return;

    const level = getConfidenceLevel(score.overallScore);
    const now = Date.now();

    // Only update message if level has been stable for 2 seconds
    if (level !== lastLevelRef.current) {
      lastLevelRef.current = level;
      levelStartTimeRef.current = now;
    } else if (now - levelStartTimeRef.current >= 2000) {
      // Level has been stable for 2 seconds, update message
      const message = getRandomMessage(level);
      if (message !== currentMessage) {
        setCurrentMessage(message);
      }
      // Reset timer so we don't update again immediately
      levelStartTimeRef.current = now + 5000; // Wait at least 5 more seconds before next change
    }

    // Check for celebration
    if (celebrationEnabled) {
      checkScore(score.overallScore);
    }
  }, [score, celebrationEnabled, checkScore, getRandomMessage, currentMessage]);

  // Clear celebration when inactive
  useEffect(() => {
    if (!isActive) {
      clearCelebration();
    }
  }, [isActive, clearCelebration]);

  if (!isActive || !score) {
    return null;
  }

  const confidenceLevel = getConfidenceLevel(score.overallScore);
  const warmthGradient = getWarmthGradient(confidenceLevel);
  const celebrationClass = getCelebrationClass(celebrationType);

  // Warmth bar width based on score (but no numbers shown)
  const warmthWidth = Math.min(100, Math.max(20, score.overallScore));

  // Get friendly tip based on weakest body part
  const getEncouragingTip = (): string | null => {
    if (score.overallScore >= 70) return null; // No tip needed when doing well

    const { arms, legs, torso } = score.bodyParts;
    const weakest = Math.min(arms, legs, torso);

    if (weakest === arms) return t('tips.arms');
    if (weakest === legs) return t('tips.legs');
    return t('tips.torso');
  };

  const tip = getEncouragingTip();

  return (
    <>
      {/* Confetti for "on fire" moments (only when moving) */}
      <ConfettiAnimation
        isActive={isMoving && isCelebrating && celebrationType === 'onFire'}
        particleCount={50}
        duration={1500}
      />

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 sm:p-6">
        {/* Main encouragement message (only when moving) */}
        {isMoving && (
          <div className={`text-center mb-4 ${celebrationClass}`}>
            <div className={`text-2xl sm:text-4xl font-bold text-white mb-2 encouragement-text ${isCelebrating ? 'celebration-pulse' : ''}`}>
              {currentMessage}
            </div>

            {/* Warmth bar - visual indicator without numbers */}
            <div className="max-w-md mx-auto">
              <div className="h-2 sm:h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full warmth-bar transition-all duration-500"
                  style={{
                    width: `${warmthWidth}%`,
                    background: warmthGradient
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Show warmth bar even when not moving (silent visual feedback) */}
        {!isMoving && (
          <div className="text-center mb-4">
            <div className="max-w-md mx-auto">
              <div className="h-2 sm:h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full warmth-bar transition-all duration-500"
                  style={{
                    width: `${warmthWidth}%`,
                    background: warmthGradient
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Celebration badge (only when moving) */}
        {isMoving && isCelebrating && celebrationType && (
          <div className="text-center mb-3">
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold celebration-badge celebration-badge-${celebrationType}`}>
              {celebrationType === 'onFire' && `🔥 ${t('celebration.onFire')}`}
              {celebrationType === 'niceMoves' && `✨ ${t('celebration.niceMoves')}`}
              {celebrationType === 'keepItUp' && `💪 ${t('celebration.keepItUp')}`}
            </span>
          </div>
        )}

        {/* Friendly tip (only when moving, needed, and not celebrating) */}
        {isMoving && tip && !isCelebrating && (
          <div className="text-center">
            <p className="text-gray-300 text-sm sm:text-base flex items-center justify-center gap-2">
              <span className="text-lg">💡</span>
              {tip}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
