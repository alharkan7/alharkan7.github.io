// Populate Dashboard Metadata
const lastSyncEl = document.getElementById('last-sync');
if (lastSyncEl && newsData.metadata && newsData.metadata.generated_at) {
    lastSyncEl.innerText = new Date(newsData.metadata.generated_at).toLocaleString();
}

// Populate Stats
const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
};

if (newsData && newsData.metadata) {
    setVal('news-total', (newsData.metadata.total_articles || 0).toLocaleString());
}
if (newsData && newsData.content_metrics) {
    setVal('news-coverage', (newsData.content_metrics.total_content_filled_pct || 0).toFixed(1) + '%');
    setVal('news-words', Math.round(newsData.content_metrics.avg_word_count || 0).toLocaleString() + 'w');
}

if (xData && xData.metadata) {
    setVal('x-total', (xData.metadata.total_items || 0).toLocaleString());
}
if (xData && xData.engagement) {
    setVal('x-engagement', (xData.engagement.avg_likes || 0).toFixed(1));
    setVal('x-reach', (xData.engagement.avg_retweets || 0).toFixed(1));
}

// Chart.js Config
Chart.defaults.color = '#5a5a5a';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 0;

// Global Animation Presets
Chart.defaults.animation = {
    duration: 1200,
    easing: 'easeOutQuart'
};

const PALETTE = {
    news: '#2c3e50',
    social: '#7f8c8d',
    environmental: '#4e6e5d',
    social_pillar: '#a67c52',
    governance: '#6c5b7b',
    neutral: '#95a5a6'
};

const chartInstances = {};

function createBarChart(id, labels, data, color) {
    if (chartInstances[id]) chartInstances[id].destroy();
    chartInstances[id] = new Chart(document.getElementById(id), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: color,
                borderRadius: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            animation: {
                y: {
                    duration: 1000,
                    from: 0
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f0f0f0' },
                    ticks: { precision: 0 }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        maxRotation: 90,
                        minRotation: window.innerWidth < 768 ? 90 : 0,
                        autoSkip: true,
                        callback: function (val, index) {
                            const label = this.getLabelForValue(index);
                            if (window.innerWidth < 768) {
                                let clean = label.replace(/^PT\s+/i, '').replace(/\s+Tbk$/i, '');
                                return clean.length > 15 ? clean.substring(0, 12) + '..' : clean;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// CHART RENDERERS
function renderNewsCharts() {
    createBarChart('newsCompanyChart', Object.keys(newsData.distributions.by_company), Object.values(newsData.distributions.by_company), PALETTE.news);

    if (chartInstances['newsSourceChart']) chartInstances['newsSourceChart'].destroy();
    chartInstances['newsSourceChart'] = new Chart(document.getElementById('newsSourceChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(newsData.distributions.by_source),
            datasets: [{
                data: Object.values(newsData.distributions.by_source),
                backgroundColor: [PALETTE.news, PALETTE.social, PALETTE.neutral, '#bdc3c7'],
                borderWidth: 1,
                borderColor: '#ffffff'
            }]
        },
        options: {
            cutout: '70%',
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1500,
                easing: 'easeOutElastic'
            },
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 20, usePointStyle: true } } }
        }
    });

    if (typeof newsList !== 'undefined') {
        const matchCounts = { 'T/T': 0, 'T/F': 0, 'F/T': 0, 'F/F': 0 };
        newsList.forEach(item => {
            const c = item.is_company_match ? 'T' : 'F';
            const p = item.is_perception_match ? 'T' : 'F';
            matchCounts[`${c}/${p}`]++;
        });

        if (chartInstances['matchDistributionChart']) chartInstances['matchDistributionChart'].destroy();
        chartInstances['matchDistributionChart'] = new Chart(document.getElementById('matchDistributionChart'), {
            type: 'bar',
            data: {
                labels: ['Both Matched', 'Company Only', 'ESG Only', 'None Matched'],
                datasets: [{
                    axis: 'y',
                    data: [matchCounts['T/T'], matchCounts['T/F'], matchCounts['F/T'], matchCounts['F/F']],
                    backgroundColor: [PALETTE.news, '#95a5a6', '#7f8c8d', '#ced6e0'],
                    borderRadius: 0
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    x: { duration: 1000, from: 0 }
                },
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                    y: { grid: { display: false } }
                }
            }
        });
    }
}

function renderXCharts() {
    createBarChart('xCompanyChart', Object.keys(xData.distributions.by_company), Object.values(xData.distributions.by_company), PALETTE.social);

    const userLabels = Object.keys(xData.distributions.top_users);
    const userColors = userLabels.map(u => u.toLowerCase() === 'grok' ? '#ecf0f1' : PALETTE.neutral);
    createBarChart('xUserChart', userLabels, Object.values(xData.distributions.top_users), userColors);

    const xTrendLabels = Object.keys(xData.distributions.by_month);
    const xTrendValues = Object.values(xData.distributions.by_month);

    if (chartInstances['xTrendChart']) chartInstances['xTrendChart'].destroy();
    chartInstances['xTrendChart'] = new Chart(document.getElementById('xTrendChart'), {
        type: 'line',
        data: {
            labels: xTrendLabels,
            datasets: [{
                label: 'Mentions',
                data: xTrendValues,
                borderColor: PALETTE.social,
                backgroundColor: 'rgba(127, 140, 141, 0.1)',
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeOutQuart',
                from: 0
            },
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } },
                y: { beginAtZero: true, grid: { color: '#f0f0f0' } }
            }
        }
    });
}

function renderAnalysisCharts() {
    if (chartInstances['pillarComparisonChart']) chartInstances['pillarComparisonChart'].destroy();
    chartInstances['pillarComparisonChart'] = new Chart(document.getElementById('pillarComparisonChart'), {
        type: 'bar',
        data: {
            labels: ['Environmental', 'Social', 'Governance'],
            datasets: [
                {
                    label: 'News (Official)',
                    data: [
                        depthData.pillar_distribution.News.Environmental || 0,
                        depthData.pillar_distribution.News.Social || 0,
                        depthData.pillar_distribution.News.Governance || 0
                    ],
                    backgroundColor: PALETTE.news
                },
                {
                    label: 'Social (Public)',
                    data: [
                        depthData.pillar_distribution.Social.Environmental || 0,
                        depthData.pillar_distribution.Social.Social || 0,
                        depthData.pillar_distribution.Social.Governance || 0
                    ],
                    backgroundColor: PALETTE.social
                }
            ]
        },
        options: {
            responsive: true,
            animation: { y: { duration: 1000, from: 0 } },
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } },
            scales: { y: { grid: { color: '#f0f0f0' } } }
        }
    });

    const companies = Object.keys(depthData.company_pillar_map);
    const esgLabels = ['Environmental', 'Social', 'Governance'];
    const esgColors = [PALETTE.environmental, PALETTE.social_pillar, PALETTE.governance];

    function createStackedPillarChart(id, source) {
        const datasets = esgLabels.map((label, i) => ({
            label: label[0], // E, S, G
            data: companies.map(c => {
                const companyData = depthData.company_pillar_map[c];
                if (companyData[source] && typeof companyData[source] === 'object') {
                    return companyData[source][label] || 0;
                }
                return source === 'Social' ? (companyData[label] || 0) : 0;
            }),
            backgroundColor: esgColors[i]
        }));

        if (chartInstances[id]) chartInstances[id].destroy();
        chartInstances[id] = new Chart(document.getElementById(id), {
            type: 'bar',
            data: { labels: companies, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { y: { duration: 1000, from: 0 } },
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10 } },
                    tooltip: { callbacks: { title: (items) => source + " Analysis: " + items[0].label } }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: {
                            maxRotation: 90,
                            minRotation: window.innerWidth < 768 ? 90 : 0,
                            callback: function (val, index) {
                                const label = this.getLabelForValue(index);
                                if (window.innerWidth < 768) {
                                    let clean = label.replace(/^PT\s+/i, '').replace(/\s+Tbk$/i, '');
                                    return clean.length > 15 ? clean.substring(0, 12) + '..' : clean;
                                }
                                return label;
                            }
                        }
                    },
                    y: { stacked: true, grid: { color: '#f0f0f0' }, title: { display: true, text: 'Frequency', font: { weight: 'bold' } } }
                }
            }
        });
    }

    createStackedPillarChart('newsCompanyPillarChart', 'News');
    createStackedPillarChart('socialCompanyPillarChart', 'Social');

    if (depthData.pillar_distribution.News && depthData.pillar_distribution.Social) {
        const newsP = depthData.pillar_distribution.News;
        const socialP = depthData.pillar_distribution.Social;
        const normNews = [newsP.Environmental || 0, newsP.Social || 0, newsP.Governance || 0].map(v => (v / Object.values(newsP).reduce((a, b) => a + b, 0) * 100).toFixed(1));
        const normSocial = [socialP.Environmental || 0, socialP.Social || 0, socialP.Governance || 0].map(v => (v / Object.values(socialP).reduce((a, b) => a + b, 0) * 100).toFixed(1));

        if (chartInstances['pillarRadarChart']) chartInstances['pillarRadarChart'].destroy();
        chartInstances['pillarRadarChart'] = new Chart(document.getElementById('pillarRadarChart'), {
            type: 'radar',
            data: {
                labels: ['Environmental', 'Social', 'Governance'],
                datasets: [
                    { label: 'News (%)', data: normNews, borderColor: PALETTE.news, backgroundColor: 'rgba(44,62,80,0.1)', pointBackgroundColor: PALETTE.news },
                    { label: 'Social (%)', data: normSocial, borderColor: PALETTE.social, backgroundColor: 'rgba(127,140,141,0.1)', pointBackgroundColor: PALETTE.social }
                ]
            },
            options: {
                animation: { duration: 1500, easing: 'easeOutBounce' },
                plugins: { legend: { position: 'bottom' } },
                scales: { r: { min: 0, max: 100, ticks: { display: false } } }
            }
        });
    }

    if (typeof sentimentData !== 'undefined' && sentimentData.by_company) {
        const sentCompanies = Object.keys(sentimentData.by_company);
        ['newsSentimentChart', 'socialSentimentChart'].forEach(id => {
            const source = id.startsWith('news') ? 'News' : 'Social';
            const colors = id.startsWith('news') ? ['#4e6e5d', '#95a5a6', '#6c5b7b'] : ['#6e8e7d', '#bdc3c7', '#8c7b6c'];

            if (chartInstances[id]) chartInstances[id].destroy();
            chartInstances[id] = new Chart(document.getElementById(id), {
                type: 'bar',
                data: {
                    labels: sentCompanies,
                    datasets: [
                        { label: 'Positive', data: sentCompanies.map(c => sentimentData.by_company[c][source].label_1 || 0), backgroundColor: colors[0] },
                        { label: 'Neutral', data: sentCompanies.map(c => sentimentData.by_company[c][source].label_0 || 0), backgroundColor: colors[1] },
                        { label: 'Negative', data: sentCompanies.map(c => sentimentData.by_company[c][source].label_2 || 0), backgroundColor: colors[2] }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { y: { duration: 1000, from: 0 } },
                    scales: {
                        x: {
                            stacked: true,
                            ticks: {
                                maxRotation: 90,
                                minRotation: window.innerWidth < 768 ? 90 : 0,
                                callback: function (val, index) {
                                    const label = this.getLabelForValue(index);
                                    if (window.innerWidth < 768) {
                                        let clean = label.replace(/^PT\s+/i, '').replace(/\s+Tbk$/i, '');
                                        return clean.length > 15 ? clean.substring(0, 12) + '..' : clean;
                                    }
                                    return label;
                                }
                            }
                        },
                        y: { stacked: true, grid: { color: '#f0f0f0' } }
                    },
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } }
                }
            });
        });
    }
}

// Initial Load
renderNewsCharts();


// Tab Switcher
function showTab(tabId, updateUrl = true) {
    // Hide all content
    document.querySelectorAll('.tab-content').forEach(t => {
        t.style.display = 'none';
        t.classList.remove('active');
    });

    // Deactivate all buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    // Show target content
    const target = document.getElementById(tabId + '-tab');
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
    }

    // Activate specific button based on tabId
    const tabBtnMap = {
        'news': 0,
        'social': 1,
        'indepth': 2,
        'methodology': 3
    };
    const btns = document.querySelectorAll('button.tab-btn');
    if (btns[tabBtnMap[tabId]]) {
        btns[tabBtnMap[tabId]].classList.add('active');
    }

    // Update URL parameter
    if (updateUrl) {
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?tab=' + tabId;
        window.history.replaceState({ path: newUrl }, '', newUrl);
    }

    // Trigger Chart Renders for the active tab
    if (tabId === 'news') renderNewsCharts();
    if (tabId === 'social') renderXCharts();
    if (tabId === 'indepth') renderAnalysisCharts();
}

// URL Deep Linking
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['news', 'social', 'indepth', 'methodology'].includes(tab)) {
        showTab(tab, false);
    }
});

// News Explorer Table Logic
const itemsPerPage = 15;
let currentPage = 1;
let filteredNewsList = [...newsList];

function initFilters() {
    const companies = [...new Set(newsList.map(item => item.company))].sort();
    const sources = [...new Set(newsList.map(item => item.source_domain))].sort();

    // Extract Month-Year combinations
    const monthYears = [...new Set(newsList.map(item => {
        const parts = item.date.split(' ');
        if (parts.length === 3) return parts[1] + ' ' + parts[2];
        return null;
    }))].filter(Boolean).sort((a, b) => {
        const dateA = parseIndoDate('1 ' + a);
        const dateB = parseIndoDate('1 ' + b);
        return dateB - dateA; // Descending
    });

    const companySelect = document.getElementById('filter-company');
    const sourceSelect = document.getElementById('filter-source');
    const monthSelect = document.getElementById('filter-month');

    if (companySelect) {
        companies.forEach(c => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = c;
            companySelect.appendChild(opt);
        });
    }

    if (sourceSelect) {
        sources.forEach(s => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = s;
            sourceSelect.appendChild(opt);
        });
    }

    if (monthSelect) {
        monthYears.forEach(my => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = my;
            monthSelect.appendChild(opt);
        });
    }
}

function parseIndoDate(dateStr) {
    const months = {
        'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
        'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
    };
    const parts = dateStr.toLowerCase().split(' ');
    if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = months[parts[1]] || 0;
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
    } else if (parts.length === 2) { // Handle "Month Year"
        const month = months[parts[0]] || 0;
        const year = parseInt(parts[1]);
        return new Date(year, month, 1);
    }
    return new Date(0);
}

window.applyFilters = function () {
    const searchQuery = document.getElementById('news-search').value.toLowerCase();
    const companyFilter = document.getElementById('filter-company').value;
    const sourceFilter = document.getElementById('filter-source').value;
    const monthFilter = document.getElementById('filter-month').value;
    const sortFilter = document.getElementById('filter-sort').value;

    // New match toggles
    const companyMatchFilter = document.getElementById('filter-company-match').value;
    const perceptionMatchFilter = document.getElementById('filter-perception-match').value;

    filteredNewsList = newsList.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery);
        const matchesCompany = companyFilter === 'all' || item.company === companyFilter;
        const matchesSource = sourceFilter === 'all' || item.source_domain === sourceFilter;
        const matchesMonth = monthFilter === 'all' || item.date.includes(monthFilter);

        // Match Logic
        // We convert values to boolean or handle 'all'
        const itemCompanyMatch = String(item.is_company_match ?? true);
        const itemPerceptionMatch = String(item.is_perception_match ?? true);

        const matchesCompanyToggle = companyMatchFilter === 'all' || itemCompanyMatch === companyMatchFilter;
        const matchesPerceptionToggle = perceptionMatchFilter === 'all' || itemPerceptionMatch === perceptionMatchFilter;

        return matchesSearch && matchesCompany && matchesSource && matchesMonth && matchesCompanyToggle && matchesPerceptionToggle;
    });

    if (sortFilter === 'oldest') {
        filteredNewsList.sort((a, b) => parseIndoDate(a.date) - parseIndoDate(b.date));
    } else {
        filteredNewsList.sort((a, b) => parseIndoDate(b.date) - parseIndoDate(a.date));
    }

    document.getElementById('filtered-count').innerText = filteredNewsList.length.toLocaleString();
    currentPage = 1;
    renderTable(1);
}

function formatDate(dateStr) {
    const monthsIndo = {
        'januari': 'Jan', 'februari': 'Feb', 'maret': 'Mar', 'april': 'Apr', 'mei': 'May', 'juni': 'Jun',
        'juli': 'Jul', 'agustus': 'Aug', 'september': 'Sep', 'oktober': 'Oct', 'november': 'Nov', 'desember': 'Dec'
    };
    const parts = dateStr.toLowerCase().split(' ');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = monthsIndo[parts[1]] || parts[1];
        const year = parts[2];
        return `${day} ${month} ${year}`;
    }
    return dateStr;
}

function renderTable(page) {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredNewsList.slice(start, end);

    const tbody = document.getElementById('news-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    pageData.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
                    <td style="white-space:nowrap">${formatDate(item.date)}</td>
                    <td><span class="company-pill">${item.company}</span></td>
                    <td>
                        <a href="${item.url}" target="_blank" class="news-title-cell">${item.title}</a>
                    </td>
                    <td style="color:var(--text-secondary)">${item.source_domain}</td>
                `;
        tbody.appendChild(tr);
    });

    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredNewsList.length / itemsPerPage) || 1;
    const container = document.getElementById('news-pagination');
    if (!container) return;

    container.innerHTML = `
                <button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
                <div class="page-info">Page ${currentPage} of ${totalPages}</div>
                <button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
            `;
}

window.goToPage = function (page) {
    currentPage = page;
    renderTable(currentPage);
}


// X Explorer Table Logic
let currentXPage = 1;
let filteredXList = typeof xList !== 'undefined' ? [...xList] : [];

function initXFilters() {
    if (typeof xList === 'undefined') return;
    const xCompanies = [...new Set(xList.map(item => item.company))].sort();
    const companyXSelect = document.getElementById('filter-x-company');
    if (companyXSelect) {
        xCompanies.forEach(c => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = c;
            companyXSelect.appendChild(opt);
        });
    }
}

function parseXDate(dateStr) {
    try {
        return new Date(dateStr);
    } catch (e) {
        return new Date(0);
    }
}

window.applyXFilters = function () {
    if (typeof xList === 'undefined') return;
    const searchQuery = document.getElementById('x-search').value.toLowerCase();
    const companyFilter = document.getElementById('filter-x-company').value;
    const sortFilter = document.getElementById('filter-x-sort').value;

    filteredXList = xList.filter(item => {
        const matchesSearch = item.text.toLowerCase().includes(searchQuery) ||
            item.username.toLowerCase().includes(searchQuery);
        const matchesCompany = companyFilter === 'all' || item.company === companyFilter;
        return matchesSearch && matchesCompany;
    });

    if (sortFilter === 'oldest') {
        filteredXList.sort((a, b) => parseXDate(a.date) - parseXDate(b.date));
    } else if (sortFilter === 'engagement') {
        filteredXList.sort((a, b) => (b.like_count + b.retweet_count) - (a.like_count + a.retweet_count));
    } else {
        filteredXList.sort((a, b) => parseXDate(b.date) - parseXDate(a.date));
    }

    const countEl = document.getElementById('x-filtered-count');
    if (countEl) countEl.innerText = filteredXList.length.toLocaleString();
    currentXPage = 1;
    renderXTable(1);
}

function formatXDate(dateStr) {
    const d = parseXDate(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function renderXTable(page) {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredXList.slice(start, end);

    const tbody = document.getElementById('x-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    pageData.forEach(item => {
        const tr = document.createElement('tr');
        const xLink = `https://x.com/${item.username}/status/${item.tweet_id}`;
        const userLink = `https://x.com/${item.username}`;

        tr.innerHTML = `
                    <td style="white-space:nowrap; font-size: 0.8rem;">${formatXDate(item.date)}</td>
                    <td>
                        <a href="${userLink}" target="_blank" style="text-decoration:none; color:var(--text-primary); font-weight:600; font-size: 0.85rem;">
                            @${item.username}
                        </a>
                    </td>
                    <td>
                        <a href="${xLink}" target="_blank" style="text-decoration:none; color:inherit; font-size: 0.9rem; line-height: 1.4; display:block;">
                            ${item.text}
                        </a>
                    </td>
                    <td><span class="company-pill">${item.company}</span></td>
                    <td style="white-space:nowrap; font-size: 0.8rem; color: var(--text-secondary)">
                        <div style="display:flex; align-items:center; gap:4px; margin-bottom:4px;">
                            <svg viewBox="0 0 24 24" style="width: 14px; fill: currentColor;"><g><path d="M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"></path></g></svg>
                            <span>${item.like_count}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:4px;">
                            <svg viewBox="0 0 24 24" style="width: 14px; fill: currentColor;"><g><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></g></svg>
                            <span>${item.retweet_count}</span>
                        </div>
                    </td>
                `;
        tbody.appendChild(tr);
    });

    renderXPagination();
}

function renderXPagination() {
    const totalPages = Math.ceil(filteredXList.length / itemsPerPage) || 1;
    const container = document.getElementById('x-pagination');
    if (!container) return;

    container.innerHTML = `
                <button class="page-btn" onclick="goToXPage(${currentXPage - 1})" ${currentXPage === 1 ? 'disabled' : ''}>Prev</button>
                <div class="page-info">Page ${currentXPage} of ${totalPages}</div>
                <button class="page-btn" onclick="goToXPage(${currentXPage + 1})" ${currentXPage === totalPages ? 'disabled' : ''}>Next</button>
            `;
}

window.goToXPage = function (page) {
    currentXPage = page;
    renderXTable(currentXPage);
}

// Initialize social table if data exists
if (typeof xList !== 'undefined' && xList.length > 0) {
    initXFilters();
    applyXFilters();
}

// --- END OF NEWS LOGIC ---

// Initialize news table if data exists
if (typeof newsList !== 'undefined' && newsList.length > 0) {
    initFilters();
    applyFilters(); // Initial render with default filters
}