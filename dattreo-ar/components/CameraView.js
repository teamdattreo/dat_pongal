"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const ASSETS = {
  bg: "/assets/frame.jpeg",
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
  xPct: 0.038,
  yPct: -0.007,
  wPct: 0.93,
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

function drawContain(ctx, source, dx, dy, dw, dh) {
  const sw = source.width;
  const sh = source.height;
  const scale = Math.min(dw / sw, dh / sh);
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

// Enhanced screen orientation detection
function getScreenOrientation() {
  if (typeof window === 'undefined') return 0;
  
  // Try modern API first
  if (window.screen?.orientation?.angle !== undefined) {
    return window.screen.orientation.angle;
  }
  
  // Legacy orientation
  if (typeof window.orientation === 'number') {
    return window.orientation;
  }
  
  // Fallback based on window dimensions
  if (window.innerWidth > window.innerHeight) {
    // Check if it's landscape left or right (approximation)
    return window.innerWidth > window.innerHeight ? 90 : -90;
  }
  
  return 0;
}

// Device Orientation API helper
async function getDeviceOrientationPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' && 
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Device orientation permission error:', error);
      return false;
    }
  }
  
  // If no permission needed or API not available
  return true;
}

// Device orientation tracking
function useDeviceOrientation() {
  const [orientation, setOrientation] = useState({
    alpha: 0,   // compass direction (0-360)
    beta: 0,    // front-to-back tilt (-180 to 180)
    gamma: 0,   // left-to-right tilt (-90 to 90)
    absolute: false,
    permissionGranted: false,
    hasDeviceOrientation: false
  });

  useEffect(() => {
    let mounted = true;
    let orientationHandler = null;

    async function init() {
      try {
        // Check if device orientation is available
        if (!('DeviceOrientationEvent' in window)) {
          console.log('DeviceOrientationEvent not supported');
          return;
        }

        // Request permission on iOS 13+
        const hasPermission = await getDeviceOrientationPermission();
        
        if (!mounted) return;
        
        if (!hasPermission) {
          console.log('Device orientation permission denied');
          setOrientation(prev => ({
            ...prev,
            permissionGranted: false,
            hasDeviceOrientation: false
          }));
          return;
        }

        orientationHandler = (event) => {
          if (!mounted) return;
          
          setOrientation({
            alpha: event.alpha || 0,
            beta: event.beta || 0,
            gamma: event.gamma || 0,
            absolute: event.absolute || false,
            permissionGranted: true,
            hasDeviceOrientation: true
          });
        };

        window.addEventListener('deviceorientation', orientationHandler);
        
        setOrientation(prev => ({
          ...prev,
          permissionGranted: true,
          hasDeviceOrientation: true
        }));

        // Also listen for screen orientation changes
        const handleScreenOrientationChange = () => {
          if (!mounted) return;
          // Force update to get fresh screen orientation
          setOrientation(prev => ({ ...prev }));
        };

        window.addEventListener('orientationchange', handleScreenOrientationChange);

        return () => {
          window.removeEventListener('orientationchange', handleScreenOrientationChange);
        };
      } catch (error) {
        console.error('Device orientation initialization error:', error);
        if (mounted) {
          setOrientation(prev => ({
            ...prev,
            hasDeviceOrientation: false
          }));
        }
      }
    }

    init();

    return () => {
      mounted = false;
      if (orientationHandler) {
        window.removeEventListener('deviceorientation', orientationHandler);
      }
    };
  }, []);

  return orientation;
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

// Smart auto-rotate based on device orientation
function determineRotationAngle(canvas, screenOrientation, deviceOrientation, facingMode) {
  const { width, height } = canvas;
  const { beta, gamma } = deviceOrientation;
  const isFrontCamera = facingMode === 'user';
  
  console.log('Rotation calculation:', {
    screenOrientation,
    beta,
    gamma,
    facingMode,
    imageSize: `${width}x${height}`,
    isPortrait: height >= width
  });

  // If image is already portrait, check if it needs correction
  if (height >= width) {
    // Check if device is upside down
    if (Math.abs(beta) > 135) {
      return 180; // Upside down
    }
    return 0; // Already correct portrait
  }

  // Image is landscape - determine correct rotation
  if (screenOrientation === 90) {
    // Landscape left (device rotated counter-clockwise)
    if (isFrontCamera) {
      // Front camera needs opposite rotation
      return 90;
    } else {
      return -90;
    }
  } 
  else if (screenOrientation === -90) {
    // Landscape right (device rotated clockwise)
    if (isFrontCamera) {
      return -90;
    } else {
      return 90;
    }
  }
  else if (screenOrientation === 180) {
    // Upside down
    return 180;
  }
  else if (screenOrientation === 0) {
    // Portrait orientation but landscape image
    // Use device tilt to determine rotation
    if (gamma > 45) {
      // Device tilted to the right
      return isFrontCamera ? -90 : 90;
    } else if (gamma < -45) {
      // Device tilted to the left
      return isFrontCamera ? 90 : -90;
    } else {
      // Default rotation for landscape in portrait mode
      return 90;
    }
  }

  // Fallback: rotate based on image dimensions
  if (width > height) {
    return 90;
  }

  return 0;
}

async function autoRotateForPortrait(canvas, facingMode, deviceOrientationData) {
  const { width, height } = canvas;
  const screenOrientation = getScreenOrientation();
  
  // Get device orientation if not provided
  let deviceOrientation = deviceOrientationData;
  if (!deviceOrientation) {
    deviceOrientation = {
      alpha: 0,
      beta: 0,
      gamma: 0,
      absolute: false
    };
  }

  // Determine rotation angle
  const rotationAngle = determineRotationAngle(
    canvas, 
    screenOrientation, 
    deviceOrientation, 
    facingMode
  );

  console.log('Applying rotation angle:', rotationAngle);

  // Apply rotation if needed
  if (rotationAngle !== 0) {
    return rotateCanvas(canvas, rotationAngle);
  }

  return canvas;
}

export default function InstaFrameCameraImage({ className = "" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [facing, setFacing] = useState("environment");
  const [bgImg, setBgImg] = useState(null);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState("");
  const [exportUrl, setExportUrl] = useState("");

  const [debug, setDebug] = useState(false);
  const [frame, setFrame] = useState(FRAME);
  const [showFrame, setShowFrame] = useState(false);
  
  const [cameraResolution, setCameraResolution] = useState({ width: 0, height: 0 });
  
  // Use device orientation hook
  const deviceOrientation = useDeviceOrientation();
  
  // Track screen orientation separately
  const [screenOrientation, setScreenOrientation] = useState(getScreenOrientation());

  // Update screen orientation on changes
  useEffect(() => {
    const handleOrientationChange = () => {
      const newOrientation = getScreenOrientation();
      setScreenOrientation(newOrientation);
      console.log('Screen orientation changed:', newOrientation);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

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
        
        const constraints = {
          video: {
            facingMode: facing,
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            aspectRatio: { ideal: 4/3 },
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
        try {
          const fallbackConstraints = {
            video: { facingMode: facing },
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

  // Request device orientation permission
  const requestOrientationPermission = async () => {
    setBusy(true);
    try {
      const granted = await getDeviceOrientationPermission();
      if (granted) {
        alert("Device orientation permission granted! You can now take photos with correct rotation.");
      } else {
        alert("Device orientation permission is required for proper photo rotation.");
      }
    } catch (error) {
      console.error("Permission request error:", error);
    } finally {
      setBusy(false);
    }
  };

  // Capture photo with advanced auto-rotation
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
      console.log('Current device orientation:', deviceOrientation);
      console.log('Current screen orientation:', screenOrientation);

      // 1. Capture the raw video frame
      const rawSnapshot = snapshotMirroredVideo(video, facing === "user");
      
      // 2. Auto-rotate using device orientation
      const finalSnapshot = await autoRotateForPortrait(
        rawSnapshot, 
        facing, 
        deviceOrientation
      );
      
      // 3. Create full export canvas with background
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
      
      // Draw the rotated photo
      drawContain(ctx, finalSnapshot, wx, wy, ww, wh);
      ctx.restore();

      ctx.restore();

      const finalExportUrl = out.toDataURL("image/png");
      setExportUrl(finalExportUrl);
      
      // 4. Create preview image
      const previewCanvas = document.createElement("canvas");
      const previewCtx = previewCanvas.getContext("2d");
      
      previewCanvas.width = Math.round(windowPx.w);
      previewCanvas.height = Math.round(windowPx.h);
      
      const windowLeft = frame.cx - frame.w/2 + windowPx.x;
      const windowTop = frame.cy - frame.h/2 + windowPx.y;
      
      previewCtx.drawImage(
        out,
        windowLeft, windowTop, windowPx.w, windowPx.h,
        0, 0, previewCanvas.width, previewCanvas.height
      );
      
      const previewUrl = previewCanvas.toDataURL("image/png");
      setCapturedPhotoUrl(previewUrl);
      
      // Show the frame after capture
      setShowFrame(true);
      
      // Auto-download the full frame
      setTimeout(() => {
        triggerDownload(finalExportUrl, "insta_frame");
      }, 500);
      
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
    setShowFrame(false);
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
      {/* Device orientation warning */}
      {!deviceOrientation.permissionGranted && deviceOrientation.hasDeviceOrientation && (
        <div className="mb-4 mx-auto max-w-[520px] p-3 bg-yellow-900/50 border border-yellow-700 rounded-lg text-yellow-200 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <strong>Device Orientation Permission Required</strong>
              <p className="mt-1 text-yellow-300">
                For proper photo rotation, please grant device orientation permission.
              </p>
            </div>
            <button
              onClick={requestOrientationPermission}
              disabled={busy}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md disabled:opacity-50"
            >
              {busy ? "Requesting..." : "Grant Permission"}
            </button>
          </div>
        </div>
      )}

      <div className="relative mx-auto w-full max-w-[420px] sm:max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl aspect-[9/16]">
        {/* BG - Only show after capture */}
        {showFrame && bgImg ? (
          <img src={ASSETS.bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-black" />
        )}

        {/* Frame group - Only show after capture */}
        {showFrame && (
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
                    className="h-full w-full object-contain bg-black"
                    style={{
                      transform: facing === "user" ? "scaleX(-1)" : "scaleX(1)",
                      transformOrigin: "center",
                    }}
                    playsInline
                    muted
                    autoPlay
                  />
                  {debug && (
                    <div className="absolute inset-0 border border-blue-400/50 pointer-events-none" />
                  )}
                </div>
              ) : (
                <div className="relative h-full w-full">
                  <img 
                    src={capturedPhotoUrl} 
                    className="h-full w-full object-contain bg-black"
                    alt="Captured" 
                  />
                  {debug && (
                    <div className="absolute inset-0 border-2 border-red-500 pointer-events-none" />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full screen camera view when not showing frame */}
        {!showFrame && (
          <div className="absolute inset-0 bg-black">
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
          </div>
        )}

        {/* Error */}
        {error ? (
          <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center z-50">
            <div className="max-w-xs rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200 whitespace-pre-wrap">
              {error}
            </div>
          </div>
        ) : null}

        {/* Debug info */}
        {debug && (
          <div className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded text-xs z-40 space-y-1 max-w-[200px]">
            <div>Camera: {cameraResolution.width}x{cameraResolution.height}</div>
            <div>Screen Orientation: {screenOrientation}°</div>
            <div>Facing: {facing}</div>
            <div>Device Tilt (β): {deviceOrientation.beta?.toFixed(1)}°</div>
            <div>Device Tilt (γ): {deviceOrientation.gamma?.toFixed(1)}°</div>
            <div>Device Compass (α): {deviceOrientation.alpha?.toFixed(1)}°</div>
            <div>Permission: {deviceOrientation.permissionGranted ? "Granted" : "Denied"}</div>
            <div>Supported: {deviceOrientation.hasDeviceOrientation ? "Yes" : "No"}</div>
            <div>Aspect: {(cameraResolution.width / cameraResolution.height).toFixed(2)}</div>
            <div>Window: {Math.round(windowPx.w)}x{Math.round(windowPx.h)}</div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-3 left-0 right-0 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-3 px-3 z-30">          
          {/* Flip Camera Button */}
          <button
            type="button"
            onClick={() => setFacing((v) => (v === "user" ? "environment" : "user"))}
            className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            title="Flip camera"
          >
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
          
          {/* Capture Button */}
          <button
            type="button"
            onClick={capture}
            disabled={busy}
            className="h-14 w-14 rounded-full border-4 border-white/80 bg-white shadow-xl disabled:opacity-70 hover:scale-105 transition-transform"
            title="Capture"
          />
          
          {/* Retake Button */}
          {capturedPhotoUrl && (
            <button
              type="button"
              onClick={retake}
              disabled={busy}
              className="h-12 w-12 rounded-full bg-rose-600 flex items-center justify-center shadow-lg hover:bg-rose-700 transition-colors disabled:opacity-60"
              title="Retake"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
          )}
          
          {/* Download Button */}
          {capturedPhotoUrl && (
            <button
              type="button"
              onClick={() => exportUrl && triggerDownload(exportUrl, "insta_frame")}
              disabled={!exportUrl || busy}
              className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center shadow-lg hover:bg-green-700 transition-colors disabled:opacity-60"
              title="Download again"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
            </button>
          )}
          
          {/* Device Orientation Permission Button */}
          {!deviceOrientation.permissionGranted && deviceOrientation.hasDeviceOrientation && (
            <button
              type="button"
              onClick={requestOrientationPermission}
              disabled={busy}
              className="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center shadow-lg hover:bg-purple-700 transition-colors disabled:opacity-60"
              title="Grant device orientation permission"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              </svg>
            </button>
          )}
          
          {/* Debug Toggle Button */}
          <button
            type="button"
            onClick={() => setDebug(v => !v)}
            className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center shadow-lg hover:bg-gray-800 transition-colors"
          >
            <span className="text-white text-sm font-semibold">
              {debug ? "D" : "D"}
            </span>
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
            <div>{screenOrientation}°</div>
            
            <div>Device Beta (Tilt):</div>
            <div>{deviceOrientation.beta?.toFixed(1)}°</div>
            
            <div>Device Gamma (Tilt):</div>
            <div>{deviceOrientation.gamma?.toFixed(1)}°</div>
            
            <div>Device Alpha (Compass):</div>
            <div>{deviceOrientation.alpha?.toFixed(1)}°</div>
            
            <div>Device Orientation Permission:</div>
            <div>{deviceOrientation.permissionGranted ? "Granted" : "Denied"}</div>
            
            <div>Device Orientation Supported:</div>
            <div>{deviceOrientation.hasDeviceOrientation ? "Yes" : "No"}</div>
            
            <div>Current Facing:</div>
            <div>{facing}</div>
            
            <div>Video Ready:</div>
            <div>{videoRef.current?.videoWidth ? "Yes" : "No"}</div>
            
            <div>Camera Aspect:</div>
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
                  WINDOW.xPct = newX;
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