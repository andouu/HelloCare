import { Brand } from "../../components/Brand";

export function StepWrapper({ children, canGoBack, onGoBack }: { children: React.ReactNode; canGoBack?: boolean; onGoBack?: () => void }) {
  return <div className="w-full h-screen flex flex-col">
    <div className="flex-4 flex flex-col items-center justify-end pb-5">
      <Brand />
    </div>
    <div className="flex-7 flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      {canGoBack && (
        <div className="px-5 pb-10">
          <button onClick={onGoBack} className="w-full h-12 text-sm text-neutral-900 rounded-full flex items-center justify-center bg-neutral-200 active:bg-neutral-300">
            Go Back
          </button>
        </div>
      )}
    </div>
  </div>
}
