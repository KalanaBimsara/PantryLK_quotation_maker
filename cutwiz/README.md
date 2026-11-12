<p align="center">
  <img width="1200" height="480" alt="Sumire nails" src="https://github.com/user-attachments/assets/31b80903-ecf2-4168-9cf1-1034aea75eb8" />
</p>


# CutWizard 

![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square&logo=typescript)
![pnpm](https://img.shields.io/badge/pnpm-11-orange?style=flat-square&logo=pnpm)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38bdf8?style=flat-square&logo=tailwind-css)

CutWizard is a lightweight, shop-friendly tool that helps you figure out the smartest way to cut your boards, sheets, panels, and lumber.  
Drop in your materials, add your parts, and boom — instant cut plan. Kerf included, drama excluded.

---

## 🔑 Key Features

* **🪚 Strict Guillotine-Cut Algorithm**  
  Every cut goes edge-to-edge across the sheet, keeping layouts shop-friendly and buildable on real panel saws and table saws. No impossible internal cuts.

* **🚀 Multi-Pass Optimization Engine**  
  Why settle for a single greedy pass? CutWizard runs 5 heuristic sorting strategies concurrently (Area, Longest Edge, Height, Width, Perimeter) and picks the one that saves the most boards and cuts the least dust.

* **🪵 Grain Direction Control (Wood Lovers Rejoice)**  
  Because rotating a wood-grain drawer face sideways is a woodworking crime. Lock orientation per piece so the grain stays continuous across your doors and tops.

* **📐 Toggleable Trim / Perimeter Margin**  
  Factory edges get beat up on delivery trucks. Toggle an optional trim margin (e.g., 10 mm) with a single click to square up the board before placing your actual parts.

* **🔍 Interactive SVG Visualizer (Zoom & Pan)**  
  Inspect 2.8-meter boards with ease. Zoom in, pan around with your mouse, check exact piece coordinates, and admire your layout without squinting.

* **🖨️ Workshop-Ready PDF & Print Mode**  
  One-click print button formatted specifically for paper and clipboard. Strips away browser chrome, keeps diagrams high-contrast, and delivers a clean cutting ticket straight to the table saw.

* **📊 Live Metrics & Yield Dashboard**  
  A clean 3×2 KPI card layout showing total yield, total waste, boards required, cut count, linear cut meters, and usable offcuts — with interactive explanatory tooltips right on the cards.

* **🌗 Real Dark Mode**  
  Day shift, night shift, or 2 AM garage workshop madness. The board canvas and UI adjust dynamically so your eyes don't burn.

* **📥 Smart CSV Import & Export**  
  Toss in your cutlists straight from Excel or CSV. Download the production breakdown with `(X, Y)` coordinates ready for the workshop floor.

* **📋 Commercial Sheet Presets**  
  Instant presets for standard sheets: Melamine 2750 × 1830 mm, MDF 2600 × 1830 mm, Plywood 2440 × 1220 mm (8×4 ft), and more.

* **💾 Auto-Persistence**  
  Everything auto-saves to `localStorage`. Refresh all you want; your pieces aren't going anywhere.

* **♻️ Usable Offcut Detection**  
  Shows exactly what leftovers you’ll get, so you can pretend you’re being sustainable and not just hoarding scrap wood in the corner.

---

## 🚀 Tech Stack

* **React 19** – modern, fast, and full of Hooks you’ll pretend to understand.  
* **TypeScript 5.8** – helps prevent math crimes.  
* **pnpm 11** – because life is too short to wait on slow package managers.  
* **Vite 6** – builds so fast you'll barely have time to blink.  
* **Tailwind CSS** – clean styling without writing 5,000 lines of manual CSS.  
* **Custom 2D Multi-Pass Packing Engine** – written by hand, because AI can’t have all the fun (por ahora).

---

## 🛠️ Quick Start

Grab **pnpm** and let's cut:

```bash
# 1. Clone the repo
git clone https://github.com/alvaro-salort/CutWizard.git
cd CutWizard

# 2. Install dependencies with pnpm
pnpm install

# 3. Fire up the dev server
pnpm dev
```

To build for production:
```bash
pnpm build
```

---

## 🧠 How the Algorithm Works

CutWizard follows a simple, smart, and realistic flow:

1. **Trim Edge:** Carves out the waste border if you asked for it.  
2. **Multi-Pass Sort:** Sorts parts using multiple heuristic weights (biggest area, longest side, etc.).  
3. **Grain Check:** If a piece has a locked grain, it stays put. If rotation is free, it tests both orientations to minimize leftover scrap.  
4. **Guillotine Split:** Leftover zones get sliced cleanly into new rectangular zones.  
5. **Pick the Winner:** CutWizard compares all passes and serves you the layout with the least sheets and highest yield.

---

<img width="1366" height="1082" alt="image" src="https://github.com/user-attachments/assets/e4559496-186e-4d7a-8688-860a550d7851" />


---

## 🤝 Contributing

PRs, issues, ideas — all welcome.  
If you want to break it, improve it, or make it do something weird, go for it.

1. Fork the repo  
2. Create a branch (`git checkout -b feature/magic`)  
3. Do your magic  
4. Send a PR  
5. Celebrate responsibly  

---

## 📄 License

This project is basically “free to use, modify, break, rebuild, and brag about.”  
Do whatever you want with it. No lawyers involved.

---

Built with ❤️ — mostly as an excuse to learn, experiment, and become slightly less terrible at coding.  
If it helps someone else along the way, even better.
