const captureBtn = document.getElementById("capture");
const retakeBtn = document.getElementById("retake");
const downloadBtn = document.getElementById("download");

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");



const frameImg = document.getElementById("frame");
const countdownEl = document.getElementById("countdown");

// ================= KAMERA =================
navigator.mediaDevices.getUserMedia({
  video: { facingMode: "user" },
  audio: false
}).then(stream => {
  video.srcObject = stream;
}).catch(err => {
  alert("Kamera tidak dapat diakses");
});

// ================= TIMER =================
function startCountdown(callback) {
  let count = 3;
  countdownEl.style.display = "flex";
  countdownEl.textContent = count;

  const interval = setInterval(() => {
    count--;
    if (count === 0) {
      clearInterval(interval);
      countdownEl.style.display = "none";
      callback();
    } else {
      countdownEl.textContent = count;
    }
  }, 1000);
}

// ================= CAPTURE =================
function capturePhoto() {
  const frameRect = document.querySelector(".frame-wrapper").getBoundingClientRect();
  const photoRect = document.querySelector(".photo-area").getBoundingClientRect();

  canvas.width = 100;
  canvas.height = 100;

  const scaleX = canvas.width / frameRect.width;
  const scaleY = canvas.height / frameRect.height;

  const px = (photoRect.left - frameRect.left) * scaleX;
  const py = (photoRect.top - frameRect.top) * scaleY;
  const pw = photoRect.width * scaleX;
  const ph = photoRect.height * scaleY;

  const videoRatio = video.videoWidth / video.videoHeight;
  const areaRatio = pw / ph;

  let dw, dh, dx, dy;

  if (videoRatio > areaRatio) {
    dh = ph;
    dw = ph * videoRatio;
    dx = px - (dw - pw) / 2;
    dy = py;
  } else {
    dw = pw;
    dh = pw / videoRatio;
    dx = px;
    dy = py - (dh - ph) / 2;
  }

  ctx.drawImage(video, dx, dy, dw, dh);
  ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
}

// ================= BUTTON =================
captureBtn.onclick = () => {
  startCountdown(capturePhoto);
};

retakeBtn.onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

downloadBtn.onclick = () => {
  const link = document.createElement("a");
  link.download = "vintage-photobooth.jpg";
  link.href = canvas.toDataURL("image/jpeg", 0.95);
  link.click();
};
