'use client';

import { useCallback, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineMenuAlt4 } from "react-icons/hi";
import { TbArrowBackUp, TbCamera, TbRefresh, TbPlus, TbCheck } from "react-icons/tb";
import { useDrawer } from "@/app/(dashboard)/layout";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { writeDocument, writeSessionMetadata, useSessionMetadata } from "@/lib/firestore";
import { Spinner } from "@/app/components/Spinner";
import { Toast } from "@/app/components/Toast";

type ViewId = "camera" | "review" | "processing" | "attach";

export default function DocumentsPage() {
  const router = useRouter();
  const { openDrawer } = useDrawer() ?? {};
  const { user } = useAuth();
  const { sessionMetadata, loading: sessionsLoading } = useSessionMetadata();

  const [view, setView] = useState<ViewId>("camera");
  const [photos, setPhotos] = useState<string[]>([]);
  const [createdDocumentId, setCreatedDocumentId] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setProcessingError(message);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (view === "camera") {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [view, startCamera, stopCamera]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current || video.readyState < 2) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPhotos((prev) => [...prev, dataUrl]);
    setView("review");
  }, []);

  const retakeLast = useCallback(() => {
    setProcessingError(null);
    setPhotos((prev) => (prev.length <= 1 ? [] : prev.slice(0, -1)));
    if (photos.length <= 1) setView("camera");
  }, [photos.length]);

  const takeMore = useCallback(() => {
    setProcessingError(null);
    setView("camera");
  }, []);

  /** Resize image to max dimension and re-encode as JPEG to keep payload size reasonable. */
  const resizePhotoToBase64 = useCallback(
    (dataUrl: string, maxSize = 1280, quality = 0.75): Promise<string> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const w = img.width;
          const h = img.height;
          const scale = Math.min(1, maxSize / Math.max(w, h));
          const cw = Math.round(w * scale);
          const ch = Math.round(h * scale);
          const canvas = document.createElement("canvas");
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0, cw, ch);
          const out = canvas.toDataURL("image/jpeg", quality);
          const base64 = out.includes("base64,") ? out.split("base64,")[1] ?? "" : out;
          resolve(base64);
        };
        img.onerror = () => reject(new Error("Failed to load image for resize"));
        img.src = dataUrl;
      }),
    [],
  );

  const handleDone = useCallback(async () => {
    if (photos.length === 0 || !user?.uid) return;
    setView("processing");
    setProcessingError(null);
    console.log("[Documents] handleDone: starting", { photoCount: photos.length });
    try {
      const base64List = await Promise.all(
        photos.map((dataUrl) => resizePhotoToBase64(dataUrl)),
      );
      const payloadSizeBytes = JSON.stringify({ images: base64List }).length;
      console.log("[Documents] handleDone: resized payload", {
        payloadSizeBytes,
        payloadSizeMB: (payloadSizeBytes / 1024 / 1024).toFixed(2),
      });
      const res = await fetch("/api/document-summary-from-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: base64List }),
      });
      console.log("[Documents] handleDone: fetch returned", { status: res.status, ok: res.ok, contentType: res.headers.get("content-type") });
      const text = await res.text();
      let data: { summary?: string; error?: string; detail?: string };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error("[Documents] handleDone: response not JSON", { textPreview: text.slice(0, 200) });
        throw new Error(
          res.status === 413
            ? "Images too large — try fewer or smaller photos."
            : `Server error (${res.status}): ${text.slice(0, 100) || res.statusText}`
        );
      }
      if (!res.ok) {
        const msg = data.error ?? data.detail ?? "Failed to summarize";
        console.error("[Documents] handleDone: API error", { status: res.status, data });
        throw new Error(msg);
      }
      const summary = typeof data.summary === "string" ? data.summary : "";
      console.log("[Documents] handleDone: got summary", { summaryLength: summary.length, hasSummary: !!summary });
      const docId = crypto.randomUUID();
      const result = await writeDocument(db, user.uid, {
        id: docId,
        summary,
        uploadedAt: new Date(),
      });
      if (!result.ok) {
        console.error("[Documents] handleDone: writeDocument failed", result.error);
        throw result.error;
      }
      console.log("[Documents] handleDone: success, navigating to attach");
      setCreatedDocumentId(docId);
      setView("attach");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Documents] handleDone: caught", { message, err });
      setProcessingError(message);
      setView("review");
    }
  }, [photos, user?.uid, resizePhotoToBase64]);

  const attachToSession = useCallback(
    async (sessionId: string) => {
      if (!user?.uid || !createdDocumentId) return;
      const session = sessionMetadata.find((s) => s.id === sessionId);
      if (!session) return;
      const updatedDocumentIds = [...session.documentIds, createdDocumentId];
      const result = await writeSessionMetadata(db, user.uid, {
        ...session,
        documentIds: updatedDocumentIds,
      });
      if (result.ok) {
        setToastMessage("Document attached to session");
        router.push("/past-sessions");
      } else {
        setToastMessage(result.error.message);
      }
    },
    [user?.uid, createdDocumentId, sessionMetadata, router],
  );

  const goBack = useCallback(() => router.back(), [router]);
  const dismissToast = useCallback(() => setToastMessage(null), []);

  const renderContent = () => {
      if (view === "camera") {
      return (
        <div className="absolute inset-0 flex flex-col">
          <button
            type="button"
            onClick={() => openDrawer?.()}
            className="absolute top-4 left-4 z-10 p-2 rounded-lg bg-white/90 text-neutral-900 hover:bg-white shadow-md"
            aria-label="Open menu"
          >
            <HiOutlineMenuAlt4 className="w-6 h-6" />
          </button>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            aria-label="Camera feed"
          />
          {processingError && (
            <div className="absolute top-4 left-4 right-4 rounded-xl bg-rose-100 text-rose-800 p-3 text-sm">
              {processingError}
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 flex justify-center">
            <button
              type="button"
              onClick={takePhoto}
              aria-label="Take photo"
              className="w-20 h-20 rounded-full border-4 border-white bg-white/90 text-neutral-900 flex items-center justify-center shrink-0 shadow-lg active:scale-95 transition-transform"
            >
              <TbCamera className="w-10 h-10" aria-hidden />
            </button>
          </div>
        </div>
      );
    }

    if (view === "review") {
      return (
        <div className="flex flex-col gap-4 p-4 flex-1">
          {processingError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
              <p className="text-sm font-medium text-rose-800">Something went wrong</p>
              <p className="text-xs text-rose-700 mt-1">{processingError}</p>
            </div>
          )}
          <p className="text-sm text-neutral-600">You have {photos.length} photo(s).</p>
          <div className="flex gap-2 overflow-x-auto pb-2 min-h-[80px]">
            {photos.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Capture ${i + 1}`}
                className="h-20 w-auto rounded-lg border border-neutral-200 object-cover shrink-0"
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={retakeLast}
              className="flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <TbRefresh className="w-4 h-4" aria-hidden />
              Retake last
            </button>
            <button
              type="button"
              onClick={takeMore}
              className="flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <TbPlus className="w-4 h-4" aria-hidden />
              Take more
            </button>
            <button
              type="button"
              onClick={() => void handleDone()}
              className="flex items-center gap-2 rounded-full bg-red-500 text-white px-4 py-2.5 text-sm font-medium hover:bg-red-600"
            >
              <TbCheck className="w-4 h-4" aria-hidden />
              I&apos;m done
            </button>
          </div>
        </div>
      );
    }

    if (view === "processing") {
      return (
        <div className="flex flex-col items-center justify-center gap-4 flex-1 py-12">
          <Spinner size="lg" theme="neutral" />
          <p className="text-sm text-neutral-600">Summarizing your document…</p>
          {processingError && (
            <p className="text-sm text-rose-600 max-w-xs text-center">{processingError}</p>
          )}
        </div>
      );
    }

    if (view === "attach") {
      return (
        <div className="flex flex-col gap-4 p-4 flex-1">
          <p className="text-sm text-neutral-600">
            Attach this document to a session.
          </p>
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" theme="neutral" />
            </div>
          ) : sessionMetadata.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-6 text-center">
              <p className="text-sm text-neutral-600">No past sessions yet.</p>
              <p className="text-xs text-neutral-500 mt-1">
                Complete a conversation and save a summary to create a session, then you can attach documents here.
              </p>
              <button
                type="button"
                onClick={() => router.push("/past-sessions")}
                className="mt-4 rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium"
              >
                Go to Past Sessions
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-neutral-500">
                Tap a session to attach the document. The document is already saved.
              </p>
              <ul className="flex flex-col gap-2 list-none p-0 m-0">
              {sessionMetadata.map((session) => (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => void attachToSession(session.id)}
                    className="w-full rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-sm hover:border-neutral-300 hover:shadow-md transition-all"
                  >
                    <span className="text-base font-semibold text-neutral-900 block">
                      {session.title || "Untitled visit"}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(session.date)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
              <button
                type="button"
                onClick={() => router.push("/past-sessions")}
                className="mt-2 text-sm text-neutral-500 hover:text-neutral-700 underline"
              >
                Skip — go to Past Sessions
              </button>
            </>
          )}
        </div>
      );
    }

    return null;
  };

  const showFullScreenCamera = view === "camera";

  return (
    <div className="w-full min-h-screen flex flex-col">
      <Toast message={toastMessage ?? ""} visible={toastMessage != null} onDismiss={dismissToast} />
      {!showFullScreenCamera && (
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <button
            type="button"
            onClick={() => openDrawer?.()}
            className="p-2 -ml-2 rounded-lg text-neutral-900 hover:bg-neutral-100 transition-colors"
            aria-label="Open menu"
          >
            <HiOutlineMenuAlt4 className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-neutral-900">Capture document</h1>
          <div className="w-10" aria-hidden />
        </header>
      )}

      {showFullScreenCamera ? (
        <div className="fixed inset-0 z-0 bg-neutral-900">
          {renderContent()}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {renderContent()}
        </div>
      )}

      {!showFullScreenCamera && view !== "attach" && (
        <footer className="pb-15 flex flex-col gap-3 px-4 pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={goBack}
            className="w-full h-12 text-sm text-white rounded-full flex items-center px-5 bg-red-500 active:bg-red-400"
          >
            <TbArrowBackUp className="w-4 h-4 shrink-0" aria-hidden />
            <span className="flex-1 text-center">Go back</span>
            <span className="w-4 shrink-0" aria-hidden />
          </button>
        </footer>
      )}
    </div>
  );
}
