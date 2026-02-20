type BarsArgs = {
  mountEl: SVGSVGElement;
  props?: any;
};

export default function renderBars({ mountEl, props }: BarsArgs) {
  const d3 = (globalThis as any).d3;
  if (!d3) return;

  mountEl.replaceChildren();

  const W = 600;
  const H = 400;
  const M = { top: 20, right: 30, bottom: 80, left: 60 };
  const iW = W - M.left - M.right;
  const iH = H - M.top - M.bottom;

  const fallbackData = [
    { party: "PDIP", media: 27.1, combined: 83.9 },
    { party: "Gerindra", media: 32.2, combined: 72.2 },
    { party: "PKS", media: 36.2, combined: 59.9 },
    { party: "Nasdem", media: 38.2, combined: 50.8 },
    { party: "PKB", media: 28.3, combined: 72.7 },
    { party: "Demokrat", media: 21.4, combined: 34.7 },
  ];
  const data = (props?.data || fallbackData) as Array<{ party: string; media: number; combined: number }>;

  const svg = d3
    .select(mountEl)
    .attr("viewBox", `0 0 ${W} ${H}`)
    .append("g")
    .attr("transform", `translate(${M.left},${M.top})`);

  const x0 = d3.scaleBand().domain(data.map((d: any) => d.party)).range([0, iW]).padding(0.28);
  const x1 = d3.scaleBand().domain(["media", "combined"]).range([0, x0.bandwidth()]).padding(0.1);
  const y = d3.scaleLinear().domain([0, 100]).range([iH, 0]);

  svg.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(""));
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${iH})`).call(d3.axisBottom(x0));
  svg.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat((d: number) => d + "%"));

  const colors: Record<string, string> = (props?.colors || { media: "#2C3E50", combined: "#C0392B" }) as Record<string, string>;
  const highlight = props?.highlight as { party: string; key: string; value: number } | undefined;

  data.forEach((d: any, di: number) => {
    (["media", "combined"] as const).forEach((key, ki) => {
      const barH = iH - y(d[key]);
      svg
        .append("rect")
        .attr("x", x0(d.party)! + x1(key)!)
        .attr("y", iH)
        .attr("width", x1.bandwidth())
        .attr("height", 0)
        .attr("fill", colors[key])
        .attr("rx", 3)
        .attr("opacity", key === "media" ? 0.65 : 1)
        .transition()
        .delay(di * 100 + ki * 50)
        .duration(700)
        .ease(d3.easeCubicOut)
        .attr("y", y(d[key]))
        .attr("height", barH);

      svg
        .append("text")
        .attr("x", x0(d.party)! + x1(key)! + x1.bandwidth() / 2)
        .attr("y", y(d[key]) - 4)
        .attr("text-anchor", "middle")
        .style("font-family", "Inter,sans-serif")
        .style("font-size", "9px")
        .style("font-weight", "700")
        .attr("fill", colors[key])
        .text(d[key] + "%")
        .attr("opacity", 0)
        .transition()
        .delay(di * 100 + ki * 50 + 600)
        .duration(300)
        .attr("opacity", 1);
    });
  });

  if (highlight && x0(highlight.party) != null && x1(highlight.key) != null) {
    svg
      .append("text")
      .attr("x", x0(highlight.party)! + x1(highlight.key)! + x1.bandwidth() / 2)
      .attr("y", y(highlight.value) - 18)
      .attr("text-anchor", "middle")
      .attr("fill", colors[highlight.key] || "#C0392B")
      .style("font-family", "Inter,sans-serif")
      .style("font-size", "11px")
      .style("font-weight", "700")
      .text("★")
      .attr("opacity", 0)
      .transition()
      .delay(1000)
      .attr("opacity", 1);
  }

  const legG = svg.append("g").attr("transform", `translate(0,${iH + 50})`);
  ([["media", "Media Only", 0.65], ["combined", "Combined Model", 1]] as const).forEach(([key, label, op], i) => {
    legG
      .append("rect")
      .attr("x", i * 130)
      .attr("y", 0)
      .attr("width", 14)
      .attr("height", 10)
      .attr("fill", colors[key])
      .attr("opacity", op)
      .attr("rx", 2);
    legG
      .append("text")
      .attr("x", i * 130 + 20)
      .attr("y", 9)
      .style("font-size", "10px")
      .style("font-family", "Inter,sans-serif")
      .attr("fill", "#666")
      .text(label);
  });
}
