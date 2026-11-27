import type { BudgetCell, BudgetModel, SeriesKind } from "../src/model";
import { axisLabel, barLabel, formatPercent } from "../src/format";
import { ActualContent, ChartStyle, HorizontalLabelPosition, LabelBoxStyle, LabelPosition, XAxisOrientation, renderChart } from "../src/render";

const host = document.getElementById("host") as HTMLElement;
const log = document.getElementById("log") as HTMLElement;
const selected = new Set<string>();
const query = new URLSearchParams(location.search);
new URLSearchParams(location.hash.startsWith("#") ? location.hash.slice(1) : "").forEach((value, key) => {
    query.set(key, value);
});
if (query.get("shot") === "1") document.body.classList.add("shot");
const hostWidth = Number(query.get("w") || 0);
const hostHeight = Number(query.get("h") || 0);
if (hostWidth > 0) host.style.width = `${hostWidth}px`;
if (hostHeight > 0) host.style.height = `${hostHeight}px`;
const palette = ["#118DFF", "#12239E", "#E66C37", "#6B007B", "#E044A7"];

function labelBox(): LabelBoxStyle {
    return {
        outline: query.get("outline") !== "0",
        outlineColor: "#FFFFFF",
        outlineWidth: 2,
        backdrop: query.get("backdrop") === "1",
        backdropColor: "#FFFFFF",
        backdropOpacity: 0.9,
        padding: 3,
        radius: 3,
        borderColor: "#605E5C",
        borderWidth: Number(query.get("border") || 0)
    };
}

const periods = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];

function series(group: string, kind: SeriesKind, budget: number, monthly: number[]): BudgetCell[] {
    let total = 0;
    return monthly.map((value, index) => {
        total += value;
        const key = `${group}|${index}|${kind}`;
        return {
            group,
            period: periods[index],
            periodIndex: index,
            kind,
            budget,
            actual: total,
            budgetFormat: null,
            actualFormat: null,
            latest: index === monthly.length - 1,
            highlighted: false,
            tooltips: [],
            selectionId: { getKey: () => key },
            selectionKey: key
        };
    });
}

const panels = [
    { label: "Afdeling Noord", cells: [...series("Afdeling Noord", "revenue", 1200000, [90000, 110000, 95000, 120000, 100000, 105000]), ...series("Afdeling Noord", "cost", 950000, [70000, 85000, 80000, 90000, 88000, 92000])] },
    { label: "Afdeling Zuid", cells: [...series("Afdeling Zuid", "revenue", 400000, [20000, 35000, 30000, 33000, 31000, 40000]), ...series("Afdeling Zuid", "cost", 220000, [45000, 41000, -5000, 47000, 52000, 49000])] },
    { label: "Afdeling Oost", cells: [...series("Afdeling Oost", "revenue", 600000, [40000, 52000, 61000, 48000, 55000, 50000]), ...series("Afdeling Oost", "cost", 580000, [50000, 47000, 52000, 49000, 51000, 48000])] },
    { label: "Afdeling West", cells: [...series("Afdeling West", "revenue", 300000, [21000, 26000, 24000, 30000, 28000, 27000]), ...series("Afdeling West", "cost", 310000, [26000, 25000, 27000, 24000, 28000, 26000])] }
];

const hierarchy = query.get("levels") === "2";
const periodLevels = hierarchy
    ? [["2025", "nov"], ["2025", "dec"], ["2026", "jan"], ["2026", "feb"], ["2026", "mrt"], ["2026", "apr"]]
    : periods.map(label => [label]);
const comparison = query.get("comparison") === "1";
const shownKinds: SeriesKind[] = query.get("kinds") === "cost" ? ["cost"] : ["revenue", "cost"];
const displayPanels = comparison
    ? panels.map(panel => ({
        ...panel,
        cells: panel.cells.flatMap(cell => [
            { ...cell, seriesKey: `${cell.kind}:0`, seriesName: "Previous year", comparisonIndex: 0, budget: cell.budget == null ? null : cell.budget * 0.9, actual: cell.actual == null ? null : cell.actual * 0.85 },
            { ...cell, seriesKey: `${cell.kind}:1`, seriesName: "Current year", comparisonIndex: 1 }
        ])
    }))
    : panels;
const legendNames = query.get("legendField") === "1" ? ["Personeel", "Materieel", "Overig"] : [];
const legendShares = [0.55, 0.3, 0.15];
if (legendNames.length) {
    displayPanels.forEach(panel => {
        panel.cells = panel.cells.flatMap(cell => legendNames.map((legend, legendIndex) => {
            const share = legendShares[legendIndex] * (legendIndex === 1 ? 1.25 : 0.9);
            return {
                ...cell,
                legend,
                legendIndex,
                seriesKey: `${cell.seriesKey || cell.kind}:${legend}`,
                seriesName: cell.seriesName ? `${cell.seriesName} · ${legend}` : legend,
                budget: cell.budget == null ? null : cell.budget * legendShares[legendIndex],
                actual: cell.actual == null ? null : cell.actual * share,
                selectionKey: `${cell.selectionKey}|${legend}`
            };
        }));
    });
}
if (query.get("highlight") === "1") {
    displayPanels.forEach(panel => panel.cells.forEach(cell => {
        cell.highlighted = true;
        cell.budgetHighlight = cell.budget == null ? null : cell.budget * 0.4;
        cell.actualHighlight = cell.actual == null ? null : cell.actual * 0.4;
    }));
}
const targetShape = query.get("target");
if (targetShape) {
    displayPanels.forEach(panel => panel.cells.forEach(cell => {
        cell.target = cell.budget == null ? null : cell.budget * (cell.periodIndex + 1) / 11;
    }));
}

const zonesOn = query.get("zones") === "1" || query.get("zoneMode") != null;
const zoneMode = (query.get("zoneMode") as "equal" | "fields" | "percent") || "equal";
const zoneCount = Number(query.get("zoneCount") || 3);
if (zonesOn && zoneMode === "fields") {
    displayPanels.forEach(panel => panel.cells.forEach(cell => {
        if (cell.budget == null) return;
        const abs = Math.abs(cell.budget);
        const sign = cell.budget >= 0 ? 1 : -1;
        cell.zones = [0.35, 0.7].map(share => sign * abs * share);
    }));
}

const model: BudgetModel = {
    hasTarget: !!targetShape,
    periods: periodLevels.map(levels => levels.join(" ")),
    periodLevels,
    levelCount: hierarchy ? 2 : 1,
    kinds: shownKinds,
    panels: displayPanels.slice(0, Number(query.get("panels") || 2))
        .map(panel => ({ ...panel, cells: panel.cells.filter(cell => shownKinds.indexOf(cell.kind) >= 0) })),
    series: (comparison
        ? shownKinds.flatMap(kind => [
            { key: `${kind}:0`, kind, name: "Previous year", order: 0 },
            { key: `${kind}:1`, kind, name: "Current year", order: 1 }
        ])
        : legendNames.length ? shownKinds.map(kind => ({ key: kind, kind, name: kind, order: 0 })) : [])
        .flatMap(item => legendNames.length
            ? legendNames.map((legend, legendIndex) => ({
                ...item,
                key: `${item.key}:${legend}`,
                name: comparison ? `${item.name} · ${legend}` : legend,
                pairName: item.name,
                legend,
                legendIndex
            }))
            : [item]),
    legendValues: legendNames.map(name => ({ name, color: null, selectionId: null })),
    percentHint: false,
    hasHighlights: query.get("highlight") === "1",
    zoneFieldCount: zonesOn && zoneMode === "fields" ? 2 : 0,
    zoneFieldNames: zonesOn && zoneMode === "fields" ? ["Drempel laag", "Drempel midden"] : [],
    names: {
        period: "Periode", group: "Indeling", component: "Onderdeel",
        budget: "Jaarbegroting", actual: "Realisatie YTD", revenue: "Opbrengsten", cost: "Kosten"
    },
    hasPeriodRole: true,
    hasValueRole: true
};

const style: ChartStyle = {
    orientation: query.get("orientation") === "horizontal" ? "horizontal" : "vertical",
    arrangement: (query.get("arrangement") as ChartStyle["arrangement"]) || "stack",
    columns: Number(query.get("columns") || 0),
    sharedAxis: query.get("shared") === "1",
    showYAxis: true,
    showGrid: true,
    minPlotHeight: 110,
    maxPlotHeight: 220,
    minPeriodWidth: 0,
    budgetStyle: (query.get("budgetStyle") as ChartStyle["budgetStyle"]) || "solid",
    budgetWidth: Number(query.get("budgetWidth") || 87) / 100,
    actualStyle: (query.get("actualStyle") as ChartStyle["actualStyle"]) || "bar",
    actualRatio: Number(query.get("ratio") || 38) / 100,
    actualPosition: (query.get("position") as ChartStyle["actualPosition"]) || "overlay",
    actualGap: Number(query.get("gap") || 3),
    groupWidth: 1 - Number(query.get("periodGap") || 40) / 100,
    kindGap: Number(query.get("kindGap") || 0) / 100,
    budgetRadius: Number(query.get("radius") || 0),
    actualRadius: Number(query.get("actualRadius") || query.get("radius") || 0),
    showComparisonLabels: true,
    comparisonColors: (query.get("pairColors") || "#64748B,#0D9488,#E66C37,#6B007B").split(","),
    colorBy: (query.get("colorBy") as ChartStyle["colorBy"]) || "component",
    revenueColor: query.get("revenue") || "#0F766E",
    costColor: query.get("cost") || "#1D4ED8",
    netColor: query.get("net") || query.get("revenue") || "#0F766E",
    actualColor: query.get("actual") || "#0F172A",
    highlightOverrun: query.get("overrun") !== "0",
    overrunColor: query.get("overrunColor") || "#BE123C",
    groupColor: label => palette[panels.findIndex(panel => panel.label === label) % palette.length],
    legendPosition: (query.get("legend") as ChartStyle["legendPosition"]) || "top",
    revenueText: "Jaarbegroting opbrengsten",
    costText: "Jaarbegroting kosten",
    budgetText: "Jaarbegroting",
    actualText: "Realisatie YTD",
    overrunText: "Boven begroting",
    zones: {
        show: zonesOn,
        mode: zoneMode,
        count: zoneCount,
        colors: (query.get("zoneColors") || "#F4B183,#FFE699,#A9D08E,#9DC3E6,#C5A0D5").split(","),
        names: (query.get("zoneNames") || "Laag,Midden,Hoog,Zone 4,Zone 5").split(","),
        percents: (query.get("zonePercents") || "34,33,33,0,0").split(",").map(Number)
    },
    budgetLabel: {
        mode: "latest",
        position: (query.get("budgetLabel") as LabelPosition) || "left",
        hPosition: (query.get("hBudget") as HorizontalLabelPosition) || "after",
        combine: query.get("combine") !== "0",
        separator: " / ",
        fontFamily: "Segoe UI",
        fontSize: 10,
        color: "#333333",
        bold: false,
        italic: false,
        underline: false,
        pointer: true,
        pointerColor: "#605E5C",
        box: labelBox()
    },
    actualLabel: {
        mode: "auto",
        content: (query.get("content") as ActualContent) || "value",
        position: (query.get("actualLabel") as LabelPosition) || "right",
        hPosition: (query.get("hActual") as HorizontalLabelPosition) || "end",
        fontFamily: "Segoe UI",
        fontSize: 10,
        color: "#111111",
        bold: true,
        italic: false,
        underline: false,
        pointer: true,
        pointerColor: "#605E5C",
        box: labelBox()
    },
    fontFamily: "Segoe UI",
    fontSize: 10,
    fontBold: false,
    fontItalic: false,
    fontUnderline: false,
    revenueName: "Opbrengsten",
    costName: "Kosten",
    legend: {
        fontSize: Number(query.get("legendSize") || 11),
        color: query.get("legendColor") || "#333333",
        pairs: [query.get("legendPair1") || "", query.get("legendPair2") || ""],
        actual: query.get("legendActual") || "",
        hidden: Object.fromEntries((query.get("legendHide") || "").split(",").filter(Boolean).map(key => [key, true]))
    },
    xAxis: {
        orientation: (query.get("xOrientation") || "auto") as XAxisOrientation,
        fontSize: Number(query.get("xSize") || 10),
        bold: query.get("xBold") === "1",
        color: query.get("xColor") || "#605E5C",
        showTitle: query.get("xTitle") === "1",
        showParents: query.get("xParents") !== "0",
        showLine: query.get("xLine") !== "0",
        ...(query.get("pairSize") ? { pairFontSize: Number(query.get("pairSize")) } : {}),
        pairBold: query.get("pairBold") === "1",
        pairOrientation: (query.get("pairOrientation") || "auto") as XAxisOrientation,
        pairColorMode: query.get("pairColor") ? "fixed" : "pair",
        pairColor: query.get("pairColor") || "#605E5C"
    },
    targetText: "Target YTD",
    target: {
        shape: targetShape === "dot" ? "dot" : "bar",
        barLength: Number(query.get("targetLength") || 200) / 100,
        barThickness: Number(query.get("targetSize") || 3),
        barColor: "#C4314B",
        dotSize: Number(query.get("targetSize") || 10),
        dotFill: "#FFFFFF",
        dotBorderColor: "#C4314B",
        dotBorderWidth: 2
    },
    formatters: {
        axis: value => axisLabel(value, false, "nl-NL"),
        label: value => barLabel(value, false, "nl-NL"),
        share: (actual, budget) => formatPercent(actual / budget, 0, "nl-NL")
    }
};

function paint(): void {
    renderChart(host, {
        model,
        width: host.clientWidth,
        height: host.clientHeight,
        style,
        selectedKeys: selected,
        handlers: {
            select: cell => {
                selected.clear();
                if (cell.selectionKey) selected.add(cell.selectionKey);
                log.textContent = `selected ${cell.group} ${cell.period} ${cell.kind}`;
                paint();
            },
            clear: () => {
                selected.clear();
                paint();
            },
            tooltip: cell => {
                log.textContent = `${cell.group} | ${cell.period} | ${cell.kind} | budget ${cell.budget} | actual ${cell.actual}`;
            },
            hideTooltip: () => undefined,
            contextMenu: () => undefined
        }
    });
}

paint();
