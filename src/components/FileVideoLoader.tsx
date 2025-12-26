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
          border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
          ${isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
          }
        `}
      >
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleFileSelect}
          className="hidden"
          id="video-upload"
        />
        <label htmlFor="video-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-300">
                Drop your dance video here
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to browse (MP4, WebM, MOV)
              </p>
            </div>
          </div>
        </label>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
