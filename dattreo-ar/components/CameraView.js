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

// Calculate rotation angle from device orientation
function calculateRotationFromOrientation(alpha, beta, gamma) {
  if (beta === null || gamma === null) return 0;
  
  // Convert degrees to radians
  const betaRad = beta * (Math.PI / 180);
  const gammaRad = gamma * (Math.PI / 180);
  
  // Calculate rotation angle based on device tilt
  let angle = Math.atan2(gammaRad, betaRad) * (180 / Math.PI);
  
  // Normalize to -180 to 180
  if (angle < 0) angle += 360;
  
  // Adjust for typical phone usage
  // Portrait upright: ~0°
  // Landscape left: ~90°
  // Portrait upside-down: ~180°
  // Landscape right: ~270° or -90°
  
  // Determine which orientation we're closest to
  if (angle > 315 || angle < 45) return 0; // Portrait upright
  if (angle >= 45 && angle < 135) return 90; // Landscape left
  if (angle >= 135 && angle < 225) return 180; // Portrait upside-down
  if (angle >= 225 && angle < 315) return -90; // Landscape right
  
  return 0;
}

// Auto-rotate canvas based on captured photo dimensions and device orientation
function autoRotateCanvasForPortrait(capturedCanvas, deviceOrientation) {
  const { width, height } = capturedCanvas;
  
  // If already portrait (height >= width), check if we need to rotate based on orientation
  if (height >= width) {
    // For portrait mode photos
    if (deviceOrientation === 180) {
      // Phone is upside down, rotate 180°
      return rotateCanvas(capturedCanvas, 180);
    }
    return capturedCanvas; // Keep as is
  }
  
  // If landscape (width > height), always rotate to portrait
  // Determine which way to rotate based on device orientation
  let rotateAngle = 90; // Default rotate left
  
  if (deviceOrientation === 90) {
    // Landscape left captured, rotate right to make portrait
    rotateAngle = -90;
  } else if (deviceOrientation === -90) {
    // Landscape right captured, rotate left to make portrait
    rotateAngle = 90;
  } else if (deviceOrientation === 180) {
    // Upside down, rotate accordingly
    rotateAngle = 180;
  }
  
  return rotateCanvas(capturedCanvas, rotateAngle);
}

function rotateCanvas(sourceCanvas, angleDeg) {
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
  
  // Device orientation states
  const [deviceOrientation, setDeviceOrientation] = useState({
    alpha: 0,
    beta: 0,
    gamma: 0,
    angle: 0
  });
  
  const [isDeviceOrientationSupported, setIsDeviceOrientationSupported] = useState(false);

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

  // Check and setup device orientation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    // Check if DeviceOrientationEvent is supported
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        (typeof DeviceOrientationEvent.requestPermission === 'function' || 
         'ondeviceorientation' in window)) {
      
      setIsDeviceOrientationSupported(true);
      
      const handleOrientation = (event) => {
        const { alpha, beta, gamma } = event;
        const angle = calculateRotationFromOrientation(alpha, beta, gamma);
        
        setDeviceOrientation({
          alpha: alpha || 0,
          beta: beta || 0,
          gamma: gamma || 0,
          angle
        });
      };

      // Request permission on iOS
      if (isIOS && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }

      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    } else {
      console.warn('Device orientation not supported');
      setIsDeviceOrientationSupported(false);
    }
  }, []);

  // Start camera
  useEffect(() => {
    let cancelled = false;
    async function start() {
      setError("");
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1080 },
            height: { ideal: 1920 },
            aspectRatio: { ideal: 9 / 16 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setError(e?.message || "Could not access camera.");
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

      // 1. Capture the raw video frame (mirrored for front camera)
      const rawSnapshot = snapshotMirroredVideo(video, facing === "user");
      
      // 2. Auto-rotate based on captured dimensions and device orientation
      const rotatedSnapshot = autoRotateCanvasForPortrait(rawSnapshot, deviceOrientation.angle);
      
      // 3. Create photo-only canvas for preview
      const photoCanvas = document.createElement("canvas");
      photoCanvas.width = 1080;
      photoCanvas.height = 1350; // 4:5 aspect ratio
      const pctx = photoCanvas.getContext("2d");
      
      pctx.fillStyle = "#000";
      pctx.fillRect(0, 0, photoCanvas.width, photoCanvas.height);
      drawCover(pctx, rotatedSnapshot, 0, 0, photoCanvas.width, photoCanvas.height);
      
      const photoUrl = photoCanvas.toDataURL("image/png");
      setCapturedPhotoUrl(photoUrl);

      // 4. Create full export canvas with background
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
      drawCover(ctx, rotatedSnapshot, wx, wy, ww, wh);
      ctx.restore();

      ctx.restore();

      setExportUrl(out.toDataURL("image/png"));
      
      // Auto-download
      triggerDownload(out.toDataURL("image/png"), "insta_frame");
      
    } catch (e) {
      setError(e?.message || String(e));
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
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                style={{
                  transform: facing === "user" ? "scaleX(-1)" : "scaleX(1)",
                  transformOrigin: "center",
                }}
                playsInline
                muted
                autoPlay
              />
            ) : (
              <img src={capturedPhotoUrl} className="h-full w-full object-cover" alt="Captured" />
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

        {/* Device orientation debug info */}
        {debug && isDeviceOrientationSupported && (
          <div className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded text-xs">
            <div>Orientation: {deviceOrientation.angle}°</div>
            <div>β: {deviceOrientation.beta?.toFixed(1) || 'N/A'}</div>
            <div>γ: {deviceOrientation.gamma?.toFixed(1) || 'N/A'}</div>
            <div>α: {deviceOrientation.alpha?.toFixed(1) || 'N/A'}</div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-3 left-0 right-0 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-3 px-3">
          <button
            type="button"
            onClick={capture}
            disabled={busy}
            className="h-14 w-14 rounded-full border-4 border-white/80 bg-white shadow-xl disabled:opacity-70"
            title="Capture"
          />
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
            onClick={retake}
            disabled={!capturedPhotoUrl}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Retake
          </button>
          {!isDeviceOrientationSupported && (
            <div className="text-xs text-white/70 bg-black/50 p-1 rounded">
              Auto-rotate not supported
            </div>
          )}
        </div>
      </div>

      {/* Quick tune (optional) */}
      {debug ? (
        <div className="mx-auto mt-3 max-w-[520px] rounded-xl border border-white/10 bg-neutral-950/60 p-3 text-xs text-white">
          <div className="mb-2 font-semibold">Tune frame placement (OUTPUT 1080x1920)</div>
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

          <div className="mt-2 text-[11px] text-white/70">
            Device orientation: {isDeviceOrientationSupported ? "Supported" : "Not supported"}
          </div>
        </div>
      ) : null}
    </div>
  );
}