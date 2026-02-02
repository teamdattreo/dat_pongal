"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const ASSETS = {
  bg: "/assets/newframe.png",
};

const OUT = { W: 1080, H: 1920 };

const FRAME = {
  cx: 540,
  cy: 960,
  w: 980,
  h: 1500,
  rotateDeg: 0,
};

const WINDOW = {
  xPct: 0.03,
  yPct: 0.056,
  wPct: 0.92,
  hPct: 0.75,
  rPct: 0,
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

function drawCover(ctx, source, dx, dy, dw, dh) {
  const sw = source.width;
  const sh = source.height;
  const scale = Math.max(dw / sw, dh / sh);
  const w = sw * scale;
  const h = sh * scale;
  const x = dx + (dw - w) / 2;
  const y = dy + (dh - h) / 2;
  ctx.drawImage(source, x, y, w, h);
}

function snapshotMirroredVideo(video, shouldMirror = true) {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  
  if (shouldMirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  
  ctx.drawImage(video, 0, 0);
  return canvas;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function triggerDownload(url, prefix) {
  const a = document.createElement("a");
  a.href = url;
  a.download = `${prefix}_${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Use screen orientation instead of device orientation
function getScreenOrientation() {
  if (typeof window === 'undefined') return 0;
  
  // Check screen orientation API first (more reliable)
  if (window.screen?.orientation?.angle !== undefined) {
    return window.screen.orientation.angle;
  }
  
  // Fallback to window orientation
  if (typeof window.orientation === 'number') {
    const angle = window.orientation;
    if (angle === 90) return 90;
    if (angle === -90) return -90;
    if (angle === 180) return 180;
    return 0;
  }
  
  // Check based on window dimensions
  if (window.innerWidth > window.innerHeight) {
    // Landscape
    return window.innerWidth > window.innerHeight * 1.5 ? 90 : 0;
  }
  
  return 0;
}

// Simple rotation function
function rotateCanvas(sourceCanvas, angleDeg) {
  if (angleDeg === 0) return sourceCanvas;
  
  const angleRad = angleDeg * (Math.PI / 180);
  const sin = Math.abs(Math.sin(angleRad));
  const cos = Math.abs(Math.cos(angleRad));
  
  // Calculate new canvas dimensions
  const newWidth = Math.floor(
    sourceCanvas.width * cos + sourceCanvas.height * sin
  );
  const newHeight = Math.floor(
    sourceCanvas.width * sin + sourceCanvas.height * cos
  );
  
  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext("2d");
  
  // Clear and rotate
  ctx.clearRect(0, 0, newWidth, newHeight);
  ctx.translate(newWidth / 2, newHeight / 2);
  ctx.rotate(angleRad);
  ctx.drawImage(
    sourceCanvas,
    -sourceCanvas.width / 2,
    -sourceCanvas.height / 2
  );
  
  return canvas;
}

// Auto-detect if photo needs rotation based on dimensions
function autoRotateForPortrait(capturedCanvas) {
  const { width, height } = capturedCanvas;
  
  // If already portrait (height >= width), no rotation needed
  if (height >= width) {
    return capturedCanvas;
  }
  
  // If landscape (width > height), rotate to portrait
  // Check which way to rotate based on device orientation
  const screenOrientation = getScreenOrientation();
  
  if (screenOrientation === 90 || screenOrientation === -90) {
    // Device is in landscape mode, rotate accordingly
    return rotateCanvas(capturedCanvas, -screenOrientation);
  }
  
  // Default: rotate 90 degrees clockwise
  return rotateCanvas(capturedCanvas, 90);
}

export default function InstaFrameCameraImage({ className = "" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [facing, setFacing] = useState("user");
  const [bgImg, setBgImg] = useState(null);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState("");
  const [exportUrl, setExportUrl] = useState("");

  const [debug, setDebug] = useState(false);
  const [frame, setFrame] = useState(FRAME);
  
  // Track camera resolution
  const [cameraResolution, setCameraResolution] = useState({ width: 0, height: 0 });

  // Load background
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const bg = await loadImage(ASSETS.bg).catch(() => null);
        if (!mounted) return;
        setBgImg(bg);
      } catch (e) {
        setError("Could not load background image.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Start camera with default device resolution
  useEffect(() => {
    let cancelled = false;
    async function start() {
      setError("");
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        
        // Try to get the widest field of view (least zoomed) camera
        const constraints = {
          video: {
            facingMode: facing,
            // Request a resolution that fits well in the preview window
            // Use exact constraints for better control
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            // Try to get the widest aspect ratio (less zoom)
            aspectRatio: { ideal: 4/3 }, // Common for wider FOV
            // Disable any digital zoom
            zoom: false,
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for video metadata to load
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              const { videoWidth, videoHeight } = videoRef.current;
              setCameraResolution({ width: videoWidth, height: videoHeight });
              console.log(`Camera resolution: ${videoWidth}x${videoHeight}`);
            }
          };
          
          await videoRef.current.play();
        }
      } catch (e) {
        console.error("Camera error:", e);
        // Try with simpler constraints if the first attempt fails
        try {
          const fallbackConstraints = {
            video: {
              facingMode: facing,
              // Minimal constraints to get any camera
            },
            audio: false,
          };
          
          const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          if (!cancelled) {
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              await videoRef.current.play();
            }
          }
        } catch (fallbackError) {
          setError(fallbackError?.message || "Could not access camera.");
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facing]);

  // Window inside the frame in PX
  const windowPx = useMemo(() => {
    const x = frame.w * WINDOW.xPct;
    const y = frame.h * WINDOW.yPct;
    const w = frame.w * WINDOW.wPct;
    const h = frame.h * WINDOW.hPct;
    const r = frame.w * WINDOW.rPct;
    return { x, y, w, h, r };
  }, [frame.w, frame.h]);

  // Capture photo with auto-rotation
  async function capture() {
    if (!videoRef.current || busy) return;
    setBusy(true);
    setError("");

    try {
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) {
        throw new Error("Video not ready yet.");
      }

      console.log(`Capturing at: ${video.videoWidth}x${video.videoHeight}`);

      // 1. Capture the raw video frame (mirrored for front camera)
      const rawSnapshot = snapshotMirroredVideo(video, facing === "user");
      
      // 2. Auto-rotate if needed (landscape to portrait)
      const finalSnapshot = autoRotateForPortrait(rawSnapshot);
      
      // 3. Create full export canvas with background (this is what gets downloaded)
      const out = document.createElement("canvas");
      out.width = OUT.W;
      out.height = OUT.H;
      const ctx = out.getContext("2d");

      // Background
      if (bgImg) {
        drawCover(ctx, bgImg, 0, 0, OUT.W, OUT.H);
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, OUT.H);
        g.addColorStop(0, "#ff7a18");
        g.addColorStop(1, "#ffb347");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, OUT.W, OUT.H);
      }

      // Draw frame with photo
      ctx.save();
      ctx.translate(frame.cx, frame.cy);
      ctx.rotate((frame.rotateDeg * Math.PI) / 180);

      const left = -frame.w / 2;
      const top = -frame.h / 2;

      // Draw photo in window area
      const wx = left + windowPx.x;
      const wy = top + windowPx.y;
      const ww = windowPx.w;
      const wh = windowPx.h;

      ctx.save();
      roundRectPath(ctx, wx, wy, ww, wh, windowPx.r);
      ctx.clip();
      ctx.fillStyle = "#000";
      ctx.fillRect(wx, wy, ww, wh);
      
      // Draw the final rotated photo
      drawCover(ctx, finalSnapshot, wx, wy, ww, wh);
      ctx.restore();

      ctx.restore();

      const finalExportUrl = out.toDataURL("image/png");
      setExportUrl(finalExportUrl);
      
      // 4. Create a preview that shows exactly what's in the frame window
      // Extract just the window area from the export canvas
      const previewCanvas = document.createElement("canvas");
      const previewCtx = previewCanvas.getContext("2d");
      
      // Calculate the window position on the final export canvas
      const windowLeft = frame.cx - frame.w/2 + windowPx.x;
      const windowTop = frame.cy - frame.h/2 + windowPx.y;
      
      // Set preview canvas to window size
      previewCanvas.width = windowPx.w;
      previewCanvas.height = windowPx.h;
      
      // Draw just the window area from the export
      previewCtx.drawImage(
        out,
        windowLeft, windowTop, windowPx.w, windowPx.h, // source: window area from export
        0, 0, windowPx.w, windowPx.h // destination: full preview canvas
      );
      
      const previewUrl = previewCanvas.toDataURL("image/png");
      setCapturedPhotoUrl(previewUrl);
      
      // Auto-download
      triggerDownload(finalExportUrl, "insta_frame");
      
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Capture error:", e);
    } finally {
      setBusy(false);
    }
  }

  function retake() {
    setCapturedPhotoUrl("");
    setExportUrl("");
  }

  // DOM percentages for positioning
  const framePct = useMemo(() => {
    return {
      cx: (frame.cx / OUT.W) * 100,
      cy: (frame.cy / OUT.H) * 100,
      w: (frame.w / OUT.W) * 100,
      h: (frame.h / OUT.H) * 100,
      rot: frame.rotateDeg,
    };
  }, [frame]);

  const winPct = useMemo(() => {
    return {
      left: WINDOW.xPct * 100,
      top: WINDOW.yPct * 100,
      width: WINDOW.wPct * 100,
      height: WINDOW.hPct * 100,
      radius: WINDOW.rPct * 100,
    };
  }, []);

  return (
    <div className={`w-full ${className}`}>
      <div className="relative mx-auto w-full max-w-[420px] sm:max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl aspect-[9/16]">
        {/* BG */}
        {bgImg ? (
          <img src={ASSETS.bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500 to-yellow-400" />
        )}

        {/* Frame group */}
        <div
          className="absolute"
          style={{
            left: `${framePct.cx}%`,
            top: `${framePct.cy}%`,
            width: `${framePct.w}%`,
            height: `${framePct.h}%`,
            transform: `translate(-50%, -50%) rotate(${framePct.rot}deg)`,
            filter: "drop-shadow(0px 18px 35px rgba(0,0,0,0.28))",
          }}
        >
          {/* Camera window */}
          <div
            className="absolute overflow-hidden"
            style={{
              left: `${winPct.left}%`,
              top: `${winPct.top}%`,
              width: `${winPct.width}%`,
              height: `${winPct.height}%`,
              borderRadius: `${winPct.radius}%`,
            }}
          >
            {!capturedPhotoUrl ? (
              <div className="relative h-full w-full">
                <video
                  ref={videoRef}
                  className="h-full w-full object-contain"
                  style={{
                    transform: facing === "user" ? "scaleX(-1)" : "scaleX(1)",
                    transformOrigin: "center",
                  }}
                  playsInline
                  muted
                  autoPlay
                />
                {/* Optional: Add a subtle border to show the full camera view */}
                {debug && (
                  <div className="absolute inset-0 border border-blue-400/50 pointer-events-none" />
                )}
              </div>
            ) : (
              <div className="relative h-full w-full">
                <img 
                  src={capturedPhotoUrl} 
                  className="h-full w-full object-cover"
                  alt="Captured" 
                />
                {/* Show cropping overlay in debug mode */}
                {debug && (
                  <div className="absolute inset-0 border-2 border-red-500 pointer-events-none" />
                )}
              </div>
            )}

            {debug ? (
              <div className="absolute inset-0 border-4 border-lime-400/90 pointer-events-none" />
            ) : null}
          </div>
        </div>

        {/* Error */}
        {error ? (
          <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center">
            <div className="max-w-xs rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200 whitespace-pre-wrap">
              {error}
            </div>
          </div>
        ) : null}

        {/* Debug info */}
        {debug && (
          <div className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded text-xs">
            <div>Camera: {cameraResolution.width}x{cameraResolution.height}</div>
            <div>Orientation: {getScreenOrientation()}°</div>
            <div>Facing: {facing}</div>
            <div>Aspect Ratio: {(cameraResolution.width / cameraResolution.height).toFixed(2)}</div>
            <div>Window Size: {Math.round(windowPx.w)}x{Math.round(windowPx.h)}</div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-3 left-0 right-0 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-3 px-3">          
          <button
            type="button"
            onClick={() => setFacing((v) => (v === "user" ? "environment" : "user"))}
            className="rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-neutral-900"
            title="Flip camera"
          >
            Flip
          </button>
          <button
            type="button"
            onClick={capture}
            disabled={busy}
            className="h-14 w-14 rounded-full border-4 border-white/80 bg-white shadow-xl disabled:opacity-70"
            title="Capture"
          />
          <button
            type="button"
            onClick={retake}
            disabled={!capturedPhotoUrl}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Retake
          </button>
          <button
            type="button"
            onClick={() => setDebug(v => !v)}
            className="rounded-xl bg-gray-700 px-3 py-2 text-sm font-semibold text-white"
          >
            {debug ? "Hide Debug" : "Debug"}
          </button>
        </div>
      </div>

      {/* Quick tune (optional) */}
      {debug ? (
        <div className="mx-auto mt-3 max-w-[520px] rounded-xl border border-white/10 bg-neutral-950/60 p-3 text-xs text-white">
          <div className="mb-2 font-semibold">Debug Information</div>
          <div className="grid grid-cols-2 gap-3">
            <div>Camera Resolution:</div>
            <div>{cameraResolution.width}x{cameraResolution.height}</div>
            
            <div>Screen Orientation:</div>
            <div>{getScreenOrientation()}°</div>
            
            <div>Current Facing:</div>
            <div>{facing}</div>
            
            <div>Video Ready:</div>
            <div>{videoRef.current?.videoWidth ? "Yes" : "No"}</div>
            
            <div>Aspect Ratio:</div>
            <div>{(cameraResolution.width / cameraResolution.height).toFixed(2)}</div>
            
            <div>Window Size:</div>
            <div>{Math.round(windowPx.w)}x{Math.round(windowPx.h)}</div>
          </div>

          <div className="mt-4 mb-2 font-semibold">Tune frame placement (OUTPUT 1080x1920)</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              cx: {Math.round(frame.cx)}
              <input
                type="range"
                min="0"
                max={OUT.W}
                value={frame.cx}
                onChange={(e) => setFrame((p) => ({ ...p, cx: +e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              cy: {Math.round(frame.cy)}
              <input
                type="range"
                min="0"
                max={OUT.H}
                value={frame.cy}
                onChange={(e) => setFrame((p) => ({ ...p, cy: +e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              w: {Math.round(frame.w)}
              <input
                type="range"
                min="600"
                max={OUT.W}
                value={frame.w}
                onChange={(e) => setFrame((p) => ({ ...p, w: +e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              h: {Math.round(frame.h)}
              <input
                type="range"
                min="900"
                max={OUT.H}
                value={frame.h}
                onChange={(e) => setFrame((p) => ({ ...p, h: +e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              rotate: {frame.rotateDeg.toFixed(1)}°
              <input
                type="range"
                min="-15"
                max="15"
                step="0.1"
                value={frame.rotateDeg}
                onChange={(e) => setFrame((p) => ({ ...p, rotateDeg: +e.target.value }))}
              />
            </label>
          </div>

          <div className="mt-4 mb-2 font-semibold">Tune window inside frame (percent of frame)</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              xPct: {(WINDOW.xPct * 100).toFixed(1)}%
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={WINDOW.xPct * 100}
                onChange={(e) => {
                  const newX = parseFloat(e.target.value) / 100;
                  // Update WINDOW object
                  WINDOW.xPct = newX;
                  // Trigger re-render by updating frame state
                  setFrame({...frame});
                }}
              />
            </label>
            <label className="flex flex-col gap-1">
              yPct: {(WINDOW.yPct * 100).toFixed(1)}%
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={WINDOW.yPct * 100}
                onChange={(e) => {
                  const newY = parseFloat(e.target.value) / 100;
                  WINDOW.yPct = newY;
                  setFrame({...frame});
                }}
              />
            </label>
            <label className="flex flex-col gap-1">
              wPct: {(WINDOW.wPct * 100).toFixed(1)}%
              <input
                type="range"
                min="80"
                max="100"
                step="0.1"
                value={WINDOW.wPct * 100}
                onChange={(e) => {
                  const newW = parseFloat(e.target.value) / 100;
                  WINDOW.wPct = newW;
                  setFrame({...frame});
                }}
              />
            </label>
            <label className="flex flex-col gap-1">
              hPct: {(WINDOW.hPct * 100).toFixed(1)}%
              <input
                type="range"
                min="60"
                max="90"
                step="0.1"
                value={WINDOW.hPct * 100}
                onChange={(e) => {
                  const newH = parseFloat(e.target.value) / 100;
                  WINDOW.hPct = newH;
                  setFrame({...frame});
                }}
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}