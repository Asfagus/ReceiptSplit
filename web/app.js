const APP_VERSION = "1.2.4";
const STORAGE_KEY = "receipt-split-pwa-state-v1";

const state = {
  people: [],
  items: [],
  memory: {}
};

const els = {
  cameraButton: document.querySelector("#cameraButton"),
  receiptUploadInput: document.querySelector("#receiptUploadInput"),
  receiptCameraInput: document.querySelector("#receiptCameraInput"),
  cameraDialog: document.querySelector("#cameraDialog"),
  cameraPreview: document.querySelector("#cameraPreview"),
  capturePhotoButton: document.querySelector("#capturePhotoButton"),
  pasteTextButton: document.querySelector("#pasteTextButton"),
  addItemButton: document.querySelector("#addItemButton"),
  clearItemsButton: document.querySelector("#clearItemsButton"),
  saveHistoryButton: document.querySelector("#saveHistoryButton"),
  statusStrip: document.querySelector("#statusStrip"),
  statusText: document.querySelector("#statusText"),
  progressTrack: document.querySelector("#progressTrack"),
  progressFill: document.querySelector("#progressFill"),
  progressLabel: document.querySelector("#progressLabel"),
  versionLabel: document.querySelector("#versionLabel"),
  participantForm: document.querySelector("#participantForm"),
  participantName: document.querySelector("#participantName"),
  participantsList: document.querySelector("#participantsList"),
  peopleCount: document.querySelector("#peopleCount"),
  itemsCount: document.querySelector("#itemsCount"),
  itemsList: document.querySelector("#itemsList"),
  totalsList: document.querySelector("#totalsList"),
  textDialog: document.querySelector("#textDialog"),
  receiptTextArea: document.querySelector("#receiptTextArea"),
  parseTextButton: document.querySelector("#parseTextButton"),
  itemDialog: document.querySelector("#itemDialog"),
  manualItemName: document.querySelector("#manualItemName"),
  manualItemPrice: document.querySelector("#manualItemPrice"),
  saveManualItemButton: document.querySelector("#saveManualItemButton"),
  installButton: document.querySelector("#installButton")
};

let installPrompt = null;
let cameraStream = null;

function uid() {
  return globalThis.crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function money(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      state.people = saved.people || [];
      state.items = saved.items || [];
      state.memory = saved.memory || {};
      state.version = saved.version || "1.0.0";
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  if (state.people.length === 0) {
    state.people = [
      { id: uid(), name: "Me" },
      { id: uid(), name: "Friend" }
    ];
  }
}

function save() {
  state.version = APP_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setStatus(message, active = true, progress = null) {
  els.statusText.textContent = message;
  els.statusStrip.hidden = !message;

  const showBar = active && typeof progress === "number";
  els.progressTrack.hidden = !showBar;
  els.progressLabel.hidden = !showBar;

  if (showBar) {
    const pct = Math.max(0, Math.min(100, Math.round(progress)));
    els.progressFill.style.width = `${pct}%`;
    els.progressLabel.textContent = `${pct}%`;
    els.progressTrack.setAttribute("aria-valuenow", String(pct));
  }
}

function clearStatus() {
  setStatus("", false);
}

function ocrStatusMessage(status) {
  const labels = {
    "loading tesseract core": "Loading OCR engine",
    "initializing tesseract": "Starting OCR",
    "loading language traineddata": "Loading language data",
    "initializing api": "Preparing scan",
    "recognizing text": "Reading receipt"
  };
  return labels[status] || "Reading receipt";
}

function parseReceiptText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map(parseReceiptLine)
    .filter(Boolean);
}

function parseReceiptLine(line) {
  const cleaned = line
    .replace(/\s+/g, " ")
    .replace(/[|]/g, " ")
    .trim();
  if (cleaned.length < 4) return null;

  if (/^\d+(?:[.,]\d+)?\s*(lb|lbs|kg|g|oz)\b/i.test(cleaned)) return null;

  const ignored = /(subtotal|total|tax|tip|balance|visa|mastercard|change|amount|payment|card|cash|auth|approved|incl|mwst|vat|euro|tender|purchase|pin)/i;
  if (ignored.test(cleaned)) return null;

  const match = cleaned.match(/^(.*?)(?:\s+\$?\s*)([0-9]{1,4}(?:[.,]\d{2}|\s+\d{2}))(?:\s*[A-Z0-9*]{1,3})?$/i);
  if (!match) return null;

  const name = cleanItemName(match[1]);
  const price = Number(match[2].replace(/\s+/, ".").replace(",", "."));

  if (!name || !/[a-z]/i.test(name) || !Number.isFinite(price) || price <= 0 || price > 300) return null;
  return createItem(name, price);
}

function cleanItemName(rawName) {
  let name = rawName
    .replace(/^\d+\s*x?\s*/i, "")
    .replace(/\s+[aà@]\s+\d+[.,]\d{2}\s*(chf|eur|usd)?$/i, "")
    .replace(/\s+\d+[.,]\d{2}\s*(chf|eur|usd)$/i, "")
    .replace(/\s+\d{4,14}(?:\s+[A-Z])?$/i, "")
    .replace(/,\s*\d{3,6}\W*$/i, "")
    .replace(/\s+(chf|eur|usd)$/i, "")
    .replace(/^[^a-z0-9]+|[-.$"'`\s]+$/gi, "")
    .trim();

  name = name
    .replace(/^(ea|y)\s+/i, "")
    .replace(/\bgbiuken\b/i, "CHICKEN")
    .replace(/\bghiuken\b/i, "CHICKEN")
    .replace(/\bghicken\b/i, "CHICKEN")
    .replace(/\bchikken\b/i, "CHICKEN")
    .replace(/\bwon?tons red\b/i, "ONIONS RED")
    .replace(/\balife ir\b/i, "CHALL BTR")
    .replace(/\bhallf?bir\b/i, "CHALL BTR")
    .replace(/\bghall,?\s*bir\b/i, "CHALL BTR")
    .replace(/\bumatintofu\b/i, "AZUMAYA TOFU")
    .replace(/\s+/g, " ")
    .trim();

  return name;
}

function addParsedItems(items) {
  state.items.push(...items);
  save();
  render();
}

function createItem(name, price) {
  const memoryHit = state.memory[normalizeName(name)];
  const assignedTo = Array.isArray(memoryHit) ? memoryHit.filter(personExists) : [];
  const fallback = state.people[0] ? [state.people[0].id] : [];
  return {
    id: uid(),
    name,
    price,
    assignedTo: assignedTo.length ? assignedTo : fallback
  };
}

function personExists(id) {
  return state.people.some((person) => person.id === id);
}

function renderPeople() {
  els.peopleCount.textContent = String(state.people.length);
  els.participantsList.replaceChildren();

  state.people.forEach((person) => {
    const chip = document.createElement("span");
    chip.className = "person-chip";
    chip.textContent = person.name;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.title = `Remove ${person.name}`;
    remove.textContent = "x";
    remove.addEventListener("click", () => {
      state.people = state.people.filter((candidate) => candidate.id !== person.id);
      state.items.forEach((item) => {
        item.assignedTo = item.assignedTo.filter((id) => id !== person.id);
      });
      save();
      render();
    });

    chip.append(remove);
    els.participantsList.append(chip);
  });
}

function renderItems() {
  els.itemsCount.textContent = String(state.items.length);
  els.itemsList.replaceChildren();

  if (state.items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No receipt items yet.";
    els.itemsList.append(empty);
    return;
  }

  state.items.forEach((item) => {
    const row = document.createElement("article");
    row.className = "item-row";

    const main = document.createElement("div");
    main.className = "item-main";

    const name = document.createElement("div");
    name.className = "item-name";
    name.textContent = item.name;

    const price = document.createElement("div");
    price.className = "item-price";
    price.textContent = money(item.price);

    main.append(name, price);
    row.append(main, renderAssignments(item), removeItemButton(item));
    els.itemsList.append(row);
  });
}

function renderAssignments(item) {
  const wrap = document.createElement("div");
  wrap.className = "assignments";

  state.people.forEach((person) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = item.assignedTo.includes(person.id);
    input.addEventListener("change", () => {
      if (input.checked) {
        item.assignedTo = Array.from(new Set([...item.assignedTo, person.id]));
      } else {
        item.assignedTo = item.assignedTo.filter((id) => id !== person.id);
      }
      save();
      renderTotals();
    });

    label.append(input, person.name);
    wrap.append(label);
  });

  return wrap;
}

function removeItemButton(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "remove-item";
  button.textContent = "Remove";
  button.addEventListener("click", () => {
    state.items = state.items.filter((candidate) => candidate.id !== item.id);
    save();
    render();
  });
  return button;
}

function totals() {
  const byPerson = new Map(state.people.map((person) => [person.id, 0]));
  state.items.forEach((item) => {
    const assigned = item.assignedTo.filter(personExists);
    if (assigned.length === 0) return;
    const share = item.price / assigned.length;
    assigned.forEach((id) => {
      byPerson.set(id, (byPerson.get(id) || 0) + share);
    });
  });

  return state.people
    .map((person) => ({ person, total: byPerson.get(person.id) || 0 }))
    .filter((row) => row.total > 0);
}

function renderTotals() {
  els.totalsList.replaceChildren();
  const rows = totals();

  if (rows.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Assign items to see totals.";
    els.totalsList.append(empty);
    return;
  }

  rows.forEach(({ person, total }) => {
    const row = document.createElement("div");
    row.className = "total-row";

    const name = document.createElement("strong");
    name.textContent = person.name;

    const amount = document.createElement("span");
    amount.className = "total-price";
    amount.textContent = money(total);

    row.append(name, amount);
    els.totalsList.append(row);
  });
}

function render() {
  renderPeople();
  renderItems();
  renderTotals();
}

async function scanImage(file) {
  if (!window.Tesseract) {
    setStatus("OCR is still loading. Try again in a few seconds.", false);
    return;
  }

  setStatus("Reading receipt image...", true, 0);
  try {
    const result = await recognizeReceiptText(file, (event) => {
      if (event.status && typeof event.progress === "number") {
        setStatus(ocrStatusMessage(event.status), true, event.progress * 100);
      }
    });
    if (result.items.length === 0) {
      els.receiptTextArea.value = result.text.trim();
      els.textDialog.showModal();
      setStatus("I could not auto-detect priced items. Review the text and parse it.", false);
      return;
    }
    addParsedItems(result.items);
    setStatus(`Added ${result.items.length} item${result.items.length === 1 ? "" : "s"} from the receipt.`, false);
  } catch (error) {
    setStatus(error.message || "Could not scan this image.", false);
  }
}

async function recognizeReceiptText(file, onProgress) {
  const result = await Tesseract.recognize(file, "eng", {
    logger: (event) => {
      if (onProgress) onProgress(event);
    }
  });
  const text = result.data.text;
  const items = parseReceiptText(text);
  return { text, items };
}

function handleReceiptFile(event) {
  const file = event.target.files?.[0];
  if (file) scanImage(file);
  event.target.value = "";
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  els.cameraPreview.srcObject = null;
}

function openNativeCameraInput() {
  els.receiptCameraInput.click();
}

async function openCamera() {
  if (window.matchMedia("(pointer: coarse)").matches) {
    openNativeCameraInput();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    openNativeCameraInput();
    return;
  }

  try {
    stopCamera();
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    els.cameraPreview.srcObject = cameraStream;
    els.cameraDialog.showModal();
  } catch {
    openNativeCameraInput();
  }
}

function captureFromCamera() {
  const video = els.cameraPreview;
  if (!video.videoWidth || !video.videoHeight) return;

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);

  canvas.toBlob((blob) => {
    stopCamera();
    els.cameraDialog.close();
    if (blob) scanImage(new File([blob], "receipt.jpg", { type: "image/jpeg" }));
  }, "image/jpeg", 0.92);
}

els.cameraButton.addEventListener("click", () => {
  openCamera();
});

els.capturePhotoButton.addEventListener("click", () => {
  captureFromCamera();
});

els.cameraDialog.addEventListener("close", () => {
  stopCamera();
});

els.receiptUploadInput.addEventListener("change", handleReceiptFile);
els.receiptCameraInput.addEventListener("change", handleReceiptFile);

els.participantForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.participantName.value.trim();
  if (!name) return;
  const exists = state.people.some((person) => person.name.toLowerCase() === name.toLowerCase());
  if (!exists) {
    state.people.push({ id: uid(), name });
    save();
    render();
  }
  els.participantName.value = "";
});

els.pasteTextButton.addEventListener("click", () => {
  els.receiptTextArea.value = "";
  els.textDialog.showModal();
});

els.parseTextButton.addEventListener("click", () => {
  const found = parseReceiptText(els.receiptTextArea.value);
  addParsedItems(found);
  els.textDialog.close();
  setStatus(found.length ? `Added ${found.length} item${found.length === 1 ? "" : "s"}.` : "No priced line items found.", false);
});

els.addItemButton.addEventListener("click", () => {
  els.manualItemName.value = "";
  els.manualItemPrice.value = "";
  els.itemDialog.showModal();
});

els.saveManualItemButton.addEventListener("click", () => {
  const name = els.manualItemName.value.trim();
  const price = Number(els.manualItemPrice.value);
  if (!name || !Number.isFinite(price) || price <= 0) return;
  state.items.push(createItem(name, price));
  save();
  render();
  els.itemDialog.close();
});

els.clearItemsButton.addEventListener("click", () => {
  state.items = [];
  save();
  render();
});

els.saveHistoryButton.addEventListener("click", () => {
  state.items.forEach((item) => {
    const assigned = item.assignedTo.filter(personExists);
    if (assigned.length) state.memory[normalizeName(item.name)] = assigned;
  });
  save();
  setStatus("Saved item assignments to this browser.", false);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  els.installButton.hidden = false;
});

els.installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  els.installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

load();
els.versionLabel.textContent = `v${APP_VERSION}`;
save();
render();
