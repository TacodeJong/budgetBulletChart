import {
    BudgetCell,
    BudgetModel,
    BudgetPanel,
    BudgetSeries,
    ComponentMode,
    GroupSort,
    PeriodSort,
    SeriesKind,
    classifyKind,
    emptyModel,
    isPercentFormat,
    parseRevenueValues
} from "../../src/model";

const KIND_ORDER: SeriesKind[] = ["revenue", "cost", "net", "total"];
const COST_TERMS = ["kosten", "kost", "lasten", "uitgaven", "uitgaaf", "cost", "expense"];

export interface CubeCell {
    text: string;
    num: number | null;
    elem: number;
    state: string;
}

export interface CubeColumn {
    title: string;
    format: string | null;
}

export interface CubeData {
    dimensions: CubeColumn[];
    measures: CubeColumn[];
    rows: { dims: CubeCell[]; measures: CubeCell[] }[];
}

export interface CubeSelection extends SelectionPoints {
    getKey(): string;
}

interface SelectionPoints {
    points: { dim: number; elem: number }[];
}

export interface CubeOptions {
    periodDimensions: number;
    hasGroup: boolean;
    hasComponent: boolean;
    pairCount: number;
    hasTarget: boolean;
    totalGroupName: string;
    combineGroups: boolean;
    groupSort: GroupSort;
    periodSort: PeriodSort;
    componentMode: ComponentMode;
    revenueValues: string[];
    pairNames: string[];
}

interface Draft extends BudgetCell {
    periodKey: string;
    order: number;
}

const START_HELP = "Add dimensions in this order: one or more period levels (year, quarter, month), then a group, then a component such as Opbrengsten or Kosten. Add measures in this order: budget, actual, and target when Target is on. Repeat that set for every comparison pair. Measures after the pairs are shown in the tooltip. Set Data mapping so the counts match the fields you added.";
const EMPTY_HELP = "There are no rows with a period for the current selections.";

export function cubeFromLayout(layout: any): CubeData {
    const cube = (layout && layout.qHyperCube) || {};
    const dimensions = ((cube.qDimensionInfo || []) as any[]).map(column => ({
        title: columnTitle(column, "Dimension"),
        format: null
    }));
    const measures = ((cube.qMeasureInfo || []) as any[]).map(column => ({
        title: columnTitle(column, "Measure"),
        format: (column.qNumFormat && column.qNumFormat.qFmt) || null
    }));
    const pages = ([...(cube.qDataPages || [])] as any[]).sort((left, right) => pageTop(left) - pageTop(right));
    const rows: CubeData["rows"] = [];
    pages.forEach(page => {
        ((page && page.qMatrix) || []).forEach((matrixRow: any[]) => {
            const cells = (matrixRow || []).map(toCell);
            rows.push({ dims: cells.slice(0, dimensions.length), measures: cells.slice(dimensions.length) });
        });
    });
    return { dimensions, measures, rows };
}

export function optionsFromProps(props: Record<string, any>): CubeOptions {
    const revenueValues = parseRevenueValues(props.revenueValues);
    return {
        periodDimensions: clampInt(props.periodDimensions, 1, 1, 6),
        hasGroup: props.hasGroup !== false,
        hasComponent: props.hasComponent !== false,
        pairCount: clampInt(props.pairCount, 1, 1, 10),
        hasTarget: props.hasTarget === true,
        totalGroupName: text(props.totalGroupName, "Totaal"),
        combineGroups: props.panelMode === "combine",
        groupSort: choice<GroupSort>(props.groupSort, ["alpha", "data", "budget", "actual"], "alpha"),
        periodSort: choice<PeriodSort>(props.periodSort, ["auto", "asc", "desc", "data"], "auto"),
        componentMode: choice<ComponentMode>(props.componentMode, ["split", "revenue", "cost", "net"], "split"),
        revenueValues,
        pairNames: Array.from({ length: 10 }, (_, index) => text(props[`pair${index + 1}Name`], ""))
    };
}

export function buildFromCube(data: CubeData, options: CubeOptions): BudgetModel {
    const model = emptyModel();
    const dimensions = data.dimensions || [];
    const measures = data.measures || [];
    const periodCount = Math.min(Math.max(1, options.periodDimensions), dimensions.length);
    let cursor = periodCount;
    const groupIndex = options.hasGroup && cursor < dimensions.length ? cursor++ : -1;
    const componentIndex = options.hasComponent && cursor < dimensions.length ? cursor++ : -1;
    const stride = options.hasTarget ? 3 : 2;
    const pairCount = Math.max(1, options.pairCount);
    const usedMeasures = pairCount * stride;

    model.hasPeriodRole = periodCount > 0 && dimensions.length > 0;
    model.hasValueRole = measures.length > 0;
    model.levelCount = Math.max(1, periodCount);
    model.names = {
        ...model.names,
        period: dimensions.slice(0, periodCount).map(column => column.title).filter(Boolean).join(" / ") || model.names.period,
        group: groupIndex >= 0 ? dimensions[groupIndex].title : model.names.group,
        component: componentIndex >= 0 ? dimensions[componentIndex].title : model.names.component,
        budget: measureTitle(measures, 0, model.names.budget),
        actual: measureTitle(measures, 1, model.names.actual),
        target: options.hasTarget ? measureTitle(measures, 2, model.names.target || "Target") : model.names.target,
        revenue: model.names.revenue,
        cost: model.names.cost
    };
    model.emptyTitle = !model.hasPeriodRole || !model.hasValueRole ? "Add fields to get started" : "No data";
    model.emptyBody = !model.hasPeriodRole || !model.hasValueRole ? START_HELP : EMPTY_HELP;
    if (!model.hasPeriodRole || !model.hasValueRole) return model;

    const mode: ComponentMode = componentIndex >= 0 ? options.componentMode : "split";
    const periods = new Map<string, PeriodInfo>();
    const cells = new Map<string, Draft>();
    let numericPeriods = true;
    let percentHint = false;
    const selectionDims = periodIndexes(periodCount)
        .concat(!options.combineGroups && groupIndex >= 0 ? [groupIndex] : [])
        .concat(mode !== "net" && componentIndex >= 0 ? [componentIndex] : []);

    data.rows.forEach(row => {
        const periodCells = periodIndexes(periodCount).map(index => row.dims[index] || blankCell());
        if (periodCells.every(cell => !cell.text && cell.num == null)) return;

        const componentCell = componentIndex >= 0 ? row.dims[componentIndex] || blankCell() : null;
        const component = componentCell ? classifyKind(componentCell.text, options.revenueValues) : null;
        if (component && componentCell && componentCell.text) model.names[component] = componentCell.text;
        if (mode === "revenue" && component !== "revenue") return;
        if (mode === "cost" && component !== "cost") return;
        const kind: SeriesKind = !component ? "total" : mode === "net" ? "net" : component;
        const sign = mode === "net" && component === "cost" ? -1 : 1;

        const periodKey = periodCells.map(cell => (cell.elem >= 0 ? `#${cell.elem}` : cell.text)).join("\u0001");
        if (!periods.has(periodKey)) {
            const sort = periodCells.map(cell => cell.num == null ? cell.text : cell.num);
            if (sort.some(value => typeof value !== "number")) numericPeriods = false;
            const levels = periodCells.map(cell => cell.text || "(Blank)");
            periods.set(periodKey, { label: levels.join(" "), levels, sort, order: periods.size });
        }
        const period = periods.get(periodKey);
        const group = options.combineGroups || groupIndex < 0
            ? options.totalGroupName
            : (row.dims[groupIndex] && row.dims[groupIndex].text) || options.totalGroupName;

        for (let pair = 0; pair < pairCount; pair += 1) {
            const budgetIndex = pair * stride;
            const actualIndex = budgetIndex + 1;
            const targetIndex = options.hasTarget ? budgetIndex + 2 : -1;
            const budgetColumn = measures[budgetIndex] || null;
            const actualColumn = measures[actualIndex] || null;
            const namedKind = measurePairKind(budgetColumn, actualColumn, options.revenueValues);
            const fallbackKind = pairCount === 2 ? (pair === 0 ? "revenue" : "cost") : null;
            if (component && (namedKind || fallbackKind) && component !== (namedKind || fallbackKind)) continue;

            const budget = scale(readNumber(row.measures[budgetIndex]), sign);
            const actual = scale(readNumber(row.measures[actualIndex]), sign);
            const target = targetIndex >= 0 ? scale(readNumber(row.measures[targetIndex]), sign) : null;
            if (budget == null && actual == null && target == null) continue;
            const budgetFormat = (budgetColumn && budgetColumn.format) || null;
            const actualFormat = (actualColumn && actualColumn.format) || null;
            const targetFormat = targetIndex >= 0 && measures[targetIndex] ? measures[targetIndex].format : null;
            if (target != null) model.hasTarget = true;
            if (isPercentFormat(budgetFormat) || isPercentFormat(actualFormat)) percentHint = true;
            const seriesKey = `${kind}:${pair}`;
            const customName = (options.pairNames[pair] || "").trim();
            const fieldName = (budgetColumn && budgetColumn.title) || (actualColumn && actualColumn.title) || `Pair ${pair + 1}`;
            const key = `${group}\u0001${periodKey}\u0001${seriesKey}`;
            const highlighted = selectionDims.every(index => isSelected(row.dims[index]));
            const existing = cells.get(key);
            if (existing) {
                existing.budget = addNullable(existing.budget, budget);
                existing.actual = addNullable(existing.actual, actual);
                existing.target = addNullable(existing.target, target);
                existing.budgetFormat = existing.budgetFormat || budgetFormat;
                existing.actualFormat = existing.actualFormat || actualFormat;
                existing.targetFormat = existing.targetFormat || targetFormat;
                existing.highlighted = existing.highlighted || highlighted;
                if (!existing.budgetDisplay) existing.budgetDisplay = displayOf(row.measures[budgetIndex]);
                if (!existing.actualDisplay) existing.actualDisplay = displayOf(row.measures[actualIndex]);
                if (!existing.targetDisplay && targetIndex >= 0) existing.targetDisplay = displayOf(row.measures[targetIndex]);
                continue;
            }
            const points = selectionDims
                .map(dim => ({ dim, elem: row.dims[dim] ? row.dims[dim].elem : -2 }))
                .filter(point => point.elem >= 0);
            const selection: CubeSelection = {
                points,
                getKey: () => points.map(point => `${point.dim}:${point.elem}`).join("|")
            };
            cells.set(key, {
                group,
                period: period.label,
                periodKey,
                periodIndex: 0,
                order: cells.size,
                kind,
                seriesKey,
                seriesName: customName || fieldName,
                comparisonIndex: pair,
                budget,
                actual,
                target,
                budgetFormat,
                actualFormat,
                targetFormat,
                budgetDisplay: displayOf(row.measures[budgetIndex]),
                actualDisplay: displayOf(row.measures[actualIndex]),
                targetDisplay: targetIndex >= 0 ? displayOf(row.measures[targetIndex]) : null,
                latest: false,
                highlighted,
                tooltips: tooltipFields(measures, row.measures, usedMeasures),
                selectionId: selection,
                selectionKey: selection.getKey()
            });
        }
    });

    const ordered = sortPeriods(Array.from(periods.entries()), numericPeriods, options.periodSort);
    const periodIndex = new Map<string, number>();
    ordered.forEach((entry, index) => periodIndex.set(entry[0], index));
    model.periods = ordered.map(entry => entry[1].label);
    model.periodLevels = ordered.map(entry => entry[1].levels);
    model.percentHint = percentHint;

    const panels = new Map<string, { panel: BudgetPanel; order: number; budget: number; actual: number }>();
    const kinds = new Set<SeriesKind>();
    const series = new Map<string, BudgetSeries>();
    const latest = new Map<string, BudgetCell>();
    cells.forEach(draft => {
        draft.periodIndex = periodIndex.get(draft.periodKey) || 0;
        kinds.add(draft.kind);
        const seriesKey = draft.seriesKey || draft.kind;
        if (!series.has(seriesKey)) {
            series.set(seriesKey, {
                key: seriesKey,
                kind: draft.kind,
                name: draft.seriesName || `Series ${(draft.comparisonIndex || 0) + 1}`,
                fieldName: draft.seriesName,
                order: draft.comparisonIndex || 0
            });
        }
        let entry = panels.get(draft.group);
        if (!entry) {
            entry = { panel: { label: draft.group, cells: [] }, order: draft.order, budget: 0, actual: 0 };
            panels.set(draft.group, entry);
        }
        entry.panel.cells.push(stripDraft(draft));
    });
    panels.forEach(entry => entry.panel.cells.forEach(cell => {
        const seriesKey = `${cell.group}\u0001${cell.seriesKey || cell.kind}`;
        const current = latest.get(seriesKey);
        if (!current || cell.periodIndex > current.periodIndex) latest.set(seriesKey, cell);
    }));
    latest.forEach(cell => {
        cell.latest = true;
        const entry = panels.get(cell.group);
        if (!entry) return;
        entry.budget += Math.abs(cell.budget || 0);
        entry.actual += Math.abs(cell.actual || 0);
    });
    model.hasHighlights = Array.from(cells.values()).some(cell => cell.highlighted)
        && Array.from(cells.values()).some(cell => !cell.highlighted);
    model.kinds = KIND_ORDER.filter(kind => kinds.has(kind));
    model.series = Array.from(series.values()).sort((left, right) =>
        KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind) || left.order - right.order);
    model.panels = sortPanels(Array.from(panels.values()), options.groupSort);
    model.panels.forEach(panel => panel.cells.sort((left, right) =>
        left.periodIndex - right.periodIndex
        || KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind)
        || (left.comparisonIndex || 0) - (right.comparisonIndex || 0)));
    return model;
}

export function fetchedRowCount(layout: any): number {
    const pages = (layout && layout.qHyperCube && layout.qHyperCube.qDataPages) || [];
    return pages.reduce((sum: number, page: any) => sum + ((page.qMatrix && page.qMatrix.length) || 0), 0);
}

function stripDraft(draft: Draft): BudgetCell {
    const cell = { ...draft };
    delete (cell as Partial<Draft>).periodKey;
    delete (cell as Partial<Draft>).order;
    return cell;
}

interface PeriodInfo {
    label: string;
    levels: string[];
    sort: (number | string)[];
    order: number;
}

type PeriodEntry = [string, PeriodInfo];

function sortPeriods(entries: PeriodEntry[], numeric: boolean, mode: PeriodSort): PeriodEntry[] {
    const ascending = (left: PeriodEntry, right: PeriodEntry) => {
        for (let level = 0; level < left[1].sort.length; level += 1) {
            const difference = numeric
                ? (left[1].sort[level] as number) - (right[1].sort[level] as number)
                : String(left[1].levels[level]).localeCompare(String(right[1].levels[level]), undefined, { numeric: true, sensitivity: "base" });
            if (difference) return difference;
        }
        return 0;
    };
    const byOrder = (left: PeriodEntry, right: PeriodEntry) => left[1].order - right[1].order;
    if (mode === "data") return entries.sort(byOrder);
    if (mode === "asc") return entries.sort(ascending);
    if (mode === "desc") return entries.sort((left, right) => ascending(right, left));
    return entries.sort(numeric ? ascending : byOrder);
}

function sortPanels(entries: { panel: BudgetPanel; order: number; budget: number; actual: number }[], mode: GroupSort): BudgetPanel[] {
    const byLabel = (left: { panel: BudgetPanel }, right: { panel: BudgetPanel }) =>
        left.panel.label.localeCompare(right.panel.label, undefined, { numeric: true, sensitivity: "base" });
    if (mode === "data") entries.sort((left, right) => left.order - right.order);
    else if (mode === "budget") entries.sort((left, right) => right.budget - left.budget || byLabel(left, right));
    else if (mode === "actual") entries.sort((left, right) => right.actual - left.actual || byLabel(left, right));
    else entries.sort(byLabel);
    return entries.map(entry => entry.panel);
}

function tooltipFields(columns: CubeColumn[], measures: CubeCell[], start: number) {
    const fields = [];
    for (let index = start; index < measures.length; index += 1) {
        const value = measures[index] && measures[index].text;
        if (!value || value === "-") continue;
        fields.push({ name: (columns[index] && columns[index].title) || "Tooltip", value });
    }
    return fields;
}

function measurePairKind(budget: CubeColumn | null, actual: CubeColumn | null, revenueValues: string[]): "revenue" | "cost" | null {
    return measureKind(budget, revenueValues) || measureKind(actual, revenueValues);
}

function measureKind(column: CubeColumn | null, revenueValues: string[]): "revenue" | "cost" | null {
    const name = normalizeName(column && column.title);
    if (!name) return null;
    const revenueTerms = revenueValues.map(normalizeName).filter(Boolean);
    if (revenueTerms.some(term => name.includes(term))) return "revenue";
    if (COST_TERMS.some(term => name.includes(term))) return "cost";
    return null;
}

function normalizeName(value: unknown): string {
    return String(value == null ? "" : value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function columnTitle(column: any, fallback: string): string {
    if (!column) return fallback;
    if (column.qFallbackTitle) return String(column.qFallbackTitle);
    if (Array.isArray(column.qGroupFallbackTitles) && column.qGroupFallbackTitles.length) return String(column.qGroupFallbackTitles[0]);
    return fallback;
}

function pageTop(page: any): number {
    return page && page.qArea && typeof page.qArea.qTop === "number" ? page.qArea.qTop : 0;
}

function toCell(cell: any): CubeCell {
    if (!cell) return blankCell();
    const numeric = typeof cell.qNum === "number" && isFinite(cell.qNum) ? cell.qNum : null;
    const text = cell.qText == null ? "" : String(cell.qText);
    const missing = !!cell.qIsNull || (numeric == null && (text === "" || text === "-"));
    return {
        text: missing ? "" : text,
        num: missing ? null : numeric,
        elem: typeof cell.qElemNumber === "number" ? cell.qElemNumber : -2,
        state: cell.qState || "O"
    };
}

function blankCell(): CubeCell {
    return { text: "", num: null, elem: -2, state: "O" };
}

function periodIndexes(count: number): number[] {
    return Array.from({ length: count }, (_, index) => index);
}

function isSelected(cell: CubeCell | undefined): boolean {
    const state = cell && cell.state;
    return state === "S" || state === "L" || state === "XS" || state === "XL";
}

function readNumber(cell: CubeCell | undefined): number | null {
    if (!cell || cell.num == null || !isFinite(cell.num)) return null;
    return cell.num;
}

function displayOf(cell: CubeCell | undefined): string | null {
    if (!cell || cell.num == null || !cell.text || cell.text === "-") return null;
    return cell.text;
}

function measureTitle(columns: CubeColumn[], index: number, fallback: string): string {
    return (columns[index] && columns[index].title) || fallback;
}

function scale(value: number | null, sign: number): number | null {
    return value == null ? null : value * sign;
}

function addNullable(left: number | null, right: number | null): number | null {
    if (left == null) return right;
    if (right == null) return left;
    return left + right;
}

function text(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim() ? value : fallback;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = typeof value === "number" ? value : parseInt(String(value), 10);
    if (!isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.round(parsed)));
}

function choice<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    const raw = typeof value === "string" ? value : "";
    for (let index = 0; index < allowed.length; index += 1) {
        if (allowed[index] === raw) return allowed[index];
    }
    return fallback;
}
