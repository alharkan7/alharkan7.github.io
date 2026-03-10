type UpgradeArgs = { mountEl: HTMLElement; panelEl?: HTMLElement; props?: any };
export default function renderUpgrade({ mountEl, panelEl, props }: UpgradeArgs) {
  const d3 = (globalThis as any).d3;
  if (!d3) return;

  mountEl.replaceChildren();

  // Create a container for tooltip
  const prevTooltip = panelEl?.querySelector(".d3-tooltip") || document.body.querySelector(".d3-tooltip-upgrade");
  if (prevTooltip) prevTooltip.remove();

  const tooltipTarget = panelEl ? d3.select(panelEl) : d3.select("body");
  const tooltip = tooltipTarget.append("div").attr("class", panelEl ? "d3-tooltip" : "d3-tooltip d3-tooltip-upgrade");

  const w = mountEl.clientWidth || 600;
  const h = 450;

  // Append SVG to the div
  const svg = d3.select(mountEl).append("svg")
    .attr("viewBox", `0 0 600 450`)
    .style("width", "100%")
    .style("height", "100%")
    .style("overflow", "visible");

  const cx = 300;
  const cy = 200;

  const data = [
    { id: "center", label: "Predictive Tool 2.0", x: cx, y: cy, r: 60, color: "var(--ink)" },
    { id: "n1", label: "Sentiment Analysis", dx: -150, dy: -80, r: 35, color: "#2980B9", desc: "Understand if the search volume represents positive support or negative curiosity." },
    { id: "n2", label: "User-Level Weight", dx: 150, dy: -80, r: 35, color: "#2980B9", desc: "Prevent a few highly active 'Power Users' from dominating the region's search volume." },
    { id: "n3", label: "Hybrid Modeling", dx: 0, dy: 130, r: 35, color: "#2980B9", desc: "Combine real-time search trends with established polling and survey methods." }
  ];

  // Compute absolute positions for outer nodes
  data.forEach(d => {
    if (d.id !== "center") {
      d.x = cx + (d.dx || 0);
      d.y = cy + (d.dy || 0);
    }
  });

  const links = [
    { source: data[0], target: data[1] },
    { source: data[0], target: data[2] },
    { source: data[0], target: data[3] }
  ];

  // Draw links
  svg.selectAll(".link")
    .data(links)
    .enter()
    .append("line")
    .attr("class", "link")
    .attr("x1", cx)
    .attr("y1", cy)
    .attr("x2", cx)
    .attr("y2", cy)
    .attr("stroke", "var(--ink-muted)")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "4 4")
    .attr("opacity", 0)
    .transition().duration(1000).delay(500)
    .attr("x2", (d: any) => d.target.x)
    .attr("y2", (d: any) => d.target.y)
    .attr("opacity", 0.6);

  const nodesG = svg.selectAll(".node")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", `translate(${cx}, ${cy})`);

  nodesG.transition().duration(1000).delay((d: any, i: number) => i * 200)
    .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);

  // Add glowing background for the center
  const centerNode = nodesG.filter((d: any) => d.id === "center");
  centerNode.append("circle")
    .attr("r", 68)
    .attr("fill", "none")
    .attr("stroke", "var(--ink-muted)")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "2 2")
    .attr("opacity", 0.5);

  nodesG.append("circle")
    .attr("r", (d: any) => d.r)
    .attr("fill", "var(--paper)")
    .attr("stroke", (d: any) => d.color)
    .attr("stroke-width", 3);

  // Multiline label logic for center node
  centerNode.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", -12)
    .attr("fill", "var(--ink)")
    .style("font-size", "14px")
    .style("font-weight", "700")
    .text("Google");

  centerNode.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", 6)
    .attr("fill", "var(--ink)")
    .style("font-size", "14px")
    .style("font-weight", "700")
    .text("Trends");

  centerNode.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", 24)
    .attr("fill", "var(--ink)")
    .style("font-size", "14px")
    .style("font-weight", "700")
    .text("2.0");

  const outerNodes = nodesG.filter((d: any) => d.id !== "center");
  outerNodes.style("cursor", "pointer");

  // Add icons to outer nodes
  outerNodes.each(function (this: SVGGElement, d: any) {
    const g = d3.select(this).append("g")
      .attr("transform", "translate(-12, -12)")
      .attr("fill", "none")
      .attr("stroke", "var(--ink)")
      .attr("stroke-width", "2")
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round");

    if (d.id === "n1") {
      g.append("path").attr("d", "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z");
      g.append("path").attr("d", "M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z");
      g.append("path").attr("d", "M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4");
      g.append("path").attr("d", "M17.599 6.5a3 3 0 0 0 .399-1.375");
      g.append("path").attr("d", "M6.003 5.125A3 3 0 0 0 6.401 6.5");
      g.append("path").attr("d", "M3.477 10.896a4 4 0 0 1 .585-.396");
      g.append("path").attr("d", "M19.938 10.5a4 4 0 0 1 .585.396");
      g.append("path").attr("d", "M6 18a4 4 0 0 1-1.967-.516");
      g.append("path").attr("d", "M19.967 17.484A4 4 0 0 1 18 18");
    } else if (d.id === "n2") {
      g.append("path").attr("d", "m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z");
      g.append("path").attr("d", "m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z");
      g.append("path").attr("d", "M7 21h10");
      g.append("path").attr("d", "M12 3v18");
      g.append("path").attr("d", "M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2");
    } else if (d.id === "n3") {
      g.append("path").attr("d", "m10 16 1.5 1.5");
      g.append("path").attr("d", "m14 8-1.5-1.5");
      g.append("path").attr("d", "M15 2c-1.798 1.998-2.518 3.995-2.807 5.993");
      g.append("path").attr("d", "m16.5 10.5 1 1");
      g.append("path").attr("d", "m17 6-2.891-2.891");
      g.append("path").attr("d", "M2 15c6.667-6 13.333 0 20-6");
      g.append("path").attr("d", "m20 9 .891.891");
      g.append("path").attr("d", "M3.109 14.109 4 15");
      g.append("path").attr("d", "m6.5 12.5 1 1");
      g.append("path").attr("d", "m7 18 2.891 2.891");
      g.append("path").attr("d", "M9 22c1.798-1.998 2.518-3.995 2.807-5.993");
    }
  });

  // Add label under outer nodes
  outerNodes.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", (d: any) => d.r + 22)
    .attr("fill", "var(--ink)")
    .style("font-size", "13px")
    .style("font-weight", "600")
    .text((d: any) => d.label);

  outerNodes.on("mouseover", function (this: SVGGElement, evt: any, d: any) {
    d3.select(this).select("circle")
      .attr("stroke-width", 5)
      .attr("r", d.r + 4)
      .attr("fill", "var(--paper-dark)");

    tooltip
      .classed("visible", true)
      .html(`<strong>${d.label}</strong><br><span style="font-size: 13px;">${d.desc}</span>`)
      .style("left", evt.offsetX + 20 + "px")
      .style("top", evt.offsetY - 30 + "px")
      .style("max-width", "250px");
  }).on("mouseout", function (this: SVGGElement, evt: any, d: any) {
    d3.select(this).select("circle")
      .attr("stroke-width", 3)
      .attr("r", d.r)
      .attr("fill", "var(--paper)");
    tooltip.classed("visible", false);
  });
}
