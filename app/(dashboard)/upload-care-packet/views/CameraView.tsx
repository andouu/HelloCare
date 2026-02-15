"use client";

type Props = {
  onTakePhoto: () => void;
  isCapturing?: boolean;
  isCameraReady?: boolean;
};

export function CameraView({ onTakePhoto, isCapturing = false, isCameraReady = true }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col justify-end pointer-events-none">
      <div className="pointer-events-auto flex justify-center pb-8">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onTakePhoto();
          }}
          disabled={isCapturing || !isCameraReady}
          className="h-12 px-8 rounded-full bg-neutral-900 text-white text-sm font-medium border-2 border-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:bg-neutral-700 transition-colors"
          aria-label={isCapturing ? "Capturing…" : "Take photo"}
        >
          {isCapturing ? (
            <span className="animate-pulse">Capturing…</span>
          ) : (
            "Take Photo"
          )}
        </button>
      </div>
    </div>
  );
}
