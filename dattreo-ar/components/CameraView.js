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

// Calculate rotation from device orientation (accelerometer/gyroscope)
function calculateRotationFromDeviceOrientation(beta, gamma) {
  if (beta === null || gamma === null) return 0;
  
  // Normalize angles
  const normBeta = ((beta + 180) % 360) - 180;
  const normGamma = ((gamma + 180) % 360) - 180;
  
  // Determine orientation based on tilt angles
  const absBeta = Math.abs(normBeta);
  const absGamma = Math.abs(normGamma);
  
  // If phone is mostly upright (portrait)
  if (absBeta < 45 && absGamma < 45) {
    // Check if phone is upside down
    if (normBeta > 135 || normBeta < -135) {
      return 180; // Portrait upside down
    }
    return 0; // Portrait upright
  }
  
  // If phone is in landscape
  if (absGamma > 45) {
    if (normGamma > 0) {
      return 90; // Landscape left (phone rotated right)
    } else {
      return -90; // Landscape right (phone rotated left)
    }
  }
  
  return 0;
}

// Get the rotation needed for the captured image
function getRotationForCapturedImage(deviceOrientationAngle, capturedWidth, capturedHeight) {
  // If image is already portrait (height >= width), check if upside down
  if (capturedHeight >= capturedWidth) {
    if (deviceOrientationAngle === 180) {
      return 180; // Portrait upside down
    }
    return 0; // Portrait upright
  }
  
  // If image is landscape (width > height), rotate based on device orientation
  switch (deviceOrientationAngle) {
    case 90: // Landscape left captured
      return -90; // Rotate left to make portrait
    case -90: // Landscape right captured
      return 90; // Rotate right to make portrait
    case 180: // Portrait upside down
      return 180; // Rotate 180 degrees
    default:
      return 90; // Default: rotate 90 degrees clockwise
  }
}

function rotateCanvas(sourceCanvas, angleDeg) {
  if (angleDeg === 0) return sourceCanvas;
  
  const angleRad = angleDeg * (Math.PI / 180);
  const sin = Math.abs(Math.sin(angleRad));
  const cos = Math.abs(Math.cos(angleRad));
  
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
  
  const [cameraResolution, setCameraResolution] = useState({ width: 0, height: 0 });
  
  // Device orientation state (accelerometer/gyroscope)
  const [deviceOrientation, setDeviceOrientation] = useState({
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

  // Setup device orientation listener (accelerometer/gyroscope)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleDeviceOrientation = (event) => {
      const { beta, gamma } = event;
      const angle = calculateRotationFromDeviceOrientation(beta, gamma);
      
      setDeviceOrientation({
        beta: beta || 0,
        gamma: gamma || 0,
        angle
      });
    };

    const checkDeviceOrientationSupport = async () => {
      if (typeof DeviceOrientationEvent !== 'undefined') {
        // iOS 13+ requires permission
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          try {
            const permissionState = await DeviceOrientationEvent.requestPermission();
            if (permissionState === 'granted') {
              window.addEventListener('deviceorientation', handleDeviceOrientation);
              setIsDeviceOrientationSupported(true);
            } else {
              setIsDeviceOrientationSupported(false);
              console.warn('Device orientation permission denied');
            }
          } catch (err) {
            console.error('Error requesting device orientation permission:', err);
            setIsDeviceOrientationSupported(false);
          }
        } else if ('ondeviceorientation' in window) {
          // Non-iOS devices or older iOS
          window.addEventListener('deviceorientation', handleDeviceOrientation);
          setIsDeviceOrientationSupported(true);
        } else {
          setIsDeviceOrientationSupported(false);
        }
      } else {
        setIsDeviceOrientationSupported(false);
      }
    };

    checkDeviceOrientationSupport();

    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
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
      console.log(`Device orientation: ${deviceOrientation.angle}°`);

      // 1. Capture the raw video frame (mirrored for front camera)
      const rawSnapshot = snapshotMirroredVideo(video, facing === "user");
      
      // 2. Calculate rotation needed based on device orientation and image dimensions
      const rotationAngle = getRotationForCapturedImage(
        deviceOrientation.angle,
        rawSnapshot.width,
        rawSnapshot.height
      );
      
      // 3. Apply rotation if needed
      const finalSnapshot = rotationAngle !== 0 
        ? rotateCanvas(rawSnapshot, rotationAngle)
        : rawSnapshot;
      
      // 4. Create photo-only canvas for preview - use actual photo dimensions
      const photoCanvas = document.createElement("canvas");
      
      // Use the rotated snapshot dimensions for the preview
      photoCanvas.width = finalSnapshot.width;
      photoCanvas.height = finalSnapshot.height;
      const pctx = photoCanvas.getContext("2d");
      
      // Fill with black background and draw the photo
      pctx.fillStyle = "#000";
      pctx.fillRect(0, 0, photoCanvas.width, photoCanvas.height);
      pctx.drawImage(finalSnapshot, 0, 0);
      
      const photoUrl = photoCanvas.toDataURL("image/png");
      setCapturedPhotoUrl(photoUrl);

      // 5. Create full export canvas with background
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

  // Request orientation permission manually (for iOS)
  const requestOrientationPermission = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceOrientationEvent.requestPermission();
        if (permissionState === 'granted') {
          window.location.reload();
        }
      } catch (error) {
        console.error('Error requesting permission:', error);
      }
    }
  };

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

        {/* Debug info */}
        {debug && (
          <div className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded text-xs">
            <div>Camera: {cameraResolution.width}x{cameraResolution.height}</div>
            <div>Device Orientation: {deviceOrientation.angle}°</div>
            <div>β (tilt): {deviceOrientation.beta?.toFixed(1) || 'N/A'}</div>
            <div>γ (tilt): {deviceOrientation.gamma?.toFixed(1) || 'N/A'}</div>
            <div>Facing: {facing}</div>
            <div>Aspect Ratio: {(cameraResolution.width / cameraResolution.height).toFixed(2)}</div>
            <div>Auto-Rotate: {isDeviceOrientationSupported ? 'Enabled' : 'Disabled'}</div>
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
          {!isDeviceOrientationSupported && (
            <button
              type="button"
              onClick={requestOrientationPermission}
              className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Enable Auto-Rotate
            </button>
          )}
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
            
            <div>Device Orientation:</div>
            <div>{deviceOrientation.angle}°</div>
            
            <div>β (front-back):</div>
            <div>{deviceOrientation.beta?.toFixed(1) || 'N/A'}</div>
            
            <div>γ (left-right):</div>
            <div>{deviceOrientation.gamma?.toFixed(1) || 'N/A'}</div>
            
            <div>Current Facing:</div>
            <div>{facing}</div>
            
            <div>Video Ready:</div>
            <div>{videoRef.current?.videoWidth ? "Yes" : "No"}</div>
            
            <div>Aspect Ratio:</div>
            <div>{(cameraResolution.width / cameraResolution.height).toFixed(2)}</div>
            
            <div>Auto-Rotate Supported:</div>
            <div>{isDeviceOrientationSupported ? 'Yes' : 'No'}</div>
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
        </div>
      ) : null}
    </div>
  );
}