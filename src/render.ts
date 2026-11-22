import type { BudgetCell, BudgetModel, BudgetPanel, BudgetSeries, SeriesKind } from "./model";
import { comparisonPairCount } from "./model";
import { BandScale, LinearScale, bandScale, panelScale } from "./scale";

export type BudgetLabelMode = "latest" | "all" | "none";
export type ActualLabelMode = "auto" | "all" | "latest" | "none";
export type ActualContent = "value" | "share" | "both";
export type LabelPosition = "auto" | "inside" | "above" | "left" | "right" | "side";
export type HorizontalLabelPosition = "end" | "after" | "insideEnd" | "insideBase";
export type Arrangement = "stack" | "grid" | "row";
export type LegendPosition = "top" | "bottom" | "left" | "right" | "none";
export type BudgetStyle = "solid" | "light" | "outline";
export type ActualStyle = "bar" | "marker";
export type ActualPosition = "overlay" | "beside";
export type ColorBy = "component" | "group";
export type ChartOrientation = "vertical" | "horizontal";
export type XAxisOrientation = "auto" | "horizontal" | "diagonal" | "vertical";
export type XAxisLabelLength = "auto" | "full";

export interface LegendStyle {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    revenue?: string;
    cost?: string;
    budget?: string;
    actual?: string;
    target?: string;
    pairs?: string[];
    hidden?: Partial<Record<"revenue" | "cost" | "budget" | "actual" | "target" | "overrun", boolean>> & { pairs?: boolean[] };
}

export interface TargetStyle {
    shape: "bar" | "dot";
    barLength: number;
    barThickness: number;
    barColor: string;
    dotSize: number;
    dotFill: string;
    dotBorderColor: string;
    dotBorderWidth: number;
}

export interface XAxisStyle {
    show: boolean;
    fontFamily: string;
    fontSize: number;
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    orientation: XAxisOrientation;
    labelLength: XAxisLabelLength;
    maxLabelWidth: number;
    showParents: boolean;
    showSeparators: boolean;
    showComponents: boolean;
    showPairs: boolean;
    pairFontFamily: string;
    pairFontSize: number;
    pairBold: boolean;
    pairItalic: boolean;
    pairUnderline: boolean;
    pairOrientation: XAxisOrientation;
    pairColorMode: "pair" | "fixed";
    pairColor: string;
    showLine: boolean;
    lineColor: string;
    showTitle: boolean;
    title: string;
}

export interface ValueFormatters {
    axis(value: number, ticks: number[], format: string | null): string;
    label(value: number, format: string | null): string;
    share(actual: number, budget: number): string;
}

export interface ChartStyle {
    orientation?: ChartOrientation;
    arrangement: Arrangement;
    columns: number;
    sharedAxis: boolean;
    showYAxis: boolean;
    showGrid: boolean;
    minPlotHeight: number;
    maxPlotHeight: number;
    minPeriodWidth: number;
    budgetStyle: BudgetStyle;
    budgetWidth: number;
    actualStyle: ActualStyle;
    actualRatio: number;
    actualPosition: ActualPosition;
    actualGap: number;
    groupWidth: number;
    kindGap: number;
    budgetRadius: number;
    actualRadius: number;
    showComparisonLabels: boolean;
    comparisonColors: string[];
    colorBy: ColorBy;
    revenueColor: string;
    costColor: string;
    netColor: string;
    actualColor: string;
    highlightOverrun: boolean;
    overrunColor: string;
    groupColor(label: string): string;
    legendPosition: LegendPosition;
    revenueText: string;
    costText: string;
    budgetText: string;
    actualText: string;
    overrunText: string;
    budgetLabel: BudgetLabelStyle;
    actualLabel: ActualLabelStyle;
    fontFamily: string;
    fontSize: number;
    fontBold: boolean;
    fontItalic: boolean;
    fontUnderline: boolean;
    revenueName: string;
    costName: string;
    xAxis?: Partial<XAxisStyle>;
    legend?: LegendStyle;
    target?: TargetStyle;
    targetText?: string;
    legendColor?(name: string, index: number): string;
    formatters: ValueFormatters;
}

export interface LabelBoxStyle {
    outline: boolean;
    outlineColor: string;
    outlineWidth: number;
    backdrop: boolean;
    backdropColor: string;
    backdropOpacity: number;
    padding: number;
    radius: number;
    borderColor: string;
    borderWidth: number;
}

export interface ValueLabelStyle {
    position: LabelPosition;
    fontFamily: string;
    fontSize: number;
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    pointer: boolean;
    pointerColor: string;
    box: LabelBoxStyle;
    hPosition?: HorizontalLabelPosition;
}

export interface BudgetLabelStyle extends ValueLabelStyle {
    mode: BudgetLabelMode;
    combine?: boolean;
    separator?: string;
}

export interface ActualLabelStyle extends ValueLabelStyle {
    mode: ActualLabelMode;
    content: ActualContent;
}

export interface RenderHandlers {
    select(cell: BudgetCell, multi: boolean): void;
    clear(): void;
    tooltip(cell: BudgetCell, x: number, y: number): void;
    hideTooltip(): void;
    contextMenu(cell: BudgetCell | null, x: number, y: number): void;
}

export interface RenderInput {
    model: BudgetModel;
    width: number;
    height: number;
    style: ChartStyle;
    selectedKeys: Set<string>;
    handlers: RenderHandlers;
}

export interface Layout {
    width: number;
    height: number;
    columns: number;
    plotWidth: number;
    plotHeight: number;
    panelHeight: number;
    kindRow: boolean;
    comparisonRow: boolean;
    periodTop: number;
    labelAngle: number;
    periodLabelHeight: number;
    pairAngle: number;
    pairRowHeight: number;
    legendY: number;
    legendX: number;
    legendVertical: boolean;
    positions: { x: number; y: number }[];
}

export interface Slot {
    position: number;
    width: number;
    labelPosition?: number;
    labelWidth?: number;
    showKindLabel?: boolean;
}

export interface SideMargins {
    left: number;
    right: number;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const FONT = "\"Segoe UI\", \"Segoe UI Web\", sans-serif";
const HEADER = 19;
const GAP = 8;
const BOTTOM = 12;
const RIGHT = 16;
const INNER_LEFT = 8;
const LEGEND = 30;
const SCROLLBAR = 12;
const INSIDE_LABEL_MIN = 22;
const POINTER_SIZE = 5;
const AXIS_COLOR = "#605E5C";
const NEUTRAL = "#7F7F7F";
const PALETTE = ["#118DFF", "#12239E", "#E66C37", "#6B007B", "#E044A7", "#744EC2", "#D9B300", "#D64550", "#197278", "#1AAB40"];

export function columnCount(style: Pick<ChartStyle, "arrangement" | "columns">, panelCount: number, width: number): number {
    const groups = Math.max(1, panelCount);
    if (style.arrangement === "stack") return 1;
    if (style.arrangement === "row") return groups;
    if (style.columns > 0) return Math.min(groups, Math.round(style.columns));
    return clamp(Math.floor(width / 360), 1, groups);
}

export function periodLabelTop(kindRow: boolean, fontSize: number, comparisonRow = false, pairFontSize = fontSize, pairRowHeight = pairFontSize + 6): number {
    if (!kindRow && !comparisonRow) return 6;
    return (kindRow ? fontSize + 6 : 0) + (comparisonRow ? pairRowHeight : 0) + 9;
}

export interface AxisRows {
    show?: boolean;
    labelHeight?: number;
    parents?: boolean;
    title?: boolean;
    pairFontSize?: number;
    pairRowHeight?: number;
}

export function axisHeight(levelCount: number, fontSize: number, kindRow = true, comparisonRow = false, rows: AxisRows = {}): number {
    const rowHeight = fontSize + 6;
    const show = rows.show !== false;
    const lowest = show ? rows.labelHeight == null ? rowHeight : rows.labelHeight : 0;
    const parents = show && rows.parents !== false ? (Math.max(1, levelCount) - 1) * rowHeight : 0;
    const title = rows.title ? rowHeight : 0;
    return periodLabelTop(kindRow, fontSize, comparisonRow, rows.pairFontSize, rows.pairRowHeight) + lowest + parents + title + 3;
}

export function xAxisOf(style: ChartStyle): XAxisStyle {
    const fontSize = (style.xAxis && style.xAxis.fontSize) || style.fontSize || 10;
    return {
        pairFontFamily: (style.xAxis && style.xAxis.fontFamily) || style.fontFamily || FONT,
        pairFontSize: fontSize,
        pairBold: false,
        pairItalic: false,
        pairUnderline: false,
        pairOrientation: "horizontal",
        pairColorMode: "pair",
        pairColor: AXIS_COLOR,
        show: true,
        fontFamily: style.fontFamily || FONT,
        fontSize: style.fontSize || 10,
        color: AXIS_COLOR,
        bold: false,
        italic: false,
        underline: false,
        orientation: "auto",
        labelLength: "auto",
        maxLabelWidth: 120,
        showParents: true,
        showSeparators: true,
        showComponents: true,
        showPairs: style.showComparisonLabels !== false,
        showLine: true,
        lineColor: "#BBBBBB",
        showTitle: false,
        title: "",
        ...(style.xAxis || {})
    };
}

export function rotatedLabelHeight(labelWidth: number, fontSize: number, angle: number): number {
    if (!angle) return fontSize + 6;
    const radians = angle * Math.PI / 180;
    return Math.ceil(labelWidth * Math.sin(radians) + fontSize * Math.cos(radians)) + 8;
}

export function computeLayout(periodCount: number, panelCount: number, style: ChartStyle, width: number, height: number, axisWidth: number, levelCount = 1, kindRow = true, sideMargins: SideMargins = { left: 0, right: 0 }, comparisonRow = false, labelAngle = 0, labelHeight?: number, legendWidth = 0, pairAngle = 0, pairHeight?: number): Layout {
    const xAxis = xAxisOf(style);
    const fontSize = xAxis.fontSize || 10;
    const periodLabelHeight = labelHeight == null ? fontSize + 6 : labelHeight;
    const pairRowHeight = pairHeight == null ? xAxis.pairFontSize + 6 : pairHeight;
    const axis = axisHeight(levelCount, fontSize, kindRow, comparisonRow, {
        show: xAxis.show,
        labelHeight: periodLabelHeight,
        parents: xAxis.showParents,
        title: xAxis.showTitle,
        pairFontSize: xAxis.pairFontSize,
        pairRowHeight
    });
    const groups = Math.max(1, panelCount);
    const columns = columnCount(style, groups, width);
    const rows = Math.ceil(groups / columns);
    const legendLine = Math.max(LEGEND, legendFontSize(style) + 16);
    const legendTop = style.legendPosition === "top" ? legendLine + 8 : 10;
    const legendBottom = style.legendPosition === "bottom" ? legendLine : 0;
    const legendLeft = style.legendPosition === "left" ? legendWidth : 0;
    const legendRight = style.legendPosition === "right" ? legendWidth : 0;
    const minPlot = Math.max(40, style.minPlotHeight);
    const maxPlot = Math.max(minPlot, style.maxPlotHeight);
    const viewportHeight = Math.max(200, height);
    const fitted = (viewportHeight - legendTop - BOTTOM - legendBottom - (rows - 1) * GAP) / rows - HEADER - axis;
    const plotHeight = Math.floor(clamp(fitted, minPlot, maxPlot));
    const panelHeight = HEADER + plotHeight + axis;
    const panelsHeight = rows * panelHeight + (rows - 1) * GAP;
    const contentHeight = legendTop + panelsHeight + BOTTOM + legendBottom;
    const scrollsDown = contentHeight > viewportHeight || viewportHeight > height;
    const viewportWidth = Math.max(280, width - (scrollsDown ? SCROLLBAR : 0) - legendRight);
    const axisLeft = style.showYAxis ? Math.ceil(axisWidth) + 10 : INNER_LEFT;
    const repeatedAxisLeft = style.showYAxis && !style.sharedAxis ? axisLeft : INNER_LEFT;
    const firstLeft = legendLeft + axisLeft + sideMargins.left;
    const otherLeft = repeatedAxisLeft + sideMargins.left;
    const panelRight = RIGHT + sideMargins.right;
    const available = (viewportWidth - firstLeft - (columns - 1) * otherLeft - columns * panelRight) / columns;
    const plotWidth = Math.floor(Math.max(available, Math.max(1, periodCount) * Math.max(0, style.minPeriodWidth), 40));
    const positions = [];
    for (let index = 0; index < groups; index += 1) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        positions.push({ x: firstLeft + column * (plotWidth + panelRight + otherLeft), y: legendTop + row * (panelHeight + GAP) });
    }
    const panelsRight = firstLeft + columns * (plotWidth + panelRight) + (columns - 1) * otherLeft;
    const totalWidth = panelsRight + legendRight;
    const scrollsAcross = totalWidth > width;
    const sideLegend = legendLeft > 0 || legendRight > 0;
    return {
        width: totalWidth,
        height: Math.floor(Math.max(contentHeight, viewportHeight - (scrollsAcross ? SCROLLBAR : 0))),
        columns,
        plotWidth,
        plotHeight,
        panelHeight,
        kindRow,
        comparisonRow,
        periodTop: periodLabelTop(kindRow, fontSize, comparisonRow, xAxis.pairFontSize, pairRowHeight),
        labelAngle,
        pairAngle,
        pairRowHeight,
        periodLabelHeight,
        legendY: style.legendPosition === "bottom" ? legendTop + panelsHeight + 14 : sideLegend ? legendTop + HEADER : 10,
        legendX: legendLeft ? 8 : legendRight ? panelsRight + 8 : firstLeft,
        legendVertical: sideLegend,
        positions
    };
}

export function slotsFor(kinds: SeriesKind[], groupWidth = 0.6, kindGap = 0): Map<SeriesKind, Slot> {
    const slots = new Map<SeriesKind, Slot>();
    if (kinds.length <= 1) {
        slots.set(kinds[0] || "total", { position: 0.5, width: groupWidth });
        return slots;
    }
    const gap = groupWidth * clamp(kindGap, 0, 0.9) / (kinds.length - 1);
    const width = (groupWidth - gap * (kinds.length - 1)) / kinds.length;
    const start = 0.5 - groupWidth / 2 + width / 2;
    kinds.forEach((kind, index) => {
        slots.set(kind, { position: start + index * (width + gap), width });
    });
    return slots;
}

export function seriesSlotsFor(series: BudgetSeries[], kinds: SeriesKind[], groupWidth = 0.6, kindGap = 0): Map<string, Slot> {
    const outer = slotsFor(kinds, groupWidth, kindGap);
    const result = new Map<string, Slot>();
    kinds.forEach(kind => {
        const componentSlot = outer.get(kind);
        if (!componentSlot) return;
        const matches = series.filter(item => item.kind === kind);
        if (!matches.length) {
            result.set(kind, { ...componentSlot, labelPosition: componentSlot.position, labelWidth: componentSlot.width, showKindLabel: true });
            return;
        }
        const gap = matches.length > 1 ? componentSlot.width * 0.06 : 0;
        const width = (componentSlot.width - gap * (matches.length - 1)) / matches.length;
        const start = componentSlot.position - componentSlot.width / 2 + width / 2;
        matches.forEach((item, index) => result.set(item.key, {
            position: start + index * (width + gap),
            width,
            labelPosition: componentSlot.position,
            labelWidth: componentSlot.width,
            showKindLabel: index === 0
        }));
    });
    return result;
}

export function renderChart(target: HTMLElement, input: RenderInput): void {
    target.textContent = "";
    const { model, style } = input;
    if (!model.panels.length || !model.periods.length) {
        target.appendChild(emptyState(model));
        return;
    }
    if (style.orientation === "horizontal") {
        renderHorizontal(target, input);
        return;
    }
    const levels = Math.max(1, model.levelCount);
    const series = seriesOf(model);
    const xAxis = xAxisOf(style);
    const comparisonRow = xAxis.showPairs
        && model.kinds.some(kind => series.filter(item => item.kind === kind).length > 1);
    const slots = seriesSlotsFor(series, model.kinds, style.groupWidth, style.kindGap);
    const sideMargins = measureSideMargins(model, style, slots);
    const multipleKinds = model.kinds.length > 1 && xAxis.showComponents;
    const lowestLabels = periodLevelLabels(model);
    const measureX = (value: string) => measure(value, xAxis.fontSize, xAxis.bold ? "bold" : "normal", xAxis.fontFamily, xAxis.italic);
    const rotatedWidth = Math.min(xAxis.maxLabelWidth, Math.max(0, ...lowestLabels.map(measureX)));
    const legendWidth = measureLegendWidth(model, style);
    const pairNames = Array.from(new Set(series.map(item => item.name)));
    const measurePair = (value: string) => measure(value, xAxis.pairFontSize, xAxis.pairBold ? "bold" : "normal", xAxis.pairFontFamily, xAxis.pairItalic);
    const pairWidth = Math.min(xAxis.maxLabelWidth, Math.max(0, ...pairNames.map(measurePair)));
    let pairAngle = comparisonRow ? fixedAngle(xAxis.pairOrientation) : 0;
    const build = (angle: number) => {
        const labelHeight = rotatedLabelHeight(rotatedWidth, xAxis.fontSize, angle);
        const pairHeight = pairAngle ? rotatedLabelHeight(pairWidth, xAxis.pairFontSize, pairAngle) : undefined;
        const sized = (axisWidth: number, kinds: boolean) => computeLayout(model.periods.length, model.panels.length, style, input.width, input.height,
            axisWidth, levels, kinds, sideMargins, comparisonRow, angle, labelHeight, legendWidth, pairAngle, pairHeight);
        const provisional = sized(40, multipleKinds);
        const scales = buildScales(model, provisional.plotHeight, style.sharedAxis);
        const axisWidth = style.showYAxis ? measureAxis(model, scales, style) : 0;
        const withKinds = sized(axisWidth, multipleKinds);
        const firstSlot = slots.get(series[0] && series[0].key) || { position: 0.5, width: style.groupWidth, labelWidth: style.groupWidth };
        const slotWidth = bandScale(model.periods.length, withKinds.plotWidth, 0.1, 0.04).bandwidth * (firstSlot.labelWidth || firstSlot.width);
        const kindRow = multipleKinds && (comparisonRow || kindNamesFit(style, slotWidth));
        return { provisional, scales, layout: kindRow || !multipleKinds ? withKinds : sized(axisWidth, false) };
    };
    let periodAngle = fixedAngle(xAxis.orientation);
    let built = build(periodAngle);
    const currentBand = () => bandScale(model.periods.length, built.layout.plotWidth, 0.1, 0.04);
    let rebuild = false;
    if (xAxis.show && xAxis.orientation === "auto" && labelsCrowded(lowestLabels, currentBand().step - 4, measureX, xAxis.labelLength)) {
        periodAngle = 45;
        rebuild = true;
    }
    if (comparisonRow && xAxis.pairOrientation === "auto") {
        const pairSlot = series.map(item => slots.get(item.key)).find(slot => slot && slot.labelWidth != null && slot.width < slot.labelWidth - 1e-9);
        const room = pairSlot ? currentBand().bandwidth * pairSlot.width + 4 : Infinity;
        if (pairNames.some(name => measurePair(name) > room)) {
            const centers = series.map(item => slots.get(item.key)).filter((slot): slot is Slot => !!slot).map(slot => slot.position).sort((a, b) => a - b);
            const closest = centers.slice(1).reduce((min, value, index) => Math.min(min, value - centers[index]), Infinity);
            const spacing = (isFinite(closest) ? closest : 1) * currentBand().bandwidth;
            pairAngle = spacing * Math.SQRT1_2 >= xAxis.pairFontSize + 4 ? 45 : 90;
            rebuild = true;
        }
    }
    if (rebuild) built = build(periodAngle);
    const { provisional, scales, layout } = built;

    const root = createRoot(target, input, layout.width, layout.height);
    if (style.legendPosition !== "none") drawLegend(root, model, style, layout, legendWidth);
    const band = bandScale(model.periods.length, layout.plotWidth, 0.1, 0.04);
    const finalScales = layout.plotHeight === provisional.plotHeight ? scales : buildScales(model, layout.plotHeight, style.sharedAxis);
    model.panels.forEach((panel, index) => drawPanel(root, panel, index, layout, band, finalScales[index], slots, input));
}

function createRoot(target: HTMLElement, input: RenderInput, width: number, height: number): SVGSVGElement {
    const { style } = input;
    const scroll = el("div", "bva-scroll");
    const root = svg("svg", {
        width,
        height,
        "font-family": style.fontFamily,
        "font-weight": style.fontBold ? "bold" : "normal",
        "font-style": style.fontItalic ? "italic" : "normal",
        "text-decoration": style.fontUnderline ? "underline" : "none"
    });
    scroll.appendChild(root);
    target.appendChild(scroll);
    scroll.addEventListener("scroll", () => input.handlers.hideTooltip());
    root.addEventListener("click", () => input.handlers.clear());
    root.addEventListener("contextmenu", event => {
        event.preventDefault();
        input.handlers.contextMenu(null, event.clientX, event.clientY);
    });
    return root;
}

function periodLevelLabels(model: BudgetModel): string[] {
    const levels = model.periodLevels.length ? model.periodLevels : model.periods.map(label => [label]);
    const lowest = Math.max(1, model.levelCount) - 1;
    return levels.map((parts, index) => parts[lowest] || model.periods[index] || "");
}

export function fixedAngle(orientation: XAxisOrientation): number {
    if (orientation === "diagonal") return 45;
    if (orientation === "vertical") return 90;
    return 0;
}

export function labelsCrowded(values: string[], room: number, width: (value: string) => number, length: XAxisLabelLength): boolean {
    if (length === "full") return values.some(value => width(value) > room);
    return periodLabels(values, room, width).some((label, index) => !label && !!values[index]);
}

function measureSideMargins(model: BudgetModel, style: ChartStyle, slots: Map<string, Slot>): SideMargins {
    let left = 0;
    let right = 0;
    const marginFor = (content: string, options: ValueLabelStyle): number => {
        const pointer = options.pointer ? POINTER_SIZE + 7 : 4;
        return measure(content, options.fontSize, weightOf(options), options.fontFamily, options.italic) + boxExtent(options.box) * 2 + pointer + 4;
    };
    model.panels.forEach(panel => panel.cells.forEach(cell => {
        const outer = outerSide(slots.get(cell.seriesKey || cell.kind));
        const budgetSide = labelSide(style.budgetLabel.position, outer);
        if (budgetSide && cell.budget != null && showBudgetLabel(style.budgetLabel.mode, cell)) {
            const margin = marginFor(style.formatters.label(cell.budget, cell.budgetFormat), style.budgetLabel);
            if (budgetSide < 0) left = Math.max(left, margin);
            else right = Math.max(right, margin);
        }
        const actualSide = labelSide(style.actualLabel.position, outer);
        if (actualSide && cell.actual != null && showActualLabel(style.actualLabel.mode, cell, model.periods.length)) {
            const margin = marginFor(actualLabel(cell, style.actualLabel, Infinity, style.formatters), style.actualLabel);
            if (actualSide < 0) left = Math.max(left, margin);
            else right = Math.max(right, margin);
        }
    }));
    return { left: Math.ceil(left), right: Math.ceil(right) };
}

function buildScales(model: BudgetModel, plotHeight: number, shared: boolean): LinearScale[] {
    const valuesOf = (panel: BudgetPanel) => {
        const values: number[] = [];
        panel.cells.forEach(cell => {
            if (cell.budget != null) values.push(cell.budget);
            if (cell.actual != null) values.push(cell.actual);
            if (cell.target != null) values.push(cell.target);
        });
        return values;
    };
    if (shared) {
        const all = [].concat(...model.panels.map(valuesOf));
        const scale = panelScale(all, plotHeight);
        return model.panels.map(() => scale);
    }
    return model.panels.map(panel => panelScale(valuesOf(panel), plotHeight));
}

function panelFormat(panel: BudgetPanel): string | null {
    for (const cell of panel.cells) {
        if (cell.budgetFormat) return cell.budgetFormat;
        if (cell.actualFormat) return cell.actualFormat;
    }
    return null;
}

function measureAxis(model: BudgetModel, scales: LinearScale[], style: ChartStyle): number {
    let widest = 0;
    model.panels.forEach((panel, index) => {
        const scale = scales[index];
        const format = panelFormat(panel);
        scale.ticks.forEach(tick => {
            widest = Math.max(widest, measure(style.formatters.axis(tick, scale.ticks, format), style.fontSize, style.fontBold ? "bold" : "normal", style.fontFamily, style.fontItalic));
        });
    });
    return Math.max(16, widest);
}

interface LegendItem {
    label: string;
    color: string;
    budget: boolean;
    target?: TargetStyle;
}

export function targetStyleOf(style: ChartStyle): TargetStyle {
    return {
        shape: "bar",
        barLength: 2,
        barThickness: 3,
        barColor: "#C4314B",
        dotSize: 10,
        dotFill: "#FFFFFF",
        dotBorderColor: "#C4314B",
        dotBorderWidth: 2,
        ...(style.target || {})
    };
}

function targetLegendSwatch(item: LegendItem, x: number, cy: number, size: number, horizontalChart: boolean): SVGElement {
    const target = item.target;
    if (target.shape === "dot") {
        const radius = Math.min(size, Math.max(3, target.dotSize)) / 2;
        return svg("circle", { cx: x + size / 2, cy, r: radius, fill: target.dotFill, stroke: target.dotBorderColor, "stroke-width": Math.min(target.dotBorderWidth, radius) });
    }
    const thickness = Math.min(size, Math.max(1, target.barThickness));
    return svg("rect", horizontalChart
        ? { x: x + size / 2 - thickness / 2, y: cy - size / 2, width: thickness, height: size, fill: target.barColor }
        : { x, y: cy - thickness / 2, width: size, height: thickness, fill: target.barColor });
}

function legendFontSize(style: ChartStyle): number {
    return (style.legend && style.legend.fontSize) || (style.fontSize || 10) + 1;
}

function legendFont(style: ChartStyle) {
    const legend = style.legend || {};
    const bold = legend.bold == null ? style.fontBold : legend.bold;
    return {
        size: legendFontSize(style),
        family: legend.fontFamily || style.fontFamily,
        italic: legend.italic == null ? style.fontItalic : legend.italic,
        underline: legend.underline,
        weight: bold ? "bold" : "normal",
        fill: legend.color || "#333333"
    };
}

function legendSwatch(size: number): number {
    return Math.max(9, Math.round(size * 0.8));
}

function measureLegendWidth(model: BudgetModel, style: ChartStyle): number {
    if (style.legendPosition !== "left" && style.legendPosition !== "right") return 0;
    const font = legendFont(style);
    const widest = Math.max(0, ...legendItems(model, style).map(item => measure(item.label, font.size, font.weight, font.family, font.italic)));
    return Math.ceil(Math.min(widest, 220) + legendSwatch(font.size) + 5 + 24);
}

function legendItems(model: BudgetModel, style: ChartStyle): LegendItem[] {
    const legend = style.legend || {};
    const own = (custom: string | undefined, fallback: string) => custom && custom.trim() ? custom : fallback;
    const hidden = legend.hidden || {};
    const comparisonCount = comparisonPairCount(model);
    const items: LegendItem[] = model.legendValues && model.legendValues.length
        ? model.legendValues.map((value, index) => ({ label: value.name, color: legendValueColor(style, value.name, index), budget: true }))
        : comparisonCount > 1 && style.colorBy !== "group"
        ? Array.from({ length: comparisonCount }, (_, index) => ({
            label: own((legend.pairs || [])[index], (model.series || []).find(series => series.order === index)?.name || `Pair ${index + 1}`),
            color: style.comparisonColors[index] || style.comparisonColors[0] || style.netColor,
            budget: true
        })).filter((_, index) => !(hidden.pairs || [])[index])
        : model.kinds.filter(kind => !hidden[kind === "revenue" || kind === "cost" ? kind : "budget"]).map(kind => ({
            label: kind === "revenue" ? own(legend.revenue, style.revenueText) : kind === "cost" ? own(legend.cost, style.costText) : own(legend.budget, style.budgetText),
            color: style.colorBy === "group" ? (kind === "cost" ? mix(NEUTRAL, "#FFFFFF", 0.45) : NEUTRAL) : kindColor(kind, style),
            budget: true
        }));
    if (!hidden.actual) items.push({ label: own(legend.actual, style.actualText), color: style.actualColor, budget: false });
    if (model.hasTarget && !hidden.target) {
        const target = targetStyleOf(style);
        items.push({ label: own(legend.target, style.targetText || model.names.target || "Target"), color: target.barColor, budget: false, target });
    }
    if (style.highlightOverrun && !hidden.overrun) items.push({ label: style.overrunText, color: style.overrunColor, budget: false });
    return items;
}

function drawLegend(root: SVGSVGElement, model: BudgetModel, style: ChartStyle, layout: Layout, legendWidth: number): void {
    const font = legendFont(style);
    const swatchSize = legendSwatch(font.size);
    const lineHeight = font.size + 9;
    let x = layout.legendX;
    let y = layout.legendY;
    legendItems(model, style).forEach(item => {
        if (item.target) {
            root.appendChild(targetLegendSwatch(item, x, y + 4.5, swatchSize, style.orientation === "horizontal"));
        } else {
            const swatch = svg("rect", { x, y: y + 4.5 - swatchSize / 2, width: swatchSize, height: swatchSize, rx: Math.min(2, style.budgetRadius), fill: item.color });
            if (item.budget) applyBudgetStyle(swatch, item.color, style.budgetStyle);
            root.appendChild(swatch);
        }
        const label = layout.legendVertical
            ? fit(item.label, legendWidth - swatchSize - 5 - 20, font.size, font.weight, font.family, font.italic)
            : item.label;
        root.appendChild(text(label, x + swatchSize + 5, y + 4.5, { ...font, baseline: "middle" }));
        if (layout.legendVertical) y += lineHeight;
        else x += swatchSize + 5 + measure(item.label, font.size, font.weight, font.family, font.italic) + 28;
    });
}

function seriesOf(model: BudgetModel): BudgetSeries[] {
    return model.series && model.series.length
        ? model.series
        : model.kinds.map((kind, order) => ({ key: kind, kind, name: kind, order }));
}

interface HorizontalColumns {
    title: number;
    parents: number[];
    period: number;
    kind: number;
    pair: number;
    area: number;
}

export interface HorizontalLayout {
    width: number;
    height: number;
    columns: number;
    plotWidth: number;
    plotHeight: number;
    panelHeight: number;
    labelArea: number;
    rightMargin: number;
    axisHeight: number;
    legendX: number;
    legendY: number;
    legendVertical: boolean;
    positions: { x: number; y: number }[];
}

const LABEL_GAP = 8;

function horizontalColumns(model: BudgetModel, style: ChartStyle, pairRow: boolean, kindRow: boolean): HorizontalColumns {
    const axis = xAxisOf(style);
    const weight = axis.bold ? "bold" : "normal";
    const width = (value: string, bold = weight) => measure(value, axis.fontSize, bold, axis.fontFamily, axis.italic);
    const levels = model.periodLevels.length ? model.periodLevels : model.periods.map(label => [label]);
    const depth = Math.max(1, model.levelCount);
    const cap = axis.maxLabelWidth;
    const widest = (values: number[]) => Math.ceil(Math.min(cap, Math.max(0, ...values)));
    const pair = pairRow
        ? widest(seriesOf(model).map(item => measure(item.name, axis.pairFontSize, axis.pairBold ? "bold" : "normal", axis.pairFontFamily, axis.pairItalic)))
        : 0;
    const kind = kindRow ? widest([width(style.revenueName), width(style.costName)]) : 0;
    const period = axis.show ? widest(periodLevelLabels(model).map(value => width(value))) : 0;
    const parents = axis.show && axis.showParents
        ? Array.from({ length: depth - 1 }, (_, level) => widest(periodSpans(levels, level).map(span => width(span.label, axis.bold ? "bold" : "600"))))
        : [];
    const title = axis.showTitle ? axis.fontSize + 8 : 0;
    const used = [pair, kind, period, ...parents].filter(value => value > 0);
    return { title, parents, period, kind, pair, area: 6 + used.reduce((sum, value) => sum + value + LABEL_GAP, 0) + title };
}

function horizontalRightMargin(model: BudgetModel, style: ChartStyle): number {
    let margin = 0;
    const widthOf = (content: string, options: ValueLabelStyle) =>
        measure(content, options.fontSize, weightOf(options), options.fontFamily, options.italic) + boxExtent(options.box) * 2 + 6;
    const insideAt = (position: HorizontalLabelPosition | undefined) => position === "insideEnd" || position === "insideBase";
    model.panels.forEach(panel => panel.cells.forEach(cell => {
        const showBudget = cell.budget != null && showBudgetLabel(style.budgetLabel.mode, cell);
        const showActual = cell.actual != null && showActualLabel(style.actualLabel.mode, cell, model.periods.length);
        const budgetWidth = showBudget ? widthOf(style.formatters.label(cell.budget, cell.budgetFormat), style.budgetLabel) : 0;
        const actualWidth = showActual ? widthOf(actualLabel(cell, style.actualLabel, Infinity, style.formatters), style.actualLabel) : 0;
        let needed: number;
        if (showBudget && showActual && style.budgetLabel.combine !== false) {
            const separator = style.budgetLabel.separator == null ? " / " : style.budgetLabel.separator;
            needed = budgetWidth + actualWidth + measure(separator, style.budgetLabel.fontSize, weightOf(style.budgetLabel), style.budgetLabel.fontFamily, style.budgetLabel.italic);
        } else {
            needed = (insideAt(style.budgetLabel.hPosition) ? 0 : budgetWidth)
                + (insideAt(style.actualLabel.hPosition) ? 0 : actualWidth);
        }
        margin = Math.max(margin, needed);
    }));
    return Math.ceil(Math.min(260, margin) + RIGHT);
}

export function computeHorizontalLayout(periodCount: number, panelCount: number, slotCount: number, style: ChartStyle, width: number, height: number, labelArea: number, rightMargin: number, legendWidth = 0): HorizontalLayout {
    const axis = xAxisOf(style);
    const groups = Math.max(1, panelCount);
    const columns = columnCount(style, groups, width);
    const rows = Math.ceil(groups / columns);
    const legendLine = Math.max(LEGEND, legendFontSize(style) + 16);
    const legendTop = style.legendPosition === "top" ? legendLine + 8 : 10;
    const legendBottom = style.legendPosition === "bottom" ? legendLine : 0;
    const legendLeft = style.legendPosition === "left" ? legendWidth : 0;
    const legendRight = style.legendPosition === "right" ? legendWidth : 0;
    const axisHeight = style.showYAxis ? style.fontSize + 10 : 6;
    const rowMin = Math.max(style.minPeriodWidth, Math.max(1, slotCount) * 7 + 6, axis.fontSize + 6);
    const minPlot = Math.max(40, style.minPlotHeight, Math.max(1, periodCount) * rowMin);
    const maxPlot = Math.max(minPlot, style.maxPlotHeight, Math.max(1, periodCount) * (Math.max(1, slotCount) * 18 + 8));
    const viewportHeight = Math.max(200, height);
    const fitted = (viewportHeight - legendTop - BOTTOM - legendBottom - (rows - 1) * GAP) / rows - HEADER - axisHeight;
    const plotHeight = Math.floor(clamp(fitted, minPlot, maxPlot));
    const panelHeight = HEADER + plotHeight + axisHeight;
    const panelsHeight = rows * panelHeight + (rows - 1) * GAP;
    const contentHeight = legendTop + panelsHeight + BOTTOM + legendBottom;
    const scrollsDown = contentHeight > viewportHeight || viewportHeight > height;
    const viewportWidth = Math.max(280, width - (scrollsDown ? SCROLLBAR : 0));
    const panelGap = GAP * 2;
    const available = (viewportWidth - legendLeft - legendRight - INNER_LEFT - columns * (labelArea + rightMargin) - (columns - 1) * panelGap) / columns;
    const plotWidth = Math.floor(Math.max(available, 60));
    const positions = [];
    for (let index = 0; index < groups; index += 1) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        positions.push({
            x: legendLeft + INNER_LEFT + labelArea + column * (labelArea + plotWidth + rightMargin + panelGap),
            y: legendTop + row * (panelHeight + GAP)
        });
    }
    const panelsRight = legendLeft + INNER_LEFT + columns * (labelArea + plotWidth + rightMargin) + (columns - 1) * panelGap;
    const totalWidth = panelsRight + legendRight;
    const scrollsAcross = totalWidth > width;
    const sideLegend = legendLeft > 0 || legendRight > 0;
    return {
        width: totalWidth,
        height: Math.floor(Math.max(contentHeight, viewportHeight - (scrollsAcross ? SCROLLBAR : 0))),
        columns,
        plotWidth,
        plotHeight,
        panelHeight,
        labelArea,
        rightMargin,
        axisHeight,
        legendX: legendLeft ? 8 : legendRight ? panelsRight + 8 : INNER_LEFT,
        legendY: style.legendPosition === "bottom" ? legendTop + panelsHeight + 14 : sideLegend ? legendTop + HEADER : 10,
        legendVertical: sideLegend,
        positions
    };
}

function horizontalScales(model: BudgetModel, plotWidth: number, shared: boolean): LinearScale[] {
    const tickCount = Math.max(2, Math.min(8, Math.floor(plotWidth / 90)));
    const flip = (scale: LinearScale): LinearScale => ({ domain: scale.domain, ticks: scale.ticks, map: value => plotWidth - scale.map(value) });
    const valuesOf = (panel: BudgetPanel) => {
        const values: number[] = [];
        panel.cells.forEach(cell => {
            if (cell.budget != null) values.push(cell.budget);
            if (cell.actual != null) values.push(cell.actual);
            if (cell.target != null) values.push(cell.target);
        });
        return values;
    };
    if (shared) {
        const scale = flip(panelScale([].concat(...model.panels.map(valuesOf)), plotWidth, 4, tickCount));
        return model.panels.map(() => scale);
    }
    return model.panels.map(panel => flip(panelScale(valuesOf(panel), plotWidth, 4, tickCount)));
}

function renderHorizontal(target: HTMLElement, input: RenderInput): void {
    const { model, style } = input;
    const axis = xAxisOf(style);
    const series = seriesOf(model);
    const slots = seriesSlotsFor(series, model.kinds, style.groupWidth, style.kindGap);
    const pairRow = axis.showPairs && model.kinds.some(kind => series.filter(item => item.kind === kind).length > 1);
    const kindRow = model.kinds.length > 1 && axis.showComponents;
    const columns = horizontalColumns(model, style, pairRow, kindRow);
    const rightMargin = horizontalRightMargin(model, style);
    const legendWidth = measureLegendWidth(model, style);
    const layout = computeHorizontalLayout(model.periods.length, model.panels.length, slots.size, style, input.width, input.height, columns.area, rightMargin, legendWidth);
    const root = createRoot(target, input, layout.width, layout.height);
    if (style.legendPosition !== "none") drawLegend(root, model, style, layout as unknown as Layout, legendWidth);
    const band = bandScale(model.periods.length, layout.plotHeight, 0.1, 0.04);
    const scales = horizontalScales(model, layout.plotWidth, style.sharedAxis);
    model.panels.forEach((panel, index) => drawHorizontalPanel(root, panel, index, layout, columns, band, scales[index], slots, pairRow, kindRow, input));
}

function drawHorizontalPanel(root: SVGSVGElement, panel: BudgetPanel, index: number, layout: HorizontalLayout, columns: HorizontalColumns, band: BandScale, x: LinearScale, slots: Map<string, Slot>, pairRow: boolean, kindRow: boolean, input: RenderInput): void {
    const { model, style } = input;
    const axis = xAxisOf(style);
    const position = layout.positions[index];
    const panelGroup = group(root, position.x, position.y);
    panelGroup.appendChild(text(fit(panel.label, layout.plotWidth + layout.labelArea, style.fontSize + 2, "bold", style.fontFamily, style.fontItalic), -layout.labelArea, 0, {
        size: style.fontSize + 2,
        weight: "bold",
        fill: "#222222",
        baseline: "top"
    }));
    const plot = group(panelGroup, 0, HEADER);
    const format = panelFormat(panel);
    const showAxisLabels = style.showYAxis;
    x.ticks.forEach(tick => {
        const tx = x.map(tick);
        if (style.showGrid) plot.appendChild(svg("line", { x1: tx, x2: tx, y1: 0, y2: layout.plotHeight, stroke: "#E8E8E8", "pointer-events": "none" }));
        if (showAxisLabels) {
            plot.appendChild(text(style.formatters.axis(tick, x.ticks, format), tx, layout.plotHeight + 5, {
                size: style.fontSize, fill: AXIS_COLOR, anchor: "middle", baseline: "top"
            }));
        }
    });
    const zero = x.map(0);
    if (axis.showLine) plot.appendChild(svg("line", { x1: zero, x2: zero, y1: 0, y2: layout.plotHeight, stroke: axis.lineColor, "pointer-events": "none" }));

    drawHorizontalCategories(plot, model, layout, columns, band, style);

    const bars = svg("g", {});
    const labels = svg("g", { "pointer-events": "none" });
    plot.appendChild(bars);
    plot.appendChild(labels);
    const placed = new LabelPlacer();
    panel.cells.forEach(cell => {
        const slot = slots.get(cell.seriesKey || cell.kind);
        if (slot) drawHorizontalCell(bars, labels, placed, panel, cell, layout, columns, band, x, slot, pairRow, kindRow, input);
    });
}

function drawHorizontalCategories(plot: SVGGElement, model: BudgetModel, layout: HorizontalLayout, columns: HorizontalColumns, band: BandScale, style: ChartStyle): void {
    const axis = xAxisOf(style);
    const weight = axis.bold ? "bold" : "normal";
    const font = { size: axis.fontSize, fill: axis.color, family: axis.fontFamily, italic: axis.italic, underline: axis.underline, weight };
    const levels = model.periodLevels.length ? model.periodLevels : model.periods.map(label => [label]);
    const depth = Math.max(1, model.levelCount);
    let edge = -6;
    if (columns.pair) edge -= columns.pair + LABEL_GAP;
    if (columns.kind) edge -= columns.kind + LABEL_GAP;
    if (axis.show) {
        const every = Math.max(1, Math.ceil((axis.fontSize + 2) / Math.max(1, band.step)));
        periodLevelLabels(model).forEach((value, periodIndex) => {
            if (!value || periodIndex % every) return;
            plot.appendChild(text(fit(value, columns.period, axis.fontSize, weight, axis.fontFamily, axis.italic), edge, band.x(periodIndex) + band.bandwidth / 2, {
                ...font, anchor: "end", baseline: "middle"
            }));
        });
        edge -= columns.period + LABEL_GAP;
        for (let level = depth - 2; level >= 0 && axis.showParents; level -= 1) {
            const width = columns.parents[level] || 0;
            periodSpans(levels, level).forEach((span, spanIndex) => {
                const top = band.x(span.first) - (band.step - band.bandwidth) / 2;
                const bottom = band.x(span.last) + band.bandwidth + (band.step - band.bandwidth) / 2;
                plot.appendChild(text(fit(span.label, width, axis.fontSize, axis.bold ? "bold" : "600", axis.fontFamily, axis.italic), edge, (top + bottom) / 2, {
                    ...font, weight: axis.bold ? "bold" : "600", anchor: "end", baseline: "middle"
                }));
                if (spanIndex > 0 && axis.showSeparators) {
                    plot.appendChild(svg("line", { x1: edge - width, x2: layout.plotWidth, y1: top, y2: top, stroke: "#E1DFDD", "pointer-events": "none" }));
                }
            });
            edge -= width + LABEL_GAP;
        }
    }
    if (axis.showTitle) {
        const title = axis.title || model.names.period;
        const cx = -layout.labelArea + axis.fontSize / 2 + 2;
        const cy = layout.plotHeight / 2;
        const node = text(fit(title, layout.plotHeight, axis.fontSize, "600", axis.fontFamily, axis.italic), cx, cy, {
            ...font, weight: axis.bold ? "bold" : "600", anchor: "middle", baseline: "middle"
        });
        node.setAttribute("transform", `rotate(-90 ${cx} ${cy})`);
        plot.appendChild(node);
    }
}

interface LabelPart {
    content: string;
    options: ValueLabelStyle;
}

function drawCombinedLabel(parent: SVGGElement, placed: LabelPlacer, parts: LabelPart[], edge: number, rowY: number, side: number): void {
    const pieces = parts.filter(part => part.content).map(part => {
        const weight = weightOf(part.options);
        const content = part.content.replace(/ /g, "\u00A0");
        return { ...part, content, weight, width: measure(content, part.options.fontSize, weight, part.options.fontFamily, part.options.italic) };
    });
    if (!pieces.length) return;
    const extra = Math.max(...pieces.map(piece => boxExtent(piece.options.box)));
    const total = pieces.reduce((sum, piece) => sum + piece.width, 0);
    const height = Math.max(...pieces.map(piece => piece.options.fontSize * 1.2)) + extra * 2;
    const left = side > 0 ? edge + 4 + extra : edge - 4 - extra - total;
    const top = placed.place({ x: left - extra, y: rowY - height / 2, width: total + extra * 2, height }, 0);
    const y = top + height / 2;
    let cursor = left;
    pieces.forEach(piece => {
        const options = piece.options;
        const node = text(piece.content, cursor, y, {
            size: options.fontSize, weight: piece.weight, family: options.fontFamily, italic: options.italic, underline: options.underline,
            fill: options.color, anchor: "start", baseline: "middle"
        });
        decorateLabel(parent, node, piece.content, cursor, y, "start", "middle", piece.weight, options);
        parent.appendChild(node);
        cursor += piece.width;
    });
}

export function horizontalBarPath(y: number, height: number, valueX: number, zeroX: number, radius: number): string {
    const left = Math.min(valueX, zeroX);
    const right = Math.max(valueX, zeroX);
    const width = right - left;
    const bottom = y + height;
    const r = Math.max(0, Math.min(radius, height / 2, width));
    if (r <= 0) return `M${left},${y}H${right}V${bottom}H${left}Z`;
    if (valueX >= zeroX) {
        return `M${left},${y}H${right - r}A${r},${r} 0 0 1 ${right},${y + r}V${bottom - r}A${r},${r} 0 0 1 ${right - r},${bottom}H${left}Z`;
    }
    return `M${right},${y}H${left + r}A${r},${r} 0 0 0 ${left},${y + r}V${bottom - r}A${r},${r} 0 0 0 ${left + r},${bottom}H${right}Z`;
}

function horizontalBar(cy: number, thickness: number, valueX: number, zeroX: number, radius: number, fill: string): SVGPathElement {
    return svg("path", { d: horizontalBarPath(cy - thickness / 2, Math.max(0, thickness), valueX, zeroX, radius), fill, "pointer-events": "none" });
}

function drawHorizontalCell(plot: SVGGElement, labelLayer: SVGGElement, placed: LabelPlacer, panel: BudgetPanel, cell: BudgetCell, layout: HorizontalLayout, columns: HorizontalColumns, band: BandScale, x: LinearScale, slot: Slot, pairRow: boolean, kindRow: boolean, input: RenderInput): void {
    const { model, style, selectedKeys } = input;
    const axis = xAxisOf(style);
    const cy = band.x(cell.periodIndex) + band.bandwidth * slot.position;
    const thickness = band.bandwidth * slot.width;
    const geometry = barGeometry(cy, thickness, style);
    const dimmed = (selectedKeys.size > 0 && !(cell.selectionKey && selectedKeys.has(cell.selectionKey)))
        || (model.hasHighlights && !cell.highlighted);
    const cellGroup = svg("g", { opacity: dimmed ? 0.35 : 1 });
    plot.appendChild(cellGroup);
    const labelGroup = svg("g", { opacity: dimmed ? 0.35 : 1 });
    labelLayer.appendChild(labelGroup);
    const zero = x.map(0);
    const color = budgetColor(cell, panel, style, model);

    const partial = model.hasHighlights && cell.highlighted;
    if (cell.budget != null) {
        drawHighlighted(cellGroup, partial, cell.budget, cell.budgetHighlight, value => {
            const shape = horizontalBar(geometry.budgetX, geometry.budgetWidth, x.map(value), zero, style.budgetRadius, color);
            applyBudgetStyle(shape, color, style.budgetStyle);
            return shape;
        });
    }
    const actualColor = isOverrun(cell, style) ? style.overrunColor : style.actualColor;
    const marker = style.actualStyle === "marker";
    if (cell.actual != null) {
        const height = Math.max(6, geometry.budgetWidth + 6);
        drawHighlighted(cellGroup, partial, cell.actual, cell.actualHighlight, value => marker
            ? svg("rect", { x: x.map(value) - 1.5, y: cy - height / 2, width: 3, height, rx: Math.min(1.5, style.actualRadius), fill: actualColor, "pointer-events": "none" })
            : horizontalBar(geometry.actualX, geometry.actualWidth, x.map(value), zero, style.actualRadius, actualColor));
    }
    if (cell.target != null) {
        const actualCenter = marker ? geometry.budgetX : geometry.actualX;
        const actualHalf = marker ? Math.max(6, geometry.budgetWidth + 6) / 2 : geometry.actualWidth / 2;
        cellGroup.appendChild(targetShape(targetStyleOf(style), actualCenter, actualHalf * 2, x.map(cell.target), true));
    }

    const draw = (content: string, options: ValueLabelStyle, labelX: number, labelY: number, anchor: "start" | "end", fill: string, decorate: boolean) => {
        const weight = weightOf(options);
        const node = text(content, labelX, labelY, {
            size: options.fontSize, weight, family: options.fontFamily, italic: options.italic, underline: options.underline,
            fill, anchor, baseline: "middle"
        });
        if (decorate) decorateLabel(labelGroup, node, content, labelX, labelY, anchor, "middle", weight, options);
        labelGroup.appendChild(node);
    };
    const boxFor = (content: string, options: ValueLabelStyle) => {
        const extra = boxExtent(options.box);
        return {
            width: measure(content, options.fontSize, weightOf(options), options.fontFamily, options.italic) + extra * 2,
            height: options.fontSize * 1.2 + extra * 2,
            extra
        };
    };
    const positive = (cell.budget != null ? cell.budget : cell.actual || 0) >= 0;
    const side = positive ? 1 : -1;
    const further = (left: number, right: number) => positive ? Math.max(left, right) : Math.min(left, right);
    const target = targetStyleOf(style);
    const targetReach = target.shape === "dot" ? target.dotSize / 2 + target.dotBorderWidth / 2 : target.barThickness / 2;
    const targetEdge = cell.target != null ? x.map(cell.target) + side * targetReach : null;
    const shown = labelValues(cell, partial);
    const ax = shown.actual != null ? x.map(shown.actual) : zero;
    const bx = shown.budget != null ? x.map(shown.budget) : zero;
    let outerEdge = [ax, bx, targetEdge].reduce((edge, value) => value == null ? edge : further(edge, value), zero);

    const outside = (content: string, options: ValueLabelStyle, from: number, rowY: number): number => {
        const box = boxFor(content, options);
        const labelX = from + side * (4 + box.extra);
        const top = placed.place({ x: positive ? labelX - box.extra : labelX - box.width + box.extra, y: rowY - box.height / 2, width: box.width, height: box.height }, 0);
        draw(content, options, labelX, top + box.height / 2, positive ? "start" : "end", options.color, true);
        return labelX + side * (box.width - box.extra);
    };
    const inside = (content: string, options: ValueLabelStyle, start: number, end: number, rowY: number, thick: number, fill: string, atEnd: boolean): number | null => {
        const box = boxFor(content, options);
        if ((end - start) * side < box.width + 8 || thick < options.fontSize * 0.9) return null;
        if (atEnd) {
            draw(content, options, end - side * 4, rowY, positive ? "end" : "start", fill, false);
            return end;
        }
        draw(content, options, start + side * 4, rowY, positive ? "start" : "end", fill, false);
        return start + side * (4 + box.width);
    };

    const showActual = cell.actual != null && showActualLabel(style.actualLabel.mode, cell, model.periods.length);
    const showBudget = cell.budget != null && showBudgetLabel(style.budgetLabel.mode, cell);
    const actualText = showActual ? actualLabel(shown, style.actualLabel, Infinity, style.formatters) : "";
    const budgetText = showBudget ? style.formatters.label(shown.budget, cell.budgetFormat) : "";

    if (showActual && showBudget && style.budgetLabel.combine !== false) {
        drawCombinedLabel(labelGroup, placed, [
            { content: budgetText, options: style.budgetLabel },
            { content: style.budgetLabel.separator == null ? " / " : style.budgetLabel.separator, options: style.budgetLabel },
            { content: actualText, options: style.actualLabel }
        ], outerEdge, cy, side);
    } else {
        let actualEdge = ax;
        if (showActual) {
            const options = style.actualLabel;
            const position = options.hPosition || "end";
            let placedEdge: number | null = null;
            if (!marker && (position === "insideEnd" || position === "insideBase")) {
                placedEdge = inside(actualText, options, zero, ax, geometry.actualX, geometry.actualWidth, contrastText(actualColor), position === "insideEnd");
            }
            if (placedEdge == null) {
                let from = position === "after" ? outerEdge : ax;
                const box = boxFor(actualText, options);
                if (position !== "after" && targetEdge != null) {
                    const ahead = (targetEdge - ax) * side;
                    if (ahead >= 0 && ahead < box.width + 8 + targetReach * 2) from = targetEdge;
                }
                placedEdge = outside(actualText, options, from, geometry.actualX);
                outerEdge = further(outerEdge, placedEdge);
            }
            actualEdge = further(actualEdge, placedEdge);
        }
        if (showBudget) {
            const options = style.budgetLabel;
            const position = options.hPosition || "after";
            const fill = style.budgetStyle === "solid" ? contrastText(color) : options.color;
            const start = !geometry.beside && cell.actual != null && (ax - zero) * side > 0 ? further(zero, actualEdge) : zero;
            let done = false;
            if (position === "insideEnd" || position === "insideBase") {
                done = inside(budgetText, options, start, bx, geometry.budgetX, geometry.budgetWidth, fill, position === "insideEnd") != null;
            }
            if (!done) outside(budgetText, options, outerEdge, geometry.budgetX);
        }
    }

    let edge = -6;
    if (pairRow && thickness >= axis.pairFontSize * 0.95) {
        const pairColor = pairNameColor(cell, panel, style, model);
        const pairWeight = axis.pairBold ? "bold" : "normal";
        cellGroup.appendChild(text(fit(comparisonLabel(cell, style), columns.pair, axis.pairFontSize, pairWeight, axis.pairFontFamily, axis.pairItalic), edge, cy, {
            size: axis.pairFontSize, family: axis.pairFontFamily, weight: pairWeight, italic: axis.pairItalic, underline: axis.pairUnderline,
            fill: pairColor, anchor: "end", baseline: "middle"
        }));
    }
    if (pairRow) edge -= columns.pair + LABEL_GAP;
    if (kindRow && slot.showKindLabel !== false) {
        const name = cell.kind === "revenue" ? style.revenueName : style.costName;
        const labelY = band.x(cell.periodIndex) + band.bandwidth * (slot.labelPosition == null ? slot.position : slot.labelPosition);
        cellGroup.appendChild(text(fit(name, columns.kind, axis.fontSize, axis.bold ? "bold" : "normal", axis.fontFamily, axis.italic), edge, labelY, {
            size: axis.fontSize, family: axis.fontFamily, weight: axis.bold ? "bold" : "normal", italic: axis.italic, underline: axis.underline,
            fill: axis.color, anchor: "end", baseline: "middle"
        }));
    }

    cellGroup.appendChild(hitArea(0, cy - thickness / 2, layout.plotWidth, thickness, panel, cell, input));
}

function labelValues(cell: BudgetCell, partial: boolean): BudgetCell {
    if (!partial) return cell;
    return {
        ...cell,
        budget: cell.budget == null ? cell.budget : cell.budgetHighlight ?? 0,
        actual: cell.actual == null ? cell.actual : cell.actualHighlight ?? 0
    };
}

function drawHighlighted(parent: SVGGElement, partial: boolean, value: number, highlight: number | null | undefined, make: (value: number) => SVGElement): void {
    if (!partial) {
        parent.appendChild(make(value));
        return;
    }
    const faded = make(value);
    faded.setAttribute("opacity", "0.35");
    parent.appendChild(faded);
    if (highlight != null && highlight !== 0) parent.appendChild(make(highlight));
}

export function isOverrun(cell: Pick<BudgetCell, "budget" | "actual">, style: Pick<ChartStyle, "highlightOverrun">): boolean {
    if (!style.highlightOverrun || cell.budget == null || cell.actual == null) return false;
    return Math.abs(cell.actual) > Math.abs(cell.budget) && Math.sign(cell.actual) * Math.sign(cell.budget) >= 0;
}

export function targetShape(target: TargetStyle, across: number, actualWidth: number, valuePos: number, horizontal: boolean): SVGElement {
    if (target.shape === "dot") {
        const radius = Math.max(1.5, target.dotSize / 2);
        return svg("circle", {
            cx: horizontal ? valuePos : across,
            cy: horizontal ? across : valuePos,
            r: radius,
            fill: target.dotFill,
            stroke: target.dotBorderColor,
            "stroke-width": Math.max(0, target.dotBorderWidth),
            "pointer-events": "none"
        });
    }
    const thickness = Math.max(1, target.barThickness);
    const length = Math.max(2, actualWidth * target.barLength);
    return svg("rect", horizontal
        ? { x: valuePos - thickness / 2, y: across - length / 2, width: thickness, height: length, fill: target.barColor, "pointer-events": "none" }
        : { x: across - length / 2, y: valuePos - thickness / 2, width: length, height: thickness, fill: target.barColor, "pointer-events": "none" });
}

function drawPanel(root: SVGSVGElement, panel: BudgetPanel, index: number, layout: Layout, band: BandScale, y: LinearScale, slots: Map<string, Slot>, input: RenderInput): void {
    const { model, style } = input;
    const position = layout.positions[index];
    const column = index % layout.columns;
    const panelGroup = group(root, position.x, position.y);
    panelGroup.appendChild(text(fit(panel.label, layout.plotWidth, style.fontSize + 2, "bold", style.fontFamily, style.fontItalic), 0, 0, {
        size: style.fontSize + 2,
        weight: "bold",
        fill: "#222222",
        baseline: "top"
    }));

    const plot = group(panelGroup, 0, HEADER);
    const format = panelFormat(panel);
    const showAxisLabels = style.showYAxis && (column === 0 || !style.sharedAxis);
    y.ticks.forEach(tick => {
        const ty = y.map(tick);
        if (style.showGrid) plot.appendChild(svg("line", { x1: 0, x2: layout.plotWidth, y1: ty, y2: ty, stroke: "#E8E8E8", "pointer-events": "none" }));
        if (showAxisLabels) {
            plot.appendChild(text(style.formatters.axis(tick, y.ticks, format), -5, ty, { size: style.fontSize, fill: AXIS_COLOR, anchor: "end", baseline: "middle" }));
        }
    });
    const zero = y.map(0);
    const xAxis = xAxisOf(style);
    if (xAxis.showLine) plot.appendChild(svg("line", { x1: 0, x2: layout.plotWidth, y1: zero, y2: zero, stroke: xAxis.lineColor, "pointer-events": "none" }));

    drawPeriodAxis(plot, model, layout, band, style);

    const bars = svg("g", {});
    const labels = svg("g", { "pointer-events": "none" });
    plot.appendChild(bars);
    plot.appendChild(labels);
    const placed = new LabelPlacer();
    panel.cells.forEach(cell => drawCell(bars, labels, placed, panel, cell, layout, band, y, slots.get(cell.seriesKey || cell.kind), input));
}

export interface PeriodSpan {
    label: string;
    first: number;
    last: number;
}

export function periodSpans(periodLevels: string[][], level: number): PeriodSpan[] {
    const spans: PeriodSpan[] = [];
    let previousKey: string | null = null;
    periodLevels.forEach((levels, index) => {
        const key = levels.slice(0, level + 1).join("\u0001");
        if (key === previousKey) spans[spans.length - 1].last = index;
        else spans.push({ label: levels[level] || "", first: index, last: index });
        previousKey = key;
    });
    return spans;
}

function drawPeriodAxis(plot: SVGGElement, model: BudgetModel, layout: Layout, band: BandScale, style: ChartStyle): void {
    const axis = xAxisOf(style);
    const levels = model.periodLevels.length ? model.periodLevels : model.periods.map(label => [label]);
    const depth = Math.max(1, model.levelCount);
    const rowHeight = axis.fontSize + 6;
    const lowest = depth - 1;
    const weight = axis.bold ? "bold" : "normal";
    const font = { size: axis.fontSize, fill: axis.color, family: axis.fontFamily, italic: axis.italic, underline: axis.underline, weight };
    const width = (value: string) => measure(value, axis.fontSize, weight, axis.fontFamily, axis.italic);
    const top = layout.plotHeight + layout.periodTop;
    let bottom = top;

    if (axis.show) {
        const values = periodLevelLabels(model);
        const angle = layout.labelAngle;
        if (angle) {
            const every = Math.max(1, Math.ceil((axis.fontSize + 2) / Math.max(1, band.step)));
            values.forEach((value, periodIndex) => {
                if (!value || periodIndex % every) return;
                const cx = band.x(periodIndex) + band.bandwidth / 2;
                const node = text(fit(value, axis.maxLabelWidth, axis.fontSize, weight, axis.fontFamily, axis.italic), cx, top + 2, {
                    ...font,
                    anchor: "end",
                    baseline: "middle"
                });
                node.setAttribute("transform", `rotate(${-angle} ${cx} ${top + 2})`);
                plot.appendChild(node);
            });
        } else {
            const room = band.step - 4;
            const labels = axis.labelLength === "full"
                ? values.map(value => fit(value, room, axis.fontSize, weight, axis.fontFamily, axis.italic))
                : periodLabels(values, room, width);
            labels.forEach((label, periodIndex) => {
                if (!label) return;
                plot.appendChild(text(label, band.x(periodIndex) + band.bandwidth / 2, top, { ...font, anchor: "middle", baseline: "top" }));
            });
        }
        bottom = top + layout.periodLabelHeight;

        if (axis.showParents) {
            for (let level = lowest - 1; level >= 0; level -= 1) {
                const rowY = bottom + (lowest - 1 - level) * rowHeight;
                periodSpans(levels, level).forEach((span, index) => {
                    const left = band.x(span.first) - (band.step - band.bandwidth) / 2;
                    const right = band.x(span.last) + band.bandwidth + (band.step - band.bandwidth) / 2;
                    plot.appendChild(text(fit(span.label, right - left - 4, axis.fontSize, "600", axis.fontFamily, axis.italic), (left + right) / 2, rowY, {
                        ...font,
                        weight: axis.bold ? "bold" : "600",
                        anchor: "middle",
                        baseline: "top"
                    }));
                    if (index > 0 && axis.showSeparators) {
                        plot.appendChild(svg("line", {
                            x1: left,
                            x2: left,
                            y1: top - 3,
                            y2: rowY + axis.fontSize + 2,
                            stroke: "#E1DFDD",
                            "pointer-events": "none"
                        }));
                    }
                });
            }
            bottom += lowest * rowHeight;
        }
    }

    if (axis.showTitle) {
        const title = axis.title || model.names.period;
        plot.appendChild(text(fit(title, layout.plotWidth, axis.fontSize, "600", axis.fontFamily, axis.italic), layout.plotWidth / 2, bottom, {
            ...font,
            weight: axis.bold ? "bold" : "600",
            anchor: "middle",
            baseline: "top"
        }));
    }
}

function drawCell(plot: SVGGElement, labelLayer: SVGGElement, placed: LabelPlacer, panel: BudgetPanel, cell: BudgetCell, layout: Layout, band: BandScale, y: LinearScale, slot: Slot, input: RenderInput): void {
    const { model, style, selectedKeys } = input;
    const cx = band.x(cell.periodIndex) + band.bandwidth * slot.position;
    const slotWidth = band.bandwidth * slot.width;
    const geometry = barGeometry(cx, slotWidth, style);
    const budgetWidth = geometry.budgetWidth;
    const dimmed = (selectedKeys.size > 0 && !(cell.selectionKey && selectedKeys.has(cell.selectionKey)))
        || (model.hasHighlights && !cell.highlighted);
    const cellGroup = svg("g", { opacity: dimmed ? 0.35 : 1 });
    plot.appendChild(cellGroup);
    const labelGroup = svg("g", { opacity: dimmed ? 0.35 : 1 });
    labelLayer.appendChild(labelGroup);
    const zero = y.map(0);

    const partial = model.hasHighlights && cell.highlighted;
    if (cell.budget != null) {
        const color = budgetColor(cell, panel, style, model);
        drawHighlighted(cellGroup, partial, cell.budget, cell.budgetHighlight, value => {
            const shape = bar(geometry.budgetX, budgetWidth, y.map(value), zero, style.budgetRadius, color);
            applyBudgetStyle(shape, color, style.budgetStyle);
            return shape;
        });
    }

    const actualColor = isOverrun(cell, style) ? style.overrunColor : style.actualColor;
    const marker = style.actualStyle === "marker";
    if (cell.actual != null) {
        const width = Math.max(6, budgetWidth + 6);
        drawHighlighted(cellGroup, partial, cell.actual, cell.actualHighlight, value => marker
            ? svg("rect", {
                x: cx - width / 2,
                y: y.map(value) - 1.5,
                width,
                height: 3,
                rx: Math.min(1.5, style.actualRadius),
                fill: actualColor,
                "pointer-events": "none"
            })
            : bar(geometry.actualX, geometry.actualWidth, y.map(value), zero, style.actualRadius, actualColor));
    }

    const actualWidth = marker ? Math.max(6, budgetWidth + 6) : geometry.actualWidth;
    const actualX = marker ? geometry.budgetX : geometry.actualX;
    const groupLeft = Math.min(geometry.budgetX - budgetWidth / 2, actualX - actualWidth / 2);
    const groupRight = Math.max(geometry.budgetX + budgetWidth / 2, actualX + actualWidth / 2);
    if (cell.target != null) cellGroup.appendChild(targetShape(targetStyleOf(style), actualX, actualWidth, y.map(cell.target), false));

    const shown = labelValues(cell, partial);
    let actualLabelTop: number | null = null;
    if (shown.actual != null && showActualLabel(style.actualLabel.mode, cell, model.periods.length)) {
        const options = style.actualLabel;
        const content = actualLabel(shown, options, slotWidth + 8, style.formatters);
        actualLabelTop = placeLabel(labelGroup, content, options, {
            x: actualX,
            width: actualWidth,
            valueY: y.map(shown.actual),
            zeroY: zero,
            color: actualColor,
            canInside: !marker,
            insideByDefault: true,
            groupLeft,
            groupRight,
            ceiling: null,
            componentSide: outerSide(slot),
            placed
        });
    }

    if (shown.budget != null && showBudgetLabel(style.budgetLabel.mode, cell)) {
        const overlay = !geometry.beside && shown.budget >= 0 && shown.actual != null && shown.actual > 0;
        let ceiling = overlay ? y.map(shown.actual) : null;
        if (overlay && actualLabelTop != null) ceiling = Math.min(ceiling, actualLabelTop + 4);
        placeLabel(labelGroup, style.formatters.label(shown.budget, cell.budgetFormat), style.budgetLabel, {
            x: geometry.budgetX,
            width: budgetWidth,
            valueY: y.map(shown.budget),
            zeroY: zero,
            color: budgetColor(cell, panel, style, model),
            canInside: style.budgetStyle === "solid",
            insideByDefault: false,
            groupLeft,
            groupRight,
            ceiling,
            componentSide: outerSide(slot),
            placed
        });
    }

    if (layout.kindRow || layout.comparisonRow) {
        const axis = xAxisOf(style);
        const font = { size: axis.fontSize, family: axis.fontFamily, italic: axis.italic, underline: axis.underline, weight: axis.bold ? "bold" : "normal" };
        const name = cell.kind === "revenue" ? style.revenueName : style.costName;
        if (layout.comparisonRow) {
            const comparison = comparisonLabel(cell, style);
            const pairColor = pairNameColor(cell, panel, style, model);
            const pairFont = {
                size: axis.pairFontSize,
                family: axis.pairFontFamily,
                weight: axis.pairBold ? "bold" : "normal",
                italic: axis.pairItalic,
                underline: axis.pairUnderline,
                fill: pairColor
            };
            if (layout.pairAngle) {
                const top = layout.plotHeight + 9;
                const node = text(fit(comparison, axis.maxLabelWidth, axis.pairFontSize, pairFont.weight, axis.pairFontFamily, axis.pairItalic), cx, top, {
                    ...pairFont,
                    anchor: "end",
                    baseline: "middle"
                });
                node.setAttribute("transform", `rotate(${-layout.pairAngle} ${cx} ${top})`);
                cellGroup.appendChild(node);
            } else {
                cellGroup.appendChild(text(fitComparison(comparison, slotWidth + 4, style), cx, layout.plotHeight + 7, {
                    ...pairFont,
                    anchor: "middle",
                    baseline: "top"
                }));
            }
        }
        if (layout.kindRow && slot.showKindLabel !== false) {
            const labelX = band.x(cell.periodIndex) + band.bandwidth * (slot.labelPosition == null ? slot.position : slot.labelPosition);
            const labelWidth = band.bandwidth * (slot.labelWidth || slot.width);
            const labelY = layout.plotHeight + 7 + (layout.comparisonRow ? layout.pairRowHeight : 0);
            cellGroup.appendChild(text(kindName(name, style, labelWidth), labelX, labelY, {
                ...font,
                fill: axis.color,
                anchor: "middle",
                baseline: "top"
            }));
        }
    }

    cellGroup.appendChild(hitArea(cx - slotWidth / 2, 0, slotWidth, layout.plotHeight, panel, cell, input));
}

function hitArea(x: number, y: number, width: number, height: number, panel: BudgetPanel, cell: BudgetCell, input: RenderInput): SVGRectElement {
    const { style, handlers } = input;
    const component = cell.kind === "revenue" ? style.revenueName : cell.kind === "cost" ? style.costName : cell.kind;
    const budgetText = cell.budget == null ? "no budget" : `budget ${style.formatters.label(cell.budget, cell.budgetFormat)}`;
    const actualText = cell.actual == null ? "no actual" : `actual ${style.formatters.label(cell.actual, cell.actualFormat)}`;
    const hit = svg("rect", {
        x,
        y,
        width,
        height,
        fill: "transparent",
        class: "bva-hit",
        tabindex: 0,
        role: "button",
        "aria-label": `${panel.label}, ${cell.period}, ${component}, ${budgetText}, ${actualText}`
    });
    hit.addEventListener("mousemove", event => handlers.tooltip(cell, event.clientX, event.clientY));
    hit.addEventListener("mouseleave", () => handlers.hideTooltip());
    hit.addEventListener("click", event => {
        event.stopPropagation();
        handlers.select(cell, event.ctrlKey || event.metaKey || event.shiftKey);
    });
    hit.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        handlers.select(cell, event.ctrlKey || event.metaKey || event.shiftKey);
    });
    hit.addEventListener("contextmenu", event => {
        event.preventDefault();
        event.stopPropagation();
        handlers.contextMenu(cell, event.clientX, event.clientY);
    });
    return hit;
}

export interface BarGeometry {
    budgetX: number;
    budgetWidth: number;
    actualX: number;
    actualWidth: number;
    beside: boolean;
}

export function barGeometry(cx: number, slotWidth: number, style: Pick<ChartStyle, "budgetWidth" | "actualRatio" | "actualStyle" | "actualPosition" | "actualGap">): BarGeometry {
    let budgetWidth = slotWidth * style.budgetWidth;
    let actualWidth = Math.max(1, budgetWidth * style.actualRatio);
    const beside = style.actualStyle === "bar" && style.actualPosition === "beside";
    if (!beside) return { budgetX: cx, budgetWidth, actualX: cx, actualWidth, beside };
    const gap = Math.max(0, style.actualGap);
    const bars = budgetWidth + actualWidth;
    if (bars + gap > slotWidth && bars > 0) {
        const factor = Math.max(0, slotWidth - gap) / bars;
        budgetWidth *= factor;
        actualWidth = Math.max(1, actualWidth * factor);
    }
    const left = cx - (budgetWidth + gap + actualWidth) / 2;
    return {
        budgetX: left + budgetWidth / 2,
        budgetWidth,
        actualX: left + budgetWidth + gap + actualWidth / 2,
        actualWidth,
        beside
    };
}

function actualLabel(cell: BudgetCell, options: ActualLabelStyle, room: number, formatters: ValueFormatters): string {
    const value = formatters.label(cell.actual, cell.actualFormat);
    if (options.content === "value" || cell.budget == null || cell.budget === 0) return value;
    const share = formatters.share(cell.actual, cell.budget);
    if (options.content === "share") return share;
    const both = `${value} · ${share}`;
    return measure(both, options.fontSize, weightOf(options), options.fontFamily, options.italic) <= room ? both : value;
}

function comparisonLabel(cell: BudgetCell, style: ChartStyle): string {
    const index = cell.comparisonIndex || 0;
    void style;
    return cell.seriesName || `Pair ${index + 1}`;
}

function fitComparison(value: string, width: number, style: ChartStyle): string {
    const axis = xAxisOf(style);
    const weight = axis.pairBold ? "bold" : "normal";
    const size = (candidate: string) => measure(candidate, axis.pairFontSize, weight, axis.pairFontFamily, axis.pairItalic);
    if (size(value) <= width) return value;
    const words = value.trim().split(/\s+/).filter(Boolean);
    const initials = words.length > 1
        ? words.map(word => (word.match(/[\p{L}\p{N}]/u) || [word[0]])[0]).join("").toUpperCase()
        : value.slice(0, 3);
    if (size(initials) <= width) return initials;
    return initials.slice(0, 1);
}

interface LabelTarget {
    x: number;
    width: number;
    valueY: number;
    zeroY: number;
    color: string;
    canInside: boolean;
    insideByDefault: boolean;
    groupLeft: number;
    groupRight: number;
    ceiling: number | null;
    componentSide: -1 | 1;
    placed: LabelPlacer;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class LabelPlacer {
    private readonly boxes: Rect[] = [];

    public place(box: Rect, preferred: number): number {
        let top = box.y;
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const hit = this.boxes.find(other => overlaps({ ...box, y: top }, other));
            if (!hit) break;
            const up = hit.y - box.height - 1;
            const down = hit.y + hit.height + 1;
            if (preferred < 0) top = up;
            else if (preferred > 0) top = down;
            else top = Math.abs(up - box.y) <= Math.abs(down - box.y) ? up : down;
        }
        this.boxes.push({ ...box, y: top });
        return top;
    }

    public reserve(box: Rect): void {
        this.boxes.push(box);
    }
}

function overlaps(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

type Baseline = "top" | "middle" | "bottom";

function weightOf(options: ValueLabelStyle): string {
    return options.bold ? "bold" : "normal";
}

function placeLabel(parent: SVGGElement, content: string, options: ValueLabelStyle, target: LabelTarget): number | null {
    const weight = weightOf(options);
    const size = options.fontSize;
    const positive = target.valueY <= target.zeroY;
    const direction = positive ? 1 : -1;
    const extra = boxExtent(options.box);
    const textWidth = measure(content, size, weight, options.fontFamily, options.italic);
    const fitsInside = target.canInside
        && Math.abs(target.valueY - target.zeroY) >= Math.max(INSIDE_LABEL_MIN, size + 10)
        && textWidth <= target.width + 2;
    const wantsInside = options.position === "inside" || (options.position === "auto" && target.insideByDefault);

    if (wantsInside && fitsInside) {
        const labelY = target.valueY + direction * 5;
        const textHeight = size * 1.2;
        target.placed.reserve({ x: target.x - textWidth / 2, y: positive ? labelY : labelY - textHeight, width: textWidth, height: textHeight });
        parent.appendChild(text(content, target.x, labelY, {
            size,
            weight,
            family: options.fontFamily,
            italic: options.italic,
            underline: options.underline,
            fill: contrastText(target.color),
            anchor: "middle",
            baseline: positive ? "top" : "bottom"
        }));
        return null;
    }

    const height = size * 1.2 + extra * 2;
    const width = textWidth + extra * 2;

    const resolvedSide = labelSide(options.position, target.componentSide);
    if (resolvedSide) {
        const right = resolvedSide > 0;
        const side = resolvedSide;
        const tip = options.pointer ? POINTER_SIZE + 2 : 0;
        const labelX = (right ? target.groupRight : target.groupLeft) + side * (4 + tip + extra);
        const anchor = right ? "start" : "end";
        const left = right ? labelX - extra : labelX - textWidth - extra;
        const labelY = target.placed.place({ x: left, y: target.valueY - height / 2, width, height }, 0) + height / 2;
        if (options.pointer) {
            const barEdge = target.x + side * target.width / 2;
            drawPointer(parent, barEdge, labelX - side * (extra + 2), target.valueY, labelY, side, options.pointerColor);
        }
        const node = text(content, labelX, labelY, {
            size, weight, family: options.fontFamily, italic: options.italic, underline: options.underline,
            fill: options.color, anchor, baseline: "middle"
        });
        decorateLabel(parent, node, content, labelX, labelY, anchor, "middle", weight, options);
        parent.appendChild(node);
        return null;
    }

    let labelY = target.valueY - direction * (5 + extra);
    if (positive && target.ceiling != null) labelY = Math.min(labelY, target.ceiling - 6 - extra);
    const top = positive ? labelY - size * 1.2 - extra : labelY - extra;
    labelY += target.placed.place({ x: target.x - width / 2, y: top, width, height }, positive ? -1 : 1) - top;
    const baseline: Baseline = positive ? "bottom" : "top";
    const node = text(content, target.x, labelY, {
        size, weight, family: options.fontFamily, italic: options.italic, underline: options.underline,
        fill: options.color, anchor: "middle", baseline
    });
    decorateLabel(parent, node, content, target.x, labelY, "middle", baseline, weight, options);
    parent.appendChild(node);
    return positive ? labelY - size - 1 - extra : null;
}

export function outerSide(slot: Slot | undefined): -1 | 1 {
    if (!slot) return 1;
    const paired = slot.labelPosition != null && slot.labelWidth != null && slot.width < slot.labelWidth - 1e-9;
    const center = paired ? slot.labelPosition : 0.5;
    return slot.position < center - 1e-9 ? -1 : 1;
}

export function labelSide(position: LabelPosition, outer: -1 | 1): -1 | 0 | 1 {
    if (position === "left") return -1;
    if (position === "right") return 1;
    if (position === "side") return outer;
    return 0;
}

function kindName(name: string, style: ChartStyle, slotWidth: number): string {
    const axis = xAxisOf(style);
    const fitted = fit(name, slotWidth + 4, axis.fontSize, axis.bold ? "bold" : "normal", axis.fontFamily, axis.italic);
    return fitted === name || fitted.length >= 6 ? fitted : "";
}

function kindNamesFit(style: ChartStyle, slotWidth: number): boolean {
    return !!kindName(style.revenueName, style, slotWidth) && !!kindName(style.costName, style, slotWidth);
}

function drawPointer(parent: SVGGElement, barEdge: number, labelEdge: number, y: number, labelY: number, side: number, color: string): void {
    const base = barEdge + side * POINTER_SIZE;
    if ((labelEdge - base) * side > 0 || labelY !== y) {
        parent.appendChild(svg("polyline", {
            points: `${base},${y} ${labelEdge - side * 3},${labelY} ${labelEdge},${labelY}`,
            fill: "none",
            stroke: color,
            "stroke-width": 1
        }));
    }
    const half = POINTER_SIZE * 0.75;
    parent.appendChild(svg("path", { d: `M${barEdge},${y}L${base},${y - half}L${base},${y + half}Z`, fill: color }));
}

export function boxExtent(box: LabelBoxStyle): number {
    return box.backdrop ? box.padding + box.borderWidth : 0;
}

function decorateLabel(parent: SVGGElement, node: SVGTextElement, value: string, x: number, y: number, anchor: "start" | "middle" | "end", baseline: Baseline, weight: string, options: ValueLabelStyle): void {
    const box = options.box;
    if (box.outline && box.outlineWidth > 0) {
        node.setAttribute("stroke", box.outlineColor);
        node.setAttribute("stroke-width", String(box.outlineWidth));
        node.setAttribute("stroke-linejoin", "round");
        node.setAttribute("paint-order", "stroke");
    }
    if (!box.backdrop) return;
    const textHeight = options.fontSize * 1.2;
    const textWidth = measure(value, options.fontSize, weight, options.fontFamily, options.italic);
    const width = textWidth + box.padding * 2;
    const height = textHeight + box.padding * 2;
    const top = (baseline === "top" ? y : baseline === "middle" ? y - textHeight / 2 : y - textHeight) - box.padding;
    const left = (anchor === "start" ? x : anchor === "middle" ? x - textWidth / 2 : x - textWidth) - box.padding;
    const attrs: Record<string, string | number> = {
        x: left,
        y: top,
        width,
        height,
        rx: Math.min(box.radius, height / 2),
        fill: box.backdropColor,
        "fill-opacity": box.backdropOpacity,
        "pointer-events": "none"
    };
    if (box.borderWidth > 0) {
        attrs.stroke = box.borderColor;
        attrs["stroke-width"] = box.borderWidth;
    }
    parent.appendChild(svg("rect", attrs));
}

function showBudgetLabel(mode: BudgetLabelMode, cell: BudgetCell): boolean {
    return mode === "all" || (mode === "latest" && cell.latest);
}

function showActualLabel(mode: ActualLabelMode, cell: BudgetCell, periodCount: number): boolean {
    if (mode === "all") return true;
    if (mode === "latest") return cell.latest;
    if (mode === "auto") return periodCount <= 4 || cell.latest;
    return false;
}

function kindColor(kind: SeriesKind, style: ChartStyle): string {
    if (kind === "revenue") return style.revenueColor;
    if (kind === "cost") return style.costColor;
    return style.netColor;
}

function pairNameColor(cell: BudgetCell, panel: BudgetPanel, style: ChartStyle, model: BudgetModel): string {
    const axis = xAxisOf(style);
    if (axis.pairColorMode === "fixed") return axis.pairColor;
    if (cell.legend != null) return budgetColor(cell, panel, style, model);
    if (style.colorBy === "group") return axis.pairColor;
    return style.comparisonColors[cell.comparisonIndex || 0] || axis.pairColor;
}

function legendValueColor(style: ChartStyle, name: string, index: number): string {
    return style.legendColor ? style.legendColor(name, index) : PALETTE[index % PALETTE.length];
}

function budgetColor(cell: BudgetCell, panel: BudgetPanel, style: ChartStyle, model?: BudgetModel): string {
    if (cell.legend != null) {
        const base = legendValueColor(style, cell.legend, cell.legendIndex || 0);
        const pairs = model ? comparisonPairCount(model) : 1;
        const index = cell.comparisonIndex || 0;
        return pairs > 1 && index < pairs - 1 ? mix(base, "#FFFFFF", 0.5 * (pairs - 1 - index) / (pairs - 1)) : base;
    }
    if (model && comparisonPairCount(model) > 1 && style.colorBy !== "group") {
        return style.comparisonColors[cell.comparisonIndex || 0] || style.comparisonColors[0] || style.netColor;
    }
    if (style.colorBy !== "group") return kindColor(cell.kind, style);
    const base = style.groupColor(panel.label);
    return cell.kind === "cost" ? mix(base, "#FFFFFF", 0.45) : base;
}

function applyBudgetStyle(node: SVGElement, color: string, budgetStyle: BudgetStyle): void {
    if (budgetStyle === "light") {
        node.setAttribute("fill-opacity", "0.35");
    } else if (budgetStyle === "outline") {
        node.setAttribute("fill-opacity", "0.1");
        node.setAttribute("stroke", color);
        node.setAttribute("stroke-width", "1.5");
    }
}

export function barPath(x: number, width: number, valueY: number, zeroY: number, radius: number): string {
    const top = Math.min(valueY, zeroY);
    const bottom = Math.max(valueY, zeroY);
    const height = bottom - top;
    const right = x + width;
    const r = Math.max(0, Math.min(radius, width / 2, height));
    if (r <= 0) return `M${x},${top}H${right}V${bottom}H${x}Z`;
    if (valueY <= zeroY) {
        return `M${x},${bottom}V${top + r}A${r},${r} 0 0 1 ${x + r},${top}H${right - r}A${r},${r} 0 0 1 ${right},${top + r}V${bottom}Z`;
    }
    return `M${x},${top}H${right}V${bottom - r}A${r},${r} 0 0 1 ${right - r},${bottom}H${x + r}A${r},${r} 0 0 1 ${x},${bottom - r}Z`;
}

function bar(cx: number, width: number, valueY: number, zeroY: number, radius: number, fill: string): SVGPathElement {
    return svg("path", { d: barPath(cx - width / 2, Math.max(0, width), valueY, zeroY, radius), fill, "pointer-events": "none" });
}

function parseHex(color: string): [number, number, number] | null {
    const value = color.replace("#", "").trim();
    const full = value.length === 3 ? value.split("").map(part => part + part).join("") : value;
    const parsed = parseInt(full.slice(0, 6), 16);
    if (!isFinite(parsed) || full.length < 6) return null;
    return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
}

export function mix(color: string, other: string, amount: number): string {
    const left = parseHex(color);
    const right = parseHex(other);
    if (!left || !right) return color;
    const channel = (index: number) => Math.round(left[index] + (right[index] - left[index]) * amount).toString(16).padStart(2, "0");
    return `#${channel(0)}${channel(1)}${channel(2)}`;
}

function contrastText(background: string): string {
    const rgb = parseHex(background);
    if (!rgb) return "#FFFFFF";
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    return luminance > 0.6 ? "#111111" : "#FFFFFF";
}

function emptyState(model: BudgetModel): HTMLElement {
    const box = el("div", "bva-empty");
    const title = el("div", "bva-empty-title");
    const body = el("div", "bva-empty-body");
    if (model.emptyTitle) {
        title.textContent = model.emptyTitle;
        body.textContent = model.emptyBody || "";
    } else if (!model.hasPeriodRole || !model.hasValueRole) {
        title.textContent = "Add fields to get started";
        body.textContent = "Put a period column in Period and at least one measure in Annual budget or Actual YTD. Group adds one panel per value, and Component splits revenue from costs.";
    } else {
        title.textContent = "No data";
        body.textContent = "There are no rows with a period for the current filters.";
    }
    box.appendChild(title);
    box.appendChild(body);
    return box;
}

export function labelVariants(value: string): string[] {
    const variants = [value];
    const words = value.trim().split(/\s+/);
    if (words.length > 1) variants.push(words[words.length - 1]);
    else if (/^\p{L}{4,}$/u.test(value)) variants.push(value.slice(0, 3), value.slice(0, 1));
    return variants;
}

export function periodLabels(values: string[], room: number, width: (value: string) => number): string[] {
    const options = values.map(labelVariants);
    const depth = Math.max(1, ...options.map(variants => variants.length));
    for (let level = 0; level < depth; level += 1) {
        const chosen = options.map(variants => variants[Math.min(level, variants.length - 1)]);
        if (chosen.every(label => width(label) <= room)) return chosen;
    }
    const shortest = options.map(variants => variants[variants.length - 1]);
    const widest = Math.max(...shortest.map(width));
    const every = Math.max(1, Math.ceil((widest + 4) / Math.max(1, room + 4)));
    return shortest.map((label, index) => index % every === 0 ? label : "");
}

let measureContext: CanvasRenderingContext2D | null = null;

function measure(value: string, size: number, weight: string, family = FONT, italic = false): number {
    if (!measureContext) measureContext = document.createElement("canvas").getContext("2d");
    if (!measureContext) return value.length * size * 0.55;
    measureContext.font = `${italic ? "italic " : ""}${weight} ${size}px ${family}`;
    return measureContext.measureText(value).width;
}

function fit(value: string, width: number, size: number, weight: string, family = FONT, italic = false): string {
    if (measure(value, size, weight, family, italic) <= width) return value;
    let low = 0;
    let high = value.length;
    while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (measure(`${value.slice(0, mid)}…`, size, weight, family, italic) <= width) low = mid;
        else high = mid - 1;
    }
    return low > 0 ? `${value.slice(0, low)}…` : "";
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function el(tag: string, className = ""): HTMLElement {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
}

function svg<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number | boolean>): SVGElementTagNameMap[K] {
    const node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach(key => node.setAttribute(key, String(attrs[key])));
    return node;
}

function group(parent: SVGElement, x: number, y: number): SVGGElement {
    const node = svg("g", { transform: `translate(${x},${y})` });
    parent.appendChild(node);
    return node;
}

function text(value: string, x: number, y: number, options: {
    size: number;
    fill: string;
    weight?: string;
    family?: string;
    italic?: boolean;
    underline?: boolean;
    anchor?: "start" | "middle" | "end";
    baseline?: "top" | "middle" | "bottom";
}): SVGTextElement {
    const baselines = { top: "text-before-edge", middle: "central", bottom: "text-after-edge" };
    const attrs: Record<string, string | number> = {
        x,
        y,
        "font-size": options.size,
        fill: options.fill,
        "text-anchor": options.anchor || "start",
        "dominant-baseline": baselines[options.baseline || "middle"],
        "pointer-events": "none"
    };
    if (options.weight) attrs["font-weight"] = options.weight;
    if (options.family) attrs["font-family"] = options.family;
    if (options.italic != null) attrs["font-style"] = options.italic ? "italic" : "normal";
    if (options.underline != null) attrs["text-decoration"] = options.underline ? "underline" : "none";
    const node = svg("text", attrs);
    node.textContent = value;
    return node;
}
