// "use client";

// import React, { useEffect, useMemo, useRef, useState } from "react";

// // /**
// //  * ✅ NO frame image used.
// //  * ✅ Instagram mock frame is drawn by code (DOM for preview, Canvas for export).
// //  * ✅ Photo window is 4:5 (grey area) and rotated with the frame.
// //  * ✅ After capture, photo stays inside the same window (not full poster preview).
// //  * ✅ Download exports 1080x1920 (9:16).
// //  */

// // const ASSETS = {
// //   bg: "/assets/new11.jpg", // your orange poster background (optional; can remove)
// // };

// // const OUT = { W: 1080, H: 1920 };

// // // --- Tune these to place the IG frame on the poster ---
// // const FRAME = {
// //   cx: 540,
// //   cy: 960,
// //   w: 960,
// //   h: 1380,
// //   rotateDeg: -6,
// //   radius: 42, // slightly rounded
// //   insetScale: 1,
// // };

// // // --- IG internal layout (percent of frame box) ---
// // const IG = {
// //   padding: 0.04,
// //   headerH: 0.10,
// //   actionsH: 0.07, // icons row
// //   metaH: 0.10, // likes + caption
// // };

// // // ---------- helpers ----------
// // function loadImage(src) {
// //   return new Promise((resolve, reject) => {
// //     const im = new Image();
// //     im.crossOrigin = "anonymous";
// //     im.onload = () => resolve(im);
// //     im.onerror = reject;
// //     im.src = src;
// //   });
// // }

// // function drawCover(ctx, source, dx, dy, dw, dh) {
// //   const sw = source.width;
// //   const sh = source.height;
// //   const scale = Math.max(dw / sw, dh / sh);
// //   const w = sw * scale;
// //   const h = sh * scale;
// //   const x = dx + (dw - w) / 2;
// //   const y = dy + (dh - h) / 2;
// //   ctx.drawImage(source, x, y, w, h);
// // }

// // function drawCoverWithTransform(ctx, img, dx, dy, dw, dh) {
// //   const sw = img.width;
// //   const sh = img.height;
// //   const scale = Math.max(dw / sw, dh / sh);
// //   const w = sw * scale;
// //   const h = sh * scale;
// //   const x = dx + (dw - w) / 2;
// //   const y = dy + (dh - h) / 2;
// //   ctx.drawImage(img, x, y, w, h);
// //   return { scale, x, y, w, h };
// // }

// // function snapshotMirroredVideo(video) {
// //   const c = document.createElement("canvas");
// //   c.width = video.videoWidth;
// //   c.height = video.videoHeight;
// //   const ctx = c.getContext("2d");
// //   ctx.translate(c.width, 0);
// //   ctx.scale(-1, 1);
// //   ctx.drawImage(video, 0, 0);
// //   return c;
// // }

// // function roundRectPath(ctx, x, y, w, h, r) {
// //   const rr = Math.min(r, w / 2, h / 2);
// //   ctx.beginPath();
// //   ctx.moveTo(x + rr, y);
// //   ctx.arcTo(x + w, y, x + w, y + h, rr);
// //   ctx.arcTo(x + w, y + h, x, y + h, rr);
// //   ctx.arcTo(x, y + h, x, y, rr);
// //   ctx.arcTo(x, y, x + w, y, rr);
// //   ctx.closePath();
// // }

// // function drawIconHeart(ctx, x, y, s) {
// //   ctx.save();
// //   ctx.translate(x, y);
// //   ctx.scale(s, s);
// //   ctx.beginPath();
// //   ctx.moveTo(0, 0.35);
// //   ctx.bezierCurveTo(0, -0.05, -0.45, -0.05, -0.45, 0.25);
// //   ctx.bezierCurveTo(-0.45, 0.55, -0.2, 0.8, 0, 1);
// //   ctx.bezierCurveTo(0.2, 0.8, 0.45, 0.55, 0.45, 0.25);
// //   ctx.bezierCurveTo(0.45, -0.05, 0, -0.05, 0, 0.35);
// //   ctx.closePath();
// //   ctx.fill();
// //   ctx.restore();
// // }

// // function drawIconComment(ctx, x, y, r) {
// //   ctx.beginPath();
// //   ctx.arc(x, y, r, 0, Math.PI * 2);
// //   ctx.stroke();
// //   ctx.beginPath();
// //   ctx.moveTo(x - r * 0.3, y + r * 0.9);
// //   ctx.lineTo(x - r * 0.05, y + r * 0.55);
// //   ctx.stroke();
// // }

// // function drawIconSend(ctx, x, y, s) {
// //   ctx.beginPath();
// //   ctx.moveTo(x, y);
// //   ctx.lineTo(x + s, y + s * 0.35);
// //   ctx.lineTo(x + s * 0.45, y + s * 0.55);
// //   ctx.lineTo(x + s * 0.35, y + s);
// //   ctx.closePath();
// //   ctx.stroke();
// // }

// // function drawIconDots(ctx, x, y, r, gap) {
// //   for (let i = 0; i < 3; i++) {
// //     ctx.beginPath();
// //     ctx.arc(x, y + i * gap, r, 0, Math.PI * 2);
// //     ctx.fill();
// //   }
// // }

// // // Simple bookmark icon for canvas (stroke)
// // function drawIconBookmark(ctx, x, y, w, h) {
// //   ctx.beginPath();
// //   ctx.moveTo(x, y);
// //   ctx.lineTo(x + w, y);
// //   ctx.lineTo(x + w, y + h);
// //   ctx.lineTo(x + w / 2, y + h - 10);
// //   ctx.lineTo(x, y + h);
// //   ctx.closePath();
// //   ctx.stroke();
// // }

// // // ---------- main ----------
// // export default function InstaFrameNoImageCamera({ className = "" }) {
// //   const videoRef = useRef(null);
// //   const streamRef = useRef(null);

// //   const [bgImg, setBgImg] = useState(null);
// //   const [error, setError] = useState("");
// //   const [busy, setBusy] = useState(false);

// //   // preview in the grey window (only photo)
// //   const [capturedPhotoUrl, setCapturedPhotoUrl] = useState("");
// //   // full export for download
// //   const [exportUrl, setExportUrl] = useState("");

// //   const [debug, setDebug] = useState(false);
// //   const [frame, setFrame] = useState(FRAME);

// //   // Load background (optional)
// //   useEffect(() => {
// //     let mounted = true;
// //     (async () => {
// //       try {
// //         const img = await loadImage(ASSETS.bg);
// //         if (!mounted) return;
// //         setBgImg(img);
// //       } catch {
// //         setBgImg(null);
// //       }
// //     })();
// //     return () => (mounted = false);
// //   }, []);

// //   // Start camera
// //   useEffect(() => {
// //     let cancelled = false;
// //     async function start() {
// //       setError("");
// //       try {
// //         if (streamRef.current) {
// //           streamRef.current.getTracks().forEach((t) => t.stop());
// //           streamRef.current = null;
// //         }
// //         const stream = await navigator.mediaDevices.getUserMedia({
// //           video: {
// //             facingMode: "user",
// //             width: { ideal: 1080 },
// //             height: { ideal: 1920 },
// //           },
// //           audio: false,
// //         });
// //         if (cancelled) {
// //           stream.getTracks().forEach((t) => t.stop());
// //           return;
// //         }
// //         streamRef.current = stream;
// //         if (videoRef.current) {
// //           videoRef.current.srcObject = stream;
// //           await videoRef.current.play();
// //         }
// //       } catch (e) {
// //         setError(e?.message || "Could not access camera.");
// //       }
// //     }
// //     start();
// //     return () => {
// //       cancelled = true;
// //       if (streamRef.current) {
// //         streamRef.current.getTracks().forEach((t) => t.stop());
// //         streamRef.current = null;
// //       }
// //     };
// //   }, []);

// //   // Compute photo window inside the IG frame (4:5, centered between header and actions/meta)
// //   const photoWindowInFramePx = useMemo(() => {
// //     const pad = frame.w * IG.padding;
// //     const contentW = frame.w - pad * 2;

// //     const headerH = frame.h * IG.headerH;
// //     const actionsH = frame.h * IG.actionsH;
// //     const metaH = frame.h * IG.metaH;

// //     const contentH = frame.h - pad * 2 - headerH - actionsH - metaH;

// //     let photoW = contentW;
// //     let photoH = (photoW * 5) / 4;

// //     if (photoH > contentH) {
// //       photoH = contentH;
// //       photoW = (photoH * 4) / 5;
// //     }

// //     const x = pad + (contentW - photoW) / 2;
// //     const y = pad + headerH + (contentH - photoH) / 2;

// //     return { x, y, w: photoW, h: photoH, pad, headerH, actionsH, metaH };
// //   }, [frame]);

// //   // Capture: store photo-only for preview AND full export for download
// //   function capture() {
// //     if (!videoRef.current || busy) return;
// //     setBusy(true);
// //     setError("");

// //     try {
// //       const video = videoRef.current;
// //       if (!video.videoWidth || !video.videoHeight) throw new Error("Video not ready yet.");

// //       const snap = snapshotMirroredVideo(video);

// //       // 1) photo-only canvas (for window preview)
// //       const pw = Math.round(photoWindowInFramePx.w);
// //       const ph = Math.round(photoWindowInFramePx.h);
// //       const photoCanvas = document.createElement("canvas");
// //       photoCanvas.width = pw;
// //       photoCanvas.height = ph;
// //       const pctx = photoCanvas.getContext("2d");
// //       pctx.fillStyle = "#000";
// //       pctx.fillRect(0, 0, pw, ph);
// //       drawCover(pctx, snap, 0, 0, pw, ph);
// //       const photoUrl = photoCanvas.toDataURL("image/png");
// //       setCapturedPhotoUrl(photoUrl);

// //       // 2) full export canvas 1080x1920
// //       const out = document.createElement("canvas");
// //       out.width = OUT.W;
// //       out.height = OUT.H;
// //       const ctx = out.getContext("2d");

// //       // background
// //       if (bgImg) {
// //         drawCoverWithTransform(ctx, bgImg, 0, 0, OUT.W, OUT.H);
// //       } else {
// //         const g = ctx.createLinearGradient(0, 0, 0, OUT.H);
// //         g.addColorStop(0, "#ff4b2b");
// //         g.addColorStop(1, "#ffb347");
// //         ctx.fillStyle = g;
// //         ctx.fillRect(0, 0, OUT.W, OUT.H);
// //       }

// //       // draw tilted IG frame group
// //       ctx.save();
// //       ctx.translate(frame.cx, frame.cy);
// //       ctx.rotate((frame.rotateDeg * Math.PI) / 180);

// //       const left = -frame.w / 2;
// //       const top = -frame.h / 2;

// //       // shadow
// //       ctx.save();
// //       ctx.shadowColor = "rgba(0,0,0,0.28)";
// //       ctx.shadowBlur = 35;
// //       ctx.shadowOffsetY = 18;

// //       // card bg
// //       ctx.fillStyle = "#ffffff";
// //       roundRectPath(ctx, left, top, frame.w, frame.h, frame.radius);
// //       ctx.fill();

// //       // border like example (neutral-200)
// //      // border like example (neutral-200) - THINNER
// // ctx.shadowColor = "transparent";
// // ctx.strokeStyle = "rgba(229,231,235,0.75)";
// // ctx.lineWidth = 1.5;
// // roundRectPath(ctx, left + 0.75, top + 0.75, frame.w - 1.5, frame.h - 1.5, frame.radius);
// // ctx.stroke();


// //       ctx.restore();

// //       // ===== Header =====
// //       const pad = photoWindowInFramePx.pad;
// //       const headerH = photoWindowInFramePx.headerH;

// //       ctx.fillStyle = "#ffffff";
// //       ctx.fillRect(left + pad, top + pad, frame.w - pad * 2, headerH);

// //       // avatar
// //       const avR = Math.min(headerH * 0.28, 26);
// //       ctx.fillStyle = "#cfcfcf";
// //       ctx.beginPath();
// //       ctx.arc(left + pad + avR, top + pad + headerH / 2, avR, 0, Math.PI * 2);
// //       ctx.fill();

// //       // username
// //       ctx.fillStyle = "#111";
// //       ctx.font = "600 26px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
// //       ctx.textBaseline = "middle";
// //       ctx.fillText("DATO", left + pad + avR * 2 + 16, top + pad + headerH / 2);

// //       // 3 dots in header (right)
// //       ctx.fillStyle = "#6b7280";
// //       ctx.font = "700 28px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
// //       ctx.textAlign = "right";
// //       ctx.fillText("⋯", left + frame.w - pad, top + pad + headerH / 2 + 2);
// //       ctx.textAlign = "left";

// //       // ===== Photo area =====
// //       const phX = left + photoWindowInFramePx.x;
// //       const phY = top + photoWindowInFramePx.y;
// //       const phW = photoWindowInFramePx.w;
// //       const phH = photoWindowInFramePx.h;

// //       ctx.fillStyle = "#4c4c4c";
// //       ctx.fillRect(phX, phY, phW, phH);
// //       ctx.drawImage(photoCanvas, phX, phY, phW, phH);

// //       // ===== Actions row =====
// //       const actionsH = photoWindowInFramePx.actionsH;
// //       const metaH = photoWindowInFramePx.metaH;

// //       const actionsTop = top + frame.h - pad - (actionsH + metaH);
// //       ctx.fillStyle = "#ffffff";
// //       ctx.fillRect(left + pad, actionsTop, frame.w - pad * 2, actionsH);

// //       const iconY = actionsTop + actionsH / 2 + 8;
// //       ctx.lineWidth = 4;

// //       // heart
// //       ctx.fillStyle = "#ff2a55";
// //       drawIconHeart(ctx, left + pad + 50, iconY - 24, 28);

// //       // comment
// //       ctx.strokeStyle = "#111";
// //       drawIconComment(ctx, left + pad + 140, iconY - 14, 18);

// //       // send
// //       drawIconSend(ctx, left + pad + 205, iconY - 35, 44);

// //       // bookmark (right)
// //       ctx.strokeStyle = "#111";
// //       drawIconBookmark(ctx, left + frame.w - pad - 58, iconY - 30, 30, 40);

// //       // ===== Meta area (likes + caption + hashtags) =====
// //       const metaTop = actionsTop + actionsH;
// //       ctx.fillStyle = "#ffffff";
// //       ctx.fillRect(left + pad, metaTop, frame.w - pad * 2, metaH);

// //       ctx.textAlign = "left";
// //       ctx.textBaseline = "top";

// //       // likes
// //       ctx.fillStyle = "#111";
// //       ctx.font = "600 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
// //       ctx.fillText("100k likes", left + pad, metaTop + 12);

// //       // caption + hashtags
// //       ctx.font = "600 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
// //       ctx.fillStyle = "#111";
// //       ctx.fillText("SLIIT Pongal", left + pad, metaTop + 54);

// //       ctx.font = "600 28px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
// //       ctx.fillStyle = "#3b82f6";
// //       ctx.fillText("#Dattreo #sliit pongal", left + pad + 300, metaTop + 58);

// //       ctx.restore(); // group
// //       ctx.restore();

// //       setExportUrl(out.toDataURL("image/png"));
// //     } catch (e) {
// //       setError(e?.message || String(e));
// //     } finally {
// //       setBusy(false);
// //     }
// //   }

// //   function download() {
// //     if (!exportUrl) return;
// //     const a = document.createElement("a");
// //     a.href = exportUrl;
// //     a.download = `insta_mock_${Date.now()}.png`;
// //     document.body.appendChild(a);
// //     a.click();
// //     a.remove();
// //   }

// //   // LIVE DOM layout (%)
// //   const framePct = useMemo(() => {
// //     return {
// //       cx: (frame.cx / OUT.W) * 100,
// //       cy: (frame.cy / OUT.H) * 100,
// //       w: (frame.w / OUT.W) * 100,
// //       h: (frame.h / OUT.H) * 100,
// //       rot: frame.rotateDeg,
// //     };
// //   }, [frame]);

// //   const photoPctInFrame = useMemo(() => {
// //     return {
// //       x: (photoWindowInFramePx.x / frame.w) * 100,
// //       y: (photoWindowInFramePx.y / frame.h) * 100,
// //       w: (photoWindowInFramePx.w / frame.w) * 100,
// //       h: (photoWindowInFramePx.h / frame.h) * 100,
// //     };
// //   }, [photoWindowInFramePx, frame.w, frame.h]);

// //   // Percent helper for actions/meta placement in DOM
// //   const actionsMetaPct = useMemo(() => {
// //     const padPx = photoWindowInFramePx.pad;
// //     const actionsHPx = photoWindowInFramePx.actionsH;
// //     const metaHPx = photoWindowInFramePx.metaH;

// //     const actionsTopPx = frame.h - padPx - (actionsHPx + metaHPx);
// //     const metaTopPx = actionsTopPx + actionsHPx;

// //     return {
// //       pad: (padPx / frame.w) * 100,
// //       actionsTop: (actionsTopPx / frame.h) * 100,
// //       actionsH: (actionsHPx / frame.h) * 100,
// //       metaTop: (metaTopPx / frame.h) * 100,
// //       metaH: (metaHPx / frame.h) * 100,
// //     };
// //   }, [photoWindowInFramePx, frame.h, frame.w]);

// //   return (
// //     <div className={`w-full ${className}`}>
// //       <div className="relative mx-auto w-full max-w-[420px] sm:max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl aspect-[9/16]">
// //         {/* BG */}
// //         {bgImg ? (
// //           <img src={ASSETS.bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
// //         ) : (
// //           <div className="absolute inset-0 bg-gradient-to-b from-orange-500 to-yellow-400" />
// //         )}

// //         {/* Tilted IG frame (DOM) */}
// //         <div
// //           className="absolute"
// //           style={{
// //             left: `${framePct.cx}%`,
// //             top: `${framePct.cy}%`,
// //             width: `${framePct.w}%`,
// //             height: `${framePct.h}%`,
// //             transform: `translate(-50%, -50%) rotate(${framePct.rot}deg)`,
// //             filter: "drop-shadow(0px 18px 35px rgba(0,0,0,0.28))",
// //           }}
// //         >
// //           {/* Card */}
// //           <div className="absolute inset-0 rounded-[44px] bg-white border border-neutral-200/50 overflow-hidden">
// //           {/* Header */}
// //             <div className="absolute left-[6%] right-[6%]" style={{ top: "5.5%", height: `${IG.headerH * 100}%` }}>
// //               <div className="flex h-full items-center gap-3">
// //                 <div className="h-10 w-10 rounded-full bg-neutral-300 shrink-0" />
// //                 <div className="flex items-center gap-2 min-w-0">
// //                   <div className="text-[18px] font-semibold text-neutral-900 truncate">DATO</div>
// //                   <div className="h-[18px] w-[18px] rounded-full bg-sky-500 grid place-items-center text-[12px] text-white leading-none">
// //                     ✓
// //                   </div>
// //                 </div>
// //                 <div className="ml-auto text-neutral-500 text-[22px] leading-none">⋯</div>
// //               </div>
// //             </div>

// //             {/* PHOTO WINDOW (4:5) */}
// //             <div
// //               className="absolute bg-[#4c4c4c] overflow-hidden"
// //               style={{
// //                 left: `${photoPctInFrame.x}%`,
// //                 top: `${photoPctInFrame.y}%`,
// //                 width: `${photoPctInFrame.w}%`,
// //                 height: `${photoPctInFrame.h}%`,
// //               }}
// //             >
// //               {!capturedPhotoUrl ? (
// //                 <video
// //                   ref={videoRef}
// //                   className="h-full w-full object-cover"
// //                   style={{ transform: "scaleX(-1)" }}
// //                   playsInline
// //                   muted
// //                   autoPlay
// //                 />
// //               ) : (
// //                 <img src={capturedPhotoUrl} className="h-full w-full object-cover" alt="Captured" />
// //               )}
// //             </div>

// //             {/* Actions row */}
// //             <div
// //               className="absolute left-[6%] right-[6%] flex items-center"
// //               style={{ top: `${actionsMetaPct.actionsTop}%`, height: `${IG.actionsH * 100}%` }}
// //             >
// //               <div className="flex items-center gap-5 text-neutral-900">
// //                 <div className="text-[26px] leading-none text-pink-600">♥</div>
// //                 <div className="text-[22px]">💬</div>
// //                 <div className="text-[22px]">✈️</div>
// //               </div>
// //               <div className="ml-auto text-[22px] text-neutral-900">🔖</div>
// //             </div>

// //             {/* Meta */}
// //             <div className="absolute left-[6%] right-[6%]" style={{ top: `${actionsMetaPct.metaTop}%`, height: `${IG.metaH * 100}%` }}>
// //               <div className="text-[22px] font-medium text-neutral-900">100k likes</div>
// //               <div className="mt-1 text-[22px] text-neutral-900">
// //                 <span className="font-semibold">SLIIT Pongal</span>
// //                 <span className="text-sky-500"> {"  "}#Dattreo #sliit pongal</span>
// //               </div>
// //             </div>

// //             {/* Debug outline for photo window */}
// //             {debug ? (
// //               <div
// //                 className="absolute border-2 border-lime-400/90 pointer-events-none"
// //                 style={{
// //                   left: `${photoPctInFrame.x}%`,
// //                   top: `${photoPctInFrame.y}%`,
// //                   width: `${photoPctInFrame.w}%`,
// //                   height: `${photoPctInFrame.h}%`,
// //                 }}
// //               />
// //             ) : null}
// //           </div>
// //         </div>

// //         {/* Error */}
// //         {error ? (
// //           <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center">
// //             <div className="max-w-xs rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200 whitespace-pre-wrap">
// //               {error}
// //             </div>
// //           </div>
// //         ) : null}

// //         {/* Controls */}
// //         <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3 px-4">
// //           <button
// //             type="button"
// //             onClick={capture}
// //             disabled={busy}
// //             className="h-14 w-14 rounded-full border-4 border-white/80 bg-white shadow-xl disabled:opacity-70"
// //             title="Capture"
// //           />
// //           <button
// //             type="button"
// //             onClick={download}
// //             disabled={!exportUrl}
// //             className="rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-60"
// //           >
// //             Download
// //           </button>
// //           <button
// //             type="button"
// //             onClick={() => {
// //               setCapturedPhotoUrl("");
// //               setExportUrl("");
// //             }}
// //             disabled={!capturedPhotoUrl}
// //             className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
// //           >
// //             Retake
// //           </button>
// //           <button
// //             type="button"
// //             onClick={() => setDebug((v) => !v)}
// //             className="rounded-xl bg-black/60 px-3 py-2 text-sm font-semibold text-white"
// //           >
// //             {debug ? "Hide Tune" : "Tune"}
// //           </button>
// //         </div>
// //       </div>

// //       {/* Tune panel */}
// //       {debug ? (
// //         <div className="mx-auto mt-3 max-w-[420px] sm:max-w-[520px] rounded-xl border border-white/10 bg-neutral-950/60 p-3 text-xs text-white">
// //           <div className="mb-2 font-semibold">Tune IG Frame Position (OUTPUT 1080x1920)</div>
// //           <div className="grid grid-cols-2 gap-3">
// //             <label className="flex flex-col gap-1">
// //               cx: {Math.round(frame.cx)}
// //               <input
// //                 type="range"
// //                 min="0"
// //                 max={OUT.W}
// //                 value={frame.cx}
// //                 onChange={(e) => setFrame((p) => ({ ...p, cx: +e.target.value }))}
// //               />
// //             </label>
// //             <label className="flex flex-col gap-1">
// //               cy: {Math.round(frame.cy)}
// //               <input
// //                 type="range"
// //                 min="0"
// //                 max={OUT.H}
// //                 value={frame.cy}
// //                 onChange={(e) => setFrame((p) => ({ ...p, cy: +e.target.value }))}
// //               />
// //             </label>
// //             <label className="flex flex-col gap-1">
// //               w: {Math.round(frame.w)}
// //               <input
// //                 type="range"
// //                 min="400"
// //                 max={OUT.W}
// //                 value={frame.w}
// //                 onChange={(e) => setFrame((p) => ({ ...p, w: +e.target.value }))}
// //               />
// //             </label>
// //             <label className="flex flex-col gap-1">
// //               h: {Math.round(frame.h)}
// //               <input
// //                 type="range"
// //                 min="500"
// //                 max={OUT.H}
// //                 value={frame.h}
// //                 onChange={(e) => setFrame((p) => ({ ...p, h: +e.target.value }))}
// //               />
// //             </label>
// //             <label className="flex flex-col gap-1">
// //               rotate: {frame.rotateDeg.toFixed(2)}°
// //               <input
// //                 type="range"
// //                 min="-25"
// //                 max="25"
// //                 step="0.1"
// //                 value={frame.rotateDeg}
// //                 onChange={(e) => setFrame((p) => ({ ...p, rotateDeg: +e.target.value }))}
// //               />
// //             </label>
// //             <label className="flex flex-col gap-1">
// //               radius: {Math.round(frame.radius)}
// //               <input
// //                 type="range"
// //                 min="10"
// //                 max="80"
// //                 value={frame.radius}
// //                 onChange={(e) => setFrame((p) => ({ ...p, radius: +e.target.value }))}
// //               />
// //             </label>
// //           </div>
// //           <div className="mt-2 text-[11px] text-white/70">
// //             When it looks perfect, copy the final <code>FRAME</code> values and remove the Tune UI.
// //           </div>
// //         </div>
// //       ) : null}
// //     </div>
// //   );
// // }
// // -----------------------------------------------------------------------------
// // Instagram frame (code-drawn) with background photo window
// // -----------------------------------------------------------------------------

// const ASSETS = {
//   bg: "/assets/newframe.png", // optional poster bg (can remove)
// };

// const OUT = { W: 1080, H: 1920 };

// /**
//  * Position/size of the whole frame on the poster output (1080x1920)
//  * Keep rotateDeg = 0 to match the sample image (straight).
//  */
// const FRAME = {
//   cx: 540,
//   cy: 960,
//   w: 980,
//   h: 1500,
//   rotateDeg: 0,
// };

// /**
//  * ✅ The orange "photo window" inside the PNG frame.
//  * These are PERCENTAGES of the frame image box.
//  *
//  * If it’s slightly off on your side, tweak these 4 values a bit.
//  */
// const WINDOW = {
//   xPct: 0.03, // left
//   yPct: 0.056, // top (moved up to fit taller camera view)
//   wPct: 0.92, // width (leaves right margin so window stays inside frame)
//   hPct: 0.75, // height tuned so cropped photo is 4:5 and large enough
//   rPct: 0, // corner radius relative to frame width
// };

// // ---------- helpers ----------
// function loadImage(src) {
//   return new Promise((resolve, reject) => {
//     const im = new Image();
//     im.crossOrigin = "anonymous";
//     im.onload = () => resolve(im);
//     im.onerror = reject;
//     im.src = src;
//   });
// }

// function drawCover(ctx, source, dx, dy, dw, dh) {
//   const sw = source.width;
//   const sh = source.height;
//   const scale = Math.max(dw / sw, dh / sh);
//   const w = sw * scale;
//   const h = sh * scale;
//   const x = dx + (dw - w) / 2;
//   const y = dy + (dh - h) / 2;
//   ctx.drawImage(source, x, y, w, h);
// }


// function snapshotMirroredVideo(video, orientationDeg = 0, mirror = true) {
//   // Grab the raw frame
//   const base = document.createElement("canvas");
//   base.width = video.videoWidth;
//   base.height = video.videoHeight;
//   const bctx = base.getContext("2d");

//   // Mirror only for front camera to match typical selfie preview
//   if (mirror) {
//     bctx.translate(base.width, 0);
//     bctx.scale(-1, 1);
//   }
//   bctx.drawImage(video, 0, 0);

//   // If already portrait, return as-is
//   if (base.height >= base.width) return base;

//   // Rotate landscape frames to portrait so saved/exported photos stay upright.
//   // Direction follows device orientation (90 or -90) to avoid sideways output.
//   const rotated = document.createElement("canvas");
//   rotated.width = base.height;
//   rotated.height = base.width;
//   const rctx = rotated.getContext("2d");
//   const rotateRad =
//     Math.abs(orientationDeg) === 90
//       ? orientationDeg > 0
//         ? Math.PI / 2
//         : -Math.PI / 2
//       : Math.PI / 2;
//   rctx.translate(rotated.width / 2, rotated.height / 2);
//   rctx.rotate(rotateRad);
//   rctx.drawImage(base, -base.width / 2, -base.height / 2);
//   return rotated;
// }

// function roundRectPath(ctx, x, y, w, h, r) {
//   const rr = Math.min(r, w / 2, h / 2);
//   ctx.beginPath();
//   ctx.moveTo(x + rr, y);
//   ctx.arcTo(x + w, y, x + w, y + h, rr);
//   ctx.arcTo(x + w, y + h, x, y + h, rr);
//   ctx.arcTo(x, y + h, x, y, rr);
//   ctx.arcTo(x, y, x + w, y, rr);
//   ctx.closePath();
// }

// function triggerDownload(url, prefix) {
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = `${prefix}_${Date.now()}.png`;
//   document.body.appendChild(a);
//   a.click();
//   a.remove();
// }

// export default function InstaFrameCameraImage({ className = "" }) {
//   const videoRef = useRef(null);
//   const streamRef = useRef(null);

//   const [facing, setFacing] = useState("user");
//   const [bgImg, setBgImg] = useState(null);

//   const [error, setError] = useState("");
//   const [busy, setBusy] = useState(false);

//   const [capturedPhotoUrl, setCapturedPhotoUrl] = useState("");
//   const [exportUrl, setExportUrl] = useState("");

//   const [debug, setDebug] = useState(false);
//   const [frame, setFrame] = useState(FRAME);
//   const [orientationDeg, setOrientationDeg] = useState(0);

//   // Load background (optional)
//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       try {
//         const bg = await loadImage(ASSETS.bg).catch(() => null);
//         if (!mounted) return;
//         setBgImg(bg);
//       } catch (e) {
//         setError("Could not load background image.");
//       }
//     })();
//     return () => {
//       mounted = false;
//     };
//   }, []);

//   // Start camera
//   useEffect(() => {
//     let cancelled = false;
//     async function start() {
//       setError("");
//       try {
//         if (streamRef.current) {
//           streamRef.current.getTracks().forEach((t) => t.stop());
//           streamRef.current = null;
//         }
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: {
//             facingMode: facing,
//             width: { ideal: 1080 },
//             height: { ideal: 1920 },
//             aspectRatio: { ideal: 9 / 16 },
//           },
//           audio: false,
//         });

//         if (cancelled) {
//           stream.getTracks().forEach((t) => t.stop());
//           return;
//         }

//         streamRef.current = stream;
//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
//           await videoRef.current.play();
//         }
//       } catch (e) {
//         setError(e?.message || "Could not access camera.");
//       }
//     }

//     start();
//     return () => {
//       cancelled = true;
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((t) => t.stop());
//         streamRef.current = null;
//       }
//     };
//   }, [facing]);

//   // Track device orientation using screen orientation (stable; avoids over-rotation)
//   useEffect(() => {
//     if (typeof window === "undefined") return;

//     const normalize = (angle) => {
//       if (angle === 270) angle = -90;
//       if (angle === 180 || angle === -180) angle = 180;
//       return angle;
//     };

//     const update = () => {
//       let angle = 0;
//       if (window.screen?.orientation && typeof window.screen.orientation.angle === "number") {
//         angle = window.screen.orientation.angle;
//       } else if (typeof window.orientation === "number") {
//         angle = window.orientation;
//       } else if (window.innerWidth > window.innerHeight) {
//         angle = 90;
//       }
//       setOrientationDeg(normalize(angle));
//     };

//     update();
//     window.screen?.orientation?.addEventListener?.("change", update);
//     window.addEventListener("orientationchange", update);
//     window.addEventListener("resize", update);

//     return () => {
//       window.screen?.orientation?.removeEventListener?.("change", update);
//       window.removeEventListener("orientationchange", update);
//       window.removeEventListener("resize", update);
//     };
//   }, []);

//   // Window inside the frame in PX (relative to the frame box)
//   const windowPx = useMemo(() => {
//     const x = frame.w * WINDOW.xPct;
//     const y = frame.h * WINDOW.yPct;
//     const w = frame.w * WINDOW.wPct;
//     const h = frame.h * WINDOW.hPct;
//     const r = frame.w * WINDOW.rPct;
//     return { x, y, w, h, r };
//   }, [frame.w, frame.h]);

//   // Only apply rotation when in a landscape orientation
//   const landscapeAngle = useMemo(() => {
//     return Math.abs(orientationDeg) === 90 || Math.abs(orientationDeg) === 270 ? orientationDeg : 0;
//   }, [orientationDeg]);

//   const previewRotate = useMemo(() => {
//     const vid = videoRef.current;
//     if (!vid || !vid.videoWidth || !vid.videoHeight) return 0;
//     return vid.videoWidth > vid.videoHeight ? landscapeAngle : 0;
//   }, [landscapeAngle]);

//   // Capture: photo-only preview + full export
//   async function capture() {
//     if (!videoRef.current || busy) return;
//     setBusy(true);
//     setError("");

//     try {
//       const video = videoRef.current;
//       if (!video.videoWidth || !video.videoHeight) {
//         throw new Error("Video not ready yet.");
//       }

//       const rotateForCapture = video.videoWidth > video.videoHeight ? landscapeAngle : 0;

//       // mirrored snapshot
//       const snap = snapshotMirroredVideo(video, rotateForCapture, facing === "user");

//       // 1) photo-only for preview (exact window size)
//       const pw = 1080;
//       const ph = 1350; // target 4:5 capture
//       const photoCanvas = document.createElement("canvas");
//       photoCanvas.width = pw;
//       photoCanvas.height = ph;
//       const pctx = photoCanvas.getContext("2d");

//       pctx.fillStyle = "#000";
//       pctx.fillRect(0, 0, pw, ph);
//       drawCover(pctx, snap, 0, 0, pw, ph);

//       const photoUrl = photoCanvas.toDataURL("image/png");
//       setCapturedPhotoUrl(photoUrl);

//       // 2) full export 1080x1920
//       const out = document.createElement("canvas");
//       out.width = OUT.W;
//       out.height = OUT.H;
//       const ctx = out.getContext("2d");

//       // background
//       if (bgImg) {
//       drawCover(ctx, bgImg, 0, 0, OUT.W, OUT.H);
//       } else {
//         const g = ctx.createLinearGradient(0, 0, 0, OUT.H);
//         g.addColorStop(0, "#ff7a18");
//         g.addColorStop(1, "#ffb347");
//         ctx.fillStyle = g;
//         ctx.fillRect(0, 0, OUT.W, OUT.H);
//       }

//       // draw frame group (photo clipped inside the window, then code-drawn frame on top)
//       ctx.save();
//       ctx.translate(frame.cx, frame.cy);
//       ctx.rotate((frame.rotateDeg * Math.PI) / 180);

//       const left = -frame.w / 2;
//       const top = -frame.h / 2;

//       // --- draw photo in the orange window area (clip to rounded rect) ---
//       const wx = left + windowPx.x;
//       const wy = top + windowPx.y;
//       const ww = windowPx.w;
//       const wh = windowPx.h;

//       ctx.save();
//       roundRectPath(ctx, wx, wy, ww, wh, windowPx.r);
//       ctx.clip();
//       ctx.fillStyle = "#000";
//       ctx.fillRect(wx, wy, ww, wh);
//       drawCover(ctx, snap, wx, wy, ww, wh);
//       ctx.restore();

//       ctx.restore();

//       setExportUrl(out.toDataURL("image/png"));
//     } catch (e) {
//       setError(e?.message || String(e));
//     } finally {
//       setBusy(false);
//     }
//   }

//   function download() {
//     if (!exportUrl) return;
//     triggerDownload(exportUrl, "insta_frame");
//   }

//   function retake() {
//     setCapturedPhotoUrl("");
//     setExportUrl("");
//   }

//   // Auto-save immediately after capture
//   useEffect(() => {
//     if (exportUrl) {
//       triggerDownload(exportUrl, "insta_frame");
//     }
//   }, [exportUrl]);

//   // DOM percentages for positioning frame on preview (9:16 box)
//   const framePct = useMemo(() => {
//     return {
//       cx: (frame.cx / OUT.W) * 100,
//       cy: (frame.cy / OUT.H) * 100,
//       w: (frame.w / OUT.W) * 100,
//       h: (frame.h / OUT.H) * 100,
//       rot: frame.rotateDeg,
//     };
//   }, [frame]);

//   // DOM window placement INSIDE frame box (percent)
//   const winPct = useMemo(() => {
//     return {
//       left: WINDOW.xPct * 100,
//       top: WINDOW.yPct * 100,
//       width: WINDOW.wPct * 100,
//       height: WINDOW.hPct * 100,
//       radius: WINDOW.rPct * 100, // used as % of frame width in CSS below
//     };
//   }, []);

//   return (
//     <div className={`w-full ${className}`}>
//       <div className="relative mx-auto w-full max-w-[420px] sm:max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl aspect-[9/16]">
//         {/* BG */}
//         {bgImg ? (
//           <img src={ASSETS.bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
//         ) : (
//           <div className="absolute inset-0 bg-gradient-to-b from-orange-500 to-yellow-400" />
//         )}

//         {/* Frame group */}
//         <div
//           className="absolute"
//           style={{
//             left: `${framePct.cx}%`,
//             top: `${framePct.cy}%`,
//             width: `${framePct.w}%`,
//             height: `${framePct.h}%`,
//             transform: `translate(-50%, -50%) rotate(${framePct.rot}deg)`,
//             filter: "drop-shadow(0px 18px 35px rgba(0,0,0,0.28))",
//           }}
//         >
//           {/* Camera window (behind the frame image) */}
//           <div
//             className="absolute overflow-hidden"
//             style={{
//               left: `${winPct.left}%`,
//               top: `${winPct.top}%`,
//               width: `${winPct.width}%`,
//               height: `${winPct.height}%`,
//               borderRadius: `${winPct.radius}%`,
//             }}
//           >
//             {!capturedPhotoUrl ? (
//               <video
//                 ref={videoRef}
//                 className="h-full w-full object-cover"
//                 style={{
//                   // Mirror only on front camera, then rotate to match device orientation without flipping upside-down
//                   transform: `${facing === "user" ? "scaleX(-1) " : ""}rotate(${previewRotate}deg)`,
//                   transformOrigin: "center",
//                 }}
//                 playsInline
//                 muted
//                 autoPlay
//               />
//             ) : (
//               <img src={capturedPhotoUrl} className="h-full w-full object-cover" alt="Captured" />
//             )}

//             {/* debug outline */}
//             {debug ? (
//               <div className="absolute inset-0 border-4 border-lime-400/90 pointer-events-none" />
//             ) : null}
//           </div>

//         </div>

//         {/* Error */}
//         {error ? (
//           <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center">
//             <div className="max-w-xs rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200 whitespace-pre-wrap">
//               {error}
//             </div>
//           </div>
//         ) : null}

//         {/* Controls */}
//         <div className="absolute bottom-3 left-0 right-0 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-3 px-3">
//           <button
//             type="button"
//             onClick={capture}
//             disabled={busy}
//             className="h-14 w-14 rounded-full border-4 border-white/80 bg-white shadow-xl disabled:opacity-70"
//             title="Capture"
//           />
//           <button
//             type="button"
//             onClick={() => setFacing((v) => (v === "user" ? "environment" : "user"))}
//             className="rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-neutral-900"
//             title="Flip camera"
//           >
//             Flip
//           </button>
//           <button
//             type="button"
//             onClick={download}
//             disabled={!exportUrl}
//             className="rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-60"
//           >
//             Download
//           </button>
//           <button
//             type="button"
//             onClick={retake}
//             disabled={!capturedPhotoUrl}
//             className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
//           >
//             Retake
//           </button>
//         </div>
//       </div>

//       {/* Quick tune (optional) */}
//       {debug ? (
//         <div className="mx-auto mt-3 max-w-[520px] rounded-xl border border-white/10 bg-neutral-950/60 p-3 text-xs text-white">
//           <div className="mb-2 font-semibold">Tune frame placement (OUTPUT 1080x1920)</div>
//           <div className="grid grid-cols-2 gap-3">
//             <label className="flex flex-col gap-1">
//               cx: {Math.round(frame.cx)}
//               <input
//                 type="range"
//                 min="0"
//                 max={OUT.W}
//                 value={frame.cx}
//                 onChange={(e) => setFrame((p) => ({ ...p, cx: +e.target.value }))}
//               />
//             </label>
//             <label className="flex flex-col gap-1">
//               cy: {Math.round(frame.cy)}
//               <input
//                 type="range"
//                 min="0"
//                 max={OUT.H}
//                 value={frame.cy}
//                 onChange={(e) => setFrame((p) => ({ ...p, cy: +e.target.value }))}
//               />
//             </label>
//             <label className="flex flex-col gap-1">
//               w: {Math.round(frame.w)}
//               <input
//                 type="range"
//                 min="600"
//                 max={OUT.W}
//                 value={frame.w}
//                 onChange={(e) => setFrame((p) => ({ ...p, w: +e.target.value }))}
//               />
//             </label>
//             <label className="flex flex-col gap-1">
//               h: {Math.round(frame.h)}
//               <input
//                 type="range"
//                 min="900"
//                 max={OUT.H}
//                 value={frame.h}
//                 onChange={(e) => setFrame((p) => ({ ...p, h: +e.target.value }))}
//               />
//             </label>
//             <label className="flex flex-col gap-1">
//               rotate: {frame.rotateDeg.toFixed(1)}°
//               <input
//                 type="range"
//                 min="-15"
//                 max="15"
//                 step="0.1"
//                 value={frame.rotateDeg}
//                 onChange={(e) => setFrame((p) => ({ ...p, rotateDeg: +e.target.value }))}
//               />
//             </label>
//           </div>

//           <div className="mt-2 text-[11px] text-white/70">
//             If the camera doesn’t perfectly fill the orange window, tweak <code>WINDOW</code> (xPct, yPct, wPct, hPct).
//           </div>
//         </div>
//       ) : null}
//     </div>
//   );
// }


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

// Improved device orientation calculation
function calculateDeviceOrientation(beta, gamma) {
  // beta: front-to-back tilt (portrait: ~0, face up: 90, face down: -90)
  // gamma: left-to-right tilt (left: -90, right: 90)
  
  if (beta === null || gamma === null) return 0;
  
  const absBeta = Math.abs(beta);
  const absGamma = Math.abs(gamma);
  
  // Determine orientation based on tilt angles
  // For typical phone usage:
  // - Portrait upright: beta ~0, gamma ~0
  // - Portrait upside-down: beta ~0, gamma ~0 but screen upside down
  // - Landscape left: phone rotated 90° clockwise from portrait
  // - Landscape right: phone rotated 90° counter-clockwise from portrait
  
  // Check if phone is in portrait or landscape based on tilt
  if (absBeta < 45 && absGamma < 45) {
    // Phone is mostly upright
    return 0; // Portrait
  }
  
  // Check for landscape orientations
  if (absGamma > 45) {
    // Significant left/right tilt indicates landscape
    if (gamma > 0) {
      return 90; // Landscape left (phone rotated right)
    } else {
      return -90; // Landscape right (phone rotated left)
    }
  }
  
  // Check for upside down portrait
  if (absBeta > 135) {
    return 180; // Upside down
  }
  
  return 0;
}

// Get rotation needed for captured image based on device orientation
function getRotationForCapturedImage(deviceOrientation) {
  switch (deviceOrientation) {
    case 0: // Portrait upright
      return 0; // No rotation needed
    case 90: // Landscape left (phone rotated right)
      return -90; // Rotate image left to make portrait
    case -90: // Landscape right (phone rotated left)
      return 90; // Rotate image right to make portrait
    case 180: // Portrait upside down
      return 180; // Rotate 180 degrees
    default:
      return 0;
  }
}

// Rotate canvas by specified angle
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

  // Check and setup device orientation with permission handling
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOrientation = (event) => {
      const { beta, gamma } = event;
      const angle = calculateDeviceOrientation(beta, gamma);
      
      setDeviceOrientation({
        beta: beta || 0,
        gamma: gamma || 0,
        angle
      });
    };

    // Check if DeviceOrientationEvent is supported
    const checkSupport = async () => {
      if (typeof DeviceOrientationEvent !== 'undefined') {
        // iOS 13+ requires permission
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          try {
            const permissionState = await DeviceOrientationEvent.requestPermission();
            if (permissionState === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
              setIsDeviceOrientationSupported(true);
            } else {
              setIsDeviceOrientationSupported(false);
              console.warn('Device orientation permission denied');
            }
          } catch (error) {
            console.error('Error requesting device orientation permission:', error);
            setIsDeviceOrientationSupported(false);
          }
        } else if ('ondeviceorientation' in window) {
          // Non-iOS devices or older iOS
          window.addEventListener('deviceorientation', handleOrientation);
          setIsDeviceOrientationSupported(true);
        } else {
          setIsDeviceOrientationSupported(false);
        }
      } else {
        setIsDeviceOrientationSupported(false);
      }
    };

    checkSupport();

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
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
      
      // 2. Get the rotation needed based on device orientation
      const rotationNeeded = getRotationForCapturedImage(deviceOrientation.angle);
      
      // 3. Apply rotation if needed
      let finalSnapshot = rawSnapshot;
      if (rotationNeeded !== 0) {
        finalSnapshot = rotateCanvas(rawSnapshot, rotationNeeded);
      }
      
      // 4. Create photo-only canvas for preview (4:5 ratio)
      const photoCanvas = document.createElement("canvas");
      const targetAspect = 4/5;
      
      // Calculate dimensions to maintain 4:5 aspect ratio
      let targetWidth, targetHeight;
      if (finalSnapshot.width / finalSnapshot.height > targetAspect) {
        // Image is wider than 4:5, fit to height
        targetHeight = 1350;
        targetWidth = Math.round(targetHeight * targetAspect);
      } else {
        // Image is taller than 4:5, fit to width
        targetWidth = 1080;
        targetHeight = Math.round(targetWidth / targetAspect);
      }
      
      photoCanvas.width = targetWidth;
      photoCanvas.height = targetHeight;
      const pctx = photoCanvas.getContext("2d");
      
      pctx.fillStyle = "#000";
      pctx.fillRect(0, 0, photoCanvas.width, photoCanvas.height);
      drawCover(pctx, finalSnapshot, 0, 0, photoCanvas.width, photoCanvas.height);
      
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

  // Helper function to request orientation permission manually
  const requestOrientationPermission = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceOrientationEvent.requestPermission();
        if (permissionState === 'granted') {
          window.location.reload(); // Reload to activate orientation detection
        }
      } catch (error) {
        console.error('Error requesting permission:', error);
      }
    }
  };

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
        {debug && (
          <div className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded text-xs">
            <div>Orientation: {deviceOrientation.angle}°</div>
            <div>β: {deviceOrientation.beta?.toFixed(1) || 'N/A'}</div>
            <div>γ: {deviceOrientation.gamma?.toFixed(1) || 'N/A'}</div>
            <div>Supported: {isDeviceOrientationSupported ? 'Yes' : 'No'}</div>
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
            {deviceOrientation.angle !== 0 && ` (Current: ${deviceOrientation.angle}°)`}
          </div>
        </div>
      ) : null}
    </div>
  );
}