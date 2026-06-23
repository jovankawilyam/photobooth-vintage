/* ================= FRAME CONFIG ================= */
const FRAME_CONFIG = {
  hole: {
    x: 65,
    y: 790,
    width: 943,
    height: 779
  }
};
const MAX_STORED_PHOTO_EDGE = 640;
const GIF_DURATION = 5000;
const GIF_FRAMES = 12;
const ANIMATION_FRAME_INTERVAL = 150;
const UNMIRROR_CAMERA = true;
const PHOTO_EFFECTS = {
  normal: "none",
  monochrome: "grayscale(100%)",
  sepia: "sepia(85%) contrast(1.06)",
  warm: "sepia(28%) saturate(1.3) contrast(1.04)",
  contrast: "contrast(1.35) saturate(0.9)"
};

/* ================= CAMERA ================= */
const video = document.getElementById("video");
const canvas = document.getElementById("captureCanvas");
const ctx = canvas?.getContext("2d");
const countdownEl = document.getElementById("countdown");
const cameraStatus = document.getElementById("cameraStatus");
const takePhotoBtn = document.getElementById("takePhoto");
const photoEffect = document.getElementById("photoEffect");
let activeStream;
let isCountingDown = false;

function setStatus(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function getPhotoFilter() {
  return PHOTO_EFFECTS[photoEffect?.value] || PHOTO_EFFECTS.normal;
}

function updatePhotoPreview() {
  if (video) {
    video.style.filter = getPhotoFilter();
    video.style.transform = UNMIRROR_CAMERA ? "scaleX(-1)" : "none";
  }
}

photoEffect?.addEventListener("change", updatePhotoPreview);
updatePhotoPreview();

async function initCamera() {
  if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
    setStatus(
      cameraStatus,
      "Kamera memerlukan akses HTTPS atau localhost. Kamu tetap bisa upload foto.",
      true
    );
    return;
  }

  try {
    activeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });
    video.srcObject = activeStream;
    await video.play();

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      takePhotoBtn.disabled = false;
      setStatus(cameraStatus, "Kamera siap. Ambil satu foto atau upload dari perangkat.");
    }
  } catch (error) {
    setStatus(
      cameraStatus,
      "Kamera tidak dapat diakses. Izinkan kamera atau gunakan upload foto.",
      true
    );
  }
}

if (video) {
  initCamera();
  window.addEventListener("pagehide", () => {
    activeStream?.getTracks().forEach(track => track.stop());
  });
}

/* ================= TIMER ================= */
function getTimer() {
  const timer = Number(document.querySelector("input[name=timer]:checked")?.value);
  return Number.isFinite(timer) && timer >= 0 ? timer : 3;
}

function startCountdown(sec, cb) {
  if (sec === 0) {
    cb();
    return;
  }

  let t = sec;
  countdownEl.textContent = t;
  countdownEl.classList.remove("hidden");

  const int = setInterval(() => {
    t--;
    countdownEl.textContent = t;
    if (t === 0) {
      clearInterval(int);
      countdownEl.classList.add("hidden");
      cb();
    }
  }, 1000);
}

function setBusyCaptureState(isBusy) {
  isCountingDown = isBusy;
  if (takePhotoBtn) {
    takePhotoBtn.disabled = isBusy;
  }
}

function createStoredPhoto(source, sourceWidth, sourceHeight) {
  const scale = Math.min(1, MAX_STORED_PHOTO_EDGE / Math.max(sourceWidth, sourceHeight));
  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.round(sourceHeight * scale);
  ctx.filter = getPhotoFilter();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";
  return canvas.toDataURL("image/jpeg", 0.9);
}

function createCameraPhoto(source, sourceWidth, sourceHeight) {
  const scale = Math.min(1, MAX_STORED_PHOTO_EDGE / Math.max(sourceWidth, sourceHeight));
  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.round(sourceHeight * scale);
  ctx.filter = getPhotoFilter();
  if (UNMIRROR_CAMERA) {
    ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = "none";
  return canvas.toDataURL("image/jpeg", 0.9);
}

function storePhotoAndShowResult(photoData) {
  try {
    localStorage.setItem("photoData", photoData);
    localStorage.removeItem("gifData");
    location.href = "result.html";
  } catch (error) {
    setStatus(cameraStatus, "Foto terlalu besar untuk disimpan. Coba foto atau file lain.", true);
  }
}

/* ================= CAPTURE ================= */
takePhotoBtn?.addEventListener("click", () => {
  if (isCountingDown || !video.videoWidth || !video.videoHeight) {
    return;
  }

  const duration = getTimer() * 1000;
  const frames = [];
  const intervalTime = duration / GIF_FRAMES;
  let framesCaptured = 0;
  let timeLeft = Math.ceil(duration / 1000);

  setBusyCaptureState(true);
  countdownEl.textContent = timeLeft;
  countdownEl.classList.remove("hidden");
  setStatus(cameraStatus, "Bersiap mengambil foto...");

  const timerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft >= 0) {
      countdownEl.textContent = timeLeft;
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
    }
  }, 1000);

  const finishWithError = message => {
    clearInterval(captureInterval);
    clearInterval(timerInterval);
    setStatus(cameraStatus, message, true);
    setBusyCaptureState(false);
    countdownEl.classList.add("hidden");
  };

  const saveCapture = () => {
    const photoData = frames[frames.length - 1];
    if (!photoData) {
      finishWithError("Foto tidak dapat diproses. Coba lagi.");
      return;
    }

    setStatus(cameraStatus, "Foto terambil. Menyiapkan hasil...");
    try {
      localStorage.setItem("photoData", photoData);
      localStorage.setItem("gifData", JSON.stringify(frames));
      location.href = "result.html";
    } catch (error) {
      setStatus(cameraStatus, "Terlalu banyak data untuk disimpan. Coba lagi.", true);
      setBusyCaptureState(false);
      countdownEl.classList.add("hidden");
    }
  };

  const captureInterval = setInterval(() => {
    try {
      frames.push(createCameraPhoto(video, video.videoWidth, video.videoHeight));
      framesCaptured++;
    } catch (error) {
      finishWithError("Foto tidak dapat diproses. Coba lagi.");
      return;
    }

    if (framesCaptured >= GIF_FRAMES) {
      clearInterval(captureInterval);
      clearInterval(timerInterval);
      countdownEl.classList.add("hidden");
      saveCapture();
    }
  }, intervalTime);
});

/* ================= UPLOAD ================= */
document.getElementById("uploadPhoto")?.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    const photoData = createStoredPhoto(img, img.naturalWidth, img.naturalHeight);
    URL.revokeObjectURL(img.src);
    storePhotoAndShowResult(photoData);
  };
  img.onerror = () => {
    URL.revokeObjectURL(img.src);
    setStatus(cameraStatus, "File foto tidak dapat dibuka.", true);
  };
  img.src = URL.createObjectURL(file);
});

/* ================= OBJECT-FIT COVER (CANVAS) ================= */
function drawCover(ctx, img, x, y, w, h) {
  const rImg = img.width / img.height;
  const rBox = w / h;

  let dw, dh, dx, dy;

  if (rImg > rBox) {
    dh = h;
    dw = h * rImg;
    dx = x - (dw - w) / 2;
    dy = y;
  } else {
    dw = w;
    dh = w / rImg;
    dx = x;
    dy = y - (dh - h) / 2;
  }

  ctx.drawImage(img, dx, dy, dw, dh);
}

function prepareFrame(frame) {
  const frameCanvas = document.createElement("canvas");
  const frameCtx = frameCanvas.getContext("2d");

  frameCanvas.width = frame.width;
  frameCanvas.height = frame.height;
  frameCtx.drawImage(frame, 0, 0);

  const imageData = frameCtx.getImageData(0, 0, frameCanvas.width, frameCanvas.height);
  const data = imageData.data;
  const bounds = {
    minX: frameCanvas.width,
    minY: frameCanvas.height,
    maxX: -1,
    maxY: -1
  };

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const isGreenPlaceholder = g > 140 && g > r * 1.25 && g > b * 1.25;

    if (isGreenPlaceholder) {
      const pixel = i / 4;
      const x = pixel % frameCanvas.width;
      const y = Math.floor(pixel / frameCanvas.width);

      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
  }

  const hasPlaceholder = bounds.maxX >= bounds.minX && bounds.maxY >= bounds.minY;
  if (!hasPlaceholder) {
    return {
      canvas: frameCanvas,
      hole: FRAME_CONFIG.hole
    };
  }

  const hole = {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX + 1,
    height: bounds.maxY - bounds.minY + 1
  };

  frameCtx.clearRect(hole.x, hole.y, hole.width, hole.height);

  return {
    canvas: frameCanvas,
    hole
  };
}

/* ================= RESULT ================= */
const resultCanvas = document.getElementById("resultCanvas");
const gifCanvas = document.getElementById("gifCanvas");
const gifPanel = document.getElementById("gifPanel");
const downloadBtn = document.getElementById("downloadBtn");
const showGifBtn = document.getElementById("showGifBtn");
const downloadGifBtn = document.getElementById("downloadGifBtn");
const resultStatus = document.getElementById("resultStatus");
let hasBurstAnimation = false;
let burstAnimationInterval;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawFramedPhoto(targetCtx, image, frame, hole) {
  targetCtx.clearRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);
  drawCover(targetCtx, image, hole.x, hole.y, hole.width, hole.height);
  targetCtx.drawImage(frame, 0, 0);
}

async function renderResult() {
  const photoData = localStorage.getItem("photoData");
  const gifDataRaw = localStorage.getItem("gifData");

  if (!photoData) {
    location.href = "index.html";
    return;
  }

  try {
    const frameImg = await loadImage("frame/frame.png");
    const preparedFrame = prepareFrame(frameImg);

    // 1. Render Statis
    const photoImg = await loadImage(photoData);
    resultCanvas.width = frameImg.width;
    resultCanvas.height = frameImg.height;
    const resultCtx = resultCanvas.getContext("2d");
    drawFramedPhoto(resultCtx, photoImg, preparedFrame.canvas, preparedFrame.hole);

    if (gifCanvas && gifDataRaw) {
      let frames = [];
      try {
        const parsedFrames = JSON.parse(gifDataRaw);
        if (Array.isArray(parsedFrames)) {
          frames = parsedFrames.filter(frame => typeof frame === "string" && frame.startsWith("data:image/"));
        }
      } catch (error) {
        localStorage.removeItem("gifData");
      }

      if (frames.length > 0) {
        const loadedFrames = await Promise.all(frames.map(f => loadImage(f)));

        gifCanvas.width = frameImg.width;
        gifCanvas.height = frameImg.height;
        const gifCtx = gifCanvas.getContext("2d");
        hasBurstAnimation = true;

        let currentFrame = 0;
        const renderAnimationFrame = () => {
          drawFramedPhoto(
            gifCtx,
            loadedFrames[currentFrame],
            preparedFrame.canvas,
            preparedFrame.hole
          );
          currentFrame = (currentFrame + 1) % loadedFrames.length;
        };

        renderAnimationFrame();
        clearInterval(burstAnimationInterval);
        burstAnimationInterval = setInterval(() => {
          if (!gifCanvas) {
            clearInterval(burstAnimationInterval);
            return;
          }
          renderAnimationFrame();
        }, ANIMATION_FRAME_INTERVAL);
      }
    }

    downloadBtn.disabled = false;
    if (showGifBtn) {
      showGifBtn.hidden = !hasBurstAnimation;
      showGifBtn.disabled = !hasBurstAnimation;
    }
    if (downloadGifBtn) {
      downloadGifBtn.hidden = true;
      downloadGifBtn.disabled = !hasBurstAnimation;
    }
    if (gifPanel && !hasBurstAnimation) {
      gifPanel.classList.add("hidden");
    }
    setStatus(
      resultStatus,
      hasBurstAnimation
        ? "Hasil siap. Kamu bisa download foto atau melihat animasi."
        : "Hasil siap. Kamu bisa download foto atau mengambil foto ulang."
    );
  } catch (err) {
    console.error("Render error:", err);
    setStatus(resultStatus, "Gagal memproses foto. Silakan coba foto ulang.", true);
  }
}

if (resultCanvas) {
  if (downloadBtn) downloadBtn.disabled = true;
  if (showGifBtn) showGifBtn.disabled = true;
  if (downloadGifBtn) downloadGifBtn.disabled = true;
  renderResult();
}

document.getElementById("retakeBtn")?.addEventListener("click", () => {
  localStorage.removeItem("photoData");
  localStorage.removeItem("gifData");
  location.href = "index.html";
});

downloadBtn?.addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = "photobooth-vintage.png";
  a.href = resultCanvas.toDataURL("image/png");
  a.click();
});

showGifBtn?.addEventListener("click", () => {
  if (!hasBurstAnimation || !gifPanel || !downloadGifBtn) return;
  gifPanel.classList.remove("hidden");
  showGifBtn.hidden = true;
  downloadGifBtn.hidden = false;
  downloadGifBtn.disabled = false;
  setStatus(resultStatus, "Animasi siap. Kamu bisa download sebagai video.");
});

downloadGifBtn?.addEventListener("click", async () => {
  if (!gifCanvas || !hasBurstAnimation || typeof MediaRecorder === "undefined") {
    setStatus(resultStatus, "Browser ini belum mendukung download animasi.", true);
    return;
  }

  setStatus(resultStatus, "Menyiapkan file video...");
  downloadGifBtn.disabled = true;

  const mimeTypes = ["video/mp4", "video/webm;codecs=vp9", "video/webm"];
  const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
  if (!supportedMimeType) {
    setStatus(resultStatus, "Browser ini belum mendukung format video animasi.", true);
    downloadGifBtn.disabled = false;
    return;
  }

  const extension = supportedMimeType.includes("mp4") ? "mp4" : "webm";

  const stream = gifCanvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType: supportedMimeType,
    videoBitsPerSecond: 2500000
  });
  const chunks = [];

  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: supportedMimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `photobooth-vintage.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(resultStatus, "Video berhasil diunduh.");
    downloadGifBtn.disabled = false;
  };

  recorder.start();
  setTimeout(() => recorder.stop(), GIF_DURATION);
});

window.addEventListener("pagehide", () => {
  clearInterval(burstAnimationInterval);
});
