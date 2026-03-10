type AccuracyArgs = { mountEl: SVGSVGElement; props?: any };
export default function renderAccuracy({ mountEl, props }: AccuracyArgs) {
    const d3 = (globalThis as any).d3;
    if (!d3) return;
    mountEl.replaceChildren();
    const W = 600, H = 450;
    const svg = d3.select(mountEl).attr("viewBox", `0 0 ${W} ${H}`);

    // Variables
    const total = 34;
    const correct = 13;
    const incorrect = total - correct;
    const cx = W / 2;
    const cy = H / 2 + 20;

    // Calculate percentage and arc angles
    const pct = correct / total;
    // We'll draw an arc from -Math.PI / 2 to Math.PI / 2 (a semi-circle)
    const arcMax = Math.PI / 2;
    const arcMin = -Math.PI / 2;
    const arcRange = arcMax - arcMin;
    const targetAngle = arcMin + arcRange * pct;

    // Arc generator
    const arcGenerator = d3.arc()
        .innerRadius(130)
        .outerRadius(160)
        .startAngle(arcMin)
        .cornerRadius(8);

    // Background Arc (the remainder)
    svg.append("path")
        .attr("transform", `translate(${cx}, ${cy})`)
        .attr("d", arcGenerator({ endAngle: arcMax }) as any)
        .attr("fill", "color-mix(in srgb, var(--ink-muted) 20%, transparent)");

    // Foreground Arc (Correct Predictions)
    const foreground = svg.append("path")
        .attr("transform", `translate(${cx}, ${cy})`)
        .attr("fill", "#E67E22"); // Theme accent

    foreground.transition().duration(1500).ease(d3.easeCubicOut)
        .attrTween("d", function () {
            const interpolate = d3.interpolate(arcMin, targetAngle);
            return function (t: number) {
                return arcGenerator({ endAngle: interpolate(t) }) as any;
            };
        });

    // Central Tally Counter (large number 13)
    const paddingVal = 30;
    const tally = svg.append("text")
        .attr("x", cx)
        .attr("y", cy - paddingVal)
        .attr("text-anchor", "middle")
        .style("font-size", "72px")
        .style("font-weight", "bold")
        .style("font-family", "Inter, sans-serif")
        .attr("fill", "var(--ink)");

    tally.transition().duration(1500).ease(d3.easeCubicOut)
        .tween("text", function () {
            const i = d3.interpolateRound(0, correct);
            return function (this: any, t: number) { this.textContent = i(t).toString(); };
        });

    tally.transition().delay(1500).duration(200)
        .style("font-size", "86px")
        .transition().duration(200)
        .style("font-size", "80px");

    // Sub-text ("/ 34 Provinces Correct")
    svg.append("text")
        .attr("x", cx)
        .attr("y", cy + 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-family", "Inter, sans-serif")
        .attr("fill", "var(--ink-muted)")
        .text(`out of ${total} provinces correctly predicted`);

    // Incorrect text reference
    const incorrectLabel = svg.append("text")
        .attr("x", cx + 170)
        .attr("y", cy - 10)
        .attr("text-anchor", "start")
        .style("font-size", "14px")
        .attr("fill", "#C0392B") // Theme red
        .style("font-family", "Inter, sans-serif")
        .style("font-weight", "600")
        .style("opacity", 0)
        .text(`21 Incorrect`);

    incorrectLabel.transition().delay(1200).duration(800)
        .style("opacity", 1)
        .attr("x", cx + 180);

    // Correct text reference
    const correctLabel = svg.append("text")
        .attr("x", cx - 170)
        .attr("y", cy - 10)
        .attr("text-anchor", "end")
        .style("font-size", "14px")
        .attr("fill", "#E67E22")
        .style("font-family", "Inter, sans-serif")
        .style("font-weight", "600")
        .style("opacity", 0)
        .text(`13 Correct`);

    correctLabel.transition().delay(800).duration(800)
        .style("opacity", 1)
        .attr("x", cx - 180);
}
