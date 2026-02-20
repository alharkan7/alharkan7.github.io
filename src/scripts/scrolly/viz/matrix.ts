type MatrixArgs = {
  mountEl: HTMLElement;
  props?: any;
};

export default function renderMatrix({ mountEl, props }: MatrixArgs) {
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

  const table = document.createElement("table");
  table.className = "matrix-table";

  const thead = table.createTHead();
  const hrow = thead.insertRow();
  const th0 = document.createElement("th");
  th0.textContent = "Party";
  hrow.appendChild(th0);
  media.forEach((m) => {
    const th = document.createElement("th");
    th.textContent = m;
    hrow.appendChild(th);
  });

  const tbody = table.createTBody();
  parties.forEach((party, pi) => {
    const row = tbody.insertRow();
    const td0 = row.insertCell();
    td0.textContent = party;
    media.forEach((m, mi) => {
      const td = row.insertCell();
      const val = sigData[party][m];
      const cell = document.createElement("div");
      cell.className = "matrix-cell " + (val ? "sig" : "not-sig");
      cell.textContent = val || "—";
      cell.title = val ? `β=${val}, p<0.05` : "Not significant";
      cell.style.opacity = "0";
      cell.style.transform = "scale(0.5)";
      td.appendChild(cell);
      setTimeout(() => {
        cell.style.opacity = "1";
        cell.style.transform = "scale(1)";
      }, (pi * media.length + mi) * 80 + 300);
    });
  });

  mountEl.replaceChildren();
  mountEl.appendChild(table);
}
