
// Constants and Configuration
const DATA_URL = (() => {
    try {
        const base = document.currentScript?.src ?? window.location.href;
        return new URL("clean_data.csv", base).toString();
    } catch {
        return "clean_data.csv";
    }
})();
const ANIMATION_DURATION = 800;
const TRANSITION_DURATION = 600;

// State
let state = {
    data: [],
    keys: [],
    filteredKeys: [],
    yearRange: [2005, 2025],
    currentYear: 'All', // 'All' or specific year (number)
    maxAPBN: 0,
    activeTab: 'main-view',
    selectedComponent: null, // 'All' or specific component
    resizeTimer: null,
    zoomTransform: d3.zoomIdentity, // Add zoom state
    isPlaying: false,
    playTimer: null,
    introPlayed: {
        "main-view": false,
        "mixed-view": false,
        "area-view": false
    }
};

// Dimensions - Updated dynamically
let margin = { top: 10, right: 20, bottom: 40, left: 50 };
let width, height;

// Color Palette
const colorMap = {
    "Pendidikan": "#2B6CB0",
    "Perlindungan Sosial": "#DD6B20",
    "Kesehatan": "#38A169",
    "Pelayanan Umum": "#718096",
    "Ekonomi": "#319795",
    "Pertahanan": "#2C5282",
    "Ketertiban dan Keamanan": "#4A5568",
    "Agama": "#805AD5",
    "Perumahan dan Fasilitas Umum": "#D69E2E",
    "Lingkungan Hidup": "#48BB78",
    "Pariwisata dan Budaya": "#D53F8C"
};
const fallbackColors = d3.schemeTableau10;
const color = (key) => colorMap[key] || fallbackColors[state.keys.indexOf(key) % fallbackColors.length];


// Initialization
async function init() {
    try {
        const rawData = await d3.csv(DATA_URL);
        processData(rawData);

        setupControls();
        setupTabs();

        // Initial Resize to set dimensions
        resize();
        window.addEventListener("resize", () => {
            clearTimeout(state.resizeTimer);
            state.resizeTimer = setTimeout(resize, 100);
        });

        // Trigger intro animation for initial tab if needed
        playIntroAnimation();

    } catch (error) {
        console.error("Error loading data:", error);
        d3.select("main").html(`<p class="error">Error loading data: ${error.message}</p>`);
    }
}

function processData(rawData) {
    const headers = rawData.columns;
    state.keys = headers
        .filter(h => h.startsWith("Pagu "))
        .map(h => h.replace("Pagu ", "").trim());

    // Sort keys by total volume
    const totalVolume = {};
    state.keys.forEach(k => totalVolume[k] = 0);
    rawData.forEach(row => {
        state.keys.forEach(k => totalVolume[k] += (+row[`Pagu ${k}`] || 0));
    });
    state.keys.sort((a, b) => totalVolume[b] - totalVolume[a]);

    state.filteredKeys = [...state.keys];
    state.selectedComponent = state.keys[0];
    state.highlightedKey = null; // Initialize highlighted key

    state.data = rawData.map(d => {
        const row = {
            year: +d.Tahun,
            // originalTotal: +d.APBN, // Removed APBN column usage entirely
            original: d
        };

        // Calculate Total based on Sum of Components (Functions)
        // to ensure charts scale to the visible data
        let sumComponents = 0;
        state.keys.forEach(key => {
            const val = +d[`Pagu ${key}`] || 0;
            row[key] = val;
            sumComponents += val;
        });

        row.total = sumComponents; // Use sum of components as the only source of truth for Total

        // Sort keys for legend display based on current year values
        // ... (sorting logic moved to render/update time or kept here if needed)

        state.keys.forEach(key => {
            // Handle percentages based on new total
            if (row.total > 0) {
                row[`pct_${key}`] = row[key] / row.total;
            } else {
                row[`pct_${key}`] = 0;
            }
        });

        return row;
    });

    const years = state.data.map(d => d.year);
    state.yearRange = [d3.min(years), d3.max(years)];
    state.maxAPBN = d3.max(state.data, d => d.total);

    // Populate Dropdowns
    const selects = d3.selectAll("#global-component-select");

    // Add Component Options
    selects.selectAll("option.comp")
        .data(state.keys)
        .enter().append("option")
        .attr("class", "comp")
        .text(d => d)
        .attr("value", d => d);

    selects.property("value", state.selectedComponent);

    // Populate Year Select
    const yearSelect = d3.select("#year-select");
    const yearsSorted = [...years].sort((a, b) => b - a);
    yearSelect.selectAll("option:not([value='All'])").remove(); // Clear existing years

    yearsSorted.forEach(y => {
        yearSelect.append("option").text(y).attr("value", y);
    });
    yearSelect.property("value", state.currentYear);
}

function setupTabs() {
    const tabs = document.querySelectorAll('button.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('button.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            document.getElementById(targetId).classList.add('active');

            state.activeTab = targetId;
            state.zoomTransform = d3.zoomIdentity; // Reset zoom on tab switch

            // Toggle Controls based on Tab
            const timelineControls = document.getElementById('timeline-controls');
            const filterControls = document.getElementById('filter-controls');
            const playBtn = document.getElementById('play-year-btn');
            const mobileToggles = document.getElementById('mobile-toggles');

            if (state.activeTab === 'main-view') {
                timelineControls.classList.remove('hidden');
                filterControls.classList.add('hidden');
                if (mobileToggles) mobileToggles.classList.remove('hidden');
                // playBtn visibility is handled by renderMainChart
            } else {
                timelineControls.classList.add('hidden');
                filterControls.classList.remove('hidden');
                if (mobileToggles) mobileToggles.classList.add('hidden');
                if (playBtn) playBtn.style.display = 'none';
            }

            // Re-render chart and play intro
            setTimeout(() => {
                resize();
                renderActiveTab();
                playIntroAnimation();
            }, 50);
        });
    });

    // Dropdown listeners
    d3.select("#global-component-select").on("change", function () {
        state.selectedComponent = this.value;
        renderActiveTab();
        playIntroAnimation(true); // Trigger foreground re-animation
    });

    // Keyboard Navigation
    document.addEventListener("keydown", (e) => {
        const tabs = ['main-view', 'mixed-view', 'area-view'];
        let currentIndex = tabs.indexOf(state.activeTab);

        if (e.key === "ArrowLeft") {
            // Left Arrow: Previous Tab (Looping)
            currentIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            const newTab = tabs[currentIndex];
            document.querySelector(`.tab-btn[data-tab="${newTab}"]`).click();
        }
        else if (e.key === "ArrowRight") {
            // Right Arrow: Next Tab (Looping)
            currentIndex = (currentIndex + 1) % tabs.length;
            const newTab = tabs[currentIndex];
            document.querySelector(`.tab-btn[data-tab="${newTab}"]`).click();
        }
        else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault(); // Prevent page scroll
            const isUp = e.key === "ArrowUp";

            if (state.activeTab === 'main-view') {
                const select = document.getElementById("year-select");
                if (select) {
                    const options = Array.from(select.options);
                    let idx = select.selectedIndex;

                    // Up/Down logic for dropdown (Up = previous option, Down = next option)
                    if (isUp) {
                        idx = (idx - 1 + options.length) % options.length;
                    } else {
                        idx = (idx + 1) % options.length;
                    }

                    select.selectedIndex = idx;
                    // Trigger change event manually to update chart
                    select.dispatchEvent(new Event('change'));
                }
            } else {
                const select = document.getElementById("global-component-select");
                if (select) {
                    const options = Array.from(select.options);
                    let idx = select.selectedIndex;

                    if (isUp) {
                        idx = (idx - 1 + options.length) % options.length;
                    } else {
                        idx = (idx + 1) % options.length;
                    }

                    select.selectedIndex = idx;
                    select.dispatchEvent(new Event('change'));
                }
            }
        }
    });
}

function resize() {
    let containerSelector = "#chart";
    if (state.activeTab === 'mixed-view') containerSelector = "#mixed-chart";
    if (state.activeTab === 'area-view') containerSelector = "#area-chart";

    const container = d3.select(containerSelector).node();
    if (!container) return;

    // Responsive Margins
    const isMobile = window.innerWidth < 768;
    margin.left = isMobile ? 60 : 50; // Increased to 60 for mobile to fit "XXXX.XT"
    margin.right = state.activeTab === 'mixed-view' ? (isMobile ? 50 : 40) : (isMobile ? 20 : 10); // Increase right margin on mobile too
    margin.bottom = isMobile ? 60 : 30; // Increase bottom margin for rotated labels on mobile

    const rect = container.getBoundingClientRect();
    width = rect.width - margin.left - margin.right;
    height = rect.height - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return;

    // Do NOT reset zoom on resize, to allow orientation changes to keep zoom? 
    // Or reset to avoid layout issues. Reset is safer.
    // state.zoomTransform = d3.zoomIdentity; 

    renderActiveTab();
}

function renderActiveTab() {
    if (state.activeTab === 'main-view') {
        renderMainChart(state.currentYear);
    } else if (state.activeTab === 'mixed-view') {
        renderMixedChart();
    } else if (state.activeTab === 'area-view') {
        renderAreaChart();
    }
}

function playIntroAnimation(isFilterChange = false) {
    if (!isFilterChange && state.introPlayed[state.activeTab]) return;

    if (state.activeTab === 'main-view') {
        if (isFilterChange) return; // Main view handles its own year-based updates
        renderMainChart();
        return;
    }

    if (!isFilterChange) {
        state.introPlayed[state.activeTab] = true;
    }

    const duration = 1500;
    const ease = d3.easeCubicOut;

    let clipId = "#mixed-fg-clip-rect";
    if (state.activeTab === 'area-view') clipId = "#area-fg-clip-rect";

    // If it's a filter change, we only animate the foreground clip
    // If it's the first load, we animate both bg and fg (handled by separate clips)
    
    if (!isFilterChange) {
        // First load: animate background too if needed
        // For Mixed/Area views, we'll keep background static or animate once
        let bgClipId = state.activeTab === 'mixed-view' ? "#mixed-bg-clip-rect" : "#area-bg-clip-rect";
        d3.select(bgClipId)
            .attr("width", 0)
            .transition()
            .duration(duration)
            .ease(ease)
            .attr("width", width);
    }

    d3.select(clipId)
        .attr("width", 0)
        .transition()
        .duration(duration)
        .ease(ease)
        .attr("width", width);
}

// --- CHART 1: Main View (Trend or Composition) ---
function renderMainChart() {
    // Update Title
    const titleEl = document.getElementById('main-chart-title');
    if (titleEl) {
        titleEl.textContent = state.currentYear === 'All'
            ? "Budget Composition & Trend"
            : `Budget Composition & Trend (${state.currentYear})`;
    }

    const container = d3.select("#chart");
    const isTreemap = state.currentYear !== 'All';
    const wasTreemap = container.attr("data-view") === 'treemap';

    // Play Button Logic
    const playBtn = document.getElementById('play-year-btn');
    if (playBtn) {
        if (isTreemap && state.currentYear < state.yearRange[1]) {
            playBtn.style.display = 'flex';
        } else {
            playBtn.style.display = 'none';
            if (state.isPlaying && state.currentYear >= state.yearRange[1]) {
                togglePlay(); // Stop if reached end
            }
        }
    }

    // Only clear if switching view modes
    if ((isTreemap && !wasTreemap) || (!isTreemap && wasTreemap)) {
        container.html("");
    }

    container.attr("data-view", isTreemap ? 'treemap' : 'trend');

    // Zoom setup (Only for Trend)
    if (!isTreemap) {
        if (state.currentYear === 'All') {
            const zoom = d3.zoom()
                .scaleExtent([1, 8])
                .extent([[0, 0], [width, height]])
                .translateExtent([[0, 0], [width, height]])
                .filter(function (event) {
                    // Allow pinch (touch with 2 fingers) and wheel; block single-touch pan
                    if (event.type === 'touchstart' || event.type === 'touchmove') {
                        return event.touches && event.touches.length >= 2;
                    }
                    return !event.ctrlKey || event.type === 'wheel';
                })
                .on("zoom", (event) => {
                    state.zoomTransform = event.transform;
                    renderMainChart(); // Re-render with new transform
                });
            // Enable pinch-zoom by preventing browser default touch handling
            container.style("touch-action", "pinch-zoom");
            container.call(zoom).on("dblclick.zoom", null);
        } else {
            container.on(".zoom", null);
            container.style("touch-action", "");
        }
    } else {
        container.on(".zoom", null);
        container.style("touch-action", "");
    }

    let svg = container.select("svg");
    let g;
    let defs;

    if (svg.empty()) {
        let translateX = margin.left;
        let translateY = margin.top;

        if (isTreemap) {
            translateX = 10;
            translateY = 10;
        }

        svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        defs = svg.append("defs");

        g = svg.append("g")
            .attr("transform", `translate(${translateX},${translateY})`);

        if (!isTreemap) {
            // Clip path for bars to prevent drawing outside axes when zoomed
            defs.append("clipPath")
                .attr("id", "main-clip")
                .append("rect")
                .attr("width", width)
                .attr("height", height);

            // Clip path for X-axis (allow labels below chart)
            defs.append("clipPath")
                .attr("id", "xaxis-clip")
                .append("rect")
                .attr("width", width)
                .attr("height", height + margin.bottom);
        }
    } else {
        g = svg.select("g");
        defs = svg.select("defs");
        if (defs.empty()) defs = svg.append("defs");
    }

    if (!isTreemap) {
        // Trend View: Full Redraw for simplicity in Zoom (or optimize later)
        // Since we didn't clear container, we must clear group content if it's a re-render
        g.html("");
        renderTrendChart(g, defs);
        updateLegend(state.yearRange[1]);
    } else {
        const treemapWidth = (width + margin.left + margin.right) - 20;
        const treemapHeight = (height + margin.top + margin.bottom) - 20;
        renderTreemapChart(g, state.currentYear, treemapWidth, treemapHeight);
        updateLegend(state.currentYear);
    }
}

function renderTrendChart(svg, defs) {
    // 1. Stacked Bar Chart for All Years
    const xBase = d3.scaleBand()
        .domain(state.data.map(d => d.year))
        .range([0, width])
        .padding(0.25);

    // Apply zoom transform to range
    const xRange = [0, width].map(d => state.zoomTransform.applyX(d));
    const x = xBase.range(xRange);

    const y = d3.scaleLinear()
        .domain([0, state.maxAPBN * 1.1])
        .range([height, 0])
        .nice();

    // Axes
    // Clip axes? Usually X axis needs clipping if we pan? 
    // Yes, if we pan, ticks might go outside.
    const axesGroup = svg.append("g");

    // Apply separate clip paths
    // X-axis needs to be clipped horizontally but allow labels below
    const xAxis = d3.axisBottom(x).tickValues(x.domain().filter((d, i) => !(i % 2))).tickSize(0).tickPadding(10);
    const xAxisG = axesGroup.append("g")
        .attr("clip-path", "url(#xaxis-clip)")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);

    xAxisG.select(".domain").remove();

    // Rotate X-axis labels on mobile
    if (window.innerWidth < 768) {
        xAxisG.selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)");
    }

    // Y-axis needs standard clipping or no clipping (ticks usually inside margin)
    // Actually, Y-axis doesn't move horizontally, so no need for complex clipping usually.
    svg.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => formatCurrencyShort(d)).tickSize(0).tickPadding(10))
        .select(".domain").remove();

    svg.append("g").attr("class", "grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat("")).select(".domain").remove();

    // Group for Bars with Clip Path
    const content = svg.append("g").attr("clip-path", "url(#main-clip)");

    // Stack Data
    const stack = d3.stack()
        .keys(state.filteredKeys)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

    const series = stack(state.data);

    // Transform data to Year-based structure for vertical cascading
    const yearGroupsData = state.data.map((d, i) => {
        const segments = series.map(layer => {
            const point = layer[i];
            return {
                key: layer.key,
                y0: point[0],
                y1: point[1],
                data: d
            };
        });
        return {
            year: d.year,
            total: d.total,
            segments: segments
        };
    });

    // Join Year Groups
    const groups = content.selectAll(".year-group")
        .data(yearGroupsData, d => d.year)
        .enter().append("g")
        .attr("class", "year-group")
        .attr("transform", d => `translate(${x(d.year)}, 0)`);

    // Create unique clip-path for each year group
    groups.each(function (d, i) {
        const year = d.year;
        const clipId = `clip-trend-${year}`;

        // Remove existing clipPath for this year to avoid duplicates
        defs.select(`#${clipId}`).remove();

        const clipRect = defs.append("clipPath")
            .attr("id", clipId)
            .append("rect")
            .attr("x", 0)
            .attr("width", x.bandwidth())
            .attr("height", height);

        if (!state.introPlayed['main-view']) {
            // First load: animate bars growing from bottom
            clipRect
                .attr("y", height) // Start from bottom
                .attr("height", 0) // Start with 0 height
                .transition()
                .duration(800)
                .ease(d3.easeCubicOut)
                .delay(i * 50)
                .attr("y", 0)
                .attr("height", height);
        } else {
            // Already animated once — show bars instantly
            clipRect.attr("y", 0);
        }

        d3.select(this).attr("clip-path", `url(#${clipId})`);
    });

    // Mark intro as played AFTER animation is triggered for this group
    // But ONLY if it was false (to avoid setting it true on zoom)
    if (!state.introPlayed['main-view']) {
        state.introPlayed['main-view'] = true;
    }

    // Add Rects (Full height immediately, revealed by clip-path)
    groups.selectAll("rect")
        .data(d => d.segments)
        .enter().append("rect")
        .attr("x", 0)
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.y1))
        .attr("height", d => y(d.y0) - y(d.y1))
        .attr("fill", d => color(d.key))
        .style("opacity", d => (state.highlightedKey && state.highlightedKey !== d.key) ? 0.3 : 1)
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut)
        .on("mousemove", handleMouseMove);
}

function renderTreemapChart(selection, year, tmWidth = width, tmHeight = height) {
    // 2. Treemap for Specific Year (No Zoom)
    const row = state.data.find(d => d.year === year);
    if (!row) return;

    // Prepare Hierarchy Data
    const rootData = {
        name: "APBN",
        children: state.filteredKeys.map(key => ({
            name: key,
            value: row[key] || 0
        }))
    };

    const root = d3.hierarchy(rootData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

    d3.treemap()
        .size([tmWidth, tmHeight])
        .padding(2)
        (root);

    // Data Join
    // Use 'name' as key to ensure smooth transitions of same components
    const nodes = selection.selectAll("g.node")
        .data(root.leaves(), d => d.data.name);

    const t = selection.transition().duration(1000).ease(d3.easeCubicOut);

    // EXIT
    nodes.exit()
        .transition(t)
        .style("opacity", 0)
        .remove();

    // UPDATE (Moving existing nodes)
    nodes.transition(t)
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    nodes.select("rect")
        .transition(t)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => color(d.data.name));

    nodes.select("text.label-name")
        .transition(t)
        .style("opacity", d => {
            const isVisible = (d.x1 - d.x0 > 50 && d.y1 - d.y0 > 30);
            if (!isVisible) return 0;
            return (state.highlightedKey && state.highlightedKey !== d.data.name) ? 0.2 : 1;
        });

    nodes.select("text.label-val")
        .transition(t)
        .text(d => formatCurrencyShort(d.data.value))
        .style("opacity", d => {
            const isVisible = (d.x1 - d.x0 > 50 && d.y1 - d.y0 > 50);
            if (!isVisible) return 0;
            return (state.highlightedKey && state.highlightedKey !== d.data.name) ? 0.2 : 0.8;
        });

    // ENTER
    const enterNodes = nodes.enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .style("opacity", 0);

    enterNodes.transition(t)
        .style("opacity", 1);

    enterNodes.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => color(d.data.name))
        .style("opacity", d => (state.highlightedKey && state.highlightedKey !== d.data.name) ? 0.3 : 1)
        .on("mouseover", function (event, d) {
            d3.select(this).attr("stroke", "white").attr("stroke-width", 2);
            const pct = (d.data.value / row.total) * 100;
            showTooltip(event, `${year} — ${d.data.name}`,
                `Allocation: <strong>${formatCurrency(d.data.value)}</strong><br>
                 Of Total APBN: <strong>${pct.toFixed(2)}%</strong>`
            );
        })
        .on("mouseout", function () {
            d3.select(this).attr("stroke", "none");
            hideTooltip();
        })
        .on("mousemove", handleMouseMove);

    // Add Labels
    enterNodes.append("text")
        .attr("class", "label-name")
        .attr("x", 5)
        .attr("y", 15)
        .text(d => d.data.name)
        .attr("font-size", "0.75rem")
        .attr("fill", "white")
        .style("pointer-events", "none")
        .style("opacity", d => {
            const isVisible = (d.x1 - d.x0 > 50 && d.y1 - d.y0 > 30);
            if (!isVisible) return 0;
            return (state.highlightedKey && state.highlightedKey !== d.data.name) ? 0.2 : 1;
        });

    enterNodes.append("text")
        .attr("class", "label-val")
        .attr("x", 5)
        .attr("y", 30)
        .text(d => formatCurrencyShort(d.data.value))
        .attr("font-size", "0.7rem")
        .attr("fill", "white")
        .style("pointer-events", "none")
        .style("opacity", d => {
            const isVisible = (d.x1 - d.x0 > 50 && d.y1 - d.y0 > 50);
            if (!isVisible) return 0;
            return (state.highlightedKey && state.highlightedKey !== d.data.name) ? 0.2 : 0.8;
        });
}


// --- CHART 2: Mixed (Bar + Line) ---
function renderMixedChart() {
    // Update Title
    const titleEl = document.getElementById('mixed-chart-title');
    if (titleEl) {
        titleEl.textContent = state.selectedComponent === 'All'
            ? "Total Budget vs Component Allocation"
            : `Total Budget vs Component Allocation (${state.selectedComponent})`;
    }

    const container = d3.select("#mixed-chart");
    container.html("");

    // Zoom setup
    const zoom = d3.zoom()
        .filter((event) => {
            if (event.type === "touchstart" || event.type === "touchmove") {
                return event.touches && event.touches.length === 2;
            }
            return !event.button;
        })
        .scaleExtent([1, 8])
        .extent([[0, 0], [width, height]])
        .translateExtent([[0, 0], [width, height]])
        .on("zoom", (event) => {
            state.zoomTransform = event.transform;
            renderMixedChart();
        });
    container.style("touch-action", "pinch-zoom"); // Enable pinch-zoom
    container.call(zoom).on("dblclick.zoom", null);

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define Clip Paths
    const defs = svg.append("defs");

    defs.append("clipPath")
        .attr("id", "mixed-bg-clip")
        .append("rect")
        .attr("id", "mixed-bg-clip-rect")
        .attr("width", width)
        .attr("height", height);

    defs.append("clipPath")
        .attr("id", "mixed-fg-clip")
        .append("rect")
        .attr("id", "mixed-fg-clip-rect")
        .attr("width", width)
        .attr("height", height);

    // Clip path for X-axis (allow labels below chart)
    defs.append("clipPath")
        .attr("id", "mixed-xaxis-clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height + margin.bottom); // Allow space for labels

    const data = state.data;
    const compKey = state.selectedComponent;
    const isAll = compKey === 'All';

    const xBase = d3.scaleBand()
        .domain(data.map(d => d.year))
        .range([0, width])
        .padding(0.3);

    const xRange = [0, width].map(d => state.zoomTransform.applyX(d));
    const x = xBase.range(xRange);

    const yBar = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.total) * 1.1])
        .range([height, 0]);

    const yLine = d3.scaleLinear()
        .domain([0, 1])
        .range([height, 0]);

    // Axes
    const axesGroup = svg.append("g");
    const xAxis = d3.axisBottom(x).tickValues(x.domain().filter((d, i) => !(i % 2))).tickSize(0).tickPadding(10);
    const xAxisG = axesGroup.append("g")
        .attr("clip-path", "url(#mixed-xaxis-clip)")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);

    xAxisG.select(".domain").remove();

    // Rotate X-axis labels on mobile
    if (window.innerWidth < 768) {
        xAxisG.selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)");
    }

    svg.append("g")
        .call(d3.axisLeft(yBar).ticks(5).tickFormat(d => formatCurrencyShort(d)).tickSize(0).tickPadding(10))
        .select(".domain").remove();

    svg.append("g")
        .attr("transform", `translate(${width}, 0)`)
        .call(d3.axisRight(yLine).ticks(5).tickFormat(d => (d * 100).toFixed(0) + "%").tickSize(0).tickPadding(10))
        .select(".domain").remove();

    svg.append("g").attr("class", "grid")
        .call(d3.axisLeft(yBar).ticks(5).tickSize(-width).tickFormat("")).select(".domain").remove();

    // Content Groups
    const bgContent = svg.append("g").attr("clip-path", "url(#mixed-bg-clip)");
    const fgContent = svg.append("g").attr("clip-path", "url(#mixed-fg-clip)");

    // Bars (Total APBN) - Put in bgContent
    bgContent.selectAll(".bar-total")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar-total")
        .attr("x", d => x(d.year))
        .attr("y", d => yBar(d.total))
        .attr("width", x.bandwidth())
        .attr("height", d => height - yBar(d.total))
        .attr("fill", "#E2E8F0")
        .on("mouseover", function (event, d) {
            d3.select(this).attr("fill", "#CBD5E0");
            showTooltip(event, `Total APBN (${d.year})`, formatCurrency(d.total));
        })
        .on("mouseout", function () {
            d3.select(this).attr("fill", "#E2E8F0");
            hideTooltip();
        });

    if (isAll) {
        const sortedKeys = [...state.keys].sort((a, b) => {
            return state.keys.indexOf(a) - state.keys.indexOf(b);
        });

        sortedKeys.forEach(key => {
            const line = d3.line()
                .x(d => x(d.year) + x.bandwidth() / 2)
                .y(d => yLine(d[`pct_${key}`] || 0))
                .curve(d3.curveMonotoneX);

            fgContent.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", color(key))
                .attr("stroke-width", 1.5)
                .attr("opacity", 0.7)
                .attr("d", line)
                .on("mouseover", function (event) {
                    d3.select(this).attr("stroke-width", 4).attr("opacity", 1);
                    showTooltip(event, key, "Click line to isolate");
                })
                .on("mouseout", function () {
                    d3.select(this).attr("stroke-width", 1.5).attr("opacity", 0.7);
                    hideTooltip();
                })
                .on("click", function () {
                    state.selectedComponent = key;
                    // Update Dropdown UI
                    const select = d3.select("#global-component-select");
                    select.property("value", key);
                    // Re-render
                    renderActiveTab();
                    playIntroAnimation(true); // Trigger re-animation
                });
        });
    } else {
        // Single Line
        const line = d3.line()
            .x(d => x(d.year) + x.bandwidth() / 2)
            .y(d => yLine(d[`pct_${compKey}`] || 0))
            .curve(d3.curveMonotoneX);

        fgContent.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", color(compKey))
            .attr("stroke-width", 3)
            .attr("d", line);

        fgContent.selectAll(".dot")
            .data(data)
            .enter().append("circle")
            .attr("cx", d => x(d.year) + x.bandwidth() / 2)
            .attr("cy", d => yLine(d[`pct_${compKey}`] || 0))
            .attr("r", 5)
            .attr("fill", color(compKey))
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .on("mouseover", function (event, d) {
                d3.select(this).attr("r", 7);
                const val = d[`pct_${compKey}`] || 0;
                showTooltip(event, `${compKey} (${d.year})`, `${(val * 100).toFixed(2)}% of APBN`);
            })
            .on("mouseout", function () {
                d3.select(this).attr("r", 5);
                hideTooltip();
            });
    }
}


// --- CHART 3: Stacked Area (Back vs Front) ---
function renderAreaChart() {
    // Update Title
    const titleEl = document.getElementById('area-chart-title');
    if (titleEl) {
        titleEl.textContent = state.selectedComponent === 'All'
            ? "Component Contribution to Total Budget"
            : `Component Contribution to Total Budget (${state.selectedComponent})`;
    }

    const container = d3.select("#area-chart");
    container.html("");

    // Zoom setup
    const zoom = d3.zoom()
        .filter((event) => {
            if (event.type === "touchstart" || event.type === "touchmove") {
                return event.touches && event.touches.length === 2;
            }
            return !event.button;
        })
        .scaleExtent([1, 8])
        .extent([[0, 0], [width, height]])
        .translateExtent([[0, 0], [width, height]])
        .on("zoom", (event) => {
            state.zoomTransform = event.transform;
            renderAreaChart();
        });
    container.style("touch-action", "pinch-zoom"); // Enable pinch-zoom
    container.call(zoom).on("dblclick.zoom", null);

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define Clip Paths
    const defs = svg.append("defs");

    defs.append("clipPath")
        .attr("id", "area-bg-clip")
        .append("rect")
        .attr("id", "area-bg-clip-rect")
        .attr("width", width)
        .attr("height", height);

    defs.append("clipPath")
        .attr("id", "area-fg-clip")
        .append("rect")
        .attr("id", "area-fg-clip-rect")
        .attr("width", width)
        .attr("height", height);

    // Clip path for X-axis
    defs.append("clipPath")
        .attr("id", "area-xaxis-clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height + margin.bottom);

    const data = state.data;
    const compKey = state.selectedComponent;
    const isAll = compKey === 'All';

    const xBase = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([0, width]);

    const x = state.zoomTransform.rescaleX(xBase);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.total) * 1.1])
        .range([height, 0]);

    // Axes
    const axesGroup = svg.append("g");
    const xAxis = d3.axisBottom(x).tickFormat(d3.format("d")).tickSize(0).tickPadding(10);
    const xAxisG = axesGroup.append("g")
        .attr("clip-path", "url(#area-xaxis-clip)")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);

    xAxisG.select(".domain").remove();

    // Rotate X-axis labels on mobile
    if (window.innerWidth < 768) {
        xAxisG.selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)");
    }

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => formatCurrencyShort(d)).tickSize(0).tickPadding(10))
        .select(".domain").remove();

    svg.append("g").attr("class", "grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat("")).select(".domain").remove();

    // Content Groups
    const bgContent = svg.append("g").attr("clip-path", "url(#area-bg-clip)");
    const fgContent = svg.append("g").attr("clip-path", "url(#area-fg-clip)");

    // Background Area (Total APBN) - Always in bgContent
    const areaTotal = d3.area()
        .x(d => x(d.year))
        .y0(height)
        .y1(d => y(d.total))
        .curve(d3.curveMonotoneX);

    bgContent.append("path")
        .datum(data)
        .attr("fill", "#E2E8F0")
        .attr("d", areaTotal)
        .attr("opacity", 0.6);

    if (isAll) {
        // Full Stacked Area - in fgContent
        const stack = d3.stack()
            .keys(state.keys) // All keys
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

        const series = stack(data);

        fgContent.selectAll(".layer")
            .data(series)
            .enter().append("path")
            .attr("class", "layer")
            .attr("fill", d => color(d.key))
            .attr("d", d3.area()
                .x(d => x(d.data.year))
                .y0(d => y(d[0]))
                .y1(d => y(d[1]))
                .curve(d3.curveMonotoneX)
            )
            .on("mouseover", function (event, d) {
                d3.select(this).style("opacity", 0.9).attr("stroke", "white");
                // Find year
                const x0 = x.invert(d3.pointer(event)[0]);
                const year = Math.round(x0);
                const row = data.find(r => r.year === year);
                if (row) {
                    const val = row[d.key];
                    const pct = (val / row.total) * 100;
                    showTooltip(event, `${year} - ${d.key}`,
                        `${formatCurrency(val)} (${pct.toFixed(1)}%)`
                    );
                }
            })
            .on("mouseout", function () {
                d3.select(this).style("opacity", 1).attr("stroke", "none");
                hideTooltip();
            });

    } else {
        // Single Focus Area - in fgContent
        const areaComp = d3.area()
            .x(d => x(d.year))
            .y0(height)
            .y1(d => y(d[compKey]))
            .curve(d3.curveMonotoneX);

        fgContent.append("path")
            .datum(data)
            .attr("fill", color(compKey))
            .attr("d", areaComp)
            .attr("opacity", 0.85);

        // Interactive Overlay logic...
        const bisect = d3.bisector(d => d.year).left;
        const focus = svg.append("g").style("display", "none");

        focus.append("line")
            .attr("y1", 0)
            .attr("y2", height)
            .attr("stroke", "#4A5568")
            .attr("stroke-dasharray", "4");

        focus.append("circle")
            .attr("class", "c-total")
            .attr("r", 4)
            .attr("fill", "#A0AEC0");

        focus.append("circle")
            .attr("class", "c-comp")
            .attr("r", 4)
            .attr("fill", color(compKey));

        svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .on("mouseover", () => focus.style("display", null))
            .on("mouseout", () => {
                focus.style("display", "none");
                hideTooltip();
            })
            .on("mousemove", function (event) {
                const x0 = x.invert(d3.pointer(event)[0]);
                const i = bisect(data, x0, 1);
                const d0 = data[i - 1];
                const d1 = data[i];
                if (!d0 || !d1) return; // Safety check
                const d = x0 - d0.year > d1.year - x0 ? d1 : d0;

                focus.attr("transform", `translate(${x(d.year)},0)`);
                focus.select(".c-total").attr("cy", y(d.total));
                focus.select(".c-comp").attr("cy", y(d[compKey]));

                showTooltip(event, `Fiscal Year ${d.year}`,
                    `Total: ${formatCurrency(d.total)}<br>
                     ${compKey}: ${formatCurrency(d[compKey])} (${(d[`pct_${compKey}`] * 100).toFixed(1)}%)`
                );
            });
    }
}

// --- Helpers ---

function updateSummary(year) {
    const row = state.data.find(d => d.year === year);
    if (!row) return;

    d3.select("#total-apbn").text(formatCurrency(row.total));

    let topKey = "";
    let topVal = -1;
    state.filteredKeys.forEach(key => {
        if (row[key] > topVal) {
            topVal = row[key];
            topKey = key;
        }
    });

    const pct = row.total ? (topVal / row.total) * 100 : 0;

    d3.select("#top-category").text(topKey || "-");
    d3.select("#top-percentage").text(topKey ? `${pct.toFixed(1)}%` : "-");
}

function updateLegend(year) {
    // Only update for main chart or if needed
    // If year is provided, we calculate % for that year
    // If no year provided (e.g. init), use currentYear
    const targetYear = year || state.currentYear;
    const row = state.data.find(d => d.year === targetYear);

    const container = d3.select("#legend");
    // container.html(""); // Do not clear!

    // Sort keys for legend display based on current year values
    const sortedKeys = [...state.keys].sort((a, b) => {
        const valA = row ? (row[a] || 0) : 0;
        const valB = row ? (row[b] || 0) : 0;
        return valB - valA;
    });

    // Set container to relative and height to support absolute children scrolling
    const itemHeight = 36;
    container.style("position", "relative")
        .style("height", (sortedKeys.length * itemHeight) + "px");

    const items = container.selectAll("div.legend-item")
        .data(sortedKeys, d => d);

    // EXIT
    items.exit().remove();

    // ENTER
    const enterItems = items.enter().append("div")
        .attr("class", "legend-item")
        .style("position", "absolute")
        .style("left", "0")
        .style("right", "0")
        .style("height", "32px")
        .style("top", (d, i) => (i * itemHeight) + "px") // Start at initial pos
        .on("click", (e, d) => toggleCategory(d))
        .on("mouseenter", function (event, d) {
            let labelHover = "";
            if (row) {
                const val = row[d] || 0;
                const pct = row.total ? (val / row.total) * 100 : 0;
                labelHover = `Amount: ${formatCurrency(val)} (${pct.toFixed(1)}%)`;
            }
            showTooltip(event, d, labelHover);
        })
        .on("mousemove", function (event, d) {
            let labelHover = "";
            if (row) {
                const val = row[d] || 0;
                const pct = row.total ? (val / row.total) * 100 : 0;
                labelHover = `Amount: ${formatCurrency(val)} (${pct.toFixed(1)}%)`;
            }
            showTooltip(event, d, labelHover);
        })
        .on("mouseleave", function () {
            hideTooltip();
        });

    const left = enterItems.append("div").style("display", "flex").style("align-items", "center").style("gap", "8px");
    left.append("div").attr("class", "legend-color").style("background-color", d => color(d));
    left.append("span").text(d => d);

    enterItems.append("div")
        .attr("class", "legend-val")
        .style("margin-left", "auto")
        .style("font-family", "var(--font-mono)")
        .style("font-size", "0.75rem")
        .style("color", "var(--color-text-secondary)");

    // UPDATE (Merge enter + update)
    const allItems = items.merge(enterItems);

    allItems.transition().duration(1000)
        .style("top", (d) => (sortedKeys.indexOf(d) * itemHeight) + "px");

    // Update legend item styles
    allItems.each(function (d) {
        const sel = d3.select(this);
        const isHighlighted = state.highlightedKey === d;
        const isAnyHighlighted = state.highlightedKey !== null;

        // If something is highlighted, fade others. If nothing highlighted, all visible.
        const opacity = (isAnyHighlighted && !isHighlighted) ? 0.3 : 1;

        sel.style("opacity", opacity)
            .style("font-weight", isHighlighted ? "bold" : "normal");

        if (row) {
            const val = row[d] || 0;
            const pct = row.total ? (val / row.total) * 100 : 0;
            sel.select(".legend-val").text(`${pct.toFixed(1)}%`);
        }
    });
}

function toggleCategory(key) {
    if (state.highlightedKey === key) {
        state.highlightedKey = null;
    } else {
        state.highlightedKey = key;
    }

    // Efficiently update chart opacity without re-rendering
    if (state.activeTab === 'main-view') {
        const isTreemap = state.currentYear !== 'All';
        const container = d3.select("#chart");

        if (isTreemap) {
            container.selectAll("g.node rect")
                .style("opacity", d => (state.highlightedKey && state.highlightedKey !== d.data.name) ? 0.3 : 1);

            // Simplified text opacity update since we can't easily access 'this' context of d3 selection loop above
            // Just select them separately
            container.selectAll("g.node text.label-name")
                .style("opacity", d => {
                    const isVisible = (d.x1 - d.x0 > 50 && d.y1 - d.y0 > 30);
                    if (!isVisible) return 0;
                    return (state.highlightedKey && state.highlightedKey !== d.data.name) ? 0.2 : 1;
                });

            container.selectAll("g.node text.label-val")
                .style("opacity", d => {
                    const isVisible = (d.x1 - d.x0 > 50 && d.y1 - d.y0 > 50);
                    if (!isVisible) return 0;
                    return (state.highlightedKey && state.highlightedKey !== d.data.name) ? 0.2 : 0.8;
                });

        } else {
            // Trend Chart (Bar segments)
            container.selectAll(".year-group rect")
                .style("opacity", d => (state.highlightedKey && state.highlightedKey !== d.key) ? 0.3 : 1);
        }
    }

    updateLegend(); // Re-render legend to update active state
}

// ... existing mouse handlers ...
function handleMouseOver(event, d) {
    d3.select(this).style("opacity", 0.9).attr("stroke", "white").attr("stroke-width", 1);

    // New data structure support
    const category = d.key || d3.select(this.parentNode).datum().key;
    const val = (d.y1 !== undefined) ? (d.y1 - d.y0) : (d[1] - d[0]);
    const year = d.data.year;
    const total = d.data.total;
    const pct = (val / total) * 100;

    showTooltip(event, `${year} — ${category}`,
        `Allocation: <strong>${formatCurrency(val)}</strong><br>
         Of Total APBN: <strong>${pct.toFixed(2)}%</strong>`
    );
}

function handleMouseMove(event, d) {
    positionTooltip(event);
}

function handleMouseOut(event, d) {
    d3.select(this).style("opacity", 1).attr("stroke", "none");
    hideTooltip();
}


function showTooltip(event, title, content) {
    const tooltip = d3.select("#tooltip");
    tooltip.html(`<h4>${title}</h4><div style="font-size:0.85rem; color:#CBD5E0;">${content}</div>`)
        .style("opacity", 1);
    positionTooltip(event);
}

function hideTooltip() {
    d3.select("#tooltip").style("opacity", 0);
}

function getEventClientXY(event) {
    const e = event?.sourceEvent ?? event;
    const t = e?.touches?.[0] || e?.changedTouches?.[0];
    if (t) return { x: t.clientX, y: t.clientY };
    if (typeof e?.clientX === "number" && typeof e?.clientY === "number") return { x: e.clientX, y: e.clientY };
    return { x: 0, y: 0 };
}

function positionTooltip(event) {
    const tooltip = d3.select("#tooltip");
    const node = tooltip.node();
    if (!node) return;

    const { x: clientX, y: clientY } = getEventClientXY(event);
    const padding = 8;
    const offset = 12;

    const rect = node.getBoundingClientRect();

    let left = clientX + offset;
    if (left + rect.width + padding > window.innerWidth) {
        left = clientX - rect.width - offset;
    }
    left = Math.max(padding, Math.min(left, window.innerWidth - rect.width - padding));

    let top = clientY - rect.height - offset;
    if (top < padding) top = clientY + offset;
    top = Math.max(padding, Math.min(top, window.innerHeight - rect.height - padding));

    tooltip.style("left", `${left}px`).style("top", `${top}px`);
}

function setupControls() {
    const yearSelect = document.getElementById("year-select");

    if (yearSelect) {
        yearSelect.addEventListener("change", (e) => {
            const val = e.target.value;
            state.currentYear = val === 'All' ? 'All' : +val;
            renderMainChart();
        });
    }

    // Play Button Logic
    const playBtn = document.getElementById('play-year-btn');
    if (playBtn) {
        playBtn.addEventListener('click', togglePlay);
    }

    // Mobile Toggles
    const legendBtn = document.getElementById('toggle-legend');

    if (legendBtn) legendBtn.addEventListener('click', () => togglePopup('legend-card'));
}

// Mobile Popup Logic
function togglePopup(cardId) {
    const card = document.getElementById(cardId);
    const backdrop = document.getElementById('popup-backdrop');
    if (!card || !backdrop) return;

    const isActive = card.classList.contains('popup-active');

    // Close all first to ensure only one is open
    closeAllPopups();

    if (!isActive) {
        card.classList.add('popup-active');
        backdrop.classList.add('active');

        // Highlight the toggle button
        if (cardId === 'legend-card') {
            document.getElementById('toggle-legend').classList.add('active');
        }
    }
}

function closeAllPopups() {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('popup-active'));
    const backdrop = document.getElementById('popup-backdrop');
    if (backdrop) backdrop.classList.remove('active');

    const legBtn = document.getElementById('toggle-legend');
    if (legBtn) legBtn.classList.remove('active');
}

function formatCurrency(val) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function formatCurrencyShort(val) {
    if (val >= 1e12) return (val / 1e12).toFixed(1) + "T";
    if (val >= 1e9) return (val / 1e9).toFixed(0) + "M";
    return val;
}

function togglePlay() {
    state.isPlaying = !state.isPlaying;
    const playBtn = document.getElementById('play-year-btn');

    if (state.isPlaying) {
        // Change icon to Pause
        playBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
        playBtn.classList.add('active');

        // Start timer
        state.playTimer = setInterval(() => {
            const currentYear = state.currentYear;
            const maxYear = state.yearRange[1];

            if (currentYear === 'All') {
                state.currentYear = state.yearRange[0];
            } else if (currentYear >= maxYear) {
                togglePlay(); // Stop if reached end
                return;
            } else {
                state.currentYear = currentYear + 1;
            }

            // Update dropdown UI
            const yearSelect = document.getElementById("year-select");
            if (yearSelect) yearSelect.value = state.currentYear;

            renderMainChart();
        }, 1500); // 1.5s per year for animation
    } else {
        // Change icon to Play
        playBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        playBtn.classList.remove('active');
        clearInterval(state.playTimer);
    }
}

// Start
init();
