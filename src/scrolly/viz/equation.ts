type EquationArgs = { mountEl: SVGSVGElement; props?: any };
export default function renderEquation({ mountEl, props }: EquationArgs) {
    const d3 = (globalThis as any).d3;
    if (!d3) return;
    mountEl.replaceChildren();
    const W = 600, H = 450;
    const svg = d3.select(mountEl).attr("viewBox", `0 0 ${W} ${H}`);

    const g = svg.append("g").attr("transform", `translate(${W / 2}, ${H / 2 - 50})`);
    g.append("text").attr("text-anchor", "middle").attr("dy", -30).style("font-size", "48px").attr("fill", "var(--ink, #333)").text("A = log((j/p) / (J/P))");

    g.append("text").attr("text-anchor", "end").attr("x", -50).attr("y", 40).style("font-size", "20px").attr("fill", "#2980B9").text("j/p = Google Search Ratio");
    g.append("text").attr("text-anchor", "start").attr("x", 50).attr("y", 40).style("font-size", "20px").attr("fill", "#C0392B").text("J/P = KPU Real Count Ratio");

    // Legends group
    const legendG = svg.append("g").attr("transform", `translate(${W / 2 - 270}, ${H / 2 + 50})`);

    // Left column
    legendG.append("text").attr("x", 0).attr("y", 0).style("font-size", "14px").attr("fill", "var(--ink, #333)").attr("font-weight", "bold").text("j")
    legendG.append("text").attr("x", 15).attr("y", 0).style("font-size", "14px").attr("fill", "var(--ink-muted, #666)").text(": Jokowi's search volume")

    legendG.append("text").attr("x", 0).attr("y", 30).style("font-size", "14px").attr("fill", "var(--ink, #333)").attr("font-weight", "bold").text("p")
    legendG.append("text").attr("x", 15).attr("y", 30).style("font-size", "14px").attr("fill", "var(--ink-muted, #666)").text(": Prabowo's search volume")

    legendG.append("text").attr("x", 0).attr("y", 60).style("font-size", "14px").attr("fill", "var(--ink, #333)").attr("font-weight", "bold").text("A")
    legendG.append("text").attr("x", 15).attr("y", 60).style("font-size", "14px").attr("fill", "var(--ink-muted, #666)").text(": Predictive Accuracy (0 = perfect)")

    // Right column
    legendG.append("text").attr("x", 280).attr("y", 0).style("font-size", "14px").attr("fill", "var(--ink, #333)").attr("font-weight", "bold").text("J")
    legendG.append("text").attr("x", 295).attr("y", 0).style("font-size", "14px").attr("fill", "var(--ink-muted, #666)").text(": Jokowi's real votes")

    legendG.append("text").attr("x", 280).attr("y", 30).style("font-size", "14px").attr("fill", "var(--ink, #333)").attr("font-weight", "bold").text("P")
    legendG.append("text").attr("x", 295).attr("y", 30).style("font-size", "14px").attr("fill", "var(--ink-muted, #666)").text(": Prabowo's real votes")

    legendG.append("text").attr("x", 280).attr("y", 60).style("font-size", "14px").attr("fill", "var(--ink, #333)").attr("font-weight", "bold").text("log")
    legendG.append("text").attr("x", 305).attr("y", 60).style("font-size", "14px").attr("fill", "var(--ink-muted, #666)").text(": Centers ratio around 0 symmetrically")
}
