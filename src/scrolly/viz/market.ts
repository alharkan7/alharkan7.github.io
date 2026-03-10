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
    const popCircle = svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 150).attr("fill", "#2C3E50").attr("opacity", 0.5);
    svg.append("text").attr("x", cx).attr("y", cy - 100).attr("text-anchor", "middle").attr("fill", "white").style("pointer-events", "none").text("Internet Users (143M)");

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
    const searchCircle = searchG.append("circle").attr("r", 0).attr("fill", "#E67E22").attr("opacity", 0.8);
    searchCircle.transition().duration(800).attr("r", 100);
    searchG.append("text").attr("text-anchor", "middle").attr("dy", 5).attr("fill", "white").style("font-weight", "bold").style("pointer-events", "none").text("Search Engine Users (106M)");

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
