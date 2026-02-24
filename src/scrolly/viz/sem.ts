type SemArgs = {
  mountEl: SVGSVGElement;
  props?: any;
};

export default function renderSEM({ mountEl, props }: SemArgs) {
  const d3 = (globalThis as any).d3;
  if (!d3) return;

  mountEl.replaceChildren();

  const rootStyles = getComputedStyle(document.documentElement);
  const paper = rootStyles.getPropertyValue("--paper").trim() || "#070A12";
  const ink = rootStyles.getPropertyValue("--ink").trim() || "#F3F6FF";
  const inkMuted = rootStyles.getPropertyValue("--ink-muted").trim() || "#7E8AB8";
  const scholarlyBlue = rootStyles.getPropertyValue("--scholarly-blue").trim() || "#DDE6FF";
  const accentBlue = rootStyles.getPropertyValue("--accent-blue").trim() || "#4DE1FF";
  const politicalRed = rootStyles.getPropertyValue("--political-red").trim() || "#FF4D9D";

  const W = 600;
  const H = 400;
  const svg = d3.select(mountEl).attr("viewBox", `0 0 ${W} ${H}`);

  const defs = svg.append("defs");
  ["sig", "insig"].forEach((t) => {
    defs
      .append("marker")
      .attr("id", `arrow-${t}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", t === "sig" ? "var(--political-red)" : "var(--ink-muted)");
  });

  const fallbackNodes = [
    { id: "tv", label: "TV", x: 80, y: 40, w: 90, h: 36, color: "#2C3E50" },
    { id: "radio", label: "Radio", x: 80, y: 110, w: 90, h: 36, color: "#C0392B" },
    { id: "internet", label: "Internet", x: 80, y: 180, w: 90, h: 36, color: "#2C3E50" },
    { id: "news", label: "Newspaper", x: 80, y: 250, w: 90, h: 36, color: "#2C3E50" },
    { id: "google", label: "Google", x: 80, y: 320, w: 90, h: 36, color: "#2C3E50" },
    { id: "turnout", label: "Voter\nTurnout", x: W - 120, y: 100, w: 100, h: 50, color: "#1A5276" },
    { id: "direct", label: "Vote\nDirection", x: W - 120, y: 240, w: 100, h: 50, color: "#922B21" },
  ];

  const fallbackPaths = [
    { from: "radio", to: "turnout", sig: true, coef: "β=0.61*" },
    { from: "tv", to: "turnout", sig: false, coef: "ns" },
    { from: "internet", to: "turnout", sig: false, coef: "ns" },
    { from: "google", to: "direct", sig: true, coef: "β=-0.69*" },
    { from: "tv", to: "direct", sig: true, coef: "β=-0.53*" },
    { from: "radio", to: "direct", sig: true, coef: "β=-0.40*" },
    { from: "news", to: "direct", sig: false, coef: "ns" },
    { from: "internet", to: "direct", sig: false, coef: "ns" },
  ];

  const nodes = (props?.nodes || fallbackNodes) as Array<{ id: string; label: string; x: number; y: number; w: number; h: number; color: string }>;
  const paths = (props?.paths || fallbackPaths) as Array<{ from: string; to: string; sig: boolean; coef: string }>;
  const legend = (props?.legend || { sigLabel: "Significant (p<0.05)", insigLabel: "Not significant" }) as { sigLabel: string; insigLabel: string };

  paths.sort((a, b) => (a.sig === b.sig ? 0 : a.sig ? 1 : -1));

  const getNode = (id: string) => nodes.find((n) => n.id === id)!;

  paths.forEach((p, i) => {
    const from = getNode(p.from);
    const to = getNode(p.to);
    const x1 = from.x + from.w;
    const y1 = from.y + from.h / 2;
    const x2 = to.x;
    const y2 = to.y + to.h / 2;
    const mx = (x1 + x2) / 2;

    const path = svg
      .append("path")
      .attr("d", `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`)
      .attr("fill", "none")
      .attr("stroke", p.sig ? "var(--political-red)" : "var(--border)")
      .attr("stroke-width", p.sig ? 2.5 : 1.5)
      .attr("stroke-dasharray", p.sig ? "none" : "5,4")
      .attr("marker-end", `url(#arrow-${p.sig ? "sig" : "insig"})`)
      .attr("opacity", 0);

    path.transition().delay(i * 120 + 300).duration(600).attr("opacity", 1);

    if (p.sig) {
      const totalLen = path.node().getTotalLength();
      path
        .attr("stroke-dasharray", `${totalLen} ${totalLen}`)
        .attr("stroke-dashoffset", totalLen)
        .transition()
        .delay(i * 120 + 300)
        .duration(800)
        .ease(d3.easeCubicInOut)
        .attr("stroke-dashoffset", 0)
        .attr("opacity", 1)
        .on("end", function (this: any) {
          d3.select(this).attr("stroke-dasharray", "none");
        });
    }

    svg
      .append("text")
      .attr("x", mx)
      .attr("y", (y1 + y2) / 2 - 5)
      .attr("text-anchor", "middle")
      .style("paint-order", "stroke")
      .style("stroke", "var(--paper)")
      .style("stroke-width", "3px")
      .style("stroke-linecap", "butt")
      .style("stroke-linejoin", "miter")
      .attr("fill", p.sig ? "var(--political-red)" : "var(--ink-muted)")
      .style("font-family", "Inter,sans-serif")
      .style("font-size", "9.5px")
      .style("font-weight", p.sig ? "700" : "400")
      .text(p.coef)
      .attr("opacity", 0)
      .transition()
      .delay(i * 120 + 800)
      .attr("opacity", 1);
  });

  nodes.forEach((n, i) => {
    const g = svg.append("g").attr("opacity", 0);
    g.transition().delay(i * 60).duration(400).attr("opacity", 1);
    g.append("rect")
      .attr("x", n.x)
      .attr("y", n.y)
      .attr("width", n.w)
      .attr("height", n.h)
      .attr("rx", 8)
      .attr("fill", n.color)
      .attr("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.2))");
    g.selectAll("text")
      .data(n.label.split("\n"))
      .join("text")
      .attr("x", n.x + n.w / 2)
      .attr("y", (_: any, j: number, arr: any[]) => n.y + n.h / 2 + (j - (arr.length - 1) / 2) * 14)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "white")
      .style("font-family", "Inter,sans-serif")
      .style("font-size", "11px")
      .style("font-weight", "600")
      .text((d: string) => d);
  });

  svg.append("circle").attr("cx", 20).attr("cy", H - 20).attr("r", 5).attr("fill", "var(--political-red)");
  svg
    .append("text")
    .attr("x", 30)
    .attr("y", H - 16)
    .style("font-size", "10px")
    .style("font-family", "Inter,sans-serif")
    .attr("fill", "var(--scholarly-blue)")
    .text(legend.sigLabel);
  svg
    .append("line")
    .attr("x1", 150)
    .attr("x2", 170)
    .attr("y1", H - 20)
    .attr("y2", H - 20)
    .attr("stroke", "var(--border)")
    .attr("stroke-dasharray", "4,3")
    .attr("stroke-width", 1.5);
  svg
    .append("text")
    .attr("x", 175)
    .attr("y", H - 16)
    .style("font-size", "10px")
    .style("font-family", "Inter,sans-serif")
    .attr("fill", "var(--ink-muted)")
    .text(legend.insigLabel);
}
