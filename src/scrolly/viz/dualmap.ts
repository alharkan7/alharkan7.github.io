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
    container.style.minWidth = "550px"; // Ensure enough width for two maps side-by-side
    container.style.width = "100%";
    container.style.padding = "10px 0";

    const mapA = document.createElement("div");
    mapA.style.flex = "1";
    mapA.innerHTML = '<h4 style="text-align:center; color: var(--ink); margin-bottom: 15px;">Search Dominance (Google)</h4>';
    const gridA = document.createElement("div");
    gridA.className = "map-visual";
    gridA.style.gridTemplateColumns = "repeat(6, 1fr)";
    gridA.style.gap = "8px"; // Added smaller gap for denser grid
    mapA.appendChild(gridA);

    const mapB = document.createElement("div");
    mapB.style.flex = "1";
    mapB.innerHTML = '<h4 style="text-align:center; color: var(--ink); margin-bottom: 15px;">Real Count Dominance (KPU)</h4>';
    const gridB = document.createElement("div");
    gridB.className = "map-visual";
    gridB.style.gridTemplateColumns = "repeat(6, 1fr)";
    gridB.style.gap = "8px"; // Added smaller gap for denser grid
    mapB.appendChild(gridB);

    const provinces = props?.provinces || ["Aceh", "Jabar", "Jateng", "Jatim", "Bali"];
    const searchValues = props?.searchValues || [0, 0, 1, 1, 0];
    const realValues = props?.realValues || [0, 0, 1, 1, 1];

    const color1 = "#2980B9"; // Blue - candidate 2
    const color2 = "#E67E22"; // Orange - candidate 1
    const color3 = "#7F8C8D"; // Gray - tie

    provinces.forEach((p: string, i: number) => {
        // Cell A (Search Dominance)
        const cellA = document.createElement("div");
        cellA.className = "province-cell";
        cellA.style.background = searchValues[i] === 1 ? color2 : (searchValues[i] === 0 ? color1 : color3);
        cellA.style.fontSize = "11px";
        cellA.style.padding = "8px 4px";
        cellA.style.position = "relative"; // Ensure tooltip positions correctly relative to cell
        cellA.textContent = p.substring(0, 3).toUpperCase();

        const tipA = document.createElement("div");
        tipA.className = "tooltip";
        const candidateA = searchValues[i] === 1 ? "Candidate 01 (Jokowi)" : (searchValues[i] === 0 ? "Candidate 02 (Prabowo)" : "Tie");
        tipA.innerHTML = `<strong>${p}</strong><br>Search Dominance: ${candidateA}`;
        cellA.appendChild(tipA);

        gridA.appendChild(cellA);

        // Cell B (Real Count Dominance)
        const cellB = document.createElement("div");
        cellB.className = "province-cell";
        cellB.style.background = realValues[i] === 1 ? color2 : (realValues[i] === 0 ? color1 : color3);
        cellB.style.fontSize = "11px";
        cellB.style.padding = "8px 4px";
        cellB.style.position = "relative"; // Ensure tooltip positions correctly relative to cell
        cellB.textContent = p.substring(0, 3).toUpperCase();

        const tipB = document.createElement("div");
        tipB.className = "tooltip";
        const candidateB = realValues[i] === 1 ? "Candidate 01 (Jokowi)" : (realValues[i] === 0 ? "Candidate 02 (Prabowo)" : "Tie");
        tipB.innerHTML = `<strong>${p}</strong><br>Real Count Dominance: ${candidateB}`;
        cellB.appendChild(tipB);

        gridB.appendChild(cellB);
    });

    container.appendChild(mapA);
    container.appendChild(mapB);
    scrollContainer.appendChild(container);
    wrapper.appendChild(scrollContainer);

    const legendContainer = document.createElement("div");
    legendContainer.style.marginTop = "25px";
    legendContainer.style.display = "flex";
    legendContainer.style.justifyContent = "center";
    legendContainer.style.gap = "20px";

    const createLegendItem = (color: string, text: string) => {
        const item = document.createElement("div");
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.gap = "8px";
        item.style.fontSize = "13px";
        item.style.color = "var(--ink-muted, #666)";

        const box = document.createElement("div");
        box.style.width = "14px";
        box.style.height = "14px";
        box.style.backgroundColor = color;
        box.style.borderRadius = "3px";

        const label = document.createElement("span");
        label.textContent = text;

        item.appendChild(box);
        item.appendChild(label);
        return item;
    };

    legendContainer.appendChild(createLegendItem(color2, "Candidate 01 (Jokowi)"));
    legendContainer.appendChild(createLegendItem(color1, "Candidate 02 (Prabowo)"));
    legendContainer.appendChild(createLegendItem(color3, "Tie"));

    const interpretation = document.createElement("div");
    interpretation.style.fontSize = "13px";
    interpretation.style.lineHeight = "1.5";
    interpretation.style.color = "var(--ink-muted, #666)";
    interpretation.style.textAlign = "center";
    interpretation.style.maxWidth = "90%";
    interpretation.style.margin = "20px auto 0";
    interpretation.innerHTML = "<strong>Interpretation:</strong> Notice how the maps are almost inverted. Provinces where Candidate 02 dominated in Search Volume often went to Candidate 01 in the Real Count, highlighting a severe mismatch between online curation and physical votes.";

    wrapper.appendChild(legendContainer);
    wrapper.appendChild(interpretation);

    mountEl.appendChild(wrapper);
}
