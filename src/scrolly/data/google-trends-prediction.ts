export const config = {
    metadata: {
        title: "Predicting the Presidency with Google Trends",
        description: "Testing Google Trends as a Predictor for the 2019 Indonesian Presidential Election. Research by Ali Al Harkan.",
        brand: "Digital Crystal Ball",
        homeNavUrl: "/data"
    },
    hero: {
        label: "Data Analysis",
        titleHtml: 'Digital <span class="hero-accent">Crystal Ball?</span>',
        subtitleHtml: "Testing Google Trends as a Predictor for the 2019 Indonesian Presidential Election",
        authorsHtml: "Ali Al Harkan · Universitas Indonesia",
        teaserHtml: 'Traditional political surveys are expensive, slow, and labor-intensive. In the era of "Big Data," Google Trends offers a seductive alternative: a free, real-time index of what millions of Indonesians are searching for. <strong>Can the search bar replace the ballot box?</strong> This study tests the accuracy and precision of Google Search data against the official 2019 KPU Real Count.',
        ctaHref: "#section-context",
        stats: [
            { target: 143, unit: "M", label: "Internet Users" },
            { target: 40, unit: "%", label: "Population Sample" },
            { target: 2, unit: "", label: "Candidates" },
            { target: 34, unit: "", label: "Provinces" }
        ]
    },
    sections: [
        {
            id: "context",
            navLabel: "Context",
            mobileLabel: "Market Share",
            viz: {
                key: "market",
                title: "The Market of Attention",
                captionHtml: "With 143 million internet users, Google Trends captures the 'Curiosity' of nearly 40% of the population.",
                mount: "svg",
                props: {}
            }
        },
        {
            id: "methodology",
            navLabel: "Method",
            mobileLabel: "Formula",
            viz: {
                key: "equation",
                title: "The Statistical Litmus Test",
                captionHtml: "We analyzed 'Topic Queries' (Broad Match) to capture the full spectrum of intent for both candidates.",
                mount: "svg",
                props: {}
            }
        },
        {
            id: "maps",
            navLabel: "The Clash",
            mobileLabel: "Maps",
            viz: {
                key: "dualmap",
                title: "The Geographical Mismatch",
                captionHtml: "Search volume was leaning one way, while the actual votes were leaning the other.",
                mount: "div",
                props: {
                    provinces: [
                        "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau",
                        "Jambi", "Sumatera Selatan", "Bengkulu", "Lampung", "Kepulauan Bangka",
                        "DKI Jakarta", "Jawa Barat", "Banten", "Jawa Tengah", "DI Yogyakarta",
                        "Jawa Timur", "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Kalimantan Barat",
                        "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara", "Sulawesi Utara",
                        "Gorontalo", "Sulawesi Tengah", "Sulawesi Selatan", "Sulawesi Tenggara", "Sulawesi Barat",
                        "Maluku", "Maluku Utara", "Papua", "Papua Barat"
                    ],
                    searchValues: [
                        0, 0, 0, 0, 0.5,
                        0, 0, 0, 0, 0,
                        0.5, 0, 0, 1, 0.5,
                        0.5, 1, 0, 1, 0,
                        1, 0, 0.5, 1, 1,
                        0, 0, 0, 0, 0,
                        0, 0.5, 1, 1
                    ],
                    realValues: [
                        0, 1, 0, 0, 1,
                        0, 0, 0, 1, 1,
                        1, 0, 0, 1, 1,
                        1, 1, 0, 1, 1,
                        1, 0, 1, 1, 1,
                        1, 1, 0, 0, 1,
                        1, 0, 1, 1
                    ]
                }
            }
        },
        {
            id: "accuracy",
            navLabel: "Accuracy",
            mobileLabel: "Accuracy",
            viz: {
                key: "accuracy",
                title: "A High Rate of Error",
                captionHtml: "Google Trends only correctly predicted the winner in 13 out of 34 provinces.",
                mount: "svg",
                props: {}
            }
        },
        {
            id: "precision",
            navLabel: "Precision",
            mobileLabel: "Precision plot",
            viz: {
                key: "precision",
                title: "The Consistency Gap",
                captionHtml: "Precision measures reliability. Because the deviation was so inconsistent, Google Trends proved to be an unreliable tool.",
                mount: "svg",
                props: {
                    data: [
                        { p: "Aceh", v: 0.704 },
                        { p: "Sumatera Utara", v: -0.058 },
                        { p: "Sumatera Barat", v: 0.681 },
                        { p: "Riau", v: 0.164 },
                        { p: "Kepulauan Riau", v: -0.073 },
                        { p: "Jambi", v: 0.094 },
                        { p: "Sumatera Selatan", v: 0.118 },
                        { p: "Bengkulu", v: -0.121 },
                        { p: "Lampung", v: -0.181 },
                        { p: "Kepulauan Bangka", v: -0.288 },
                        { p: "DKI Jakarta", v: -0.029 },
                        { p: "Jawa Barat", v: 0.140 },
                        { p: "Banten", v: 0.187 },
                        { p: "Jawa Tengah", v: -0.497 },
                        { p: "DI Yogyakarta", v: -0.348 },
                        { p: "Jawa Timur", v: -0.284 },
                        { p: "Bali", v: -0.955 },
                        { p: "Nusa Tenggara Barat", v: 0.273 },
                        { p: "Nusa Tenggara Timur", v: -0.785 },
                        { p: "Kalimantan Barat", v: -0.149 },
                        { p: "Kalimantan Tengah", v: -0.155 },
                        { p: "Kalimantan Selatan", v: 0.234 },
                        { p: "Kalimantan Timur", v: -0.100 },
                        { p: "Kalimantan Utara", v: -0.334 },
                        { p: "Sulawesi Utara", v: -0.478 },
                        { p: "Gorontalo", v: -0.047 },
                        { p: "Sulawesi Tengah", v: -0.164 },
                        { p: "Sulawesi Selatan", v: 0.105 },
                        { p: "Sulawesi Tenggara", v: 0.163 },
                        { p: "Sulawesi Barat", v: -0.291 },
                        { p: "Maluku", v: -0.218 },
                        { p: "Maluku Utara", v: 0.045 },
                        { p: "Papua", v: -0.952 },
                        { p: "Papua Barat", v: -0.510 }
                    ]
                }
            }
        },
        {
            id: "sentiment",
            navLabel: "The Why",
            mobileLabel: "Sentiment",
            viz: {
                key: "sentiment",
                title: "Curiosity is not Support",
                captionHtml: "A voter might search for a candidate because they support them, or because they are looking for a scandal. Without Sentiment, volume is a blunt instrument.",
                mount: "svg",
                props: {}
            }
        },
        {
            id: "conclusion",
            navLabel: "Future",
            mobileLabel: "Upgrade",
            viz: {
                key: "upgrade",
                title: "Potential for Evolution",
                captionHtml: "To become a true predictive tool, the platform needs Sentiment Analysis, User-Level Weighting, and Hybrid Modeling.",
                mount: "div",
                props: {}
            }
        }
    ],
    theme: {
        accent: "#E67E22",
        secondary: "#2980B9"
    },
    footerHtml: `
    <div class="footer-inner">
      <div class="footer-thesis">
        <div class="footer-label">Full Research Paper</div>
        <p><em>Memprediksi Hasil Pemilu Presiden Indonesia 2019 dengan Google Trends: Uji Akurasi, Presisi dan Peluang Pemanfaatannya</em></p>
      </div>
      <div class="footer-meta">
        <p><strong>Research by:</strong> Ali Al Harkan</p>
        <p><strong>Institution:</strong> Universitas Indonesia</p>
      </div>
      <div class="footer-actions">
        <a href="https://www.atlantis-press.com/proceedings/aprish-19/125957127" target="_blank" class="footer-btn">Read the Paper</a>
        <a href="mailto:alharkan7@gmail.com" class="footer-btn secondary">Contact Researcher</a>
      </div>
    </div>
  `
};
