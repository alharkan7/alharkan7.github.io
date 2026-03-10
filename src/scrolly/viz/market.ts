type MarketArgs = { mountEl: SVGSVGElement; panelEl?: HTMLElement; props?: any };
export default function renderMarket({ mountEl, panelEl, props }: MarketArgs) {
    const d3 = (globalThis as any).d3;
    if (!d3) return;
    mountEl.replaceChildren();
    const W = 600, H = 450;
    const svg = d3.select(mountEl).attr("viewBox", `0 0 ${W} ${H}`);
    const cx = W / 2, cy = H / 2;

    const prevTooltip = panelEl?.querySelector(".d3-tooltip") || document.body.querySelector(".d3-tooltip-market");
    if (prevTooltip) prevTooltip.remove();

    // Choose container for tooltip
    const tooltipTarget = panelEl ? d3.select(panelEl) : d3.select("body");
    const tooltip = tooltipTarget.append("div").attr("class", panelEl ? "d3-tooltip" : "d3-tooltip d3-tooltip-market");

    // Total Population
    const popCircle = svg.append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", 0)
        .attr("fill", "#2C3E50")
        .attr("opacity", 0.5);

    popCircle.transition().duration(1000).ease(d3.easeCubicOut).attr("r", 150);

    const popText = svg.append("text")
        .attr("x", cx)
        .attr("y", cy - 110)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-family", "var(--font-serif)")
        .style("font-size", "1.1rem")
        .style("pointer-events", "none")
        .attr("opacity", 0);

    popText.transition().delay(400).duration(800).attr("opacity", 1);

    popText.append("tspan").attr("x", cx).attr("dy", "0").text("Internet Users");
    popText.append("tspan").attr("x", cx).attr("dy", "1.2em").style("font-size", "0.9rem").attr("opacity", 0.8).text("(143M)");

    popCircle.on("mouseover", function (this: SVGCircleElement, evt: any) {
        d3.select(this).attr("opacity", 0.7);
        tooltip
            .classed("visible", true)
            .html(`<strong>Internet Users</strong><br>143 Million Active Users<br>~53% of Total Population`)
            .style("left", evt.offsetX + 12 + "px")
            .style("top", evt.offsetY - 40 + "px");
    }).on("mouseout", function (this: SVGCircleElement) {
        d3.select(this).attr("opacity", 0.5);
        tooltip.classed("visible", false);
    });

    // Search Users
    const searchG = svg.append("g").attr("transform", `translate(${cx}, ${cy + 30})`);
    const searchCircle = searchG.append("circle")
        .attr("r", 0)
        .attr("fill", "#E67E22")
        .attr("opacity", 0.8);

    searchCircle.transition().delay(300).duration(1000).ease(d3.easeElasticOut.amplitude(1.1).period(0.6)).attr("r", 100);

    const searchLabel = searchG.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", 0)
        .attr("fill", "white")
        .style("font-family", "var(--font-sans)")
        .style("font-weight", "bold")
        .style("font-size", "0.95rem")
        .style("pointer-events", "none")
        .attr("opacity", 0);

    searchLabel.transition().delay(800).duration(600).attr("opacity", 1);

    searchLabel.append("tspan")
        .attr("x", 0)
        .attr("dy", "-0.2em")
        .text("Search Engine");

    searchLabel.append("tspan")
        .attr("x", 0)
        .attr("dy", "1.1em")
        .text("Users");

    searchLabel.append("tspan")
        .attr("x", 0)
        .attr("dy", "1.2em")
        .style("font-size", "0.8rem")
        .style("font-weight", "normal")
        .text("(106M)");

    searchCircle.on("mouseover", function (this: SVGCircleElement, evt: any) {
        d3.select(this).attr("opacity", 1);
        tooltip
            .classed("visible", true)
            .html(`<strong>Search Engine Users</strong><br>~106 Million Users<br>74% of Internet Users<br>Google Trends reflects their Curiosity`)
            .style("left", evt.offsetX + 12 + "px")
            .style("top", evt.offsetY - 40 + "px");
    }).on("mouseout", function (this: SVGCircleElement) {
        d3.select(this).attr("opacity", 0.8);
        tooltip.classed("visible", false);
    });
}
