type MatrixArgs = {
  mountEl: SVGSVGElement;
  props?: any;
};

export default function renderMatrix({ mountEl, props }: MatrixArgs) {
  const d3 = (globalThis as any).d3;
  if (!d3) return;

  const W = 600;
  const H = 400;
  const M = { top: 60, right: 20, bottom: 20, left: 100 };
  const iW = W - M.left - M.right;
  const iH = H - M.top - M.bottom;

  const fallbackParties = ["PDIP", "Gerindra", "PKS", "Nasdem", "PKB", "Demokrat", "Golkar"];
  const fallbackMedia = ["TV", "Radio", "Newspaper", "Internet", "Google"];

  const fallbackSigData: Record<string, Record<string, string | null>> = {
    PDIP: { TV: null, Radio: null, Newspaper: null, Internet: null, Google: null },
    Gerindra: { TV: null, Radio: null, Newspaper: null, Internet: null, Google: "-0.69*" },
    PKS: { TV: null, Radio: null, Newspaper: null, Internet: null, Google: null },
    Nasdem: { TV: "-0.53*", Radio: null, Newspaper: null, Internet: null, Google: null },
    PKB: { TV: null, Radio: null, Newspaper: null, Internet: null, Google: "-0.54*" },
    Demokrat: { TV: null, Radio: "-0.40*", Newspaper: null, Internet: null, Google: null },
    Golkar: { TV: null, Radio: null, Newspaper: null, Internet: null, Google: null },
  };

  const parties = (props?.parties || fallbackParties) as string[];
  const media = (props?.media || fallbackMedia) as string[];
  const sigData = (props?.sigData || fallbackSigData) as Record<string, Record<string, string | null>>;

  const svg = d3.select(mountEl).attr("viewBox", `0 0 ${W} ${H}`);
  svg.selectAll("*").remove(); // Clear previous render

  const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

  // Scales
  const x = d3.scaleBand().domain(media).range([0, iW]).padding(0.15);

  const y = d3.scaleBand().domain(parties).range([0, iH]).padding(0.2);

  // Column Headers (Media)
  svg
    .append("g")
    .attr("transform", `translate(${M.left}, ${M.top - 10})`)
    .selectAll("text")
    .data(media)
    .join("text")
    .attr("x", (d: string) => (x(d) || 0) + x.bandwidth() / 2)
    .attr("class", "matrix-header")
    .text((d: string) => d);

  // Row Headers (Parties)
  svg
    .append("g")
    .attr("transform", `translate(${M.left - 10}, ${M.top})`)
    .selectAll("text")
    .data(parties)
    .join("text")
    .attr("y", (d: string) => (y(d) || 0) + y.bandwidth() / 2)
    .attr("class", "matrix-label")
    .attr("text-anchor", "end")
    .attr("dominant-baseline", "middle")
    .text((d: string) => d);

  // Matrix Cells
  parties.forEach((party, pi) => {
    media.forEach((m, mi) => {
      const val = sigData[party][m];
      const isSig = !!val;
      const cellG = g
        .append("g")
        .attr("transform", `translate(${x(m)}, ${y(party)})`)
        .attr("opacity", 0); // Start hidden for animation

      // Cell Rect
      cellG
        .append("rect")
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("class", `matrix-cell-rect ${isSig ? "sig" : "not-sig"}`);

      // Cell Text
      cellG
        .append("text")
        .attr("x", x.bandwidth() / 2)
        .attr("y", y.bandwidth() / 2)
        .attr("class", `matrix-cell-text ${isSig ? "sig" : "not-sig"}`)
        .text(val || "—");

      // Tooltip (using SVG title)
      cellG.append("title").text(val ? `β=${val}, p<0.05` : "Not significant");

      // Animate reveal
      cellG
        .transition()
        .delay((pi * media.length + mi) * 80 + 300)
        .duration(500)
        .attr("opacity", 1);
    });
  });
}
