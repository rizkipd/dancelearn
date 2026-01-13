import { useState, useCallback, useRef, useEffect } from 'react';

// New celebration types: more encouraging, triggers more often
export type CelebrationType = 'onFire' | 'niceMoves' | 'keepItUp' | 'dancing' | null;

interface UseCelebrationOptions {
  onFireThreshold?: number;
  niceMovesThreshold?: number;
  keepItUpThreshold?: number;
  cooldownMs?: number;
  soundEnabled?: boolean;
  effectsEnabled?: boolean;
}

interface UseCelebrationReturn {
  celebrationType: CelebrationType;
  isActive: boolean;
  triggerCelebration: (type: CelebrationType) => void;
  checkScore: (score: number) => void;
  clearCelebration: () => void;
}

// Preload sound
let successSound: HTMLAudioElement | null = null;
if (typeof window !== 'undefined') {
  successSound = new Audio('/sounds/success.mp3');
  successSound.volume = 0.4;
}

export function useCelebration(options: UseCelebrationOptions = {}): UseCelebrationReturn {
  const {
    // Lowered thresholds for more frequent encouragement
    onFireThreshold = 75,      // was 90 (perfect)
    niceMovesThreshold = 60,   // was 85 (excellent)
    keepItUpThreshold = 45,    // was 80 (good)
    cooldownMs = 2000,
    soundEnabled = true,
    effectsEnabled = true,
  } = options;

  const [celebrationType, setCelebrationType] = useState<CelebrationType>(null);
  const [isActive, setIsActive] = useState(false);
  const lastCelebrationRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const playSound = useCallback(() => {
    if (soundEnabled && successSound) {
      successSound.currentTime = 0;
      successSound.play().catch(() => {
        // Sound play failed (user hasn't interacted yet)
      });
    }
  }, [soundEnabled]);

  const triggerCelebration = useCallback((type: CelebrationType) => {
    if (!effectsEnabled || !type) return;

    const now = Date.now();
    if (now - lastCelebrationRef.current < cooldownMs) return;

    lastCelebrationRef.current = now;
    setCelebrationType(type);
    setIsActive(true);

    // Play sound for top celebrations
    if (type === 'onFire' || type === 'niceMoves') {
      playSound();
    }

    // Clear after animation
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
      setCelebrationType(null);
    }, 1500);
  }, [effectsEnabled, cooldownMs, playSound]);

  const checkScore = useCallback((score: number) => {
    if (score >= onFireThreshold) {
      triggerCelebration('onFire');
    } else if (score >= niceMovesThreshold) {
      triggerCelebration('niceMoves');
    } else if (score >= keepItUpThreshold) {
      triggerCelebration('keepItUp');
    }
    // 'dancing' is always active (shown in UI, not triggered here)
  }, [onFireThreshold, niceMovesThreshold, keepItUpThreshold, triggerCelebration]);

  const clearCelebration = useCallback(() => {
    setIsActive(false);
    setCelebrationType(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    celebrationType,
    isActive,
    triggerCelebration,
    checkScore,
    clearCelebration,
  };
}
