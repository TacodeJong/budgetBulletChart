import { axisLabel, barLabel, formatSi, tooltipValue } from "../src/format";
import { ModelOptions, buildModel, classifyKind, comparisonPairCount, defaultOptions, isPercentFormat, parseRevenueValues } from "../src/model";
import { ChartStyle, axisHeight, barGeometry, barPath, columnCount, computeLayout, fixedAngle, horizontalBarPath, isOverrun, labelSide, labelsCrowded, mix, outerSide, rotatedLabelHeight, periodLabels, periodSpans, seriesSlotsFor, slotsFor, LabelPlacer } from "../src/render";
import { bandScale, nice, panelScale } from "../src/scale";

const assert = {
    equal(actual: unknown, expected: unknown): void {
        if (actual !== expected) throw new Error(`${String(actual)} !== ${String(expected)}`);
    },
    deepEqual(actual: unknown, expected: unknown): void {
        const left = JSON.stringify(actual);
        const right = JSON.stringify(expected);
        if (left !== right) throw new Error(`${left}\n!==\n${right}`);
    },
    near(actual: number, expected: number): void {
        if (Math.abs(actual - expected) > 1e-6) throw new Error(`${actual} is not close to ${expected}`);
    }
};

assert.equal(formatSi(12345, "en-US"), "12.3k");
assert.equal(formatSi(1500000, "en-US"), "1.5M");
assert.equal(formatSi(999999, "en-US"), "1M");
assert.equal(formatSi(-2000, "en-US"), "-2k");
assert.equal(formatSi(12345, "nl-NL"), "12,3k");
assert.equal(axisLabel(50, false, "en-US"), "50");
assert.equal(axisLabel(1.256, false, "en-US"), "1.26");
assert.equal(axisLabel(0.5, true, "en-US"), "50%");
assert.equal(barLabel(0.5, true, "en-US"), "50.0%");
assert.equal(barLabel(25000, false, "en-US"), "25k");
assert.equal(tooltipValue(1234.5, false, "en-US"), "1,234.50");
assert.equal(tooltipValue(null, false, "en-US"), "—");

assert.equal(isPercentFormat("0.0%"), true);
assert.equal(isPercentFormat("#,0.00 %;-#,0.00 %"), true);
assert.equal(isPercentFormat("\"%\" #,0"), false);
assert.equal(isPercentFormat("\\%#,0"), false);
assert.equal(isPercentFormat("€ #,0"), false);
assert.equal(isPercentFormat(null), false);

assert.deepEqual(nice(-14.1, 114.1, 10), [-20, 120]);
const scale = panelScale([0, 100], 200);
assert.deepEqual(scale.domain, [0, 120]);
assert.deepEqual(scale.ticks, [0, 50, 100]);
assert.near(scale.map(120), 0);
assert.near(scale.map(0), 200);
assert.deepEqual(panelScale([-100, 0], 200).domain, [-120, 0]);
assert.deepEqual(panelScale([-50, 100], 200).domain[0] < -50, true);
assert.equal(Object.is(panelScale([0, 100], 200).ticks[0], -0), false);

const band = bandScale(3, 300, 0.1, 0.04);
assert.near(band.step, 300 / 2.98);
assert.near(band.x(0) + band.step * 2 + band.bandwidth + band.x(0), 300);

assert.equal(classifyKind("Opbrengsten"), "revenue");
assert.equal(classifyKind(" opbrengsten "), "revenue");
assert.equal(classifyKind("Kosten"), "cost");
assert.equal(classifyKind(null), "cost");
assert.equal(classifyKind("Subsidie", parseRevenueValues("subsidie; bijdrage")), "revenue");
assert.deepEqual(parseRevenueValues(""), defaultOptions().revenueValues);
assert.equal(labelSide("side", -1), -1);
assert.equal(labelSide("side", 1), 1);
assert.equal(labelSide("left", 1), -1);
assert.equal(labelSide("above", -1), 0);
const costPairs = seriesSlotsFor([
    { key: "cost:0", kind: "cost", name: "-1jr", order: 0 },
    { key: "cost:1", kind: "cost", name: "Huidig", order: 1 }
], ["cost"], 0.6);
assert.equal(outerSide(costPairs.get("cost:0")), -1);
assert.equal(outerSide(costPairs.get("cost:1")), 1);
const mixedPairs = seriesSlotsFor([
    { key: "revenue:0", kind: "revenue", name: "-1jr", order: 0 },
    { key: "revenue:1", kind: "revenue", name: "Huidig", order: 1 },
    { key: "cost:0", kind: "cost", name: "-1jr", order: 0 },
    { key: "cost:1", kind: "cost", name: "Huidig", order: 1 }
], ["revenue", "cost"], 0.6);
assert.deepEqual(["revenue:0", "revenue:1", "cost:0", "cost:1"].map(key => outerSide(mixedPairs.get(key))), [-1, 1, -1, 1]);
const components = slotsFor(["revenue", "cost"], 0.6);
assert.equal(outerSide(components.get("revenue")), -1);
assert.equal(outerSide(components.get("cost")), 1);

function column(role: string, name: string, values: unknown[], format?: string, objects?: unknown[]) {
    return { source: { roles: { [role]: true }, displayName: name, queryName: `t.${name}`, format }, values, objects };
}

const host = {
    createSelectionIdBuilder() {
        const parts: string[] = [];
        const builder = {
            withCategory(col: any, index: number) {
                parts.push(String(col.values[index]));
                return builder;
            },
            createSelectionId() {
                const key = parts.join("|");
                return { getKey: () => key };
            }
        };
        return builder;
    }
};

const periods = [3, 1, 2, 1, 2, 3, 1, 1];
const groups = ["B", "B", "B", "A", "A", "A", "A", "A"];
const kinds = ["Opbrengsten", "Opbrengsten", "Opbrengsten", "Kosten", "Kosten", "Kosten", "Opbrengsten", "Opbrengsten"];
const percentObjects = periods.map(() => ({ general: { formatString: "0.0%" } }));
const dataView = {
    categorical: {
        categories: [
            column("period", "Periode", periods),
            column("group", "Indeling", groups),
            column("component", "Onderdeel", kinds)
        ],
        values: [
            column("budget", "Begroting", [30, 10, 20, 5, 6, 7, 1, 2], "#,0", percentObjects),
            column("actual", "Realisatie", [3, 1, 2, null, 6, 7, 1, 1], "#,0", percentObjects)
        ]
    }
};

function options(partial: Partial<ModelOptions> = {}): ModelOptions {
    return { ...defaultOptions(), ...partial };
}

const model = buildModel(dataView, host, options());
assert.deepEqual(model.periods, ["1", "2", "3"]);
assert.deepEqual(model.kinds, ["revenue", "cost"]);
assert.deepEqual(model.panels.map(panel => panel.label), ["A", "B"]);
assert.equal(model.percentHint, true);
const panelA = model.panels[0];
const revenueA = panelA.cells.filter(cell => cell.kind === "revenue");
assert.equal(revenueA.length, 1);
assert.equal(revenueA[0].budget, 3);
assert.equal(revenueA[0].actual, 2);
assert.equal(revenueA[0].latest, true);
assert.equal(revenueA[0].budgetFormat, "0.0%");
const costA = panelA.cells.filter(cell => cell.kind === "cost");
assert.deepEqual(costA.map(cell => cell.periodIndex), [0, 1, 2]);
assert.deepEqual(costA.map(cell => cell.latest), [false, false, true]);
assert.equal(costA[0].actual, null);
assert.equal(model.panels[1].cells[0].selectionKey, "1|B|Opbrengsten");

const separateBudgets = buildModel({
    categorical: {
        categories: [
            column("period", "Periode", [1, 1, 2, 2]),
            column("component", "Onderdeel", ["Opbrengsten", "Kosten", "Opbrengsten", "Kosten"])
        ],
        values: [
            column("budget", "First budget (name is irrelevant)", [100, 999, 120, 999], "€ #,0"),
            column("budget", "Second budget", [999, 70, 999, 80], "€ #,0"),
            column("actual", "First actual", [20, 999, 40, 999], "€ #,0"),
            column("actual", "Second actual", [999, 15, 999, 35], "€ #,0")
        ]
    }
}, host, options());
const separateRevenue = separateBudgets.panels[0].cells.filter(cell => cell.kind === "revenue");
const separateCosts = separateBudgets.panels[0].cells.filter(cell => cell.kind === "cost");
assert.deepEqual(separateRevenue.map(cell => cell.budget), [100, 120]);
assert.deepEqual(separateCosts.map(cell => cell.budget), [70, 80]);
assert.deepEqual(separateRevenue.map(cell => cell.actual), [20, 40]);
assert.deepEqual(separateCosts.map(cell => cell.actual), [15, 35]);
assert.equal(separateRevenue[0].budgetFormat, "€ #,0");

const singleCostPair = buildModel({
    categorical: {
        categories: [
            column("period", "Periode", [1, 1]),
            column("component", "Onderdeel", ["Opbrengsten", "Kosten"])
        ],
        values: [
            column("budget", "Begroting kosten YR", [70, 70]),
            column("actual", "Realisatie kosten YTD", [15, 15])
        ]
    }
}, host, options());
assert.deepEqual(singleCostPair.kinds, ["cost"]);
assert.equal(singleCostPair.panels[0].cells.length, 1);
assert.equal(singleCostPair.panels[0].cells[0].budget, 70);
assert.equal(singleCostPair.panels[0].cells[0].actual, 15);

const yearComparison = buildModel({
    categorical: {
        categories: [
            column("period", "Periode", [1, 1]),
            column("component", "Onderdeel", ["Opbrengsten", "Kosten"])
        ],
        values: [
            column("budget", "Begroting kosten YR -1jr", [700, 70]),
            column("budget", "Begroting kosten YR", [800, 80]),
            column("actual", "Realisatie kosten YTD -1jr", [150, 15]),
            column("actual", "Realisatie kosten YTD", [350, 35])
        ]
    }
}, host, options());
assert.deepEqual(yearComparison.kinds, ["cost"]);
assert.deepEqual(yearComparison.panels[0].cells.map(cell => [cell.budget, cell.actual]), [[70, 15], [80, 35]]);
assert.deepEqual(yearComparison.series.map(series => series.name), ["Begroting kosten YR -1jr", "Begroting kosten YR"]);
assert.equal(comparisonPairCount(yearComparison), 2);
const renamedColumn = (role: string, display: string, query: string, values: unknown[]) =>
    ({ source: { roles: { [role]: true }, displayName: display, queryName: query }, values });
const threeYears = buildModel({
    categorical: {
        categories: [column("period", "Periode", [1, 1]), column("component", "Onderdeel", ["Opbrengsten", "Kosten"])],
        values: [
            renamedColumn("budget", "2024", "m.Begroting kosten YR -2jr", [1, 10]),
            renamedColumn("budget", "2025", "m.Begroting kosten YR -1jr", [2, 20]),
            renamedColumn("budget", "2026", "m.Begroting kosten YR", [3, 30])
        ]
    }
}, host, options());
assert.deepEqual(threeYears.kinds, ["cost"]);
assert.deepEqual(threeYears.series.map(series => series.name), ["2024", "2025", "2026"]);
assert.equal(comparisonPairCount(threeYears), 3);
const unnamedYears = buildModel({
    categorical: {
        categories: [column("period", "Periode", [1, 1]), column("component", "Onderdeel", ["Opbrengsten", "Kosten"])],
        values: [
            column("budget", "2024", [1, 10]),
            column("budget", "2025", [2, 20]),
            column("budget", "2026", [3, 30])
        ]
    }
}, host, options());
assert.deepEqual(unnamedYears.series.map(series => series.key), ["revenue:0", "revenue:1", "revenue:2", "cost:0", "cost:1", "cost:2"]);
const renamedPairs = buildModel({
    categorical: {
        categories: [column("period", "Periode", [1]), column("component", "Onderdeel", ["Kosten"])],
        values: [
            column("budget", "Begroting kosten YR -1jr", [70]),
            column("budget", "Begroting kosten YR", [80]),
            column("actual", "Realisatie kosten YTD -1jr", [15]),
            column("actual", "Realisatie kosten YTD", [35])
        ]
    }
}, host, options({ pairNames: ["2025", " "] }));
assert.deepEqual(renamedPairs.series.map(series => [series.name, series.fieldName]), [
    ["2025", "Begroting kosten YR -1jr"],
    ["Begroting kosten YR", "Begroting kosten YR"]
]);
assert.deepEqual(renamedPairs.panels[0].cells.map(cell => cell.seriesName), ["2025", "Begroting kosten YR"]);

const withTargets = buildModel({
    categorical: {
        categories: [column("period", "Periode", [1, 2])],
        values: [
            column("budget", "Begroting 2025", [10, 10]),
            column("budget", "Begroting 2026", [20, 20]),
            column("actual", "Realisatie 2025", [1, 2]),
            column("actual", "Realisatie 2026", [3, 4]),
            column("target", "Target 2025", [5, 6])
        ]
    }
}, host, options());
assert.equal(withTargets.hasTarget, true);
assert.deepEqual(withTargets.panels[0].cells.map(cell => cell.target), [5, null, 6, null]);
assert.equal(withTargets.names.target, "Target 2025");
assert.equal(!!buildModel(dataView, host, options()).hasTarget, false);

const yearsWithComponent = buildModel({
    categorical: {
        categories: [column("period", "Periode", [1, 1]), column("component", "Component", ["Opbrengsten", "Kosten"])],
        values: [
            column("budget", "Jaarbegroting 2025", [10, 8]),
            column("budget", "Jaarbegroting 2026", [12, 9]),
            column("actual", "Realisatie YTD 2025", [1, 2]),
            column("actual", "Realisatie YTD 2026", [3, 4])
        ]
    }
}, host, options());
assert.deepEqual(yearsWithComponent.panels[0].cells.map(cell => [cell.kind, cell.budget]), [["revenue", 10], ["revenue", 12], ["cost", 8], ["cost", 9]]);

const legendColumn = column("legend", "Soort", ["Personeel", "Materieel", "Personeel", "Materieel"], undefined,
    [{ colors: { legendFill: { solid: { color: "#123456" } } } }, null, null, null]);
const withLegend = buildModel({
    categorical: {
        categories: [column("period", "Periode", [1, 1, 2, 2]), legendColumn],
        values: [column("budget", "Begroting", [10, 20, 10, 20]), column("actual", "Realisatie", [1, 2, 3, 4])]
    }
}, host, options());
assert.deepEqual(withLegend.legendValues.map(value => [value.name, value.color]), [["Personeel", "#123456"], ["Materieel", null]]);
assert.deepEqual(withLegend.series.map(series => series.name), ["Personeel", "Materieel"]);
assert.equal(comparisonPairCount(withLegend), 1);
assert.deepEqual(withLegend.panels[0].cells.map(cell => [cell.legend, cell.budget]), [["Personeel", 10], ["Materieel", 20], ["Personeel", 10], ["Materieel", 20]]);
assert.equal(withLegend.names.legend, "Soort");

const descending = buildModel(dataView, host, options({ periodSort: "desc", groupSort: "budget" }));
assert.deepEqual(descending.periods, ["3", "2", "1"]);
assert.deepEqual(descending.panels.map(panel => panel.label), ["B", "A"]);

const net = buildModel(dataView, host, options({ componentMode: "net" }));
assert.deepEqual(net.kinds, ["net"]);
const netA = net.panels[0].cells;
assert.deepEqual(netA.map(cell => cell.budget), [3 - 5, -6, -7]);
assert.equal(netA[0].selectionKey, "1|A");

const costsOnly = buildModel(dataView, host, options({ componentMode: "cost" }));
assert.deepEqual(costsOnly.kinds, ["cost"]);
assert.deepEqual(costsOnly.panels.map(panel => panel.label), ["A"]);

const combined = buildModel(dataView, host, options({ combineGroups: true }));
assert.equal(combined.panels.length, 1);
assert.equal(combined.panels[0].label, "Totaal");
const combinedRevenue = combined.panels[0].cells.filter(cell => cell.kind === "revenue");
assert.deepEqual(combinedRevenue.map(cell => cell.budget), [13, 20, 30]);

const ungrouped = buildModel({
    categorical: {
        categories: [column("period", "Maand", ["jan", "feb"])],
        values: [column("budget", "Begroting", [1, 2], "#,0.00")]
    }
}, host, options());
assert.deepEqual(ungrouped.periods, ["jan", "feb"]);
assert.deepEqual(ungrouped.kinds, ["total"]);
assert.equal(ungrouped.panels[0].label, "Totaal");
assert.equal(ungrouped.percentHint, false);

const ungroupedSeparateBudgets = buildModel({
    categorical: {
        categories: [column("period", "Maand", ["jan", "feb"])],
        values: [
            column("budget", "Begroting opbrengsten", [100, 120]),
            column("budget", "Begroting kosten", [70, 80])
        ]
    }
}, host, options());
assert.deepEqual(ungroupedSeparateBudgets.panels[0].cells.map(cell => cell.budget), [100, 70, 120, 80]);
assert.equal(ungroupedSeparateBudgets.series.length, 2);

const highlighted = buildModel({
    categorical: {
        categories: [column("period", "Maand", ["jan", "feb"])],
        values: [{ ...column("budget", "Begroting", [1, 2]), highlights: [1, null] }]
    }
}, host, options());
assert.equal(highlighted.hasHighlights, true);
assert.deepEqual(highlighted.panels[0].cells.map(cell => cell.highlighted), [true, false]);
assert.deepEqual(highlighted.panels[0].cells.map(cell => cell.budgetHighlight), [1, null]);

const hierarchy = buildModel({
    categorical: {
        categories: [
            column("period", "Jaar", [2025, 2025, 2026, 2026]),
            column("period", "Maand", ["November", "December", "Januari", "Februari"])
        ],
        values: [column("budget", "Begroting", [1, 2, 3, 4])]
    }
}, host, options());
assert.equal(hierarchy.levelCount, 2);
assert.deepEqual(hierarchy.periods, ["2025 November", "2025 December", "2026 Januari", "2026 Februari"]);
assert.deepEqual(hierarchy.periodLevels[2], ["2026", "Januari"]);
assert.equal(hierarchy.names.period, "Jaar / Maand");
assert.equal(hierarchy.panels[0].cells[0].selectionKey, "2025|November");
assert.deepEqual(periodSpans(hierarchy.periodLevels, 0), [
    { label: "2025", first: 0, last: 1 },
    { label: "2026", first: 2, last: 3 }
]);

const numericHierarchy = buildModel({
    categorical: {
        categories: [
            column("period", "Jaar", [2026, 2025, 2025]),
            column("period", "Kwartaal", [1, 4, 3])
        ],
        values: [column("budget", "Begroting", [1, 2, 3])]
    }
}, host, options());
assert.deepEqual(numericHierarchy.periods, ["2025 3", "2025 4", "2026 1"]);
assert.equal(axisHeight(3, 10), 44 + 2 * 16);
assert.equal(axisHeight(1, 10, false), 25);
assert.equal(axisHeight(1, 10, true, true), 60);
assert.equal(axisHeight(3, 10, false, false, { parents: false }), 6 + 16 + 3);
assert.equal(axisHeight(3, 10, false, false, { show: false }), 6 + 3);
assert.equal(axisHeight(1, 10, false, false, { title: true }), 6 + 16 + 16 + 3);
assert.equal(axisHeight(1, 10, false, false, { labelHeight: 50 }), 6 + 50 + 3);
assert.equal(rotatedLabelHeight(100, 10, 0), 16);
assert.equal(rotatedLabelHeight(100, 10, 90), 108);
assert.equal(fixedAngle("diagonal"), 45);
assert.equal(fixedAngle("auto"), 0);
const charWidth = (value: string) => value.length * 6;
assert.equal(labelsCrowded(["januari", "februari"], 60, charWidth, "full"), false);
assert.equal(labelsCrowded(["januari", "februari"], 40, charWidth, "full"), true);
assert.equal(labelsCrowded(["januari", "februari"], 40, charWidth, "auto"), false);
assert.equal(labelsCrowded(["2026-01", "2026-02", "2026-03"], 10, charWidth, "auto"), true);
const placer = new LabelPlacer();
assert.equal(placer.place({ x: 0, y: 100, width: 40, height: 12 }, 0), 100);
assert.equal(placer.place({ x: 20, y: 104, width: 40, height: 12 }, 0), 113);
assert.equal(placer.place({ x: 20, y: 104, width: 40, height: 12 }, -1), 87);
assert.equal(placer.place({ x: 100, y: 104, width: 40, height: 12 }, 0), 104);
const chars = (value: string) => value.length * 6;
assert.deepEqual(periodLabels(["januari", "februari"], 60, chars), ["januari", "februari"]);
assert.deepEqual(periodLabels(["januari", "februari"], 30, chars), ["jan", "feb"]);
assert.deepEqual(periodLabels(["januari", "februari"], 8, chars), ["j", "f"]);
assert.deepEqual(periodLabels(["Kwrt 1", "Kwrt 2"], 20, chars), ["1", "2"]);
assert.deepEqual(periodLabels(["10", "11", "12", "13"], 5, chars), ["10", "", "12", ""]);
const narrow = computeLayout(36, 4, { arrangement: "grid", columns: 2, legendPosition: "top", showYAxis: true, sharedAxis: false, minPlotHeight: 110, maxPlotHeight: 220, minPeriodWidth: 0, fontSize: 10 } as ChartStyle, 800, 600, 40, 2, false);
assert.equal(narrow.width <= 800, true);
const tight = computeLayout(6, 2, { arrangement: "stack", columns: 0, legendPosition: "top", showYAxis: true, sharedAxis: false, minPlotHeight: 110, maxPlotHeight: 220, minPeriodWidth: 65, fontSize: 10 } as ChartStyle, 800, 600, 40, 1, false);
assert.equal(tight.periodTop, 6);
assert.equal(tight.plotHeight, 220);

const empty = buildModel({ categorical: { categories: [column("period", "Maand", ["jan"])] } }, host, options());
assert.equal(empty.hasValueRole, false);
assert.equal(empty.panels.length, 0);

const style = { arrangement: "stack", columns: 0, legendPosition: "top", showYAxis: true, sharedAxis: false, minPlotHeight: 110, maxPlotHeight: 220, minPeriodWidth: 65 } as ChartStyle;
const fits = computeLayout(6, 2, style, 800, 600, 40);
assert.equal(fits.plotHeight, 208);
assert.equal(fits.height, 600);
assert.equal(fits.width, 800);
assert.deepEqual(fits.positions.map(point => point.x), [50, 50]);
const callouts = computeLayout(6, 2, style, 800, 600, 40, 1, true, { left: 45, right: 55 });
assert.equal(callouts.width, 800);
assert.equal(callouts.plotWidth, fits.plotWidth - 100);
assert.deepEqual(callouts.positions.map(point => point.x), [95, 95]);
const crowded = computeLayout(24, 5, style, 800, 400, 40);
assert.equal(crowded.plotHeight, 110);
assert.equal(crowded.plotWidth, 24 * 65);

const grid = computeLayout(3, 4, { ...style, arrangement: "grid", columns: 2, sharedAxis: true }, 800, 600, 40);
assert.equal(grid.columns, 2);
assert.equal(grid.positions[1].x, 50 + grid.plotWidth + 16 + 8);
assert.equal(grid.positions[2].y, grid.positions[0].y + grid.panelHeight + 8);
assert.equal(columnCount({ arrangement: "row", columns: 0 }, 3, 900), 3);
assert.equal(columnCount({ arrangement: "grid", columns: 0 }, 5, 1100), 3);

const slots = slotsFor(["revenue", "cost"]);
assert.near(slots.get("revenue").position, 0.35);
assert.near(slots.get("cost").position, 0.65);
assert.near(slots.get("cost").width, 0.3);

assert.near(slotsFor(["revenue", "cost"], 0.8).get("cost").position, 0.7);
const spaced = slotsFor(["revenue", "cost"], 0.8, 0.25);
assert.near(spaced.get("revenue").width, 0.3);
assert.near(spaced.get("cost").position - spaced.get("revenue").position, 0.5);
assert.near(spaced.get("revenue").position - spaced.get("revenue").width / 2, 0.1);
const comparisonSlots = seriesSlotsFor([
    { key: "cost:0", kind: "cost", name: "Previous", order: 0 },
    { key: "cost:1", kind: "cost", name: "Current", order: 1 }
], ["cost"], 0.8, 0);
assert.equal(comparisonSlots.size, 2);
assert.equal(comparisonSlots.get("cost:0").showKindLabel, true);
assert.equal(comparisonSlots.get("cost:1").showKindLabel, false);
assert.equal(comparisonSlots.get("cost:0").position < comparisonSlots.get("cost:1").position, true);

const overlay = barGeometry(100, 40, { budgetWidth: 0.5, actualRatio: 0.5, actualStyle: "bar", actualPosition: "overlay", actualGap: 4 });
assert.deepEqual([overlay.budgetX, overlay.budgetWidth, overlay.actualX, overlay.actualWidth, overlay.beside], [100, 20, 100, 10, false]);
const beside = barGeometry(100, 40, { budgetWidth: 0.5, actualRatio: 0.5, actualStyle: "bar", actualPosition: "beside", actualGap: 4 });
assert.near(beside.budgetX, 100 - 17 + 10);
assert.near(beside.actualX, 100 - 17 + 20 + 4 + 5);
const squeezed = barGeometry(100, 40, { budgetWidth: 1, actualRatio: 1, actualStyle: "bar", actualPosition: "beside", actualGap: 4 });
assert.near(squeezed.budgetWidth + squeezed.actualWidth + 4, 40);
assert.equal(barGeometry(100, 40, { budgetWidth: 0.5, actualRatio: 0.5, actualStyle: "marker", actualPosition: "beside", actualGap: 4 }).beside, false);

assert.equal(barPath(0, 10, 0, 50, 0), "M0,0H10V50H0Z");
assert.equal(barPath(0, 10, 0, 50, 4), "M0,50V4A4,4 0 0 1 4,0H6A4,4 0 0 1 10,4V50Z");
assert.equal(barPath(0, 10, 80, 50, 20), "M0,50H10V75A5,5 0 0 1 5,80H5A5,5 0 0 1 0,75Z");
assert.equal(mix("#000000", "#FFFFFF", 0.5), "#808080");

assert.equal(horizontalBarPath(0, 10, 50, 0, 0), "M0,0H50V10H0Z");
assert.equal(horizontalBarPath(0, 10, 50, 0, 3), "M0,0H47A3,3 0 0 1 50,3V7A3,3 0 0 1 47,10H0Z");
assert.equal(horizontalBarPath(0, 10, 20, 60, 2).startsWith("M60,0H22"), true);

const flag = { highlightOverrun: true };
assert.equal(isOverrun({ budget: 100, actual: 120 }, flag), true);
assert.equal(isOverrun({ budget: 100, actual: 80 }, flag), false);
assert.equal(isOverrun({ budget: -100, actual: -120 }, flag), true);
assert.equal(isOverrun({ budget: 100, actual: -120 }, flag), false);
assert.equal(isOverrun({ budget: null, actual: 120 }, flag), false);
assert.equal(isOverrun({ budget: 100, actual: 120 }, { highlightOverrun: false }), false);

console.log("All tests passed.");
