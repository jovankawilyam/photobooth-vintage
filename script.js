/* ================= FRAME CONFIG ================= */
const FRAME_CONFIG = {
  hole: {
    x: 74,
    y: 870,
    width: 1029,
    height: 845
  }
};
const MAX_STORED_PHOTO_EDGE = 1600;

/* ================= CAMERA ================= */
const video = document.getElementById("video");
const canvas = document.getElementById("captureCanvas");
const ctx = canvas?.getContext("2d");
const countdownEl = document.getElementById("countdown");
const cameraStatus = document.getElementById("cameraStatus");
const takePhotoBtn = document.getElementById("takePhoto");
let activeStream;
let isCountingDown = false;

function setStatus(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("error", isError);
}

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

function createStoredPhoto(source, sourceWidth, sourceHeight) {
  const scale = Math.min(1, MAX_STORED_PHOTO_EDGE / Math.max(sourceWidth, sourceHeight));
  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.round(sourceHeight * scale);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function storePhotoAndShowResult(photoData) {
  try {
    localStorage.setItem("photoData", photoData);
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

  isCountingDown = true;
  takePhotoBtn.disabled = true;
  startCountdown(getTimer(), () => {
    const photoData = createStoredPhoto(video, video.videoWidth, video.videoHeight);
    storePhotoAndShowResult(photoData);
    isCountingDown = false;
    takePhotoBtn.disabled = false;
  });
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

/* ================= RESULT ================= */
const resultCanvas = document.getElementById("resultCanvas");
const downloadBtn = document.getElementById("downloadBtn");
const resultStatus = document.getElementById("resultStatus");

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function renderResult() {
  const photoData = localStorage.getItem("photoData");
  if (!photoData) {
    location.href = "index.html";
    return;
  }

  const [photo, frame] = await Promise.all([
    loadImage(photoData),
    loadImage("frame/frame.png")
  ]);
  const resultCtx = resultCanvas.getContext("2d");

  resultCanvas.width = frame.width;
  resultCanvas.height = frame.height;

  drawCover(
    resultCtx,
    photo,
    FRAME_CONFIG.hole.x,
    FRAME_CONFIG.hole.y,
    FRAME_CONFIG.hole.width,
    FRAME_CONFIG.hole.height
  );
  resultCtx.drawImage(frame, 0, 0);
  downloadBtn.disabled = false;
  setStatus(resultStatus, "Hasil siap. Kamu bisa download atau mengambil foto ulang.");
}

if (resultCanvas) {
  downloadBtn.disabled = true;
  renderResult().catch(() => {
    setStatus(resultStatus, "Hasil foto tidak dapat ditampilkan. Silakan foto ulang.", true);
  });
}

document.getElementById("retakeBtn")?.addEventListener("click", () => {
  localStorage.removeItem("photoData");
  location.href = "index.html";
});

downloadBtn?.addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = "photobooth-vintage.png";
  a.href = resultCanvas.toDataURL("image/png");
  a.click();
});
