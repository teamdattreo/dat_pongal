// app/page.js
"use client";

import { useCallback, useRef, useState } from "react";
import CameraView from "../components/CameraView";
import PreviewModal from "../components/PreviewModal";
import { motion } from "framer-motion";

export default function Home() {
  const cameraRef = useRef(null);
  const [facingMode, setFacingMode] = useState("user");
  const [modalPhoto, setModalPhoto] = useState(null);
  const [showFlash, setShowFlash] = useState(false);

  const downloadPhoto = useCallback((photo) => {
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `pongal-${new Date(photo.timestamp).getTime()}.jpg`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleCapture = useCallback((captureResult) => {
    const triggerFlash = () => {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 200);
    };

    if (!captureResult) {
      triggerFlash();
    }

    const result = captureResult ?? cameraRef.current?.capture();
    if (!result) return;

    try {
      if (captureResult) {
        triggerFlash();
      }

      const newPhoto = {
        id: Date.now(),
        url: result.url,
        timestamp: new Date().toISOString()
      };

      setModalPhoto(newPhoto);
      downloadPhoto(newPhoto);
    } catch (error) {
      console.error("Error capturing photo:", error);
    }
  }, [downloadPhoto]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Flash effect */}
      {showFlash && (
        <div className="fixed inset-0 bg-white z-50 animate-ping opacity-75 pointer-events-none" />
      )}
      
      <div >
        <motion.header 
          className="mb-8 text-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
        </motion.header>

        <div className="grid grid-cols-1 gap-8">
          {/* Camera Section */}
          <div className="space-y-6">
            <motion.div 
              className="relative overflow-hidden rounded-3xl shadow-2xl border-4 border-white/30 bg-white/20 backdrop-blur-sm"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <CameraView
                ref={cameraRef}
                facingMode={facingMode}
                onFacingModeChange={setFacingMode}
                onCapture={handleCapture}
                className="p-2"
              />
            </motion.div>
          </div>
        </div>
      </div>

      <PreviewModal
        photo={modalPhoto}
        open={!!modalPhoto}
        onClose={() => setModalPhoto(null)}
        onDelete={() => setModalPhoto(null)}
        onDownload={downloadPhoto}
      />
    </div>
  );
}
