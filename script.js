import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.min.mjs";

const { PDFDocument, StandardFonts, rgb } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs";

const fileInput = document.getElementById("fileInput");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const addTextBtn = document.getElementById("addText");
const eraseWordBtn = document.getElementById("eraseWord");
const downloadBtn = document.getElementById("download");
const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");
const darkModeToggle = document.getElementById("darkModeToggle");
const pageLabel = document.getElementById("pageLabel");
const fontSizeInput = document.getElementById("fontSize");
const textColorInput = document.getElementById("textColor");
const canvas = document.getElementById("pdfCanvas");
const overlay = document.getElementById("overlay");

const state = {
  pdfjsDoc: null,
  pdfBytes: null,
  currentPage: 1,
  pageCount: 0,
  scale: 1.4,
  eraseMode: false,
  editsByPage: new Map()
};

const getPageEdits = (page) => {
  if (!state.editsByPage.has(page)) {
    state.editsByPage.set(page, { texts: [], erases: [] });
  }
  return state.editsByPage.get(page);
};

const renderOverlay = () => {
  overlay.innerHTML = "";
  const edits = getPageEdits(state.currentPage);

  edits.texts.forEach((item, idx) => {
    const input = document.createElement("input");
    input.value = item.text;
    input.className = "text-layer-item";
    input.style.left = `${item.x}px`;
    input.style.top = `${item.y}px`;
    input.style.fontSize = `${item.fontSize}px`;
    input.style.color = item.color || "#000000";

    makeDraggable(input, (x, y) => {
      item.x = x;
      item.y = y;
    });

    input.addEventListener("input", () => {
      edits.texts[idx].text = input.value;
      edits.texts[idx].color = input.style.color;
    });

    overlay.appendChild(input);
  });

  edits.erases.forEach((item) => {
    const div = document.createElement("div");
    div.className = "erase-mark";
    div.style.left = `${item.x}px`;
    div.style.top = `${item.y}px`;
    div.style.width = `${item.w}px`;
    div.style.height = `${item.h}px`;
    overlay.appendChild(div);
  });
};

const makeDraggable = (el, onDrop) => {
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;

  el.addEventListener("mousedown", (e) => {
    dragging = true;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const rect = overlay.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(e.clientX - rect.left - offsetX, rect.width - 20)
    );
    const y = Math.max(
      0,
      Math.min(e.clientY - rect.top - offsetY, rect.height - 20)
    );
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  });

  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    onDrop(parseFloat(el.style.left), parseFloat(el.style.top));
  });
};

const renderPage = async () => {
  const page = await state.pdfjsDoc.getPage(state.currentPage);
  const viewport = page.getViewport({ scale: state.scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  overlay.style.width = `${viewport.width}px`;
  overlay.style.height = `${viewport.height}px`;

  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;

  pageLabel.textContent = `Page ${state.currentPage} / ${state.pageCount}`;
  prevPageBtn.disabled = state.currentPage <= 1;
  nextPageBtn.disabled = state.currentPage >= state.pageCount;

  renderOverlay();
};

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  state.pdfBytes = await file.arrayBuffer();
  state.pdfjsDoc = await pdfjsLib.getDocument({
    data: state.pdfBytes
  }).promise;

  state.pageCount = state.pdfjsDoc.numPages;
  state.currentPage = 1;
  state.editsByPage.clear();

  [
    prevPageBtn,
    nextPageBtn,
    addTextBtn,
    eraseWordBtn,
    downloadBtn,
    zoomInBtn,
    zoomOutBtn
  ].forEach((btn) => (btn.disabled = false));

  renderPage();
});

prevPageBtn.addEventListener("click", async () => {
  if (state.currentPage <= 1) return;
  state.currentPage -= 1;
  await renderPage();
});

nextPageBtn.addEventListener("click", async () => {
  if (state.currentPage >= state.pageCount) return;
  state.currentPage += 1;
  await renderPage();
});

zoomInBtn.addEventListener("click", async () => {
  state.scale += 0.2;
  await renderPage();
});

zoomOutBtn.addEventListener("click", async () => {
  if (state.scale <= 0.6) return;
  state.scale -= 0.2;
  await renderPage();
});

darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

addTextBtn.addEventListener("click", () => {
  const edits = getPageEdits(state.currentPage);
  edits.texts.push({
    x: 40,
    y: 40,
    text: "Edit me",
    fontSize: Number(fontSizeInput.value) || 20,
    color: textColorInput.value
  });
  renderOverlay();
});

eraseWordBtn.addEventListener("click", () => {
  state.eraseMode = !state.eraseMode;
  eraseWordBtn.textContent = `🧽 Erase: ${
    state.eraseMode ? "On" : "Off"
  }`;
});

overlay.addEventListener("click", (e) => {
  if (!state.eraseMode) return;
  if (e.target !== overlay) return;
  const rect = overlay.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  getPageEdits(state.currentPage).erases.push({
    x: x - 20,
    y: y - 12,
    w: 70,
    h: 24
  });
  renderOverlay();
});

downloadBtn.addEventListener("click", async () => {
  const pdfDoc = await PDFDocument.load(state.pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const [pageIdx, edits] of state.editsByPage.entries()) {
    const page = pdfDoc.getPage(pageIdx - 1);
    const { width, height } = page.getSize();
    const scaleX = width / canvas.width;
    const scaleY = height / canvas.height;

    edits.erases.forEach((item) => {
      page.drawRectangle({
        x: item.x * scaleX,
        y: height - (item.y + item.h) * scaleY,
        width: item.w * scaleX,
        height: item.h * scaleY,
        color: rgb(1, 1, 1)
      });
    });

    edits.texts.forEach((item) => {
      const r = parseInt(item.color.slice(1, 3), 16) / 255;
      const g = parseInt(item.color.slice(3, 5), 16) / 255;
      const b = parseInt(item.color.slice(5, 7), 16) / 255;

      page.drawText(item.text, {
        x: item.x * scaleX,
        y: height - (item.y + item.fontSize) * scaleY,
        size: item.fontSize * scaleY,
        font,
        color: rgb(r, g, b)
      });
    });
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "edited.pdf";
  a.click();
  URL.revokeObjectURL(url);
});