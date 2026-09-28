/**
 * ComfyDock
 * Solid edge-to-edge phone tab bar + status strip (pre-liquid-glass).
 * Dock top/bottom. Show/hide + reorder. Prefs in localStorage.
 * Gallery is a separate Photos-style page. Does not touch LiteGraph.
 * Disable with ?dgm=off
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
    const raw = localStorage.getItem(PREF_KEY) || localStorage.getItem("DesktopGraphMobile.prefs");
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

    let gpuTxt = "GPU —";
    if (liveGpu) {
      const used = liveGpu.vram_used;
      const total = liveGpu.vram_total;
      const pct = total ? Math.round((used / total) * 100) : 0;
      const util = liveGpu.util != null ? ` ${Math.round(liveGpu.util)}%` : "";
      gpuTxt = `${shortGpuName(liveGpu.name)}${util} ${gb(used)}/${gb(total)} ${pct}%`;
    } else if (stockGpu) {
      gpuTxt = `${shortGpuName(stockGpu.name)} ${fmtUsed(stockGpu.vram_free, stockGpu.vram_total)}`;
    }

    let ramTxt = "RAM —";
    if (live && live.ram_total) {
      ramTxt = `RAM ${gb(live.ram_used)}/${gb(live.ram_total)} ${Math.round(live.ram_percent)}%`;
    } else if (sys.ram_total) {
      ramTxt = `RAM ${fmtUsed(sys.ram_free, sys.ram_total)}`;
    }

    let cpuTxt = "CPU —";
    const cpu = live?.cpu_percent;
    if (cpu != null && !Number.isNaN(Number(cpu))) {
      cpuTxt = `CPU ${Math.round(Number(cpu))}%`;
    }

    el.innerHTML = `<span>${gpuTxt}</span><span>${ramTxt}</span><span>${cpuTxt}</span>`;
  } catch {
    el.innerHTML = "<span>GPU —</span><span>RAM —</span><span>CPU —</span>";
  }
}

let statsTimer = 0;
function startStats() {
  if (statsTimer) window.clearInterval(statsTimer);
  refreshStats();
  statsTimer = window.setInterval(refreshStats, 2500);
}

function injectCss() {
  let css = document.getElementById(STYLE_ID);
  if (!css) {
    css = document.createElement("style");
    css.id = STYLE_ID;
    document.head.appendChild(css);
  }
  css.textContent = `
html.dgm-on {
  --dgm-accent: #0a84ff;
  --dgm-green: #30d158;
  --dgm-red: #ff453a;
  --dgm-label: rgba(235,235,245,0.58);
  --dgm-label-on: #f2f2f7;
  --dgm-bar-bg: rgba(22, 22, 24, 0.97);
  --dgm-sheet-bg: #1c1c1e;
  --dgm-hairline: rgba(255,255,255,0.16);
  --dgm-bar-h: 49px;
  --dgm-bar: calc(var(--dgm-bar-h) + env(safe-area-inset-bottom, 0px));
  --dgm-bar-top: calc(var(--dgm-bar-h) + env(safe-area-inset-top, 0px));
  --dgm-stats: calc(30px + env(safe-area-inset-top, 0px));
  --dgm-stats-bottom: calc(30px + env(safe-area-inset-bottom, 0px));
  -webkit-tap-highlight-color: transparent;
}
html.dgm-on.dgm-bottom .comfyui-body,
html.dgm-on.dgm-bottom #comfyui-body {
  padding-bottom: var(--dgm-bar) !important;
  padding-top: var(--dgm-stats) !important;
  box-sizing: border-box !important;
}
html.dgm-on.dgm-top .comfyui-body,
html.dgm-on.dgm-top #comfyui-body {
  padding-top: var(--dgm-bar-top) !important;
  padding-bottom: var(--dgm-stats-bottom) !important;
  box-sizing: border-box !important;
}
html.dgm-on.dgm-bottom #comfyui-body-bottom,
html.dgm-on.dgm-bottom .comfyui-body-bottom,
html.dgm-on.dgm-bottom .graph-canvas-menu,
html.dgm-on.dgm-bottom [class*="graph-canvas-menu"] {
  bottom: var(--dgm-bar) !important;
}
html.dgm-on.dgm-top #comfyui-body-top,
html.dgm-on.dgm-top .comfyui-body-top {
  top: var(--dgm-bar-top) !important;
}
html.dgm-on.dgm-bottom #comfyui-body-top,
html.dgm-on.dgm-bottom .comfyui-body-top {
  top: var(--dgm-stats) !important;
}
html.dgm-on.dgm-top #comfyui-body-bottom,
html.dgm-on.dgm-top .comfyui-body-bottom,
html.dgm-on.dgm-top .graph-canvas-menu,
html.dgm-on.dgm-top [class*="graph-canvas-menu"] {
  bottom: var(--dgm-stats-bottom) !important;
}

#dgm-stats {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  pointer-events: none;
  width: auto;
  max-width: none;
  background: rgba(12, 12, 14, 0.96);
  color: rgba(235,235,245,0.9);
  font: 600 11px/1.1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  letter-spacing: -0.02em;
  box-sizing: border-box;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
html.dgm-bottom #dgm-stats {
  top: 0;
  bottom: auto;
  height: var(--dgm-stats);
  min-height: 0;
  padding: env(safe-area-inset-top, 0px) 12px 0;
  border-bottom: 0.5px solid var(--dgm-hairline);
}
html.dgm-top #dgm-stats {
  bottom: 0;
  top: auto;
  height: var(--dgm-stats-bottom);
  min-height: 0;
  padding: 0 12px env(safe-area-inset-bottom, 0px);
  border-top: 0.5px solid var(--dgm-hairline);
}
#dgm-stats span { white-space: nowrap; opacity: 0.92; }
#dgm-stats span + span::before {
  content: "·";
  margin-right: 10px;
  opacity: 0.35;
  font-weight: 700;
}

#dgm-root {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 41;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  gap: 0;
  pointer-events: auto;
  background: var(--dgm-bar-bg);
  box-sizing: border-box;
  border-radius: 0;
  border: 0;
  box-shadow: none;
  overflow: hidden;
}
html.dgm-bottom #dgm-root {
  top: auto;
  bottom: 0;
  height: var(--dgm-bar);
  padding: 2px 2px env(safe-area-inset-bottom, 0px);
  border-top: 0.5px solid var(--dgm-hairline);
}
html.dgm-top #dgm-root {
  bottom: auto;
  top: 0;
  height: var(--dgm-bar-top);
  padding: env(safe-area-inset-top, 0px) 2px 2px;
  border-bottom: 0.5px solid var(--dgm-hairline);
}
#dgm-root button {
  appearance: none;
  -webkit-appearance: none;
  flex: 1 1 0;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--dgm-label);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 4px 2px;
  border-radius: 8px;
  font: 510 10px/1.05 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  letter-spacing: -0.02em;
}
#dgm-root button svg { width: 24px; height: 24px; display: block; }
#dgm-root button span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#dgm-root button:active {
  background: rgba(255,255,255,0.08);
  opacity: 0.72;
}
#dgm-root button.primary { color: var(--dgm-green); }
#dgm-root button.warn { color: var(--dgm-red); }
#dgm-root button[data-act="more"] { color: var(--dgm-accent); }

#dgm-toast {
  position: fixed;
  left: 50%;
  transform: translateX(-50%) translateY(6px);
  z-index: 10070;
  pointer-events: none;
  background: #2c2c2e;
  color: #fff;
  padding: 10px 14px;
  border-radius: 10px;
  border: 0.5px solid rgba(255,255,255,0.12);
  font: 600 13px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  letter-spacing: -0.02em;
  opacity: 0;
  transition: opacity .22s ease, transform .22s ease;
}
html.dgm-bottom #dgm-toast { bottom: calc(var(--dgm-bar) + 14px); top: auto; }
html.dgm-top #dgm-toast { top: calc(var(--dgm-bar-top) + 14px); bottom: auto; }
#dgm-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

#dgm-sheet, #dgm-tabmenu {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 10080;
}
#dgm-sheet.open, #dgm-tabmenu.open { display: block; }
#dgm-tabmenu .dgm-mask,
#dgm-sheet .dgm-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
}
#dgm-sheet .dgm-card,
#dgm-tabmenu .dgm-card {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 82vh;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--dgm-sheet-bg);
  color: #f2f2f7;
  border-radius: 14px 14px 0 0;
  border-top: 0.5px solid var(--dgm-hairline);
  padding: 6px 16px calc(18px + env(safe-area-inset-bottom, 0px));
  font: 400 15px/1.3 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}
.dgm-grabber {
  width: 36px;
  height: 5px;
  border-radius: 999px;
  background: rgba(235,235,245,0.28);
  margin: 4px auto 10px;
}
#dgm-sheet h3, #dgm-tabmenu h3 {
  margin: 0 0 10px;
  text-align: center;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.03em;
  color: #f2f2f7;
}
#dgm-sheet .hint {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.35;
  color: rgba(235,235,245,0.55);
  text-align: center;
}
#dgm-sheet .seg {
  display: flex;
  background: rgba(118,118,128,0.24);
  border-radius: 10px;
  padding: 2px;
  margin-bottom: 14px;
}
#dgm-sheet .seg button {
  flex: 1;
  border: 0;
  background: transparent;
  color: #f2f2f7;
  border-radius: 8px;
  min-height: 32px;
  font: 600 13px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  letter-spacing: -0.02em;
}
#dgm-sheet .seg button.on {
  background: #636366;
}
#dgm-sheet .dgm-group {
  background: #2c2c2e;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}
#dgm-sheet .row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 12px;
  border-bottom: 0.5px solid rgba(255,255,255,0.08);
  min-height: 48px;
}
#dgm-sheet .row:last-child { border-bottom: 0; }
#dgm-sheet .name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: #f2f2f7;
  text-align: left;
  font: 400 17px/1.2 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  letter-spacing: -0.02em;
  padding: 0;
}
#dgm-sheet .name svg {
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  color: var(--dgm-accent);
  background: rgba(10,132,255,0.16);
  border-radius: 7px;
  padding: 4px;
  box-sizing: content-box;
}
#dgm-sheet .mini {
  min-width: 34px;
  min-height: 32px;
  border: 0;
  border-radius: 9px;
  background: rgba(118,118,128,0.28);
  color: #f2f2f7;
  font-size: 14px;
  font-weight: 600;
}
#dgm-sheet .mini[data-toggle="1"] {
  min-width: 64px;
  font-size: 12px;
  letter-spacing: -0.01em;
}
#dgm-sheet .mini[data-toggle="1"].on {
  background: rgba(48,209,88,0.22);
  color: var(--dgm-green);
}
#dgm-sheet .done, #dgm-tabmenu .done {
  width: 100%;
  margin-top: 8px;
  min-height: 50px;
  border: 0;
  border-radius: 14px;
  background: var(--dgm-accent);
  color: #fff;
  font: 600 17px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  letter-spacing: -0.02em;
}
#dgm-tabmenu .done {
  background: rgba(118,118,128,0.36);
  box-shadow: none;
}
#dgm-tabmenu .dgm-action {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 0.5px solid rgba(255,255,255,0.08);
  color: #f2f2f7;
  min-height: 48px;
  padding: 12px 4px;
  font: 400 17px/1.2 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  letter-spacing: -0.02em;
}
#dgm-tabmenu .dgm-action:last-of-type { border-bottom: 0; }
#dgm-tabmenu .dgm-actions {
  background: #2c2c2e;
  border-radius: 12px;
  padding: 0 12px;
  margin-bottom: 8px;
}

#dgm-gallery {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 20050;
  background: #000;
  color: #fff;
}
#dgm-gallery.open { display: flex; flex-direction: column; }
#dgm-gallery .dgm-g-head {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(8px + env(safe-area-inset-top, 0px)) 10px 8px;
  padding-right: 76px;
  background: rgba(28,28,30,0.86);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  backdrop-filter: saturate(180%) blur(24px);
  border-bottom: 0.5px solid var(--dgm-hairline);
}
#dgm-gallery .dgm-g-head .dgm-g-close,
#dgm-gallery .dgm-g-full .dgm-g-close {
  position: fixed;
  top: calc(8px + env(safe-area-inset-top, 0px));
  right: 10px;
  left: auto;
  z-index: 20100;
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: rgba(118,118,128,0.36);
  color: #fff;
  font: 600 14px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}
#dgm-gallery .dgm-g-grid {
  flex: 1;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
  padding-bottom: 8px;
  background: #000;
}
#dgm-gallery .tile {
  border: 0;
  padding: 0;
  background: #111;
  aspect-ratio: 1;
  overflow: hidden;
}
#dgm-gallery .tile.vid {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ddd;
  font: 600 10px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}
#dgm-gallery .dgm-g-full video {
  max-width: 100%;
  max-height: 100%;
}
#dgm-gallery .dgm-g-full {
  position: absolute;
  inset: 0;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: env(safe-area-inset-top, 0px);
}
#dgm-gallery .dgm-g-full[hidden] { display: none; }
#dgm-gallery .dgm-g-full img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
#dgm-gallery .dgm-g-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 22px;
  background: rgba(44,44,46,0.8);
  color: #fff;
  font-size: 28px;
  line-height: 1;
}
#dgm-gallery .dgm-g-nav.prev { left: 8px; }
#dgm-gallery .dgm-g-nav.next { right: 8px; }
#dgm-gallery .dgm-g-count {
  position: absolute;
  left: 50%;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: 2;
  font: 600 12px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  color: #ddd;
}
#dgm-gallery .dgm-g-more {
  margin: 8px 12px calc(10px + env(safe-area-inset-bottom, 0px));
  min-height: 44px;
  border: 0;
  border-radius: 14px;
  background: rgba(118,118,128,0.36);
  color: #fff;
  font: 600 16px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}
#dgm-gallery .dgm-g-more[hidden] { display: none; }
#dgm-gallery .seg { flex: 1; display: flex; background: rgba(118,118,128,0.24); border-radius: 10px; padding: 2px; }
#dgm-gallery .seg button {
  flex: 1; border: 0; background: transparent; color: #fff;
  min-height: 32px; border-radius: 8px;
  font: 600 13px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}
#dgm-gallery .seg button.on { background: rgba(99,99,102,0.9); }

html.dgm-on canvas#graph-canvas,
html.dgm-on .graph-canvas-container canvas {
  touch-action: none !important;
}
`;
}

function visibleIds() {
  return prefs.order.filter((id) => !prefs.hidden.includes(id));
}

function runMenuItem(id) {
  closeSheet();
  document.getElementById("dgm-tabmenu")?.classList.remove("open");
  const fn = ACTIONS[id];
  if (fn) fn();
}

function renderBar() {
  const root = document.getElementById(ROOT_ID);
  if (!root) return;
  const items = visibleIds()
    .map((id) => {
      const meta = CATALOG.find((c) => c.id === id);
      if (!meta) return "";
      const extra = id === "run" ? " primary" : id === "stop" || id === "reboot" ? " warn" : "";
      return `<button type="button" class="${extra.trim()}" data-act="${id}">${ICONS[id]}<span>${meta.label}</span></button>`;
    })
    .join("");
  root.innerHTML = `<button type="button" data-act="more">${ICONS.more}<span>Menu</span></button>${items}`;
  root.querySelectorAll("button[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const act = btn.getAttribute("data-act");
      if (act === "more") {
        openSheet();
        return;
      }
      ACTIONS[act]?.();
    });
  });
}

function openSheet() {
  const sheet = document.getElementById(SHEET_ID);
  if (!sheet) return;
  const rows = prefs.order
    .map((id, i) => {
      const meta = CATALOG.find((c) => c.id === id);
      const onBar = !prefs.hidden.includes(id);
      return `<div class="row" data-id="${id}">
        <button class="name" data-open="1">${ICONS[id] || ""}${meta.label}</button>
        <button class="mini" data-move="up" ${i === 0 ? "disabled" : ""}>↑</button>
        <button class="mini" data-move="down" ${i === prefs.order.length - 1 ? "disabled" : ""}>↓</button>
        <button class="mini${onBar ? " on" : ""}" data-toggle="1">${onBar ? "On" : "Off"}</button>
      </div>`;
    })
    .join("");
  sheet.querySelector(".dgm-list").innerHTML = `<div class="dgm-group">${rows}</div>`;
  sheet.querySelectorAll("[data-dock]").forEach((b) => {
    b.classList.toggle("on", b.getAttribute("data-dock") === prefs.dock);
  });
  sheet.classList.add("open");
}

function closeSheet() {
  document.getElementById(SHEET_ID)?.classList.remove("open");
}

function moveId(id, dir) {
  const i = prefs.order.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= prefs.order.length) return;
  const next = prefs.order.slice();
  const [item] = next.splice(i, 1);
  next.splice(j, 0, item);
  prefs.order = next;
  savePrefs(prefs);
  renderBar();
  openSheet();
}

function toggleId(id) {
  if (prefs.hidden.includes(id)) {
    prefs.hidden = prefs.hidden.filter((x) => x !== id);
  } else {
    prefs.hidden = [...prefs.hidden, id];
  }
  savePrefs(prefs);
  renderBar();
  openSheet();
}

function setDock(dock) {
  prefs.dock = dock === "top" ? "top" : "bottom";
  savePrefs(prefs);
  applyDockClass();
  renderBar();
  openSheet();
}

function buildChrome() {
  document.getElementById(ROOT_ID)?.remove();
  document.getElementById(SHEET_ID)?.remove();
  document.getElementById(TOAST_ID)?.remove();
  document.getElementById(STAT_ID)?.remove();

  const root = document.createElement("nav");
  root.id = ROOT_ID;
  root.setAttribute("aria-label", "Mobile dock");
  document.body.appendChild(root);

  const tip = document.createElement("div");
  tip.id = TOAST_ID;
  document.body.appendChild(tip);

  const stats = document.createElement("div");
  stats.id = STAT_ID;
  stats.innerHTML = "<span>GPU …</span><span>RAM …</span><span>CPU …</span>";
  document.body.appendChild(stats);
  startStats();

  const sheet = document.createElement("div");
  sheet.id = SHEET_ID;
  sheet.innerHTML = `
    <div class="dgm-mask"></div>
    <div class="dgm-card">
      <div class="dgm-grabber" aria-hidden="true"></div>
      <h3>Customize</h3>
      <p class="hint">Tap a name to open it. Off only hides it from the floating bar.</p>
      <div class="seg">
        <button type="button" data-dock="top">Top</button>
        <button type="button" data-dock="bottom">Bottom</button>
      </div>
      <div class="dgm-list"></div>
      <button type="button" class="done">Done</button>
    </div>
  `;
  document.body.appendChild(sheet);
  sheet.querySelector(".dgm-mask").onclick = closeSheet;
  sheet.querySelector(".done").onclick = closeSheet;
  sheet.querySelectorAll("[data-dock]").forEach((b) => {
    b.onclick = () => setDock(b.getAttribute("data-dock"));
  });
  sheet.querySelector(".dgm-list").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    const row = e.target.closest(".row");
    if (!btn || !row) return;
    const id = row.getAttribute("data-id");
    if (btn.hasAttribute("data-open")) {
      runMenuItem(id);
    } else if (btn.hasAttribute("data-move")) {
      moveId(id, btn.getAttribute("data-move") === "up" ? -1 : 1);
    } else if (btn.hasAttribute("data-toggle")) {
      toggleId(id);
    }
  });
  renderBar();
}

function start() {
  if (!isPhone()) {
    document.getElementById(ROOT_ID)?.remove();
    document.getElementById(SHEET_ID)?.remove();
    document.getElementById(TOAST_ID)?.remove();
    document.getElementById(STAT_ID)?.remove();
    if (statsTimer) window.clearInterval(statsTimer);
    document.documentElement.classList.remove("dgm-on", "dgm-top", "dgm-bottom");
    console.log("[ComfyDock] desktop/wide — no chrome");
    return;
  }
  prefs = loadPrefs();
  document.documentElement.classList.add("dgm-on");
  applyDockClass();
  injectCss();
  buildChrome();
  console.log("[ComfyDock] phone dock");
}

try {
  app.registerExtension({
    name: EXT,
    async setup() {
      window.setTimeout(start, 800);
    },
  });
} catch (e) {
  console.warn("[ComfyDock] register failed", e);
}
