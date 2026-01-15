/* ================= FRAME CONFIG ================= */
const FRAME_CONFIG = {
  frameWidth: 900,
  frameHeight: 1200,
  hole: {
    x: 90,
    y: 240,
    width: 520,
    height: 420
  }
};

/* ================= CAMERA ================= */
const video = document.getElementById("video");
const canvas = document.getElementById("captureCanvas");
const ctx = canvas?.getContext("2d");
const countdownEl = document.getElementById("countdown");

if (video) {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => video.srcObject = stream)
    .catch(() => alert("Camera tidak bisa diakses"));
}

/* ================= TIMER ================= */
function getTimer() {
  return +document.querySelector("input[name=timer]:checked").value;
}

function startCountdown(sec, cb) {
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

/* ================= CAPTURE ================= */
document.getElementById("takePhoto")?.addEventListener("click", () => {
  startCountdown(getTimer(), () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    localStorage.setItem("photoData", canvas.toDataURL());
    location.href = "result.html";
  });
});

/* ================= UPLOAD ================= */
document.getElementById("uploadPhoto")?.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    localStorage.setItem("photoData", canvas.toDataURL());
    location.href = "result.html";
  };
  img.src = URL.createObjectURL(file);
});

/* ================= RESULT ================= */
const resultPhoto = document.getElementById("resultPhoto");
if (resultPhoto) {
  resultPhoto.src = localStorage.getItem("photoData");
}

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

/* ================= DOWNLOAD ================= */
document.getElementById("downloadBtn")?.addEventListener("click", () => {
  const frame = new Image();
  const photo = new Image();
  frame.src = "frame/frame.png";
  photo.src = resultPhoto.src;

  frame.onload = () => {
    const c = document.getElementById("finalCanvas");
    const x = c.getContext("2d");

    c.width = frame.width;
    c.height = frame.height;

    drawCover(
      x,
      photo,
      FRAME_CONFIG.hole.x,
      FRAME_CONFIG.hole.y,
      FRAME_CONFIG.hole.width,
      FRAME_CONFIG.hole.height
    );

    x.drawImage(frame, 0, 0);

    const a = document.createElement("a");
    a.download = "photobooth.png";
    a.href = c.toDataURL("image/png");
    a.click();
  };
});
