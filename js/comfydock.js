/**
 * ComfyDock v1.0
 * iOS liquid-glass floating tab bar + capsule stats.
 * Dock top/bottom. Show/hide + reorder. Prefs in localStorage.
 * Does not touch LiteGraph. Disable with ?dgm=off
 */
import { app } from "../../scripts/app.js";

const EXT = "ComfyDock";
const STYLE_ID = "dgm-style";
const ROOT_ID = "dgm-root";
const SHEET_ID = "dgm-sheet";
const TOAST_ID = "dgm-toast";
const STAT_ID = "dgm-stats";
const PREF_KEY = "ComfyDock.prefs";

const CATALOG = [
  { id: "tabmenu", label: "Tab" },
  { id: "assets", label: "Assets" },
  { id: "gallery", label: "Gallery" },
  { id: "workflows", label: "Workflows" },
  { id: "queue", label: "Queue" },
  { id: "fit", label: "Fit" },
  { id: "run", label: "Run" },
  { id: "stop", label: "Stop" },
  { id: "reboot", label: "Reboot" },
];

const ICONS = {
  assets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="14" height="12" rx="2"/><path d="M7 9h.01M7 17l3.2-3.2a1 1 0 0 1 1.4 0L16 17"/><path d="M9 19h9a2 2 0 0 0 2-2V8"/></svg>',
  gallery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 14 2.5-2.5a1 1 0 0 1 1.4 0L14 15l2-2 4 4"/><circle cx="8.5" cy="8.5" r="1.2"/></svg>',
  workflows: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  queue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  fit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  run: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l12-6.5-12-6.5z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  reboot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v6h-6"/></svg>',
  tabmenu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10M4 18h16"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18" cy="12" r="1.7"/></svg>',
};

function defaultPrefs() {
  return {
    dock: "bottom",
    order: CATALOG.map((x) => x.id),
    hidden: [],
  };
}

function loadPrefs() {
  const base = defaultPrefs();
  try {
    const raw = localStorage.getItem(PREF_KEY) || localStorage.getItem("ComfyDock.prefs");
    if (!raw) return base;
    const p = JSON.parse(raw);
    const order = Array.isArray(p.order) ? p.order.filter((id) => CATALOG.some((c) => c.id === id)) : base.order;
    CATALOG.forEach((c) => {
      if (!order.includes(c.id)) order.push(c.id);
    });
    return {
      dock: p.dock === "top" ? "top" : "bottom",
      order,
      hidden: Array.isArray(p.hidden) ? p.hidden.filter((id) => CATALOG.some((c) => c.id === id)) : [],
    };
  } catch {
    return base;
  }
}

function savePrefs(p) {
  localStorage.setItem(PREF_KEY, JSON.stringify(p));
}

let prefs = loadPrefs();

function disabledByUrl() {
  try {
    const q = new URLSearchParams(window.location.search);
    return q.get("dgm") === "off" || q.get("dgm") === "0";
  } catch {
    return false;
  }
}

function isPhone() {
  if (disabledByUrl()) return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth <= 900;
  return coarse && narrow;
}

function toast(msg) {
  const el = document.getElementById(TOAST_ID);
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1600);
}

async function runCommand(id) {
  const exec = app.extensionManager?.command?.execute;
  if (typeof exec !== "function") return false;
  try {
    await exec(id);
    return true;
  } catch (e) {
    console.warn("[ComfyDock] command failed", id, e);
    return false;
  }
}

function showLeftSidebar() {
  const left = document.querySelector("#comfyui-body-left, .comfyui-body-left");
  if (left instanceof HTMLElement) {
    left.style.display = "flex";
    left.style.visibility = "visible";
    left.style.opacity = "1";
    left.style.zIndex = "10030";
    left.style.pointerEvents = "auto";
  }
}

function clickSidebarButton(patterns) {
  const root = document.getElementById(ROOT_ID);
  const buttons = document.querySelectorAll(
    "#comfyui-body-left button, .comfyui-body-left button, .side-tool-bar-container button, .side-bar-button, [class*='side-bar'] button"
  );
  for (const b of buttons) {
    if (root && root.contains(b)) continue;
    const t = `${b.getAttribute("aria-label") || ""} ${b.getAttribute("title") || ""}`.toLowerCase();
    if (patterns.some((p) => t.includes(p))) {
      b.click();
      return t.trim();
    }
  }
  return "";
}

async function openWorkflowTabMenu() {
  openTabMenuSheet();
}

function findActiveWorkflowTab() {
  const tabs = [...document.querySelectorAll('[data-testid="workflow-tab"]')];
  const wf = app.extensionManager?.workflow?.activeWorkflow;
  const name = `${wf?.filename || wf?.name || wf?.key || ""}`.split("/").pop().replace(/\.json$/i, "");
  if (name) {
    const hit = tabs.find((t) => (t.textContent || "").includes(name));
    if (hit) return hit;
  }
  return (
    tabs.find((t) => t.getAttribute("aria-selected") === "true") ||
    tabs.find((t) => t.className.toString().includes("active")) ||
    tabs[0] ||
    document.querySelector("#comfyui-body-top .workflow-tab, .comfyui-body-top .workflow-tab")
  );
}

function fireContextMenu(el) {
  const r = el.getBoundingClientRect();
  const x = Math.max(8, r.left + Math.min(48, r.width / 2));
  const y = Math.max(8, r.bottom - 4);
  const base = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    button: 2,
    buttons: 2,
  };
  el.dispatchEvent(new PointerEvent("pointerdown", { ...base, pointerId: 1, pointerType: "mouse" }));
  el.dispatchEvent(new MouseEvent("mousedown", base));
  el.dispatchEvent(new MouseEvent("mouseup", base));
  el.dispatchEvent(new MouseEvent("contextmenu", base));
}

const TAB_MENU_ITEMS = [
  { label: "Rename", cmds: ["Comfy.RenameWorkflow"] },
  { label: "Duplicate", cmds: ["Comfy.DuplicateWorkflow"] },
  { label: "Save", cmds: ["Comfy.SaveWorkflow", "Comfy.Save"] },
  { label: "Save As", cmds: ["Comfy.SaveWorkflowAs"] },
  { label: "Export", cmds: ["Comfy.ExportWorkflow"] },
  { label: "Export (API)", cmds: ["Comfy.ExportWorkflowAPI"] },
  { label: "Clear Workflow", cmds: ["Comfy.ClearWorkflow"] },
  { label: "Close Tab", cmds: ["Workspace.CloseWorkflow"] },
];

function openTabMenuSheet() {
  let sheet = document.getElementById("dgm-tabmenu");
  if (!sheet) {
    sheet = document.createElement("div");
    sheet.id = "dgm-tabmenu";
    sheet.innerHTML = `
      <div class="dgm-mask"></div>
      <div class="dgm-card">
        <div class="dgm-grabber" aria-hidden="true"></div>
        <h3>Current workflow</h3>
        <div class="dgm-actions dgm-tab-actions"></div>
        <button type="button" class="done">Cancel</button>
      </div>`;
    document.body.appendChild(sheet);
    sheet.querySelector(".dgm-mask").onclick = () => sheet.classList.remove("open");
    sheet.querySelector(".done").onclick = () => sheet.classList.remove("open");
    sheet.querySelector(".dgm-tab-actions").addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-cmds]");
      if (!btn) return;
      const cmds = JSON.parse(btn.getAttribute("data-cmds"));
      sheet.classList.remove("open");
      for (const id of cmds) {
        if (await runCommand(id)) {
          toast(btn.textContent.trim());
          return;
        }
      }
      toast("Command missing");
    });
  }
  const wf = app.extensionManager?.workflow?.activeWorkflow;
  const title = wf?.filename || wf?.name || "Current workflow";
  sheet.querySelector("h3").textContent = title;
  sheet.querySelector(".dgm-tab-actions").innerHTML = TAB_MENU_ITEMS.map(
    (it) =>
      `<button type="button" class="dgm-action" data-cmds='${JSON.stringify(it.cmds)}'>${it.label}</button>`
  ).join("");
  sheet.classList.add("open");
}

async function openAssets() {
  showLeftSidebar();
  if (await runCommand("Workspace.ToggleSidebarTab.assets")) {
    toast("Assets");
    return;
  }
  toast(clickSidebarButton(["asset", "media"]) || "Tap left Assets icon");
}

const MEDIA_OK = /\.(png|jpe?g|webp|gif|bmp|tiff?|avif|jfif|mp4|webm|mov|mkv)$/i;
const VIDEO_OK = /\.(mp4|webm|mov|mkv)$/i;
function isMediaName(name) {
  return MEDIA_OK.test(String(name || ""));
}
function isVideoName(name) {
  return VIDEO_OK.test(String(name || ""));
}

function viewUrl(item, mode) {
  if (!isMediaName(item.filename)) return "";
  const q = new URLSearchParams({
    filename: item.filename,
    type: item.type || "output",
    subfolder: item.subfolder || "",
  });
  if (isVideoName(item.filename)) return `/view?${q.toString()}`;
  if (mode === "thumb") {
    q.set("size", "160");
    q.set("q", "18");
  } else {
    q.set("size", "720");
    q.set("q", "35");
  }
  return `/dgm/thumb?${q.toString()}`;
}

let galleryItems = [];
let galleryIndex = 0;
let galleryPageSize = 20;
const GALLERY_FIRST = 20;
const GALLERY_MORE = 10;
const thumbQueue = [];
let thumbActive = 0;

function pumpThumbs() {
  while (thumbActive < 2 && thumbQueue.length) {
    const img = thumbQueue.shift();
    if (!img || !img.isConnected) continue;
    const src = img.getAttribute("data-src");
    if (!src) continue;
    thumbActive += 1;
    const done = () => {
      thumbActive = Math.max(0, thumbActive - 1);
      pumpThumbs();
    };
    img.onload = done;
    img.onerror = done;
    img.src = src;
    img.removeAttribute("data-src");
  }
}

function queueThumb(img) {
  thumbQueue.push(img);
  pumpThumbs();
}

function showGalleryFull(i) {
  const sheet = document.getElementById("dgm-gallery");
  if (!sheet || !galleryItems.length) return;
  galleryIndex = (i + galleryItems.length) % galleryItems.length;
  const it = galleryItems[galleryIndex];
  const full = sheet.querySelector(".dgm-g-full");
  const img = full.querySelector("img");
  let vid = full.querySelector("video");
  if (!vid) {
    vid = document.createElement("video");
    vid.setAttribute("controls", "");
    vid.setAttribute("playsinline", "");
    img.after(vid);
  }
  const src = viewUrl(it, "full");
  if (isVideoName(it.filename)) {
    img.hidden = true;
    img.removeAttribute("src");
    vid.hidden = false;
    vid.src = src;
  } else {
    vid.pause();
    vid.removeAttribute("src");
    vid.hidden = true;
    img.hidden = false;
    img.src = src;
  }
  full.hidden = false;
  const label = full.querySelector(".dgm-g-count");
  if (label) label.textContent = `${galleryIndex + 1} / ${galleryItems.length}`;
}

function bindGallerySwipe(full) {
  if (full._dgmSwipe) return;
  full._dgmSwipe = true;
  let x0 = 0;
  let y0 = 0;
  full.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      x0 = t.clientX;
      y0 = t.clientY;
    },
    { passive: true }
  );
  full.addEventListener(
    "touchend",
    (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) showGalleryFull(galleryIndex + 1);
      else showGalleryFull(galleryIndex - 1);
    },
    { passive: true }
  );
}

async function openGallery() {
  const url = new URL("/extensions/ComfyUI-ComfyDock/gallery.html", window.location.origin);
  const a = document.createElement("a");
  a.href = url.href;
  a.target = "comfydock-gallery";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast("Gallery tab");
}

async function openWorkflows() {
  showLeftSidebar();
  if (await runCommand("Workspace.ToggleSidebarTab.workflows")) {
    toast("Workflows");
    return;
  }
  toast(clickSidebarButton(["workflow"]) || "Tap left Workflows icon");
}

async function openQueue() {
  const el = document.querySelector(
    '[data-testid="queue-overlay-toggle"], button[aria-label*="job history" i], button[title*="job history" i]'
  );
  if (el instanceof HTMLElement) {
    el.click();
    toast("Job history");
    return;
  }
  showLeftSidebar();
  if (await runCommand("Comfy.Queue.ToggleOverlay")) {
    toast("Queue overlay");
    return;
  }
  if (await runCommand("Workspace.ToggleSidebarTab.queue")) {
    toast("Queue tab");
    return;
  }
  toast(clickSidebarButton(["job history", "queue"]) || "Queue control not found");
}

async function fitView() {
  if (await runCommand("Comfy.Canvas.FitView")) {
    toast("Fit view");
    return;
  }
  if (await runCommand("Comfy.Canvas.ResetView")) {
    toast("Reset view");
    return;
  }
  toast("Fit failed");
}

async function runPrompt() {
  if (await runCommand("Comfy.QueuePrompt")) {
    toast("Queued");
    return;
  }
  if (typeof app.queuePrompt === "function") {
    await app.queuePrompt(0);
    toast("Queued");
    return;
  }
  document.querySelector('[data-testid="queue-button"]')?.click();
  toast("Run clicked");
}

async function rebootServer() {
  if (!window.confirm("Reboot ComfyUI server?")) return;
  toast("Rebooting…");
  if (await runCommand("Comfy.Restart")) return;
  if (await runCommand("Manager.Restart")) return;
  const paths = ["/manager/reboot", "/api/manager/reboot", "/reboot", "/api/reboot"];
  for (const path of paths) {
    for (const method of ["GET", "POST"]) {
      try {
        const api = app.api;
        const res = typeof api?.fetchApi === "function"
          ? await api.fetchApi(path, { method })
          : await fetch(path, { method });
        if (res && res.status && res.status >= 400) continue;
        toast("Reboot sent");
        window.setTimeout(() => window.location.reload(), 4000);
        return;
      } catch {
        /* try next */
      }
    }
  }
  toast("Reboot API missing");
}

async function stopPrompt() {
  if (await runCommand("Comfy.Interrupt")) {
    toast("Stop");
    return;
  }
  app.api?.interrupt?.();
  toast("Stop");
}

const ACTIONS = {
  tabmenu: openWorkflowTabMenu,
  assets: openAssets,
  gallery: openGallery,
  workflows: openWorkflows,
  queue: openQueue,
  fit: fitView,
  run: runPrompt,
  stop: stopPrompt,
  reboot: rebootServer,
};

function applyDockClass() {
  document.documentElement.classList.toggle("dgm-top", prefs.dock === "top");
  document.documentElement.classList.toggle("dgm-bottom", prefs.dock === "bottom");
}

function gb(bytes) {
  const n = Number(bytes) || 0;
  return `${(n / 1073741824).toFixed(1)}G`;
}

function fmtUsed(free, total) {
  const t = Number(total) || 0;
  const f = Number(free) || 0;
  const used = Math.max(0, t - f);
  const pct = t ? Math.round((used / t) * 100) : 0;
  return `${gb(used)}/${gb(t)} ${pct}%`;
}

function shortGpuName(name) {
  const s = String(name || "GPU");
  const m = s.match(/RTX\s*\d+\s*\w*/i) || s.match(/RX\s*\d+\s*\w*/i) || s.match(/A\d{2,4}/);
  return m ? m[0].replace(/\s+/g, " ") : s.replace(/cuda:\d+\s*/i, "").split(":")[0].slice(0, 14);
}

async function fetchJson(path) {
  const api = app.api;
  const res = typeof api?.fetchApi === "function" ? await api.fetchApi(path) : await fetch(path);
  if (!res || (res.status && res.status >= 400)) return null;
  return res.json();
}

async function refreshStats() {
  const el = document.getElementById(STAT_ID);
  if (!el) return;
  try {
    const live = await fetchJson("/dgm/stats");
    const stock = await fetchJson("/system_stats");
    const sys = stock?.system || {};
    const devs = Array.isArray(stock?.devices) ? stock.devices : [];
    const stockGpu = devs.find((d) => /cuda|rocm|xpu|mps|hip/i.test(`${d.type} ${d.name}`)) || devs[0];
    const liveGpu = live?.gpus?.[0];

    let gpuTxt = "GPU \u2014";
    if (liveGpu) {
      const used = liveGpu.vram_used;
      const total = liveGpu.vram_total;
      const pct = total ? Math.round((used / total) * 100) : 0;
      const util = liveGpu.util != null ? ` ${Math.round(liveGpu.util)}%` : "";
      gpuTxt = `${shortGpuName(liveGpu.name)}${util} ${gb(used)}/${gb(total)} ${pct}%`;
    } else if (stockGpu) {
      gpuTxt = `${shortGpuName(stockGpu.name)} ${fmtUsed(stockGpu.vram_free, stockGpu.vram_total)}`;
    }

    let ramTxt = "RAM \u2014";
    if (live && live.ram_total) {
      ramTxt = `RAM ${gb(live.ram_used)}/${gb(live.ram_total)} ${Math.round(live.ram_percent)}%`;
    } else if (sys.ram_total) {
      ramTxt = `RAM ${fmtUsed(sys.ram_free, sys.ram_total)}`;
    }

    let cpuTxt = "CPU \u2014";
    const cpu = live?.cpu_percent;
    if (cpu != null && !Number.isNaN(Number(cpu))) {
      cpuTxt = `CPU ${Math.round(Number(cpu))}%`;
    }

    el.innerHTML = `<span>${gpuTxt}</span><span>${ramTxt}</span><span>${cpuTxt}</span>`;
  } catch {
    el.innerHTML = "<span>GPU \u2014</span><span>RAM \u2014</span><span>CPU \u2014</span>";
  }
}

let statsTimer = 0;
function startStats() {
  if (statsTimer) window.clearInterval(statsTimer);
  refreshStats();
  statsTimer = window.setInterval(refreshStats, 2500);
}
