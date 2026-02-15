"use client";

type Props = {
  photoCount: number;
  onRetakePhoto: () => void;
  onTakeMorePhotos: () => void;
  onDone: () => void;
  isUploading?: boolean;
};

export function CameraWithPhotosView({
  photoCount,
  onRetakePhoto,
  onTakeMorePhotos,
  onDone,
  isUploading = false,
}: Props) {
  return (
    <div className="absolute inset-0 flex flex-col justify-end">
      <div className="rounded-t-2xl bg-white shadow-lg border-t border-neutral-200 px-5 pt-5 pb-8">
        <p className="text-base font-semibold text-neutral-900 mb-4">
          {photoCount} Photo{photoCount !== 1 ? "s" : ""} Uploaded
        </p>
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            type="button"
            onClick={onRetakePhoto}
            disabled={isUploading}
            className="flex-1 min-w-[120px] h-11 rounded-full bg-neutral-100 text-neutral-900 text-sm font-medium border border-neutral-200 active:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            Retake Photo
          </button>
          <button
            type="button"
            onClick={onTakeMorePhotos}
            disabled={isUploading}
            className="flex-1 min-w-[120px] h-11 rounded-full bg-neutral-100 text-neutral-900 text-sm font-medium border border-neutral-200 active:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            Take more photos
          </button>
        </div>
        <button
          type="button"
          onClick={onDone}
          disabled={isUploading}
          className="w-full h-12 rounded-full bg-neutral-900 text-white text-sm font-medium flex items-center justify-center active:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? "Uploading…" : "I'm done"}
        </button>
      </div>
    </div>
  );
}
