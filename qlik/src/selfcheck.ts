import { CubeCell, CubeData, buildFromCube, optionsFromProps } from "./cube";

declare const process: { exit(code: number): void };

let failed = 0;

function check(name: string, condition: boolean): void {
    if (condition) return;
    failed += 1;
    console.error(`FAIL ${name}`);
}

function dim(text: string, elem: number, num: number | null = null, state = "O"): CubeCell {
    return { text, num, elem, state };
}

function meas(num: number | null, text = num == null ? "" : String(num)): CubeCell {
    return { text, num, elem: -1, state: "O" };
}

function data(dims: string[], measures: { title: string; format?: string }[], rows: { dims: CubeCell[]; measures: CubeCell[] }[]): CubeData {
    return {
        dimensions: dims.map(title => ({ title, format: null })),
        measures: measures.map(column => ({ title: column.title, format: column.format || "#,##0" })),
        rows
    };
}

const base = optionsFromProps({});

const basic = buildFromCube(data(
    ["Periode", "Indeling", "Onderdeel"],
    [{ title: "Jaarbegroting" }, { title: "Realisatie YTD" }, { title: "Opmerking" }],
    [
        { dims: [dim("2026-02", 2, 202602), dim("Zuid", 2), dim("Opbrengsten", 1)], measures: [meas(500), meas(20), meas(null, "let op")] },
        { dims: [dim("2026-01", 1, 202601), dim("Noord", 1), dim("Opbrengsten", 1)], measures: [meas(100), meas(40), meas(null, "")] },
        { dims: [dim("2026-02", 2, 202602), dim("Noord", 1), dim("Opbrengsten", 1)], measures: [meas(100), meas(90), meas(null, "")] },
        { dims: [dim("2026-01", 1, 202601), dim("Noord", 1), dim("Kosten", 2)], measures: [meas(80), meas(30), meas(null, "")] },
        { dims: [dim("2026-02", 2, 202602), dim("Noord", 1), dim("Kosten", 2)], measures: [meas(80), meas(70), meas(null, "")] },
        { dims: [dim("2026-01", 1, 202601), dim("Zuid", 2), dim("Opbrengsten", 1)], measures: [meas(500), meas(10), meas(null, "")] }
    ]
), base);

check("periods sorted numerically", basic.periods.join("|") === "2026-01|2026-02");
check("alpha panels", basic.panels.map(panel => panel.label).join("|") === "Noord|Zuid");
check("kinds", basic.kinds.join("|") === "revenue|cost");
check("latest noord revenue", basic.panels[0].cells.filter(cell => cell.kind === "revenue" && cell.latest).length === 1);
check("latest actual is the last period", basic.panels[0].cells.find(cell => cell.kind === "revenue" && cell.latest)?.actual === 90);
check("component names", basic.names.revenue === "Opbrengsten" && basic.names.cost === "Kosten");
check("measure names", basic.names.budget === "Jaarbegroting" && basic.names.actual === "Realisatie YTD");
check("tooltip kept", basic.panels[1].cells.some(cell => cell.tooltips.some(field => field.name === "Opmerking" && field.value === "let op")));
check("selection points cover period, group and component", ((basic.panels[0].cells[0].selectionId as any).points || []).length === 3);

const byBudget = buildFromCube(data(
    ["Periode", "Indeling", "Onderdeel"],
    [{ title: "Jaarbegroting" }, { title: "Realisatie" }],
    basicRows()
), { ...base, groupSort: "budget" });
check("budget sort puts the larger panel first", byBudget.panels[0].label === "Zuid");

const net = buildFromCube(data(
    ["Periode", "Onderdeel"],
    [{ title: "Begroting" }, { title: "Realisatie" }],
    [
        { dims: [dim("jan", 1, 1), dim("Opbrengsten", 1)], measures: [meas(10), meas(4)] },
        { dims: [dim("jan", 1, 1), dim("Kosten", 2)], measures: [meas(10), meas(3)] }
    ]
), { ...base, hasGroup: false, componentMode: "net" });
check("net combines revenue and cost", net.panels.length === 1 && net.panels[0].cells.length === 1);
check("net cost is subtracted", net.panels[0].cells[0].kind === "net" && net.panels[0].cells[0].budget === 0 && net.panels[0].cells[0].actual === 1);

const pairs = buildFromCube(data(
    ["Periode", "Onderdeel"],
    [{ title: "Begroting opbrengst" }, { title: "Realisatie opbrengst" }, { title: "Begroting kosten" }, { title: "Realisatie kosten" }],
    [
        { dims: [dim("jan", 1, 1), dim("Opbrengsten", 1)], measures: [meas(10), meas(4), meas(99), meas(98)] },
        { dims: [dim("jan", 1, 1), dim("Kosten", 2)], measures: [meas(7), meas(6), meas(80), meas(70)] }
    ]
), { ...base, hasGroup: false, pairCount: 2 });
const revenue = pairs.panels[0].cells.filter(cell => cell.kind === "revenue");
const cost = pairs.panels[0].cells.filter(cell => cell.kind === "cost");
check("revenue row keeps the revenue pair only", revenue.length === 1 && revenue[0].budget === 10 && revenue[0].comparisonIndex === 0);
check("cost row keeps the cost pair only", cost.length === 1 && cost[0].budget === 80 && cost[0].comparisonIndex === 1);

const levels = buildFromCube(data(
    ["Jaar", "Maand", "Indeling"],
    [{ title: "Begroting" }, { title: "Realisatie" }],
    [
        { dims: [dim("2026", 1, 2026), dim("mrt", 3, 3), dim("Noord", 1)], measures: [meas(5), meas(2)] },
        { dims: [dim("2025", 2, 2025), dim("dec", 12, 12), dim("Noord", 1)], measures: [meas(5), meas(1)] }
    ]
), { ...base, periodDimensions: 2, hasComponent: false });
check("two period levels", levels.levelCount === 2 && levels.periods.join("|") === "2025 dec|2026 mrt");
check("parent level kept", levels.periodLevels[0].join("|") === "2025|dec");

const desc = buildFromCube(data(
    ["Periode"],
    [{ title: "Begroting" }, { title: "Realisatie" }],
    [
        { dims: [dim("jan", 1, 1)], measures: [meas(1), meas(1)] },
        { dims: [dim("feb", 2, 2)], measures: [meas(1), meas(1)] }
    ]
), { ...base, hasGroup: false, hasComponent: false, periodSort: "desc" });
check("descending periods", desc.periods.join("|") === "feb|jan");

const percent = buildFromCube(data(
    ["Periode"],
    [{ title: "Begroting", format: "0.0%" }, { title: "Realisatie", format: "0.0%" }],
    [{ dims: [dim("jan", 1, 1)], measures: [meas(0.5, "50.0%"), meas(0.25, "25.0%")] }]
), { ...base, hasGroup: false, hasComponent: false });
check("percent hint and formatted tooltip text", percent.percentHint === true && percent.panels[0].cells[0].budgetDisplay === "50.0%");

const missing = buildFromCube(data([], [], []), base);
check("missing fields explain how to map them", missing.hasPeriodRole === false && /period levels/.test(missing.emptyBody || ""));

const combined = buildFromCube(data(
    ["Periode", "Indeling"],
    [{ title: "Begroting" }, { title: "Realisatie" }],
    [
        { dims: [dim("jan", 1, 1), dim("Noord", 1)], measures: [meas(10), meas(4)] },
        { dims: [dim("jan", 1, 1), dim("Zuid", 2)], measures: [meas(5), meas(1)] }
    ]
), { ...base, hasComponent: false, combineGroups: true, totalGroupName: "Totaal" });
check("combined groups sum into one panel", combined.panels.length === 1 && combined.panels[0].label === "Totaal" && combined.panels[0].cells[0].budget === 15);

function basicRows() {
    return [
        { dims: [dim("2026-02", 2, 202602), dim("Zuid", 2), dim("Opbrengsten", 1)], measures: [meas(500), meas(20)] },
        { dims: [dim("2026-01", 1, 202601), dim("Noord", 1), dim("Opbrengsten", 1)], measures: [meas(100), meas(40)] },
        { dims: [dim("2026-02", 2, 202602), dim("Noord", 1), dim("Opbrengsten", 1)], measures: [meas(100), meas(90)] },
        { dims: [dim("2026-01", 1, 202601), dim("Noord", 1), dim("Kosten", 2)], measures: [meas(80), meas(30)] },
        { dims: [dim("2026-02", 2, 202602), dim("Noord", 1), dim("Kosten", 2)], measures: [meas(80), meas(70)] },
        { dims: [dim("2026-01", 1, 202601), dim("Zuid", 2), dim("Opbrengsten", 1)], measures: [meas(500), meas(10)] }
    ];
}

if (failed) {
    console.error(`${failed} failed`);
    process.exit(1);
}
console.log("qlik model checks passed");
