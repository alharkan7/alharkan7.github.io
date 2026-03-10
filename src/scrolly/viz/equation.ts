type EquationArgs = { mountEl: SVGSVGElement; props?: any };
export default function renderEquation({ mountEl, props }: EquationArgs) {
    const d3 = (globalThis as any).d3;
    if (!d3) return;
    mountEl.replaceChildren();
    const W = 600, H = 450;
    const svg = d3.select(mountEl).attr("viewBox", `0 0 ${W} ${H}`);

    const g = svg.append("g").attr("transform", `translate(${W / 2}, ${H / 2 - 30})`);

    // Main Equation
    const mainEq = g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", -30)
        .style("font-family", "var(--font-serif)")
        .style("font-size", "46px")
        .attr("fill", "var(--ink, #333)")
        .attr("opacity", 0)
        .text("A = log((j/p) / (J/P))");

    mainEq.transition()
        .duration(1000)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1)
        .attr("transform", "translate(0,-20)");

    // Definitions
    const defLeft = g.append("text")
        .attr("text-anchor", "end")
        .attr("x", -50)
        .attr("y", 40)
        .style("font-family", "var(--font-sans)")
        .style("font-size", "18px")
        .style("letter-spacing", "0.02em")
        .attr("fill", "var(--accent-blue, #2980B9)")
        .attr("opacity", 0)
        .text("j/p = Google Search Ratio");

    const defRight = g.append("text")
        .attr("text-anchor", "start")
        .attr("x", 50)
        .attr("y", 40)
        .style("font-family", "var(--font-sans)")
        .style("font-size", "18px")
        .style("letter-spacing", "0.02em")
        .attr("fill", "var(--political-red, #C0392B)")
        .attr("opacity", 0)
        .text("J/P = KPU Real Count Ratio");

    defLeft.transition().delay(600).duration(800).attr("opacity", 1);
    defRight.transition().delay(800).duration(800).attr("opacity", 1);

    // Legends group
    const legendG = svg.append("g")
        .attr("transform", `translate(${W / 2 - 270}, ${H / 2 + 70})`)
        .attr("opacity", 0);

    legendG.transition().delay(1200).duration(1000).attr("opacity", 1);

    // Left column
    legendG.append("text").attr("x", 0).attr("y", 0).style("font-size", "14px").style("font-family", "var(--font-sans)").attr("fill", "var(--ink, #333)").attr("font-weight", "bold").text("j")
    legendG.append("text").attr("x", 15).attr("y", 0).style("font-size", "14px").style("font-family", "var(--font-serif)").attr("fill", "var(--ink-muted, #666)").text(": Jokowi's search volume")

    legendG.append("text").attr("x", 0).attr("y", 30).style("font-size", "14px").style("font-family", "var(--font-sans)").attr("fill", "var(--ink, #333)").attr("font-weight", "bold").text("p")
    legendG.append("text").attr("x", 15).attr("y", 30).style("font-size", "14px").style("font-family", "var(--font-serif)").attr("fill", "var(--ink-muted, #666)").text(": Prabowo's search volume")

    legendG.append("text").attr("x", 0).attr("y", 60).style("font-size", "14px").style("font-family", "var(--font-sans)").attr("fill", "var(--ink, #333)").attr("font-weight", "bold").text("A")
    legendG.append("text").attr("x", 15).attr("y", 60).style("font-size", "14px").style("font-family", "var(--font-serif)").attr("fill", "var(--ink-muted, #666)").text(": Predictive Accuracy (0 = perfect)")

    // Right column
    legendG.append("text").attr("x", 280).attr("y", 0).style("font-size", "14px").style("font-family", "var(--font-sans)").attr("fill", "var(--ink, #333)").attr("font-weight", "bold").text("J")
    legendG.append("text").attr("x", 295).attr("y", 0).style("font-size", "14px").style("font-family", "var(--font-serif)").attr("fill", "var(--ink-muted, #666)").text(": Jokowi's real votes")

    legendG.append("text").attr("x", 280).attr("y", 30).style("font-size", "14px").style("font-family", "var(--font-sans)").attr("fill", "var(--ink, #333)").attr("font-weight", "bold").text("P")
    legendG.append("text").attr("x", 295).attr("y", 30).style("font-size", "14px").style("font-family", "var(--font-serif)").attr("fill", "var(--ink-muted, #666)").text(": Prabowo's real votes")

    legendG.append("text").attr("x", 280).attr("y", 60).style("font-size", "14px").style("font-family", "var(--font-sans)").attr("fill", "var(--ink, #333)").attr("font-weight", "bold").text("log")
    legendG.append("text").attr("x", 305).attr("y", 60).style("font-size", "14px").style("font-family", "var(--font-serif)").attr("fill", "var(--ink-muted, #666)").text(": Centers ratio around 0 symmetrically")
}
