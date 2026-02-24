type MapArgs = {
  mountEl: HTMLElement;
  props?: any;
};

export default function renderMap({ mountEl, props }: MapArgs) {
  const d3 = (globalThis as any).d3;
  if (!d3) return;

  const rootStyles = getComputedStyle(document.documentElement);
  const paperDark = rootStyles.getPropertyValue("--paper-dark").trim() || "#0E1428";
  const ink = rootStyles.getPropertyValue("--ink").trim() || "#F3F6FF";
  const inkMuted = rootStyles.getPropertyValue("--ink-muted").trim() || "#7E8AB8";

  const fallbackProvinces = [
    "Aceh",
    "Sumut",
    "Sumbar",
    "Riau",
    "Jambi",
    "Sumsel",
    "Bengkulu",
    "Lampung",
    "Bangka",
    "Kepri",
    "DKI",
    "Jabar",
    "Jateng",
    "DIY",
    "Jatim",
    "Banten",
    "Bali",
    "NTB",
    "NTT",
    "Kalbar",
    "Kalteng",
    "Kalsel",
    "Kaltim",
    "Kalut",
    "Sulut",
    "Sulteng",
    "Sulsel",
    "Sultra",
    "Gorontalo",
    "Sulbar",
    "Maluku",
    "Malut",
    "Papua Barat",
    "Papua",
  ];
  const fallbackValues = [
    83, 76, 82, 78, 80, 75, 81, 79, 80, 71, 69, 72, 82, 85, 82, 73, 86, 85, 87, 75, 77, 79, 73, 74, 84,
    81, 84, 83, 86, 84, 86, 88, 85, 88,
  ];
  const provinces = (props?.provinces || fallbackProvinces) as string[];
  const rVal = (props?.values || fallbackValues) as number[];
  const domain = (props?.domain || [68, 90]) as [number, number];
  const noteHtml = (props?.noteHtml || "🔵 Darker = Higher Turnout<br>Hover each province for details") as string;

  const grid = document.createElement("div");
  grid.className = "map-visual";

  const colorScale = d3.scaleSequential().domain(domain).interpolator(d3.interpolateBlues);

  provinces.forEach((p, i) => {
    const cell = document.createElement("div");
    cell.className = "province-cell";
    cell.style.background = colorScale(rVal[i]);
    cell.style.opacity = "0";
    cell.textContent = p.substring(0, 3).toUpperCase();
    const tip = document.createElement("div");
    tip.className = "tooltip";
    tip.innerHTML = `<strong>${p}</strong><br>Turnout: ${rVal[i]}%`;
    cell.appendChild(tip);
    setTimeout(() => {
      cell.style.transition = "opacity 0.4s ease, transform 0.3s ease";
      cell.style.opacity = "1";
    }, i * 40 + 200);
    grid.appendChild(cell);
  });

  const note = document.createElement("div");
  note.style.cssText = [
    "position:absolute",
    "right:0",
    "bottom:0",
    "font-family:Inter,sans-serif",
    "font-size:11px",
    "color:var(--ink-muted)",
    "text-align:right",
    "line-height:1.5",
    "padding:5px 8px",
    "border-radius:8px",
    "background:color-mix(in srgb, var(--paper-dark) 70%, transparent)",
    "backdrop-filter:blur(4px)",
    "-webkit-backdrop-filter:blur(4px)",
  ].join(";");
  note.innerHTML = noteHtml;

  mountEl.replaceChildren();
  mountEl.appendChild(grid);
  mountEl.appendChild(note);
}
