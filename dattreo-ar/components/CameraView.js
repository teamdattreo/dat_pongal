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

// Get device orientation from accelerometer data
function getDeviceOrientationFromAccel(beta, gamma) {
  // beta: front-to-back tilt (-180 to 180)
  // gamma: left-to-right tilt (-90 to 90)
  
  // Determine orientation based on which tilt is more significant
  const absBeta = Math.abs(beta);
  const absGamma = Math.abs(gamma);
  
  // Portrait orientations (beta is more significant)
  if (absBeta > absGamma) {
    if (beta > 45 && beta < 135) {
      return 0; // Normal portrait (top up)
    } else if (beta < -45 && beta > -135) {
      return 180; // Upside down portrait
    }
  }
  
  // Landscape orientations (gamma is more significant)
  if (gamma > 45) {
    return 90; // Landscape right (rotated clockwise)
  } else if (gamma < -45) {
    return -90; // Landscape left (rotated counter-clockwise)
  }
  
  // Default to portrait
  return 0;
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
  const [deviceOrientation, setDeviceOrientation] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [accelData, setAccelData] = useState({ beta: 0, gamma: 0 });

  // Request device orientation permission (iOS 13+)
  const requestOrientationPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        setPermissionGranted(permission === "granted");
        return permission === "granted";
      } catch (e) {
        console.error("Permission request failed:", e);
        setPermissionGranted(false);
        return false;
      }
    } else {
      setPermissionGranted(true);
      return true;
    }
  };

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

  // Device orientation listener using accelerometer
  useEffect(() => {
    if (typeof window === "undefined") return;

    let lastUpdate = 0;
    const THROTTLE = 100; // ms

    const handleOrientation = (event) => {
      const now = Date.now();
      if (now - lastUpdate < THROTTLE) return;
      lastUpdate = now;

      const { beta, gamma } = event;
      
      if (beta !== null && gamma !== null) {
        setAccelData({ beta, gamma });
        const orientation = getDeviceOrientationFromAccel(beta, gamma);
        setDeviceOrientation(orientation);
      }
    };

    if (permissionGranted) {
      window.addEventListener("deviceorientation", handleOrientation, true);
      return () => {
        window.removeEventListener("deviceorientation", handleOrientation, true);
      };
    }
  }, [permissionGranted]);

  // Fallback: screen orientation API
  useEffect(() => {
    if (permissionGranted) return;

    const updateFromScreen = () => {
      let angle = 0;
      if (window.screen?.orientation?.angle !== undefined) {
        angle = window.screen.orientation.angle;
      } else if (typeof window.orientation === "number") {
        angle = window.orientation;
      }
      
      if (angle === 270) angle = -90;
      setDeviceOrientation(angle);
    };

    updateFromScreen();
    window.screen?.orientation?.addEventListener?.("change", updateFromScreen);
    window.addEventListener("orientationchange", updateFromScreen);
    
    return () => {
      window.screen?.orientation?.removeEventListener?.("change", updateFromScreen);
      window.removeEventListener("orientationchange", updateFromScreen);
    };
  }, [permissionGranted]);

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

  const windowPx = useMemo(() => {
    const x = frame.w * WINDOW.xPct;
    const y = frame.h * WINDOW.yPct;
    const w = frame.w * WINDOW.wPct;
    const h = frame.h * WINDOW.hPct;
    const r = frame.w * WINDOW.rPct;
    return { x, y, w, h, r };
  }, [frame.w, frame.h]);

  // Fixed auto-rotate logic based on device orientation
  function autoRotateForPortrait(capturedCanvas, currentOrientation) {
    const { width, height } = capturedCanvas;
    
    console.log(`Device orientation at capture: ${currentOrientation}°`);
    console.log(`Image dimensions: ${width}x${height}`);
    
    let rotationNeeded = 0;
    
    // Determine rotation based on device orientation
    switch (currentOrientation) {
      case 0:
        // Portrait upright - no rotation if already portrait
        if (width > height) {
          // Image is landscape but device is portrait - rotate 90°
          rotationNeeded = 90;
        }
        break;
        
      case 180:
        // Portrait upside down - rotate 180°
        rotationNeeded = 180;
        break;
        
      case 90:
        // Landscape right - rotate -90° to make portrait
        rotationNeeded = -90;
        break;
        
      case -90:
        // Landscape left - rotate 90° to make portrait
        rotationNeeded = 90;
        break;
    }
    
    console.log(`Rotation needed: ${rotationNeeded}°`);
    
    if (rotationNeeded === 0) {
      return capturedCanvas;
    }
    
    return rotateCanvas(capturedCanvas, rotationNeeded);
  }

  // Capture photo with device-orientation-aware rotation
  async function capture() {
    if (!videoRef.current || busy) return;
    
    // Request permission if not granted (for iOS)
    if (!permissionGranted) {
      const granted = await requestOrientationPermission();
      if (!granted) {
        setError("Device orientation permission required for proper photo rotation");
        return;
      }
    }
    
    setBusy(true);
    setError("");

    try {
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) {
        throw new Error("Video not ready yet.");
      }

      console.log(`Capturing at: ${video.videoWidth}x${video.videoHeight}`);

      // 1. Capture the raw video frame (mirrored for front camera only)
      const rawSnapshot = snapshotMirroredVideo(video, facing === "user");
      
      // 2. Auto-rotate based on current device orientation
      const finalSnapshot = autoRotateForPortrait(rawSnapshot, deviceOrientation);
      
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

      setShowFrame(true);

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
        {/* BG - Only show after capture */}
        {showFrame && bgImg ? (
          <img src={ASSETS.bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500 to-yellow-400" />
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
              className="absolute overflow-hidden bg-black"
              style={{
                left: `${winPct.left}%`,
                top: `${winPct.top}%`,
                width: `${winPct.width}%`,
                height: `${winPct.height}%`,
                borderRadius: `${winPct.radius}%`,
              }}
            >
              {capturedPhotoUrl && (
                <>
                  <img src={capturedPhotoUrl} className="h-full w-full object-contain" alt="Captured" />
                  {debug && (
                    <div className="absolute inset-0 border-4 border-green-400/90 pointer-events-none" />
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Full screen camera view when not showing frame */}
        {!showFrame && (
          <div className="absolute inset-0 bg-black">
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
          <div className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded text-xs z-40 space-y-1">
            <div>Camera: {cameraResolution.width}x{cameraResolution.height}</div>
            <div>Orientation: {deviceOrientation}°</div>
            <div>Beta: {accelData.beta.toFixed(1)}°</div>
            <div>Gamma: {accelData.gamma.toFixed(1)}°</div>
            <div>Facing: {facing}</div>
            <div>Permission: {permissionGranted ? "✓" : "✗"}</div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-3 left-0 right-0 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-3 px-3 z-30">
          {!permissionGranted && !showFrame && (
            <button
              type="button"
              onClick={requestOrientationPermission}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors"
            >
              Enable Motion
            </button>
          )}
          
          {/* Flip Camera Button */}
          <button
            type="button"
            onClick={() => setFacing((v) => (v === "user" ? "environment" : "user"))}
            className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            title="Flip camera"
          >
            🔄
          </button>

          {/* Capture Button */}
          <button
            type="button"
            onClick={capture}
            disabled={busy}
            className="h-16 w-16 rounded-full border-4 border-white/80 bg-white shadow-xl disabled:opacity-70 transition-transform active:scale-95"
            title="Capture"
          />

          {/* Retake Button */}
          {capturedPhotoUrl && (
            <button
              type="button"
              onClick={retake}
              className="h-12 w-12 rounded-full bg-rose-600 flex items-center justify-center shadow-lg hover:bg-rose-700 transition-colors"
              title="Retake"
            >
              ↺
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
              💾
            </button>
          )}

          {/* Debug Toggle */}
          <button
            type="button"
            onClick={() => setDebug(v => !v)}
            className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center shadow-lg hover:bg-gray-800 transition-colors text-white text-xs"
          >
            {debug ? "D" : "D"}
          </button>
        </div>
      </div>

      {/* Debug panel */}
      {debug && (
        <div className="mx-auto mt-3 max-w-[520px] rounded-xl border border-white/10 bg-neutral-950/60 p-3 text-xs text-white">
          <div className="mb-2 font-semibold">Debug Information</div>
          <div className="grid grid-cols-2 gap-3">
            <div>Camera:</div>
            <div>{cameraResolution.width}x{cameraResolution.height}</div>
            
            <div>Device Orientation:</div>
            <div>{deviceOrientation}°</div>
            
            <div>Beta (tilt):</div>
            <div>{accelData.beta.toFixed(1)}°</div>
            
            <div>Gamma (rotation):</div>
            <div>{accelData.gamma.toFixed(1)}°</div>
            
            <div>Permission:</div>
            <div>{permissionGranted ? "Granted" : "Not granted"}</div>
            
            <div>Facing:</div>
            <div>{facing}</div>
          </div>

          <div className="mt-4 mb-2 font-semibold">Tune frame placement</div>
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
          </div>
        </div>
      )}
    </div>
  );
}