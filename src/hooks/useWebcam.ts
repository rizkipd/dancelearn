import { useState, useRef, useCallback, useEffect } from 'react';

interface UseWebcamOptions {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
  mirrored?: boolean;
}

interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  isActive: boolean;
  start: () => Promise<void>;
  stop: () => void;
  devices: MediaDeviceInfo[];
  selectedDevice: string;
  selectDevice: (deviceId: string) => void;
}

export function useWebcam(options: UseWebcamOptions = {}): UseWebcamReturn {
  const {
    width = 1280,
    height = 720,
    facingMode = 'user',
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  const getDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
    }
  }, [selectedDevice]);

  useEffect(() => {
    getDevices();
  }, [getDevices]);

  // Assign stream to video element when both are available
  useEffect(() => {
    if (streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  });

  const start = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: selectedDevice ? undefined : facingMode,
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setStream(mediaStream);

      // Try to assign immediately if video element exists
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setIsActive(true);
      await getDevices();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access webcam';
      setError(message);
      console.error('Webcam error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [width, height, facingMode, selectedDevice, getDevices]);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDevice(deviceId);
    if (isActive) {
      stop();
    }
  }, [isActive, stop]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    stream,
    isLoading,
    error,
    isActive,
    start,
    stop,
    devices,
    selectedDevice,
    selectDevice,
  };
}
