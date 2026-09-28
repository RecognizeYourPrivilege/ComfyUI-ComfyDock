# ComfyDock

**Mobile liquid-glass dock for stock ComfyUI.**

ComfyDock does **not** replace the graph. It wraps the **official desktop LiteGraph canvas** with an iOS-style floating tab bar, so you can run the real ComfyUI editor on a phone.

- Official bezier graph (nodes, wires, widgets, groups)
- Official Assets / Workflows / Queue / Job History
- Official Run / Interrupt commands
- Phone-only chrome (coarse pointer + width ≤ 900). Desktop is untouched.

> Open the normal ComfyUI URL on your phone (`http://HOST:8188`), **not** a separate `/mobile` app.

---

## Install (easiest)

### Option A — ComfyUI Manager

1. Open **ComfyUI Manager**
2. **Install via Git URL**
3. Paste:

```text
https://github.com/RecognizeYourPrivilege/ComfyUI-ComfyDock
```

4. Restart ComfyUI
5. On your phone, hard-refresh: `http://HOST:8188/?v=1`

### Option B — git clone

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/RecognizeYourPrivilege/ComfyUI-ComfyDock
```

Restart ComfyUI. Folder name must stay `ComfyUI-ComfyDock` (extension paths depend on it).

### Option C — manual zip

1. Download the repo ZIP from GitHub
2. Extract into `ComfyUI/custom_nodes/ComfyUI-ComfyDock/`
3. Restart ComfyUI

### Optional dependency

For richer CPU/RAM stats:

```bash
pip install -r ComfyUI/custom_nodes/ComfyUI-ComfyDock/requirements.txt
```

`psutil` is optional. Without it, ComfyDock still works and falls back to `/proc` / ComfyUI `system_stats`.

---

## Quick start (phone)

1. Install + restart ComfyUI
2. Open **the desktop URL** on the phone (Safari / Chrome)
3. You should see:
   - A **capsule** status strip (GPU / RAM / CPU)
   - A **floating liquid-glass tab bar** (bottom by default)
4. Load a workflow and tap **Run**

Disable without uninstalling:

```text
http://HOST:8188/?dgm=off
```

(Same kill switch as earlier builds; kept for compatibility.)

---

## Features

### Floating iOS tab bar

Phone-only overlay with blur glass, safe-area padding, and large tap targets:

| Button | What it does |
|--------|----------------|
| **Menu** | Customize dock (order, show/hide, top/bottom) |
| **Tab** | Workflow actions sheet (Rename, Duplicate, Save, Export, Close, …) via official commands |
| **Assets** | Official Assets sidebar tab |
| **Gallery** | Photos-style gallery (outputs / inputs / temp) in a separate tab |
| **Workflows** | Official Workflows sidebar tab |
| **Queue** | Official job history / queue overlay |
| **Fit** | `Comfy.Canvas.FitView` |
| **Run** | `Comfy.QueuePrompt` (green) |
| **Stop** | `Comfy.Interrupt` (red) |
| **Reboot** | Restart ComfyUI when Manager / reboot API is available |

Buttons can be **reordered** or **hidden** from the Menu sheet. Hidden buttons stay available inside Menu.

### Capsule system stats

Live GPU / RAM / CPU readout in a compact pill (does not block taps on the graph). Uses `/dgm/stats` when the Python side is loaded, with fallback to ComfyUI `/system_stats`.

### Gallery

Photos-style gallery for Output, Input, and Temp — large album title, 3-up cover grid, and a fullscreen viewer — using `/dgm/gallery` and `/dgm/thumb`.

### Customize sheet

- Dock **Top** or **Bottom**
- Reorder bar buttons
- Toggle On/Off per button
- Prefs persist in `localStorage` key `ComfyDock.prefs` (migrates older `DesktopGraphMobile.prefs` automatically)

### What ComfyDock deliberately does **not** do

- ❌ Second frontend / fake graph
- ❌ Recreate nodes as HTML cards
- ❌ Hide or replace the official Run box as the only run path (bar Run is an alias)
- ❌ Touch `app.graph` / `app.canvas` ownership
- ❌ Require a `/mobile` route

---

## Compatibility notes

- **Do not** install **ComfyUI-MobileFriendly** next to ComfyDock. That pack hides the floating Run box; ComfyDock’s job is the opposite (keep stock UI reachable).
- Best on **iPhone Safari** or Android Chrome with a coarse pointer and width ≤ 900.
- Wide / desktop sessions: ComfyDock injects **no chrome**.

---

## Layout

```text
ComfyUI-ComfyDock/
  __init__.py          # optional /dgm/stats + /dgm/thumb routes
  requirements.txt     # optional psutil
  LICENSE
  README.md
  js/
    comfydock.js       # phone dock + sheets
    gallery.html       # gallery page
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| No bar on phone | Hard refresh `?v=1`, confirm folder name is `ComfyUI-ComfyDock`, restart ComfyUI |
| Bar on desktop | Expected only when pointer is coarse **and** width ≤ 900 |
| Run does nothing | Check official queue still works on desktop; ComfyDock only calls `Comfy.QueuePrompt` |
| Stats stuck on — | Install `psutil` or ensure `nvidia-smi` is on PATH for GPU util |
| Want stock UI only | Add `?dgm=off` or remove the custom node folder |

---

## License

MIT — see [LICENSE](LICENSE).

---

## Credits

Built as a thin shell around stock ComfyUI. The graph is ComfyUI’s; ComfyDock is only the phone dock.
