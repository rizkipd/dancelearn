import { useState, useCallback, useRef, useEffect } from 'react';

export type CelebrationType = 'perfect' | 'excellent' | 'good' | null;

interface UseCelebrationOptions {
  perfectThreshold?: number;
  excellentThreshold?: number;
  goodThreshold?: number;
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
    perfectThreshold = 90,
    excellentThreshold = 85,
    goodThreshold = 80,
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

    if (type === 'perfect' || type === 'excellent') {
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
    if (score >= perfectThreshold) {
      triggerCelebration('perfect');
    } else if (score >= excellentThreshold) {
      triggerCelebration('excellent');
    } else if (score >= goodThreshold) {
      triggerCelebration('good');
    }
  }, [perfectThreshold, excellentThreshold, goodThreshold, triggerCelebration]);

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
