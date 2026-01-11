// ================= VARIABEL GLOBAL =================
const captureBtn = document.getElementById("capture");
const retakeBtn = document.getElementById("retake");
const downloadBtn = document.getElementById("download");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const frameImg = document.getElementById("frame");
const countdownEl = document.getElementById("countdown");
const previewContainer = document.getElementById("previewContainer");
const previewImg = document.getElementById("preview");

let isCaptured = false;
let currentPhotoDataURL = null;

// ================= INISIALISASI KAMERA =================
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    video.srcObject = stream;
    
    // Tunggu video siap
    video.onloadedmetadata = () => {
      console.log("Kamera siap. Resolusi:", video.videoWidth, "x", video.videoHeight);
    };
  } catch (err) {
    console.error("Error mengakses kamera:", err);
    alert("Tidak dapat mengakses kamera. Pastikan Anda memberikan izin.");
    
    // Fallback: gunakan gambar placeholder
    video.style.display = "none";
    const placeholder = document.createElement("div");
    placeholder.style.cssText = `
      position: absolute; width: 100%; height: 100%; 
      background: linear-gradient(45deg, #666, #999); 
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 18px; z-index: 1;
    `;
    placeholder.textContent = "Kamera tidak tersedia";
    document.querySelector(".frame-wrapper").appendChild(placeholder);
  }
}

// ================= TIMER COUNTDOWN =================
function startCountdown(callback) {
  let count = 3;
  countdownEl.style.display = "flex";
  countdownEl.textContent = count;
  countdownEl.style.color = "#d4a017";

  const interval = setInterval(() => {
    count--;
    
    if (count > 0) {
      countdownEl.textContent = count;
      // Efek visual
      countdownEl.style.transform = `scale(${1 + (3-count)*0.2})`;
      countdownEl.style.transition = "transform 0.3s";
    } else if (count === 0) {
      countdownEl.textContent = "📸";
      countdownEl.style.fontSize = "120px";
      
      setTimeout(() => {
        clearInterval(interval);
        countdownEl.style.display = "none";
        countdownEl.style.transform = "scale(1)";
        countdownEl.style.fontSize = "100px";
        callback();
      }, 300);
    }
  }, 1000);
}

// ================= CAPTURE PHOTO =================
function capturePhoto() {
  const frameRect = document.querySelector(".frame-wrapper").getBoundingClientRect();
  const photoArea = document.querySelector(".photo-area");
  const photoRect = photoArea.getBoundingClientRect();
  
  // Set canvas size SAMA dengan frame wrapper
  canvas.width = frameRect.width;
  canvas.height = frameRect.height;
  
  // Hitung posisi relatif area foto dalam frame
  const scaleX = canvas.width / frameRect.width;
  const scaleY = canvas.height / frameRect.height;
  
  const photoX = (photoRect.left - frameRect.left) * scaleX;
  const photoY = (photoRect.top - frameRect.top) * scaleY;
  const photoWidth = photoRect.width * scaleX;
  const photoHeight = photoRect.height * scaleY;
  
  // Bersihkan canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 1. Gambar video (hanya area yang dipilih)
  // Buat temporary canvas untuk cropping
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  tempCanvas.width = photoWidth;
  tempCanvas.height = photoHeight;
  
  // Gambar bagian video ke temporary canvas
  tempCtx.drawImage(
    video,
    0, 0, video.videoWidth, video.videoHeight, // Source
    0, 0, photoWidth, photoHeight              // Destination
  );
  
  // 2. Gambar temporary canvas ke canvas utama
  ctx.drawImage(tempCanvas, photoX, photoY);
  
  // 3. Gambar frame di atasnya
  ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
  
  // Simpan data URL untuk preview dan download
  currentPhotoDataURL = canvas.toDataURL("image/jpeg", 0.9);
  
  // Tampilkan preview
  previewImg.src = currentPhotoDataURL;
  previewContainer.style.display = "block";
  previewContainer.scrollIntoView({ behavior: "smooth" });
  
  isCaptured = true;
  console.log("Foto diambil!");
}

// ================= EVENT LISTENERS UTAMA =================
captureBtn.addEventListener("click", () => {
  if (!isCaptured) {
    startCountdown(capturePhoto);
  } else {
    if (confirm("Foto sudah diambil. Apakah ingin mengambil foto baru?")) {
      isCaptured = false;
      startCountdown(capturePhoto);
    }
  }
});

retakeBtn.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  previewContainer.style.display = "none";
  isCaptured = false;
  currentPhotoDataURL = null;
  console.log("Foto direset");
});

downloadBtn.addEventListener("click", () => {
  if (!currentPhotoDataURL) {
    alert("Ambil foto terlebih dahulu!");
    return;
  }
  
  const link = document.createElement("a");
  link.download = `vintage-photobooth-${new Date().getTime()}.jpg`;
  link.href = currentPhotoDataURL;
  link.click();
  
  // Feedback visual
  downloadBtn.textContent = "✓ Terunduh!";
  setTimeout(() => {
    downloadBtn.textContent = "Unduh";
  }, 2000);
});

// ================= DRAG & RESIZE FUNCTIONALITY =================
const photoArea = document.querySelector(".photo-area");
const resizeHandle = document.querySelector(".resize-handle");

let isDragging = false;
let isResizing = false;
let startX, startY, startLeft, startTop, startWidth, startHeight;

// Fungsi untuk membatasi area dalam frame
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// EVENT LISTENERS UNTUK MOUSE
photoArea.addEventListener("mousedown", startDrag);
resizeHandle.addEventListener("mousedown", startResize);

document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    const frameRect = document.querySelector(".frame-wrapper").getBoundingClientRect();
    const newLeft = startLeft + dx;
    const newTop = startTop + dy;
    
    // Batasi agar tidak keluar frame
    const maxLeft = frameRect.width - photoArea.offsetWidth;
    const maxTop = frameRect.height - photoArea.offsetHeight;
    
    photoArea.style.left = `${clamp(newLeft, 0, maxLeft)}px`;
    photoArea.style.top = `${clamp(newTop, 0, maxTop)}px`;
    
  } else if (isResizing) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    const frameRect = document.querySelector(".frame-wrapper").getBoundingClientRect();
    const minSize = 50; // Ukuran minimum
    
    const newWidth = clamp(startWidth + dx, minSize, frameRect.width - photoArea.offsetLeft);
    const newHeight = clamp(startHeight + dy, minSize, frameRect.height - photoArea.offsetTop);
    
    photoArea.style.width = `${newWidth}px`;
    photoArea.style.height = `${newHeight}px`;
  }
});

document.addEventListener("mouseup", stopDragResize);

// EVENT LISTENERS UNTUK TOUCH (MOBILE)
photoArea.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  startDrag({ clientX: touch.clientX, clientY: touch.clientY });
});

resizeHandle.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  startResize({ clientX: touch.clientX, clientY: touch.clientY });
  e.stopPropagation();
});

document.addEventListener("touchmove", (e) => {
  if (isDragging || isResizing) {
    e.preventDefault();
    const touch = e.touches[0];
    const moveEvent = { clientX: touch.clientX, clientY: touch.clientY };
    
    if (isDragging) {
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      
      const frameRect = document.querySelector(".frame-wrapper").getBoundingClientRect();
      const newLeft = startLeft + dx;
      const newTop = startTop + dy;
      
      const maxLeft = frameRect.width - photoArea.offsetWidth;
      const maxTop = frameRect.height - photoArea.offsetHeight;
      
      photoArea.style.left = `${clamp(newLeft, 0, maxLeft)}px`;
      photoArea.style.top = `${clamp(newTop, 0, maxTop)}px`;
      
    } else if (isResizing) {
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      
      const frameRect = document.querySelector(".frame-wrapper").getBoundingClientRect();
      const minSize = 50;
      
      const newWidth = clamp(startWidth + dx, minSize, frameRect.width - photoArea.offsetLeft);
      const newHeight = clamp(startHeight + dy, minSize, frameRect.height - photoArea.offsetTop);
      
      photoArea.style.width = `${newWidth}px`;
      photoArea.style.height = `${newHeight}px`;
    }
  }
});

document.addEventListener("touchend", stopDragResize);

// FUNGSI BANTUAN
function startDrag(e) {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  startLeft = photoArea.offsetLeft;
  startTop = photoArea.offsetTop;
  
  // Feedback visual
  photoArea.style.borderColor = "rgba(255, 255, 0, 0.8)";
  photoArea.style.boxShadow = "0 0 10px rgba(255, 255, 0, 0.5)";
}

function startResize(e) {
  isResizing = true;
  startX = e.clientX;
  startY = e.clientY;
  startWidth = photoArea.offsetWidth;
  startHeight = photoArea.offsetHeight;
  
  // Feedback visual
  photoArea.style.borderColor = "rgba(0, 255, 255, 0.8)";
  photoArea.style.boxShadow = "0 0 10px rgba(0, 255, 255, 0.5)";
  e.stopPropagation();
}

function stopDragResize() {
  if (isDragging || isResizing) {
    isDragging = false;
    isResizing = false;
    
    // Kembalikan gaya normal
    photoArea.style.borderColor = "rgba(255, 255, 255, 0.8)";
    photoArea.style.boxShadow = "none";
  }
}

// ================= INISIALISASI =================
// Cegah perilaku drag default
photoArea.addEventListener("dragstart", (e) => e.preventDefault());

// Inisialisasi saat halaman dimuat
window.addEventListener("DOMContentLoaded", () => {
  initCamera();
  console.log("Photobooth siap digunakan!");
  
  // Tips untuk pengguna
  setTimeout(() => {
    if (!isCaptured) {
      const tips = document.querySelector(".instructions p");
      const originalText = tips.textContent;
      tips.textContent = "✨ Drag & resize area foto, lalu klik 'Ambil Foto'!";
      tips.style.color = "#d4a017";
      
      setTimeout(() => {
        tips.textContent = originalText;
        tips.style.color = "";
      }, 5000);
    }
  }, 3000);
});