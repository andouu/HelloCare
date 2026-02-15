"use client";

type Props = {
  onLetsGo: () => void;
  onTakeMeHome: () => void;
};

export function IntroView({ onLetsGo, onTakeMeHome }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col justify-end">
      <div className="rounded-t-2xl bg-white shadow-lg border-t border-neutral-200 px-5 pt-5 pb-8">
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Upload Care Packet</h2>
        <p className="text-sm text-neutral-700 mb-6">
          Center each page so it&apos;s readable from the camera, and then press the picture button.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onLetsGo}
            className="w-full h-12 rounded-full bg-neutral-900 text-white text-sm font-medium flex items-center justify-center active:bg-neutral-700 transition-colors"
          >
            Sounds good, let&apos;s go!
          </button>
          <button
            type="button"
            onClick={onTakeMeHome}
            className="w-full h-12 rounded-full bg-red-500 text-white text-sm font-medium flex items-center justify-center active:bg-red-400 transition-colors"
          >
            I&apos;m in the wrong place, take me home
          </button>
        </div>
      </div>
    </div>
  );
}
