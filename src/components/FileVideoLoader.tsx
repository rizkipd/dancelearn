import { useCallback, useState } from 'react';

interface FileVideoLoaderProps {
  onVideoLoaded: (file: File, url: string) => void;
}

export function FileVideoLoader({ onVideoLoaded }: FileVideoLoaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);

    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid video file (MP4, WebM, or MOV)');
      return;
    }

    const url = URL.createObjectURL(file);
    onVideoLoaded(file, url);
  }, [onVideoLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative overflow-hidden rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer
          ${isDragging
            ? 'bg-cyan-500/10 border-2 border-cyan-500'
            : 'glass border-2 border-dashed border-white/20 hover:border-cyan-500/50 hover:bg-white/5'
          }
        `}
      >
        {/* Animated gradient border on hover */}
        <div className={`absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none ${isDragging ? 'opacity-100' : ''}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 animate-gradient" style={{ backgroundSize: '200% 200%' }} />
        </div>

        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleFileSelect}
          className="hidden"
          id="video-upload"
        />
        <label htmlFor="video-upload" className="cursor-pointer relative z-10">
          <div className="flex flex-col items-center gap-5">
            {/* Upload Icon with gradient background */}
            <div className={`
              w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center transition-all duration-300
              ${isDragging
                ? 'bg-gradient-to-br from-cyan-500 to-purple-500 scale-110'
                : 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20'
              }
            `}>
              <svg
                className={`w-10 h-10 sm:w-12 sm:h-12 transition-all duration-300 ${isDragging ? 'text-white' : 'text-cyan-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            {/* Text */}
            <div>
              <p className={`text-lg sm:text-xl font-semibold transition-colors ${isDragging ? 'text-cyan-300' : 'text-white'}`}>
                {isDragging ? 'Drop your video here' : 'Drop your dance video here'}
              </p>
              <p className="text-sm sm:text-base text-gray-400 mt-2">
                or <span className="text-cyan-400 hover:text-cyan-300 transition-colors">browse files</span>
              </p>
              <p className="text-xs text-gray-500 mt-3">
                Supports MP4, WebM, MOV
              </p>
            </div>

            {/* File type badges */}
            <div className="flex gap-2 mt-2">
              {['MP4', 'WebM', 'MOV'].map((format) => (
                <span
                  key={format}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-white/5 text-gray-400 border border-white/10"
                >
                  {format}
                </span>
              ))}
            </div>
          </div>
        </label>
      </div>

      {error && (
        <div className="mt-4 p-4 glass rounded-xl border border-red-500/30">
          <p className="text-sm text-red-400 text-center flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
