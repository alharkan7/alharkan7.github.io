type SentimentArgs = { mountEl: SVGSVGElement; panelEl?: HTMLElement; props?: any };
export default function renderSentiment({ mountEl, panelEl, props }: SentimentArgs) {
    const d3 = (globalThis as any).d3;
    if (!d3) return;
    mountEl.replaceChildren();
    const W = 600, H = 450;
    const svg = d3.select(mountEl).attr("viewBox", `0 0 ${W} ${H}`);

    const cx = W / 2;
    const cy = H / 2;

    const prevTooltip = panelEl?.querySelector(".d3-tooltip") || document.body.querySelector(".d3-tooltip-sentiment");
    if (prevTooltip) prevTooltip.remove();

    const tooltipTarget = panelEl ? d3.select(panelEl) : d3.select("body");
    const tooltip = tooltipTarget.append("div").attr("class", panelEl ? "d3-tooltip" : "d3-tooltip d3-tooltip-sentiment");

    // Add labels for the two sides
    svg.append("text").attr("x", cx - 110).attr("y", 60).attr("text-anchor", "middle").attr("fill", "#2ECC71").style("font-size", "20px").style("font-weight", "600").text("Love-Searching");
    svg.append("text").attr("x", cx + 110).attr("y", 60).attr("text-anchor", "middle").attr("fill", "#E74C3C").style("font-size", "20px").style("font-weight", "600").text("Hate-Searching");

    svg.append("text").attr("x", cx - 110).attr("y", 80).attr("text-anchor", "middle").attr("fill", "var(--ink-muted)").style("font-size", "14px").text("(Positive Sentiment)");
    svg.append("text").attr("x", cx + 110).attr("y", 80).attr("text-anchor", "middle").attr("fill", "var(--ink-muted)").style("font-size", "14px").text("(Negative Sentiment)");

    const data = [
        { word: "Economy", type: "pos", desc: "A supporter searching to praise economic growth.", r: 35 },
        { word: "Leadership", type: "pos", desc: "A voter searching to admire their firm leadership style.", r: 32 },
        { word: "Infrastructure", type: "pos", desc: "A Supporter searching for proof of newly built toll roads.", r: 42 },

        { word: "Scandal", type: "neg", desc: "A critic searching for negative news to mock the candidate.", r: 38 },
        { word: "Corruption", type: "neg", desc: "A critic trying to find alleged corruption cases.", r: 35 },
        { word: "Prices", type: "neg", desc: "A critic searching to complain about the price of basic goods.", r: 32 },
        { word: "Hoax", type: "neg", desc: "A critic searching for negative rumors and misinformation.", r: 28 },
    ];

    const nodes = data.map((d: any) => ({
        ...d,
        x: cx, y: cy, // start in middle
        targetX: d.type === "pos" ? cx - 110 : cx + 110,
        targetY: cy + 10
    }));

    const sim = d3.forceSimulation(nodes)
        .force("x", d3.forceX((d: any) => d.targetX).strength(0.08))
        .force("y", d3.forceY((d: any) => d.targetY).strength(0.08))
        .force("collide", d3.forceCollide((d: any) => d.r + 3).iterations(4))
        .alphaTarget(0.4); // keep them floating vigorously for a moment

    // Legend
    const legendG = svg.append("g").attr("transform", `translate(${cx}, ${H - 30})`);

    legendG.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("fill", "var(--ink-muted)")
        .attr("font-size", "13px")
        .attr("text-anchor", "middle")
        .html(`Google Trends aggregates all searches into "Volume", ignoring the actual intent.`);

    const g = svg.selectAll(".node")
        .data(nodes)
        .enter().append("g")
        .attr("class", "node")
        .style("cursor", "pointer");

    g.append("circle")
        .attr("r", (d: any) => d.r)
        .attr("fill", (d: any) => d.type === "pos" ? "#2ECC71" : "#E74C3C")
        .attr("opacity", 0)
        .attr("stroke", "var(--paper)")
        .attr("stroke-width", 2)
        .transition().duration(1000)
        .attr("opacity", 0.85);

    g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", 4)
        .attr("fill", "white")
        .style("font-size", "11px")
        .style("font-weight", "500")
        .style("pointer-events", "none")
        .text((d: any) => d.word);

    g.on("mouseover", function (this: SVGGElement, evt: any, d: any) {
        d3.select(this).select("circle")
            .attr("opacity", 1)
            .attr("stroke-width", 3);
        tooltip
            .classed("visible", true)
            .html(`<strong>${d.word}</strong><br><span style="font-size: 13px;">${d.desc}</span>`)
            .style("left", evt.offsetX + 15 + "px")
            .style("top", evt.offsetY - 30 + "px")
            .style("max-width", "220px");
    }).on("mouseout", function (this: SVGGElement) {
        d3.select(this).select("circle")
            .attr("opacity", 0.85)
            .attr("stroke-width", 2);
        tooltip.classed("visible", false);
    });

    sim.on("tick", () => {
        g.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
    });

    // Stop fierce simulation after short while
    setTimeout(() => {
        sim.alphaTarget(0.01);
    }, 2000);
}
