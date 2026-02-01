"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PreviewModal({ photo, open, onClose, onDelete, onDownload }) {
  const [isClosing, setIsClosing] = useState(false);
  
  useEffect(() => {
    if (!open) return;
    
    function handleKey(event) {
      if (event.key === "Escape") {
        handleClose();
      }
    }
    
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose?.();
    }, 300);
  };

  const handleDelete = () => {
    onDelete?.(photo?.id);
    handleClose();
  };

  const handleDownload = () => {
    onDownload?.(photo);
  };

  if (!open || !photo) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        onClick={handleClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <motion.div
          className={`flex w-full max-w-4xl flex-col gap-6 rounded-3xl border-2 border-white/10 bg-gradient-to-br from-gray-900 to-gray-800 p-6 shadow-2xl ${
            isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
          } transition-all duration-300`}
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-pink-400">
                Celebration Moment
              </p>
              <h3 className="text-2xl font-bold text-white">
                {photo.templateLabel || 'Your Photo'}
              </h3>
              <p className="text-sm text-gray-400">
                {photo.timestamp ? new Date(photo.timestamp).toLocaleString() : 'Just now'}
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleClose}
              className="group flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-gray-300 transition-all hover:bg-white/10 hover:text-white"
              aria-label="Close preview"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="relative overflow-hidden rounded-2xl border-2 border-white/10 bg-black/50 shadow-inner">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-pink-500 border-t-transparent"></div>
            </div>
            <img 
              src={photo.url} 
              alt="Captured celebration" 
              className="relative z-10 h-full w-full object-contain" 
              loading="lazy"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <motion.button
              type="button"
              onClick={handleDownload}
              className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-4 text-sm font-bold text-white shadow-lg transition-all hover:from-pink-600 hover:to-purple-700 hover:shadow-xl active:scale-95"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download Photo
            </motion.button>
            
            <motion.button
              type="button"
              onClick={handleDelete}
              className="group flex items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-6 py-4 text-sm font-bold text-red-400 transition-all hover:bg-red-500/20 hover:text-red-300 active:scale-95"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </motion.button>
          </div>
          
          <div className="mt-2 text-center">
            <p className="text-xs text-gray-500">
              Press <kbd className="rounded bg-white/10 px-2 py-1 font-mono text-xs">ESC</kbd> to close
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
