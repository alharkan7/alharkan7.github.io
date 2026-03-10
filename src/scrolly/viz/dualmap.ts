type DualMapArgs = { mountEl: HTMLElement; props?: any };
export default function renderDualMap({ mountEl, props }: DualMapArgs) {
    mountEl.replaceChildren();

    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.style.justifyContent = "center";

    const scrollContainer = document.createElement("div");
    scrollContainer.style.width = "100%";
    scrollContainer.style.overflowX = "auto";
    (scrollContainer.style as any).webkitOverflowScrolling = "touch";

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.gap = "20px";
    container.style.width = "100%";
    container.style.padding = "10px 0";
    container.style.boxSizing = "border-box";

    const mapA = document.createElement("div");
    mapA.style.flex = "1";
    mapA.style.minWidth = "0"; // Prevent flex-basis issues
    mapA.innerHTML = '<h4 style="text-align:center; color: var(--ink); margin-bottom: 12px; font-family: var(--font-sans); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Search Volume</h4>';
    const gridA = document.createElement("div");
    gridA.className = "map-visual";
    gridA.style.gridTemplateColumns = "repeat(6, 1fr)";
    gridA.style.gap = "6px";
    mapA.appendChild(gridA);

    const mapB = document.createElement("div");
    mapB.style.flex = "1";
    mapB.style.minWidth = "0"; // Prevent flex-basis issues
    mapB.innerHTML = '<h4 style="text-align:center; color: var(--ink); margin-bottom: 12px; font-family: var(--font-sans); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Real Count</h4>';
    const gridB = document.createElement("div");
    gridB.className = "map-visual";
    gridB.style.gridTemplateColumns = "repeat(6, 1fr)";
    gridB.style.gap = "6px";
    mapB.appendChild(gridB);

    const provinces = (props?.provinces || ["Aceh", "Jabar", "Jateng", "Jatim", "Bali"]) as string[];
    const searchValues = (props?.searchValues || [0, 0, 1, 1, 0]) as number[];
    const realValues = (props?.realValues || [0, 0, 1, 1, 1]) as number[];

    const color1 = "#2980B9"; // Blue - candidate 2
    const color2 = "#E67E22"; // Orange - candidate 1
    const color3 = "#7F8C8D"; // Gray - tie

    provinces.forEach((p: string, i: number) => {
        // Cell A (Search Dominance)
        const cellA = document.createElement("div");
        cellA.className = "province-cell";
        cellA.style.background = searchValues[i] === 1 ? color2 : (searchValues[i] === 0 ? color1 : color3);
        cellA.style.fontSize = "9px";
        cellA.style.padding = "8px 2px";
        cellA.style.opacity = "0";
        cellA.style.position = "relative";
        cellA.textContent = p.substring(0, 3).toUpperCase();

        const tipA = document.createElement("div");
        tipA.className = "tooltip";
        const candidateA = searchValues[i] === 1 ? "Candidate 01 (Jokowi)" : (searchValues[i] === 0 ? "Candidate 02 (Prabowo)" : "Tie");
        tipA.innerHTML = `<strong>${p}</strong><br>Search: ${candidateA}`;
        cellA.appendChild(tipA);

        setTimeout(() => {
            cellA.style.transition = "opacity 0.4s ease, transform 0.3s ease";
            cellA.style.opacity = "1";
        }, i * 15 + 100);

        gridA.appendChild(cellA);

        // Cell B (Real Count Dominance)
        const cellB = document.createElement("div");
        cellB.className = "province-cell";
        cellB.style.background = realValues[i] === 1 ? color2 : (realValues[i] === 0 ? color1 : color3);
        cellB.style.fontSize = "9px";
        cellB.style.padding = "8px 2px";
        cellB.style.opacity = "0";
        cellB.style.position = "relative";
        cellB.textContent = p.substring(0, 3).toUpperCase();

        const tipB = document.createElement("div");
        tipB.className = "tooltip";
        const candidateB = realValues[i] === 1 ? "Candidate 01 (Jokowi)" : (realValues[i] === 0 ? "Candidate 02 (Prabowo)" : "Tie");
        tipB.innerHTML = `<strong>${p}</strong><br>Real Count: ${candidateB}`;
        cellB.appendChild(tipB);

        setTimeout(() => {
            cellB.style.transition = "opacity 0.4s ease, transform 0.3s ease";
            cellB.style.opacity = "1";
        }, i * 15 + 150);

        gridB.appendChild(cellB);
    });

    container.appendChild(mapA);
    container.appendChild(mapB);
    scrollContainer.appendChild(container);
    wrapper.appendChild(scrollContainer);

    const legendContainer = document.createElement("div");
    legendContainer.style.marginTop = "20px";
    legendContainer.style.display = "flex";
    legendContainer.style.justifyContent = "center";
    legendContainer.style.flexWrap = "wrap";
    legendContainer.style.gap = "16px";
    legendContainer.style.opacity = "0";
    legendContainer.style.transition = "opacity 1s ease";
    setTimeout(() => { legendContainer.style.opacity = "1"; }, 800);

    const createLegendItem = (color: string, text: string) => {
        const item = document.createElement("div");
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.gap = "6px";
        item.style.fontSize = "11px";
        item.style.fontFamily = "var(--font-sans)";
        item.style.color = "var(--ink-muted, #666)";

        const box = document.createElement("div");
        box.style.width = "12px";
        box.style.height = "12px";
        box.style.backgroundColor = color;
        box.style.borderRadius = "2px";

        const label = document.createElement("span");
        label.textContent = text;

        item.appendChild(box);
        item.appendChild(label);
        return item;
    };

    legendContainer.appendChild(createLegendItem(color2, "Jokowi"));
    legendContainer.appendChild(createLegendItem(color1, "Prabowo"));
    legendContainer.appendChild(createLegendItem(color3, "Tie"));

    const interpretation = document.createElement("div");
    interpretation.style.fontSize = "0.75rem";
    interpretation.style.fontFamily = "var(--font-serif)";
    interpretation.style.fontStyle = "italic";
    interpretation.style.lineHeight = "1.6";
    interpretation.style.color = "var(--ink-muted, #666)";
    interpretation.style.textAlign = "center";
    interpretation.style.maxWidth = "500px";
    interpretation.style.margin = "16px auto 0";
    interpretation.style.opacity = "0";
    interpretation.style.transition = "opacity 1.2s ease";
    setTimeout(() => { interpretation.style.opacity = "1"; }, 1200);

    interpretation.innerHTML = "<strong>Interpretation:</strong> Provinces where Candidate 02 dominated in search volume often shifted to Candidate 01 in the real count, highlighting the mismatch between online curation and actual votes.";

    wrapper.appendChild(legendContainer);
    wrapper.appendChild(interpretation);

    mountEl.appendChild(wrapper);
}
