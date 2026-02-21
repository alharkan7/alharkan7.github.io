type TimelineArgs = {
  mountEl: SVGSVGElement;
  legendEl?: HTMLElement | null;
  props?: any;
};

export default function renderTimeline({ mountEl, legendEl, props }: TimelineArgs) {
  const d3 = (globalThis as any).d3;
  if (!d3) return;

  mountEl.replaceChildren();

  const W = 600;
  const H = 400;
  const M = { top: 20, right: 70, bottom: 50, left: 50 };
  const iW = W - M.left - M.right;
  const iH = H - M.top - M.bottom;

  const fallbackData = [
    { year: 2000, internet: 1.9, tv: 88, radio: 68 },
    { year: 2002, internet: 3.6, tv: 89, radio: 66 },
    { year: 2004, internet: 5.6, tv: 90, radio: 64 },
    { year: 2006, internet: 8.4, tv: 90, radio: 62 },
    { year: 2008, internet: 13.1, tv: 91, radio: 59 },
    { year: 2010, internet: 19.5, tv: 92, radio: 57 },
    { year: 2012, internet: 27.2, tv: 92, radio: 55 },
    { year: 2014, internet: 40.4, tv: 93, radio: 50 },
    { year: 2016, internet: 56.1, tv: 94, radio: 47 },
    { year: 2018, internet: 71.2, tv: 93, radio: 43 },
    { year: 2019, internet: 73.7, tv: 93, radio: 42 },
  ];

  const data = (props?.data || fallbackData) as Array<Record<string, number>>;

  const svg = d3
    .select(mountEl)
    .attr("viewBox", `0 0 ${W} ${H}`)
    .append("g")
    .attr("transform", `translate(${M.left},${M.top})`);

  const years = data.map((d: any) => d.year).filter((v: any) => typeof v === "number");
  const minYear = years.length ? d3.min(years) : 2000;
  const maxYear = years.length ? d3.max(years) : 2019;

  const x = d3.scaleLinear().domain([minYear, maxYear]).range([0, iW]);
  const y = d3.scaleLinear().domain([0, 100]).range([iH, 0]);

  svg
    .append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(""));

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(6));
  svg.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat((d: number) => d + "%"));

  const defaultColors = { internet: "#2980B9", tv: "#1E8449", radio: "#C0392B" };
  const colors = (props?.colors || defaultColors) as Record<string, string>;
  const series = (props?.series || ["internet", "tv", "radio"]) as string[];
  const annotation = (props?.annotation || { year: 2015, label: "Digital rises" }) as { year: number; label: string };

  const line = d3
    .line()
    .x((d: any) => x(d.year))
    .y((d: any) => y(d.value))
    .curve(d3.curveMonotoneX);

  series.forEach((key) => {
    const lineData = data.map((d: any) => ({ year: d.year, value: d[key] }));
    const path = svg
      .append("path")
      .datum(lineData)
      .attr("fill", "none")
      .attr("stroke", colors[key] || "#999")
      .attr("stroke-width", key === "internet" ? 3 : 2)
      .attr("d", line);

    const totalLength = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(1400)
      .delay(series.indexOf(key) * 300)
      .ease(d3.easeCubicInOut)
      .attr("stroke-dashoffset", 0);

    const last = lineData[lineData.length - 1];
    svg
      .append("circle")
      .attr("cx", x(last.year))
      .attr("cy", y(last.value))
      .attr("r", 5)
      .attr("fill", colors[key] || "#999")
      .attr("opacity", 0)
      .transition()
      .delay(1700)
      .attr("opacity", 1);

    svg
      .append("text")
      .attr("x", x(last.year) + 7)
      .attr("y", y(last.value) + 4)
      .attr("fill", colors[key] || "#999")
      .style("font-family", "Inter,sans-serif")
      .style("font-size", "11px")
      .style("font-weight", "700")
      .text(key === "internet" ? "Internet" : key === "tv" ? "TV" : "Radio")
      .attr("opacity", 0)
      .transition()
      .delay(1800)
      .attr("opacity", 1);
  });

  svg
    .append("line")
    .attr("x1", x(annotation.year))
    .attr("x2", x(annotation.year))
    .attr("y1", 0)
    .attr("y2", iH)
    .attr("stroke", "#D4AC0D")
    .attr("stroke-dasharray", "4,3")
    .attr("stroke-width", 1.5)
    .attr("opacity", 0)
    .transition()
    .delay(2000)
    .attr("opacity", 0.7);

  svg
    .append("text")
    .attr("x", x(annotation.year) + 6)
    .attr("y", 16)
    .attr("fill", "#D4AC0D")
    .style("font-size", "10px")
    .style("font-family", "Inter,sans-serif")
    .style("font-weight", "600")
    .text(annotation.label)
    .attr("opacity", 0)
    .transition()
    .delay(2100)
    .attr("opacity", 1);

  if (legendEl) {
    legendEl.innerHTML = series
      .map((k) => {
        const label = k === "tv" ? "TV" : k.charAt(0).toUpperCase() + k.slice(1);
        return `
    <div class="legend-item">
      <div class="legend-swatch" style="background:${(colors as any)[k]};height:${k === "internet" ? "3px" : "2px"}"></div>
      <span>${label} Penetration</span>
    </div>
  `;
      })
      .join("");
  }
}
