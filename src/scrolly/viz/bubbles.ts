type BubblesArgs = {
  mountEl: SVGSVGElement;
  props?: any;
};

export default function renderBubbles({ mountEl, props }: BubblesArgs) {
  const d3 = (globalThis as any).d3;
  if (!d3) return;

  mountEl.replaceChildren();

  const W = 600;
  const H = 450;

  const svg = d3.select(mountEl).attr("viewBox", `0 0 ${W} ${H}`);
  const cx = W / 2;
  const cy = H / 2;

  const fallbackCenters = [
    { id: "turnout", label: "Voter\nTurnout", dx: -110, dy: 0, r: 44, color: "#1A5276" },
    { id: "direction", label: "Vote\nDirection", dx: 110, dy: 0, r: 44, color: "#C0392B" },
  ];

  const fallbackVars = [
    { label: "TV", cat: "media", angle: -100, dist: 190, r: 30, color: "#2E86AB" },
    { label: "Radio", cat: "media", angle: -140, dist: 185, r: 30, color: "#2E86AB" },
    { label: "Internet", cat: "media", angle: -60, dist: 195, r: 30, color: "#2E86AB" },
    { label: "Newspaper", cat: "media", angle: -160, dist: 208, r: 30, color: "#5DADE2" },
    { label: "Google", cat: "media", angle: -20, dist: 180, r: 26, color: "#5DADE2" },
    { label: "Religion", cat: "socio", angle: 70, dist: 180, r: 28, color: "#1E8449" },
    { label: "Ethnicity", cat: "socio", angle: 110, dist: 190, r: 28, color: "#1E8449" },
    { label: "Poverty", cat: "econ", angle: 145, dist: 185, r: 26, color: "#D4AC0D" },
    { label: "Literacy", cat: "econ", angle: 163, dist: 200, r: 26, color: "#D4AC0D" },
  ];

  const centersIn = (props?.centers || fallbackCenters) as Array<{ id: string; label: string; dx: number; dy: number; r: number; color: string }>;
  const centers = centersIn.map((c) => ({ ...c, x: cx + c.dx, y: cy + c.dy }));
  const vars = (props?.vars || fallbackVars) as Array<{ label: string; cat: string; angle: number; dist: number; r: number; color: string }>;
  const cornerLabels = (props?.cornerLabels || { media: "MEDIA VARIABLES", socioEcon: "SOCIOLOGICAL + ECONOMIC" }) as { media: string; socioEcon: string };

  const toRad = (d: number) => (d * Math.PI) / 180;

  vars.forEach((v, i) => {
    const vx = cx + Math.cos(toRad(v.angle)) * v.dist;
    const vy = cy + Math.sin(toRad(v.angle)) * v.dist;
    centers.forEach((c) => {
      svg
        .append("line")
        .attr("x1", vx)
        .attr("y1", vy)
        .attr("x2", c.x)
        .attr("y2", c.y)
        .attr("stroke", v.color)
        .attr("stroke-width", 1)
        .attr("opacity", 0)
        .transition()
        .delay(i * 80 + 400)
        .duration(500)
        .attr("opacity", 0.15);
    });
  });

  centers.forEach((c) => {
    const g = svg.append("g").attr("transform", `translate(${c.x},${c.y})`);
    g.append("circle").attr("r", 0).attr("fill", c.color).transition().duration(600).attr("r", c.r);
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-family", "Inter,sans-serif")
      .style("font-size", "11px")
      .style("font-weight", "700")
      .attr("fill", "white")
      .attr("pointer-events", "none")
      .selectAll("tspan")
      .data(c.label.split("\n"))
      .join("tspan")
      .attr("x", 0)
      .attr("dy", (_: any, j: number) => (j === 0 ? "-0.4em" : "1.2em"))
      .text((d: string) => d);
  });

  vars.forEach((v, i) => {
    const vx = cx + Math.cos(toRad(v.angle)) * v.dist;
    const vy = cy + Math.sin(toRad(v.angle)) * v.dist;
    const g = svg.append("g").attr("transform", `translate(${vx},${vy})`).attr("opacity", 0);
    g.transition().delay(i * 80 + 200).duration(500).attr("opacity", 1);
    g.append("circle").attr("r", v.r).attr("fill", v.color).attr("opacity", 0.85);

    const lines = v.label.split("\n");
    const textEl = g
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-family", "Inter,sans-serif")
      .style("font-size", "9.5px")
      .style("font-weight", "600")
      .attr("fill", "white")
      .attr("pointer-events", "none");

    if (lines.length === 1) {
      textEl.text(v.label);
    } else {
      textEl
        .selectAll("tspan")
        .data(lines)
        .join("tspan")
        .attr("x", 0)
        .attr("dy", (_: any, j: number) => (j === 0 ? "-0.4em" : "1.2em"))
        .text((d: string) => d);
    }
  });

  svg
    .append("text")
    .attr("x", 12)
    .attr("y", 18)
    .attr("fill", "#2E86AB")
    .style("font-family", "Inter,sans-serif")
    .style("font-size", "11px")
    .style("font-weight", "700")
    .attr("text-anchor", "start")
    .text(cornerLabels.media);

  svg
    .append("text")
    .attr("x", W - 12)
    .attr("y", H - 8)
    .attr("fill", "#1E8449")
    .style("font-family", "Inter,sans-serif")
    .style("font-size", "11px")
    .style("font-weight", "700")
    .attr("text-anchor", "end")
    .text(cornerLabels.socioEcon);
}
