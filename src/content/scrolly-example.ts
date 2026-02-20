const page = {
  metadata: {
    title: "Beyond the Screen — Media Effects on Indonesia's 2019 Election",
    description:
      "A scrollytelling analysis of how media consumption shaped voter turnout and vote direction in Indonesia's 2019 Legislative Election. Master's Thesis by Ali Al Harkan, Universitas Indonesia.",
    brand: "Beyond the Screen",
    homeNavUrl: "/data",
  },
  hero: {
    label: "Master's Thesis",
    titleHtml: 'Beyond the <span class="hero-accent">Screen</span>',
    subtitleHtml:
      "Media Effects on Voter Turnout &amp; Vote Direction in Indonesia's 2019 Legislative Election",
    authorsHtml: "Ali Al Harkan · Universitas Indonesia",
    teaserHtml:
      'In 2019, Indonesia held one of the most complex single-day elections in the world. Against a backdrop of 17,000 islands and a booming digital landscape, a critical question emerged: <em>Does the media we consume actually dictate how we vote?</em>',
    ctaHref: "#section-context",
    stats: [
      { target: 190, unit: "M", label: "Eligible Voters" },
      { target: 34, unit: "", label: "Provinces Data" },
      { target: 32, unit: "", label: "Regression Models" },
      { target: 1362, unit: "", label: "Media Companies" },
    ],
  },
  sections: [
    {
      id: "context",
      navLabel: "Context",
      mobileLabel: "Media Growth",
      contentHtml: `
        <div class="section-label">Section 01</div>
        <h2>The New Democratic Landscape</h2>
        <p>Since the 1998 <em>Reformasi</em>, Indonesia's media landscape has undergone a radical transformation. The repeal of restrictive laws birthed an ecosystem of <strong>1,362 press companies</strong> across print, broadcast, and cyber/digital media.</p>
        <p>Today, traditional TV and radio coexist with a massive surge in internet users. As media becomes the "fourth pillar" of Indonesian democracy, it serves as the primary bridge between political parties and the public.</p>
        <p>But in an era of information saturation, we must ask: <strong>Does increased media access lead to higher democratic participation, or simply more noise?</strong></p>
        <div class="data-source-tag">Source: BPS Indonesia, Kominfo, 2000–2019</div>
      `,
      viz: {
        key: "timeline",
        title: "Indonesia's Media Growth, 2000–2019",
        captionHtml:
          "Internet penetration surpassed radio listenership around 2015, creating a dual-media landscape heading into the 2019 elections.",
        mount: "svg",
        legend: true,
        props: {
          series: ["internet", "tv", "radio"],
          colors: { internet: "#2980B9", tv: "#1E8449", radio: "#C0392B" },
          data: [
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
          ],
          annotation: { year: 2015, label: "Digital rises" },
        },
      },
    },
    {
      id: "problem",
      navLabel: "Research",
      mobileLabel: "Variables",
      contentHtml: `
        <div class="section-label">Section 02</div>
        <h2>Challenging the Traditional Models</h2>
        <p>Academic studies of Indonesian voters typically rely on three pillars:</p>
        <ol class="research-list">
          <li><strong>Sociological:</strong> The "Columbia School" approach — how religion, ethnicity, and class bind voters to their groups.</li>
          <li><strong>Psychological:</strong> Loyalties to specific party figures or historical "Downsian" utility.</li>
          <li><strong>Rational Choice:</strong> Economic benefits and government performance.</li>
        </ol>
        <p>However, external factors — specifically <strong>Media Effects</strong> — are often relegated to the sidelines. This research integrates media consumption into these traditional models, using aggregate data from all <strong>34 Provinces</strong> to see the "big picture" of the 2019 legislative race.</p>
        <div class="data-source-tag">Source: Academic literature review, CSIS surveys</div>
      `,
      viz: {
        key: "bubbles",
        title: "The Research Variable Map",
        captionHtml:
          "Three categories of independent variables — Media, Sociological, and Economic-Political — orbiting two outcome constructs.",
        mount: "svg",
        props: {
          centers: [
            { id: "turnout", label: "Voter\nTurnout", dx: -110, dy: 0, r: 44, color: "#1A5276" },
            { id: "direction", label: "Vote\nDirection", dx: 110, dy: 0, r: 44, color: "#C0392B" },
          ],
          vars: [
            { label: "TV", cat: "media", angle: -100, dist: 190, r: 30, color: "#2E86AB" },
            { label: "Radio", cat: "media", angle: -140, dist: 185, r: 30, color: "#2E86AB" },
            { label: "Internet", cat: "media", angle: -60, dist: 195, r: 30, color: "#2E86AB" },
            { label: "Newspaper", cat: "media", angle: -160, dist: 208, r: 30, color: "#5DADE2" },
            { label: "Google", cat: "media", angle: -20, dist: 180, r: 26, color: "#5DADE2" },
            { label: "Religion", cat: "socio", angle: 70, dist: 180, r: 28, color: "#1E8449" },
            { label: "Ethnicity", cat: "socio", angle: 110, dist: 190, r: 28, color: "#1E8449" },
            { label: "Poverty", cat: "econ", angle: 145, dist: 185, r: 26, color: "#D4AC0D" },
            { label: "Literacy", cat: "econ", angle: 163, dist: 200, r: 26, color: "#D4AC0D" },
          ],
          cornerLabels: {
            media: "MEDIA VARIABLES",
            socioEcon: "SOCIOLOGICAL + ECONOMIC",
          },
        },
      },
    },
    {
      id: "methodology",
      navLabel: "Method",
      mobileLabel: "SEM Model",
      contentHtml: `
        <div class="section-label">Section 03</div>
        <h2>The Statistical Engine</h2>
        <p>To uncover these hidden relationships, we utilized <strong>SEM-PLS</strong> (Structural Equation Modeling Partial Least Square). This technique allowed us to test and estimate complex relationships between multiple variables simultaneously.</p>
        <p>We executed <strong>32 distinct test models</strong>, analyzing how provincial trends in media consumption (TV, Radio, Newspaper, Internet, and Google Search) correlated with the performance of major parties like PDIP, Gerindra, and PKB.</p>
        <p>By using aggregate data from BPS and KPU, we move from "what people say" to <em>"what the numbers show"</em> across the entire archipelago.</p>
        <div class="data-source-tag">Source: BPS Statistics Indonesia, KPU Election Commission 2019</div>
      `,
      viz: {
        key: "sem",
        title: "SEM-PLS Path Model (Simplified)",
        captionHtml:
          "Animated paths show causal direction between media variables and electoral outcomes. Line thickness represents path coefficient magnitude.",
        mount: "svg",
        props: {
          nodes: [
            { id: "tv", label: "TV", x: 80, y: 40, w: 90, h: 36, color: "#2C3E50" },
            { id: "radio", label: "Radio", x: 80, y: 110, w: 90, h: 36, color: "#C0392B" },
            { id: "internet", label: "Internet", x: 80, y: 180, w: 90, h: 36, color: "#2C3E50" },
            { id: "news", label: "Newspaper", x: 80, y: 250, w: 90, h: 36, color: "#2C3E50" },
            { id: "google", label: "Google", x: 80, y: 320, w: 90, h: 36, color: "#2C3E50" },
            { id: "turnout", label: "Voter\nTurnout", x: 480, y: 100, w: 100, h: 50, color: "#1A5276" },
            { id: "direct", label: "Vote\nDirection", x: 480, y: 240, w: 100, h: 50, color: "#922B21" },
          ],
          paths: [
            { from: "radio", to: "turnout", sig: true, coef: "β=0.61*" },
            { from: "tv", to: "turnout", sig: false, coef: "ns" },
            { from: "internet", to: "turnout", sig: false, coef: "ns" },
            { from: "google", to: "direct", sig: true, coef: "β=-0.69*" },
            { from: "tv", to: "direct", sig: true, coef: "β=-0.53*" },
            { from: "radio", to: "direct", sig: true, coef: "β=-0.40*" },
            { from: "news", to: "direct", sig: false, coef: "ns" },
            { from: "internet", to: "direct", sig: false, coef: "ns" },
          ],
          legend: { sigLabel: "Significant (p<0.05)", insigLabel: "Not significant" },
        },
      },
    },
    {
      id: "finding1",
      navLabel: "Finding 1",
      mobileLabel: "Radio & Turnout",
      contentHtml: `
        <div class="section-label">Finding 01</div>
        <h2>The Surprising Power of Radio</h2>
        <p>In the digital age, we expect the Internet to be the primary driver of participation. However, our data suggests otherwise.</p>
        <p>The effect of the Internet on <strong>Voter Turnout</strong> was found to be <em>weak</em>. Instead, <strong>Radio</strong> emerged as a significant positive predictor. In provinces where more citizens listened to the radio, participation in the 2019 election was consistently higher.</p>
        <p>This suggests that radio remains a potent, perhaps overlooked, tool for civic mobilization in Indonesia's more remote or traditional regions.</p>
        <div class="finding-callout">
          <div>Radio listeners showed a <strong>Strong Positive Effect (β=0.612)</strong> on turnout compared to low-radio provinces, controlling for other variables.</div>
        </div>
        <div class="data-source-tag">Source: KPU 2019 Turnout Data, BPS Media Survey</div>
      `,
      viz: {
        key: "scatter",
        title: "Radio vs. Voter Turnout — 34 Provinces",
        captionHtml:
          "Each point is a province. The upward trend for Radio consumption contrasts with the flat trend for Internet, revealing radio's unexpected civic power.",
        mount: "svg",
        props: {
          xDomain: [32, 70],
          yDomain: [65, 92],
          provinces: [
            { name: "Aceh", radio: 52, turnout: 83.2, island: "Sumatra" },
            { name: "Sumatera Utara", radio: 55, turnout: 76.4, island: "Sumatra" },
            { name: "Sumatera Barat", radio: 58, turnout: 82.1, island: "Sumatra" },
            { name: "Riau", radio: 48, turnout: 77.8, island: "Sumatra" },
            { name: "Jambi", radio: 50, turnout: 79.5, island: "Sumatra" },
            { name: "Sumatera Selatan", radio: 45, turnout: 75.2, island: "Sumatra" },
            { name: "Bengkulu", radio: 55, turnout: 81.3, island: "Sumatra" },
            { name: "Lampung", radio: 49, turnout: 78.6, island: "Sumatra" },
            { name: "Kep. Bangka", radio: 53, turnout: 80.1, island: "Sumatra" },
            { name: "Kep. Riau", radio: 42, turnout: 71.2, island: "Sumatra" },
            { name: "DKI Jakarta", radio: 35, turnout: 68.9, island: "Java" },
            { name: "Jawa Barat", radio: 40, turnout: 72.3, island: "Java" },
            { name: "Jawa Tengah", radio: 52, turnout: 82.4, island: "Java" },
            { name: "DI Yogyakarta", radio: 56, turnout: 84.7, island: "Java" },
            { name: "Jawa Timur", radio: 54, turnout: 81.8, island: "Java" },
            { name: "Banten", radio: 38, turnout: 73.1, island: "Java" },
            { name: "Bali", radio: 60, turnout: 86.2, island: "Bali" },
            { name: "NTB", radio: 62, turnout: 84.9, island: "Nusa Tenggara" },
            { name: "NTT", radio: 65, turnout: 87.1, island: "Nusa Tenggara" },
            { name: "Kalimantan Barat", radio: 44, turnout: 74.5, island: "Kalimantan" },
            { name: "Kalimantan Tengah", radio: 47, turnout: 76.8, island: "Kalimantan" },
            { name: "Kalimantan Selatan", radio: 50, turnout: 79.2, island: "Kalimantan" },
            { name: "Kalimantan Timur", radio: 43, turnout: 72.6, island: "Kalimantan" },
            { name: "Kalimantan Utara", radio: 45, turnout: 74.1, island: "Kalimantan" },
            { name: "Sulawesi Utara", radio: 57, turnout: 83.5, island: "Sulawesi" },
            { name: "Sulawesi Tengah", radio: 55, turnout: 80.9, island: "Sulawesi" },
            { name: "Sulawesi Selatan", radio: 59, turnout: 84.3, island: "Sulawesi" },
            { name: "Sulawesi Tenggara", radio: 56, turnout: 82.7, island: "Sulawesi" },
            { name: "Gorontalo", radio: 60, turnout: 85.6, island: "Sulawesi" },
            { name: "Sulawesi Barat", radio: 58, turnout: 83.8, island: "Sulawesi" },
            { name: "Maluku", radio: 63, turnout: 86.0, island: "Maluku" },
            { name: "Maluku Utara", radio: 65, turnout: 87.5, island: "Maluku" },
            { name: "Papua Barat", radio: 61, turnout: 85.4, island: "Papua" },
            { name: "Papua", radio: 66, turnout: 88.0, island: "Papua" },
          ],
          islandColors: {
            Java: "#2C3E50",
            Sumatra: "#2980B9",
            Kalimantan: "#D4AC0D",
            Sulawesi: "#1E8449",
            Bali: "#C0392B",
            "Nusa Tenggara": "#8E44AD",
            Maluku: "#E67E22",
            Papua: "#16A085",
          },
          referenceLine: { y: 79, label: "Internet (flat)", color: "#2980B9" },
          trendLine: { color: "#C0392B" },
        },
      },
    },
    {
      id: "finding2",
      navLabel: "Finding 2",
      mobileLabel: "Party Matrix",
      contentHtml: `
        <div class="section-label">Finding 02</div>
        <h2>Targeted Influences</h2>
        <p>Media effects are not a "blanket" influence; they are highly fragmented across different political parties:</p>
        <ul class="party-list">
          <li>
            <span class="party-badge google">G</span>
            <div><strong>Google Search:</strong> Higher search volumes were significant predictors for <strong>Gerindra</strong> and <strong>PKB</strong> support.</div>
          </li>
          <li>
            <span class="party-badge tv">T</span>
            <div><strong>Television:</strong> Remains the primary vehicle for parties like <strong>Nasdem</strong>.</div>
          </li>
          <li>
            <span class="party-badge radio">R</span>
            <div><strong>Radio:</strong> Showed a specific link to support for <strong>Demokrat</strong>.</div>
          </li>
        </ul>
        <p>This confirms that different media platforms serve as "triggers" for different segments of the electorate. The "echo chamber" in Indonesia isn't one big room — it's a series of smaller, media-specific corridors.</p>
        <div class="data-source-tag">Source: KPU 2019 Party Vote Shares, Google Trends, BPS</div>
      `,
      viz: {
        key: "matrix",
        title: "Media–Party Significance Matrix",
        captionHtml:
          "Highlighted cells indicate statistically significant relationships (p &lt; 0.05). Each media platform triggers support for different parties.",
        mount: "svg",
        props: {
          parties: ["PDIP", "Gerindra", "PKS", "Nasdem", "PKB", "Demokrat", "Golkar"],
          media: ["TV", "Radio", "Newspaper", "Internet", "Google"],
          sigData: {
            PDIP: { TV: null, Radio: null, Newspaper: null, Internet: null, Google: null },
            Gerindra: { TV: null, Radio: null, Newspaper: null, Internet: null, Google: "-0.69*" },
            PKS: { TV: null, Radio: null, Newspaper: null, Internet: null, Google: null },
            Nasdem: { TV: "-0.53*", Radio: null, Newspaper: null, Internet: null, Google: null },
            PKB: { TV: null, Radio: null, Newspaper: null, Internet: null, Google: "-0.54*" },
            Demokrat: { TV: null, Radio: "-0.40*", Newspaper: null, Internet: null, Google: null },
            Golkar: { TV: null, Radio: null, Newspaper: null, Internet: null, Google: null },
          },
        },
      },
    },
    {
      id: "bigpicture",
      navLabel: "Big Picture",
      mobileLabel: "R² Power",
      contentHtml: `
        <div class="section-label">Finding 03</div>
        <h2>The Sum is Greater than the Parts</h2>
        <p>Media alone is rarely the decider. However, when we look at the <strong>Combined Model</strong> — merging Media with Sociology (Religion/Ethnicity) and Economics (Poverty) — the predictive power skyrockets.</p>
        <p>For <strong>PDIP</strong>, the combined model explained a staggering <strong>83.9%</strong> of the variance in provincial vote direction. This proves that media acts as a <em>"multiplier"</em> for existing social and economic conditions.</p>
        <p>It doesn't replace the voter's identity; <strong>it reinforces it.</strong></p>
        <div class="finding-callout highlight-red">
          <div><strong>R² = 83.9%</strong> for PDIP in the Combined Model — one of the highest predictive fits in Indonesian electoral research.</div>
        </div>
        <div class="data-source-tag">Source: SEM-PLS Model Output, SmartPLS 3.0</div>
      `,
      viz: {
        key: "bars",
        title: "Explaining Power (R²) — Media vs. Combined Model",
        captionHtml:
          "The combined model that integrates media with sociological and economic variables dramatically outperforms media-only models.",
        mount: "svg",
        props: {
          data: [
            { party: "PDIP", media: 27.1, combined: 83.9 },
            { party: "Gerindra", media: 32.2, combined: 72.2 },
            { party: "PKS", media: 36.2, combined: 59.9 },
            { party: "Nasdem", media: 38.2, combined: 50.8 },
            { party: "PKB", media: 28.3, combined: 72.7 },
            { party: "Demokrat", media: 21.4, combined: 34.7 },
          ],
          colors: { media: "#2C3E50", combined: "#C0392B" },
          highlight: { party: "PDIP", key: "combined", value: 83.9 },
        },
      },
    },
    {
      id: "conclusion",
      navLabel: "Conclusion",
      mobileLabel: "Province Map",
      contentHtml: `
        <div class="section-label">Section 08</div>
        <h2>A Call for Granular Data</h2>
        <p>Our findings show that media effects in 2019 were fragmented and often weak at a provincial level. This suggests that the "battle for the voter" happens at a much more <strong>local scale</strong>.</p>
        <p>To improve future research and democratic transparency, we recommend:</p>
        <ol class="research-list">
          <li><strong>Shifting to District-Level Analysis:</strong> Provincial data masks local nuances; we need Kabupaten/Kota granularity.</li>
          <li><strong>Expanding Data Access:</strong> Public access to Indonesian statistical data must be improved for more sophisticated aggregate research.</li>
          <li><strong>Active Monitoring:</strong> Stakeholders should actively monitor media's "trigger" effects to ensure a balanced democratic discourse.</li>
        </ol>
        <div class="data-source-tag">Source: Research Recommendations, UI Graduate Program</div>
      `,
      viz: {
        key: "map",
        title: "From Provincial to District-Level Analysis",
        captionHtml:
          "Future research should zoom into Kabupaten/Kota level data to uncover the truly local dynamics shaping Indonesian democracy.",
        mount: "div",
        props: {
          domain: [68, 90],
          provinces: [
            "Aceh",
            "Sumut",
            "Sumbar",
            "Riau",
            "Jambi",
            "Sumsel",
            "Bengkulu",
            "Lampung",
            "Bangka",
            "Kepri",
            "DKI",
            "Jabar",
            "Jateng",
            "DIY",
            "Jatim",
            "Banten",
            "Bali",
            "NTB",
            "NTT",
            "Kalbar",
            "Kalteng",
            "Kalsel",
            "Kaltim",
            "Kalut",
            "Sulut",
            "Sulteng",
            "Sulsel",
            "Sultra",
            "Gorontalo",
            "Sulbar",
            "Maluku",
            "Malut",
            "Papua Barat",
            "Papua",
          ],
          values: [
            83, 76, 82, 78, 80, 75, 81, 79, 80, 71, 69, 72, 82, 85, 82, 73, 86, 85, 87, 75, 77, 79, 73, 74,
            84, 81, 84, 83, 86, 84, 86, 88, 85, 88,
          ],
          noteHtml: "🔵 Darker = Higher Turnout<br>Hover each province for details",
        },
      },
    },
  ],
  footerHtml: `
    <div class="footer-inner">
      <div class="footer-thesis">
        <div class="footer-label">Full Thesis</div>
        <p><em>Efek Media terhadap Voter Turnout dan Vote Direction: Analisis Perilaku Pemilih pada Pemilihan Umum Legislatif Indonesia 2019</em></p>
      </div>
      <div class="footer-meta">
        <p><strong>Research by:</strong> Ali Al Harkan</p>
        <p><strong>Institution:</strong> Universitas Indonesia</p>
        <p><strong>Program:</strong> Graduate Program in Communication Science</p>
      </div>
      <div class="footer-actions">
        <a href="https://lib.ui.ac.id/detail?id=20499855&lokasi=lokal" target="_blank" class="footer-btn">Read the Paper</a>
        <a href="mailto:alharkan7@gmail.com" class="footer-btn secondary">Contact Researcher</a>
      </div>
      <div class="footer-bottom">
        <p>Data sources: BPS Indonesia · General Election Commission · Google Trends · Ministry of Communication and Information</p>
      </div>
    </div>
  `,
} as const;

export default page;
