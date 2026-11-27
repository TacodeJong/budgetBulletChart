export type SeriesKind = "revenue" | "cost" | "net" | "total";
export type GroupSort = "alpha" | "data" | "budget" | "actual";
export type PeriodSort = "auto" | "asc" | "desc" | "data";
export type ComponentMode = "split" | "revenue" | "cost" | "net";

export interface TooltipField {
    name: string;
    value: string;
}

export interface SelectionLike {
    getKey(): string;
    getSelector?(): unknown;
}

export interface LegendValue {
    name: string;
    color: string | null;
    selectionId: SelectionLike | null;
}

export interface SelectionBuilder {
    withCategory(column: unknown, index: number): SelectionBuilder;
    createSelectionId(): SelectionLike;
}

export interface ModelHost {
    createSelectionIdBuilder(): SelectionBuilder;
}

export interface BudgetCell {
    group: string;
    period: string;
    periodIndex: number;
    kind: SeriesKind;
    seriesKey?: string;
    seriesName?: string;
    comparisonIndex?: number;
    legend?: string;
    legendIndex?: number;
    budget: number | null;
    actual: number | null;
    target?: number | null;
    budgetFormat: string | null;
    actualFormat: string | null;
    targetFormat?: string | null;
    latest: boolean;
    highlighted: boolean;
    budgetHighlight?: number | null;
    actualHighlight?: number | null;
    tooltips: TooltipField[];
    selectionId: SelectionLike | null;
    selectionKey: string | null;
    budgetDisplay?: string | null;
    actualDisplay?: string | null;
    targetDisplay?: string | null;
    /** Absolute zone thresholds from zero (Zones data role), ordered by field order. */
    zones?: (number | null)[];
}

export interface BudgetPanel {
    label: string;
    cells: BudgetCell[];
}

export interface BudgetSeries {
    key: string;
    kind: SeriesKind;
    name: string;
    fieldName?: string;
    pairName?: string;
    legend?: string;
    legendIndex?: number;
    order: number;
}

export interface BudgetModel {
    periods: string[];
    periodLevels: string[][];
    levelCount: number;
    kinds: SeriesKind[];
    series?: BudgetSeries[];
    panels: BudgetPanel[];
    percentHint: boolean;
    hasHighlights: boolean;
    hasTarget?: boolean;
    zoneFieldCount?: number;
    zoneFieldNames?: string[];
    legendValues?: LegendValue[];
    names: { period: string; group: string; component: string; budget: string; actual: string; target?: string; legend?: string; revenue: string; cost: string };
    hasPeriodRole: boolean;
    hasValueRole: boolean;
    emptyTitle?: string;
    emptyBody?: string;
}

export interface ModelOptions {
    totalGroupName: string;
    combineGroups: boolean;
    groupSort: GroupSort;
    periodSort: PeriodSort;
    componentMode: ComponentMode;
    revenueValues: string[];
    pairNames?: string[];
    formatValue(value: unknown, format: string): string | null;
}

export const DEFAULT_REVENUE_VALUES = ["opbrengst", "baten", "inkomst", "omzet", "revenue", "income"];
const KIND_ORDER: SeriesKind[] = ["revenue", "cost", "net", "total"];

export function emptyModel(): BudgetModel {
    return {
        periods: [],
        periodLevels: [],
        levelCount: 1,
        kinds: [],
        series: [],
        panels: [],
        percentHint: false,
        hasHighlights: false,
        names: {
            period: "Periode", group: "Indeling", component: "Onderdeel",
            budget: "Budget", actual: "Actual YTD", target: "Target", revenue: "Opbrengsten", cost: "Kosten"
        },
        hasPeriodRole: false,
        hasValueRole: false
    };
}

export function comparisonPairCount(model: BudgetModel): number {
    const series = model.series || [];
    const paired = model.kinds.some(kind => new Set(series.filter(item => item.kind === kind).map(item => item.order)).size > 1);
    if (!paired) return Math.min(1, series.length);
    return Math.max(...series.map(item => item.order)) + 1;
}

export function defaultOptions(): ModelOptions {
    return {
        totalGroupName: "Totaal",
        combineGroups: false,
        groupSort: "alpha",
        periodSort: "auto",
        componentMode: "split",
        revenueValues: DEFAULT_REVENUE_VALUES,
        formatValue: () => null
    };
}

export function parseRevenueValues(text: unknown): string[] {
    const values = String(text == null ? "" : text)
        .split(/[,;\n]+/)
        .map(value => value.trim().toLowerCase())
        .filter(value => value.length > 0);
    return values.length ? values : DEFAULT_REVENUE_VALUES;
}

export function classifyKind(value: unknown, revenueValues: string[] = DEFAULT_REVENUE_VALUES): "revenue" | "cost" {
    const text = value == null ? "" : String(value).trim().toLowerCase();
    if (!text) return "cost";
    return revenueValues.some(prefix => text.indexOf(prefix) === 0) ? "revenue" : "cost";
}

export function isPercentFormat(format: string | null | undefined): boolean {
    if (!format) return false;
    const unquoted = format.replace(/"[^"]*"|'[^']*'|\\./g, "");
    return unquoted.indexOf("%") >= 0 || /^\s*p\d*\s*$/i.test(unquoted) || /^percent$/i.test(unquoted.trim());
}

interface Draft extends BudgetCell {
    periodKey: string;
    order: number;
    fieldName?: string;
    pairName?: string;
}

function legendColorAt(column: any, row: number): string | null {
    const objects = column && column.objects && column.objects[row];
    const fill = objects && objects.colors && objects.colors.legendFill;
    const color = fill && fill.solid && fill.solid.color;
    return typeof color === "string" && color ? color : null;
}

export function buildModel(dataView: any, host: ModelHost, options: ModelOptions): BudgetModel {
    const categorical = dataView && dataView.categorical;
    const model = emptyModel();
    if (!categorical) return model;

    const periodCols = allRoles(categorical, "period").filter(column => isCategoryColumn(categorical, column));
    const periodCol = periodCols[0] || null;
    const groupCol = firstRole(categorical, "group");
    const componentCol = firstRole(categorical, "component");
    const legendRole = firstRole(categorical, "legend");
    const legendCol = legendRole && isCategoryColumn(categorical, legendRole) ? legendRole : null;
    const budgetCols = allRoles(categorical, "budget");
    const actualCols = allRoles(categorical, "actual");
    const targetCols = allRoles(categorical, "target");
    const zoneCols = allRoles(categorical, "zones");
    const tooltipCols = allRoles(categorical, "tooltips");
    model.hasPeriodRole = !!periodCol;
    model.hasValueRole = !!(budgetCols.length || actualCols.length);
    model.zoneFieldCount = zoneCols.length;
    model.zoneFieldNames = zoneCols.map((column, index) => columnName(column, `Zone ${index + 1}`));
    model.names = {
        period: periodCols.length ? periodCols.map(column => columnName(column, "")).filter(Boolean).join(" / ") : model.names.period,
        group: columnName(groupCol, model.names.group),
        component: columnName(componentCol, model.names.component),
        budget: columnName(budgetCols[0], model.names.budget),
        actual: columnName(actualCols[0], model.names.actual),
        target: targetCols.length === 1 ? columnName(targetCols[0], model.names.target) : model.names.target,
        legend: columnName(legendCol, "Legend"),
        revenue: model.names.revenue,
        cost: model.names.cost
    };
    model.hasHighlights = [...budgetCols, ...actualCols].some(column => !!column.highlights);
    if (!periodCol || !model.hasValueRole) return model;

    const mode: ComponentMode = componentCol ? options.componentMode : "split";
    const selectionCols = [...periodCols, options.combineGroups ? null : groupCol, mode === "net" ? null : componentCol, legendCol]
        .filter(column => column && isCategoryColumn(categorical, column));
    const legendValues = new Map<string, LegendValue & { index: number }>();
    model.levelCount = periodCols.length;
    const periods = new Map<string, PeriodInfo>();
    const cells = new Map<string, Draft>();
    let numericPeriods = true;
    let percentHint = false;
    const rowCount = periodCol.values ? periodCol.values.length : 0;
    const comparisonCount = Math.max(budgetCols.length, actualCols.length, 1);

    const yearPairs = comparisonCount === 2 && differOnlyByNumbers(
        comparisonName(comparisonColumn(budgetCols, 0), comparisonColumn(actualCols, 0), 0),
        comparisonName(comparisonColumn(budgetCols, 1), comparisonColumn(actualCols, 1), 1)
    );
    for (let row = 0; row < rowCount; row += 1) {
        const raws = periodCols.map(column => readValue(column, row));
        if (raws.every(raw => raw == null || raw === "")) continue;

        const componentValue = readValue(componentCol, row);
        const component = componentCol ? classifyKind(componentValue, options.revenueValues) : null;
        if (component) {
            const componentLabel = readLabel(componentCol, row, options);
            if (componentLabel) model.names[component] = componentLabel;
        }
        if (mode === "revenue" && component !== "revenue") continue;
        if (mode === "cost" && component !== "cost") continue;
        const kind: SeriesKind = !component ? "total" : mode === "net" ? "net" : component;
        const sign = mode === "net" && component === "cost" ? -1 : 1;

        const periodKey = raws.map(rawKey).join("\u0001");
        let period = periods.get(periodKey);
        if (!period) {
            const sort = raws.map(raw => raw instanceof Date ? raw.getTime() : typeof raw === "number" ? raw : rawKey(raw));
            if (sort.some(value => typeof value !== "number")) numericPeriods = false;
            const levels = periodCols.map((column, level) => readLabel(column, row, options) || rawKey(raws[level]) || "(Blank)");
            period = { label: levels.join(" "), levels, sort, order: periods.size };
            periods.set(periodKey, period);
        }

        const group = options.combineGroups ? options.totalGroupName : readLabel(groupCol, row, options) || options.totalGroupName;
        let legend: string | undefined;
        let legendIndex: number | undefined;
        if (legendCol) {
            legend = readLabel(legendCol, row, options) || "(Blank)";
            let entry = legendValues.get(legend);
            if (!entry) {
                let selectionId: SelectionLike | null = null;
                try {
                    selectionId = host.createSelectionIdBuilder().withCategory(legendCol, row).createSelectionId();
                } catch {
                    selectionId = null;
                }
                entry = { name: legend, color: legendColorAt(legendCol, row), selectionId, index: legendValues.size };
                legendValues.set(legend, entry);
            } else if (!entry.color) {
                entry.color = legendColorAt(legendCol, row);
            }
            legendIndex = entry.index;
        }
        for (let comparisonIndex = 0; comparisonIndex < comparisonCount; comparisonIndex += 1) {
            const budgetCol = comparisonColumn(budgetCols, comparisonIndex);
            const actualCol = comparisonColumn(actualCols, comparisonIndex);
            const namedKind = measurePairKind(budgetCol, actualCol, options.revenueValues);
            const fallbackKind = comparisonCount === 2 && !yearPairs ? (comparisonIndex === 0 ? "revenue" : "cost") : null;
            if (component && (namedKind || fallbackKind) && component !== (namedKind || fallbackKind)) continue;

            const budget = scale(readNumber(budgetCol, row), sign);
            const actual = scale(readNumber(actualCol, row), sign);
            const targetCol = targetCols[comparisonIndex] || null;
            const target = scale(readNumber(targetCol, row), sign);
            if (budget == null && actual == null && target == null) continue;
            const budgetFormat = rowFormat(budgetCol, row);
            const actualFormat = rowFormat(actualCol, row);
            const targetFormat = rowFormat(targetCol, row);
            if (target != null) model.hasTarget = true;
            if (isPercentFormat(budgetFormat) || isPercentFormat(actualFormat)) percentHint = true;
            const highlighted = isHighlighted(budgetCol, row) || isHighlighted(actualCol, row);
            const budgetHighlight = scale(readHighlight(budgetCol, row), sign);
            const actualHighlight = scale(readHighlight(actualCol, row), sign);
            const zones = zoneCols.map(column => scale(readNumber(column, row), sign));
            const seriesKey = legend == null ? `${kind}:${comparisonIndex}` : `${kind}:${comparisonIndex}:${legend}`;
            const fieldName = comparisonName(budgetCol, actualCol, comparisonIndex);
            const customName = ((options.pairNames || [])[comparisonIndex] || "").trim();
            const pairName = customName || fieldName;
            const seriesName = legend == null ? pairName : legend;
            const key = `${group}\u0001${periodKey}\u0001${seriesKey}`;
            const existing = cells.get(key);
            if (existing) {
                existing.budget = addNullable(existing.budget, budget);
                existing.actual = addNullable(existing.actual, actual);
                existing.target = addNullable(existing.target, target);
                existing.budgetFormat = existing.budgetFormat || budgetFormat;
                existing.actualFormat = existing.actualFormat || actualFormat;
                existing.targetFormat = existing.targetFormat || targetFormat;
                existing.highlighted = existing.highlighted || highlighted;
                existing.budgetHighlight = addNullable(existing.budgetHighlight, budgetHighlight);
                existing.actualHighlight = addNullable(existing.actualHighlight, actualHighlight);
                existing.zones = mergeZones(existing.zones, zones);
                continue;
            }
            const cell: Draft = {
                group,
                period: period.label,
                periodKey,
                periodIndex: 0,
                order: cells.size,
                kind,
                seriesKey,
                seriesName,
                fieldName,
                pairName,
                comparisonIndex,
                legend,
                legendIndex,
                budget,
                actual,
                target,
                budgetFormat,
                actualFormat,
                targetFormat,
                latest: false,
                highlighted,
                budgetHighlight,
                actualHighlight,
                zones: zones.length ? zones : undefined,
                tooltips: readTooltips(tooltipCols, row, options),
                selectionId: null,
                selectionKey: null
            };
            try {
                let builder = host.createSelectionIdBuilder();
                selectionCols.forEach(column => { builder = builder.withCategory(column, row); });
                cell.selectionId = builder.createSelectionId();
                cell.selectionKey = cell.selectionId.getKey();
            } catch {
                cell.selectionId = null;
            }
            cells.set(key, cell);
        }
    }

    const orderedPeriods = sortPeriods(Array.from(periods.entries()), numericPeriods, options.periodSort);
    const periodIndex = new Map<string, number>();
    orderedPeriods.forEach((entry, index) => periodIndex.set(entry[0], index));
    model.periods = orderedPeriods.map(entry => entry[1].label);
    model.periodLevels = orderedPeriods.map(entry => entry[1].levels);
    model.percentHint = percentHint;

    const panels = new Map<string, { panel: BudgetPanel; order: number; budget: number; actual: number }>();
    const kinds = new Set<SeriesKind>();
    const series = new Map<string, BudgetSeries>();
    const latest = new Map<string, BudgetCell>();
    cells.forEach(draft => {
        draft.periodIndex = periodIndex.get(draft.periodKey);
        kinds.add(draft.kind);
        const draftSeriesKey = draft.seriesKey || draft.kind;
        if (!series.has(draftSeriesKey)) {
            series.set(draftSeriesKey, {
                key: draftSeriesKey,
                kind: draft.kind,
                name: draft.seriesName || `Series ${(draft.comparisonIndex || 0) + 1}`,
                fieldName: draft.fieldName,
                pairName: draft.pairName,
                legend: draft.legend,
                legendIndex: draft.legendIndex,
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
        entry.budget += Math.abs(cell.budget || 0);
        entry.actual += Math.abs(cell.actual || 0);
    });

    model.kinds = KIND_ORDER.filter(kind => kinds.has(kind));
    model.series = Array.from(series.values()).sort((left, right) =>
        KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind) || left.order - right.order
        || (left.legendIndex || 0) - (right.legendIndex || 0));
    if (legendCol) {
        model.legendValues = Array.from(legendValues.values()).map(({ index, ...value }) => (void index, value));
        if (comparisonPairCount(model) > 1) {
            model.series.forEach(item => { item.name = `${item.pairName} · ${item.legend}`; });
            const names = new Map(model.series.map(item => [item.key, item.name]));
            panels.forEach(entry => entry.panel.cells.forEach(cell => { cell.seriesName = names.get(cell.seriesKey) || cell.seriesName; }));
        }
    }
    model.panels = sortPanels(Array.from(panels.values()), options.groupSort);
    model.panels.forEach(panel => panel.cells.sort((left, right) =>
        left.periodIndex - right.periodIndex
        || KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind)
        || (left.comparisonIndex || 0) - (right.comparisonIndex || 0)
        || (left.legendIndex || 0) - (right.legendIndex || 0)));
    return model;
}

function stripDraft(draft: Draft): BudgetCell {
    const { periodKey, order, fieldName, pairName, ...cell } = draft;
    void periodKey;
    void order;
    void fieldName;
    void pairName;
    return cell;
}

interface PeriodInfo {
    label: string;
    levels: string[];
    sort: (number | string)[];
    order: number;
}

type PeriodEntry = [string, PeriodInfo];

function rawKey(raw: unknown): string {
    if (raw == null) return "";
    return raw instanceof Date ? raw.toISOString() : String(raw);
}

function sortPeriods(entries: PeriodEntry[], numeric: boolean, mode: PeriodSort): PeriodEntry[] {
    const ascending = (left: PeriodEntry, right: PeriodEntry) => {
        for (let level = 0; level < left[1].sort.length; level += 1) {
            const difference = numeric
                ? (left[1].sort[level] as number) - (right[1].sort[level] as number)
                : left[1].levels[level].localeCompare(right[1].levels[level], undefined, { numeric: true, sensitivity: "base" });
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

function scale(value: number | null, sign: number): number | null {
    return value == null ? null : value * sign;
}

function addNullable(left: number | null, right: number | null): number | null {
    if (left == null) return right;
    if (right == null) return left;
    return left + right;
}

function mergeZones(left: (number | null)[] | undefined, right: (number | null)[]): (number | null)[] | undefined {
    if (!right.length) return left;
    if (!left || !left.length) return right.slice();
    const length = Math.max(left.length, right.length);
    return Array.from({ length }, (_, index) => addNullable(left[index] ?? null, right[index] ?? null));
}

function readNumber(column: any, index: number): number | null {
    const value = readValue(column, index);
    if (value == null || value === "") return null;
    const parsed = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
    return isFinite(parsed) ? parsed : null;
}

function comparisonColumn(columns: any[], index: number): any {
    if (!columns.length) return null;
    return columns.length === 1 ? columns[0] : columns[index] || null;
}

function differOnlyByNumbers(left: string, right: string): boolean {
    const stem = (name: string) => (name || "").toLowerCase().replace(/[-+]?\s*\d+\s*(jr|yr|y)?\b/g, "").replace(/\s+/g, " ").trim();
    return left !== right && stem(left) === stem(right);
}

function measurePairKind(budgetColumn: any, actualColumn: any, revenueValues: string[]): "revenue" | "cost" | null {
    return measureKind(budgetColumn, revenueValues) || measureKind(actualColumn, revenueValues);
}

function comparisonName(budgetColumn: any, actualColumn: any, index: number): string {
    return columnName(budgetColumn, "") || columnName(actualColumn, "") || `Pair ${index + 1}`;
}

function measureKind(column: any, revenueValues: string[]): "revenue" | "cost" | null {
    if (!column || !column.source) return null;
    const revenueTerms = revenueValues.map(normalizeName).filter(Boolean);
    const costTerms = ["kosten", "kost", "lasten", "uitgaven", "uitgaaf", "cost", "expense"];
    for (const raw of [column.source.displayName, column.source.queryName]) {
        const name = normalizeName(raw);
        if (!name) continue;
        if (revenueTerms.some(term => name.includes(term))) return "revenue";
        if (costTerms.some(term => name.includes(term))) return "cost";
    }
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

function rowFormat(column: any, index: number): string | null {
    if (!column) return null;
    const objects = column.objects && column.objects[index];
    const dynamic = objects && objects.general && objects.general.formatString;
    if (typeof dynamic === "string" && dynamic) return dynamic;
    const format = column.source && column.source.format;
    return typeof format === "string" && format ? format : null;
}

function readHighlight(column: any, index: number): number | null {
    if (!column || !column.highlights) return null;
    const value = column.highlights[index];
    if (value == null || value === "") return null;
    const parsed = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
    return isFinite(parsed) ? parsed : null;
}

function isHighlighted(column: any, index: number): boolean {
    if (!column || !column.highlights) return false;
    const value = column.highlights[index];
    return value != null && value !== "";
}

function allRoles(categorical: any, role: string): any[] {
    const found = [
        ...listRole(categorical && categorical.categories, role),
        ...listRole(categorical && categorical.values, role)
    ];
    const seen = new Set<string>();
    return found.filter(column => {
        const key = columnKey(column);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function columnKey(column: any): string {
    const source = column && column.source;
    if (!source) return "";
    return String(source.queryName || source.displayName || "").trim().toLowerCase();
}

function firstRole(categorical: any, role: string): any {
    return allRoles(categorical, role)[0] || null;
}

function listRole(columns: any, role: string): any[] {
    const found = [];
    if (!columns) return found;
    for (let index = 0; index < columns.length; index += 1) {
        const column = columns[index];
        if (column && column.source && column.source.roles && column.source.roles[role]) found.push(column);
    }
    return found;
}

function isCategoryColumn(categorical: any, column: any): boolean {
    const categories = categorical && categorical.categories;
    return !!categories && categories.indexOf(column) >= 0;
}

function columnName(column: any, fallback: string): string {
    return (column && column.source && (column.source.displayName || column.source.queryName)) || fallback;
}

function readValue(column: any, index: number): unknown {
    if (!column || !column.values || index >= column.values.length) return null;
    return column.values[index];
}

function readLabel(column: any, index: number, options: ModelOptions): string {
    const value = readValue(column, index);
    if (value == null || value === "") return "";
    const format = rowFormat(column, index);
    if (format) {
        try {
            const formatted = options.formatValue(value, format);
            if (formatted != null && String(formatted).trim()) return String(formatted).trim();
        } catch {
            /* Fall back to the raw value when Power BI cannot format it. */
        }
    }
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value).trim();
}

function readTooltips(columns: any[], index: number, options: ModelOptions): TooltipField[] {
    return columns
        .map(column => ({ name: columnName(column, "Tooltip"), value: readLabel(column, index, options) }))
        .filter(item => item.value);
}
