"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineMenuAlt4 } from "react-icons/hi";
import { useDrawer } from "@/app/(dashboard)/layout";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { useSessionMetadata } from "@/lib/firestore";
import { writeSessionMetadata } from "@/lib/firestore/api";
import { uploadCarePacketImages } from "@/lib/storage/carePackets";
import { useCamera } from "@/app/hooks/useCamera";
import { IntroView } from "./views/IntroView";
import { CameraView } from "./views/CameraView";
import { CameraWithPhotosView } from "./views/CameraWithPhotosView";
import { AttachVisitView } from "./views/AttachVisitView";
import { Toast } from "@/app/components/Toast";

type ViewId = "intro" | "camera" | "cameraWithPhotos" | "attachVisit";
type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function UploadCarePacketPage() {
  const router = useRouter();
  const { openDrawer } = useDrawer() ?? {};
  const { user } = useAuth();
  const { sessionMetadata, loading: sessionsLoading } = useSessionMetadata();
  const { videoRef, error: cameraError, isReady, start: startCamera, stop: stopCamera, capturePhoto } = useCamera();

  const [view, setView] = useState<ViewId>("intro");
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const hasStartedCamera = useRef(false);

  // Start camera when we enter intro view
  useEffect(() => {
    if (view === "intro" && !hasStartedCamera.current) {
      hasStartedCamera.current = true;
      void startCamera();
    }
  }, [view, startCamera]);

  // Stop camera when leaving camera views
  useEffect(() => {
    if (view === "attachVisit") {
      stopCamera();
    }
  }, [view, stopCamera]);

  // Auto-select most recent session when entering attach view
  useEffect(() => {
    if (view === "attachVisit" && sessionMetadata.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessionMetadata[0].id);
    }
  }, [view, sessionMetadata, selectedSessionId]);

  const handleLetsGo = useCallback(() => setView("camera"), []);
  const handleTakeMeHome = useCallback(() => {
    stopCamera();
    router.push("/");
  }, [router, stopCamera]);

  const handleTakePhoto = useCallback(async () => {
    setIsCapturing(true);
    try {
      const blob = await capturePhoto();
      if (blob) {
        setPhotos((prev) => [...prev, blob]);
        setView("cameraWithPhotos");
      }
    } finally {
      setIsCapturing(false);
    }
  }, [capturePhoto]);

  const handleRetakePhoto = useCallback(() => {
    setPhotos((prev) => (prev.length > 1 ? prev.slice(0, -1) : []));
    if (photos.length <= 1) {
      setView("camera");
    }
  }, [photos.length]);

  const handleTakeMorePhotos = useCallback(() => setView("camera"), []);

  const handleDone = useCallback(async () => {
    if (!user?.uid || photos.length === 0) return;
    setIsUploading(true);
    try {
      const { paths } = await uploadCarePacketImages(user.uid, photos);
      setUploadedPaths(paths);
      setView("attachVisit");
    } catch {
      setToastMessage("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [user?.uid, photos]);

  const handleCreateNewVisit = useCallback(async (): Promise<string | null> => {
    if (!user?.uid) return null;
    const id = crypto.randomUUID();
    const now = new Date();
    const title = `Visit on ${now.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })}`;
    const result = await writeSessionMetadata(db, user.uid, {
      id,
      date: now,
      title,
      summary: "",
      actionItemIds: [],
      documentIds: [],
    });
    if (result.ok) {
      setSelectedSessionId(id);
      return id;
    }
    return null;
  }, [user?.uid]);

  const handleSave = useCallback(
    async (sessionId: string) => {
      if (!user?.uid || uploadedPaths.length === 0) return;
      const session = sessionMetadata.find((s) => s.id === sessionId);
      if (!session) return;
      setSaveStatus("saving");
      try {
        const result = await writeSessionMetadata(db, user.uid, {
          ...session,
          documentIds: [...session.documentIds, ...uploadedPaths],
        });
        if (result.ok) {
          setSaveStatus("saved");
          setToastMessage("Saved!");
          setTimeout(() => router.push("/"), 1500);
        } else {
          setSaveStatus("error");
          setToastMessage("Could not save. Please try again.");
        }
      } catch {
        setSaveStatus("error");
        setToastMessage("Could not save. Please try again.");
      }
    },
    [user?.uid, uploadedPaths, sessionMetadata, router]
  );

  const dismissToast = useCallback(() => setToastMessage(null), []);

  // Full-page attach view (no header)
  if (view === "attachVisit") {
    return (
      <>
        <Toast message={toastMessage ?? ""} visible={toastMessage != null} onDismiss={dismissToast} />
        <AttachVisitView
          sessions={sessionMetadata}
          loading={sessionsLoading}
          selectedSessionId={selectedSessionId}
          onSelectSession={setSelectedSessionId}
          onCreateNewVisit={handleCreateNewVisit}
          onSave={handleSave}
          saveStatus={saveStatus}
        />
      </>
    );
  }

  // Camera views: full-screen video + overlay
  const showCamera = view === "intro" || view === "camera" || view === "cameraWithPhotos";

  return (
    <div className="w-full h-screen flex flex-col bg-neutral-200">
      <Toast message={toastMessage ?? ""} visible={toastMessage != null} onDismiss={dismissToast} />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 shrink-0 bg-neutral-900/80 z-10">
        <button
          type="button"
          onClick={() => openDrawer?.()}
          className="p-2 -ml-2 rounded-lg text-white hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <HiOutlineMenuAlt4 className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-white">Upload Care Packet</h1>
        <div className="w-10" aria-hidden />
      </header>

      {/* Full-screen camera area */}
      <div className="flex-1 min-h-0 relative">
        {showCamera && (
          <>
            {cameraError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-300 p-4">
                <p className="text-sm text-neutral-700 text-center">
                  Camera access is needed. Please allow camera and refresh.
                </p>
              </div>
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
                aria-hidden
              />
            )}
            {view === "intro" && isReady && (
              <IntroView onLetsGo={handleLetsGo} onTakeMeHome={handleTakeMeHome} />
            )}
            {view === "camera" && (
              <CameraView
                onTakePhoto={handleTakePhoto}
                isCapturing={isCapturing}
                isCameraReady={isReady}
              />
            )}
            {view === "cameraWithPhotos" && (
              <CameraWithPhotosView
                photoCount={photos.length}
                onRetakePhoto={handleRetakePhoto}
                onTakeMorePhotos={handleTakeMorePhotos}
                onDone={handleDone}
                isUploading={isUploading}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
