import { axisLabel, barLabel, formatPercent } from "../../src/format";
import { BudgetModel, isPercentFormat } from "../../src/model";
import {
    ActualContent,
    ActualLabelMode,
    ActualPosition,
    ActualStyle,
    Arrangement,
    BudgetLabelMode,
    BudgetStyle,
    ChartStyle,
    ColorBy,
    HorizontalLabelPosition,
    LabelPosition,
    LegendPosition,
    ValueFormatters,
    ValueLabelStyle,
    XAxisLabelLength,
    XAxisOrientation
} from "../../src/render";

const PAIR_COLORS = ["#A5A5A5", "#118DFF", "#E66C37", "#6B007B", "#E044A7", "#744EC2", "#D9B300", "#197278", "#8A3FFC", "#005D5D"];
const GROUP_PALETTE = ["#118DFF", "#12239E", "#E66C37", "#6B007B", "#E044A7", "#744EC2", "#D9B300", "#197278"];

type ValueFormat = "auto" | "compact" | "number" | "percent";

export function styleFromProps(props: Record<string, any>, model: BudgetModel, locale: string): ChartStyle {
    const revenueName = text(props.revenueName, model.names.revenue || "Opbrengsten");
    const costName = text(props.costName, model.names.cost || "Kosten");
    const budgetName = model.names.budget || "Budget";
    const actualName = model.names.actual || "Actual YTD";
    const horizontal = props.orientation === "horizontal";
    return {
        orientation: horizontal ? "horizontal" : "vertical",
        arrangement: choice<Arrangement>(props.arrangement, ["stack", "grid", "row"], "stack"),
        columns: Math.round(num(props.columns, 0, 0, 12)),
        sharedAxis: props.sharedAxis === true,
        showYAxis: props.showYAxis !== false,
        showGrid: props.showGrid !== false,
        minPlotHeight: num(props.minPlotHeight, 110, 40, 600),
        maxPlotHeight: num(props.maxPlotHeight, 220, 40, 1000),
        minPeriodWidth: num(props.minPeriodWidth, 0, 0, 400),
        budgetStyle: choice<BudgetStyle>(props.budgetStyle, ["solid", "light", "outline"], "solid"),
        budgetWidth: num(props.budgetWidth, 87, 20, 100) / 100,
        actualStyle: choice<ActualStyle>(props.actualStyle, ["bar", "marker"], "bar"),
        actualRatio: num(props.actualRatio, 38, 5, 100) / 100,
        actualPosition: choice<ActualPosition>(props.actualBarPosition, ["overlay", "beside"], "overlay"),
        actualGap: num(props.actualGap, 3, 0, 30),
        groupWidth: 1 - num(props.periodGap, 40, 0, 80) / 100,
        kindGap: num(props.kindGap, 0, 0, 60) / 100,
        budgetRadius: num(props.budgetRadius, 0, 0, 20),
        actualRadius: num(props.actualRadius, 0, 0, 20),
        showComparisonLabels: props.xShowPairs !== false,
        comparisonColors: PAIR_COLORS.map((fallback, index) => colorOf(props[`pair${index + 1}Color`], fallback)),
        colorBy: choice<ColorBy>(props.colorBy, ["component", "group"], "component"),
        revenueColor: colorOf(props.revenueColor, "#118DFF"),
        costColor: colorOf(props.costColor, "#E66C37"),
        netColor: colorOf(props.netColor, "#118DFF"),
        actualColor: colorOf(props.actualColor, "#252423"),
        highlightOverrun: props.highlightOverrun === true,
        overrunColor: colorOf(props.overrunColor, "#C4314B"),
        groupColor: groupColor,
        legendPosition: choice<LegendPosition>(props.legendPosition, ["top", "bottom", "left", "right", "none"], "top"),
        revenueText: text(props.legendRevenue, "") || `${budgetName} · ${revenueName}`,
        costText: text(props.legendCost, "") || `${budgetName} · ${costName}`,
        budgetText: text(props.legendBudget, "") || budgetName,
        actualText: text(props.legendActual, "") || actualName,
        overrunText: text(props.overrunText, "Boven begroting"),
        revenueName,
        costName,
        fontFamily: text(props.fontFamily, "Segoe UI"),
        fontSize: num(props.fontSize, 10, 7, 20),
        fontBold: props.fontBold === true,
        fontItalic: props.fontItalic === true,
        fontUnderline: props.fontUnderline === true,
        legend: {
            fontFamily: text(props.legendFontFamily, "Segoe UI"),
            fontSize: num(props.legendFontSize, 11, 7, 24),
            color: colorOf(props.legendColor, "#333333"),
            bold: props.legendBold === true,
            italic: props.legendItalic === true,
            underline: props.legendUnderline === true,
            revenue: text(props.legendRevenue, ""),
            cost: text(props.legendCost, ""),
            budget: text(props.legendBudget, ""),
            actual: text(props.legendActual, ""),
            target: text(props.legendTarget, ""),
            pairs: Array.from({ length: 10 }, (_, index) => text(props[`legendPair${index + 1}`], "")),
            hidden: {
                revenue: props.legendShowRevenue === false,
                cost: props.legendShowCost === false,
                budget: props.legendShowBudget === false,
                actual: props.legendShowActual === false,
                target: props.legendShowTarget === false,
                overrun: props.legendShowOverrun === false,
                pairs: Array.from({ length: 10 }, (_, index) => props[`legendShowPair${index + 1}`] === false)
            }
        },
        targetText: text(props.legendTarget, "") || model.names.target || "Target",
        target: {
            shape: props.targetShape === "dot" ? "dot" : "bar",
            barLength: num(props.targetBarLength, 200, 50, 400) / 100,
            barThickness: num(props.targetBarThickness, 3, 1, 30),
            barColor: colorOf(props.targetBarColor, "#C4314B"),
            dotSize: num(props.targetDotSize, 10, 3, 40),
            dotFill: colorOf(props.targetDotFill, "#FFFFFF"),
            dotBorderColor: colorOf(props.targetDotBorderColor, "#C4314B"),
            dotBorderWidth: num(props.targetDotBorderWidth, 2, 0, 10)
        },
        xAxis: {
            show: props.xShow !== false,
            fontFamily: text(props.xFontFamily, "Segoe UI"),
            fontSize: num(props.xFontSize, 10, 7, 24),
            color: colorOf(props.xColor, "#605E5C"),
            bold: props.xBold === true,
            italic: props.xItalic === true,
            underline: props.xUnderline === true,
            orientation: choice<XAxisOrientation>(props.xOrientation, ["auto", "horizontal", "diagonal", "vertical"], "auto"),
            labelLength: choice<XAxisLabelLength>(props.xLabelLength, ["auto", "full"], "auto"),
            maxLabelWidth: num(props.xMaxLabelWidth, 120, 30, 300),
            showParents: props.xShowParents !== false,
            showSeparators: props.xShowSeparators !== false,
            showComponents: props.xShowComponents !== false,
            showPairs: props.xShowPairs !== false,
            pairFontFamily: text(props.xPairFontFamily, "Segoe UI"),
            pairFontSize: num(props.xPairFontSize, 10, 7, 24),
            pairBold: props.xPairBold === true,
            pairItalic: props.xPairItalic === true,
            pairUnderline: props.xPairUnderline === true,
            pairOrientation: choice<XAxisOrientation>(props.xPairOrientation, ["auto", "horizontal", "diagonal", "vertical"], "auto"),
            pairColorMode: props.xPairColorMode === "fixed" ? "fixed" : "pair",
            pairColor: colorOf(props.xPairColor, "#605E5C"),
            showLine: props.xShowLine !== false,
            lineColor: colorOf(props.xLineColor, "#BBBBBB"),
            showTitle: props.xShowTitle === true,
            title: text(props.xTitle, "")
        },
        budgetLabel: {
            ...labelStyle("budget", props, "#333333", false, ["left", "side", "above", "inside"], "left"),
            hPosition: choice<HorizontalLabelPosition>(props.budgetLabelHPosition, ["after", "insideEnd", "insideBase"], "after"),
            combine: props.budgetCombine !== false,
            separator: typeof props.budgetSeparator === "string" ? props.budgetSeparator : " / ",
            mode: choice<BudgetLabelMode>(props.budgetLabelMode, ["latest", "all", "none"], "latest")
        },
        actualLabel: {
            ...labelStyle("actual", props, "#111111", true, ["right", "side", "above", "inside"], "right"),
            hPosition: choice<HorizontalLabelPosition>(props.actualLabelHPosition, ["end", "after", "insideEnd", "insideBase"], "end"),
            mode: choice<ActualLabelMode>(props.actualLabelMode, ["auto", "all", "latest", "none"], "auto"),
            content: choice<ActualContent>(props.actualContent, ["value", "share", "both"], "value")
        },
        formatters: buildFormatters(props, model, locale)
    };
}

export function tooltipRows(cell: import("../../src/model").BudgetCell, model: BudgetModel, style: ChartStyle, shareText: string, locale: string): { name: string; value: string }[] {
    const rows = [
        { name: model.names.group, value: cell.group },
        { name: model.names.period, value: cell.period }
    ];
    if (cell.kind === "revenue" || cell.kind === "cost") {
        rows.push({ name: model.names.component, value: cell.kind === "revenue" ? style.revenueName : style.costName });
    }
    const pairCount = (model.series || []).reduce((max, series) => Math.max(max, series.order + 1), 0);
    if (pairCount > 1) rows.push({ name: "Comparison", value: cell.seriesName || `Pair ${(cell.comparisonIndex || 0) + 1}` });
    rows.push({ name: style.budgetText, value: shown(cell.budgetDisplay, cell.budget, cell.budgetFormat, model, locale) });
    rows.push({ name: style.actualText, value: shown(cell.actualDisplay, cell.actual, cell.actualFormat, model, locale) });
    if (model.hasTarget) {
        rows.push({ name: style.targetText || "Target", value: shown(cell.targetDisplay, cell.target == null ? null : cell.target, cell.targetFormat || cell.budgetFormat, model, locale) });
    }
    if (cell.budget != null && cell.actual != null && cell.budget !== 0) {
        rows.push({ name: shareText, value: formatPercent(cell.actual / cell.budget, 1, locale) });
    }
    cell.tooltips.forEach(field => rows.push({ name: field.name, value: field.value }));
    return rows;
}

function shown(display: string | null | undefined, value: number | null | undefined, format: string | null | undefined, model: BudgetModel, locale: string): string {
    if (value == null) return "—";
    if (display) return display;
    const percent = isPercentFormat(format) || model.percentHint;
    return percent ? formatPercent(value, 1, locale) : new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

function labelStyle(prefix: string, props: Record<string, any>, textColor: string, bold: boolean, positions: LabelPosition[], position: LabelPosition): ValueLabelStyle {
    const key = (name: string) => props[`${prefix}Label${name}`];
    const boldValue = key("Bold");
    return {
        position: choice<LabelPosition>(key("Position"), positions, position),
        fontFamily: text(key("FontFamily"), "Segoe UI"),
        fontSize: num(key("FontSize"), 10, 6, 24),
        color: colorOf(key("Color"), textColor),
        bold: typeof boldValue === "boolean" ? boldValue : bold,
        italic: key("Italic") === true,
        underline: key("Underline") === true,
        pointer: key("Pointer") !== false,
        pointerColor: colorOf(key("PointerColor"), "#605E5C"),
        box: {
            outline: key("Outline") !== false,
            outlineColor: colorOf(key("OutlineColor"), "#FFFFFF"),
            outlineWidth: num(key("OutlineWidth"), 2, 0, 10),
            backdrop: key("Backdrop") === true,
            backdropColor: colorOf(key("BackdropColor"), "#FFFFFF"),
            backdropOpacity: 1 - num(key("BackdropTransparency"), 10, 0, 100) / 100,
            padding: num(key("Padding"), 3, 0, 12),
            radius: num(key("Radius"), 3, 0, 12),
            borderColor: colorOf(key("BorderColor"), "#605E5C"),
            borderWidth: num(key("BorderWidth"), 0, 0, 5)
        }
    };
}

function buildFormatters(props: Record<string, any>, model: BudgetModel, locale: string): ValueFormatters {
    const mode = choice<ValueFormat>(props.valueFormat, ["auto", "compact", "number", "percent"], "auto");
    const units = Math.max(0, num(props.displayUnits, 0, 0, 1e9));
    const decimals = Math.round(num(props.decimals, -1, -1, 6));
    const percentFallback = model.percentHint;
    const plain = (value: number, axis: boolean) => {
        const digits = decimals >= 0 ? decimals : axis || Math.abs(value) >= 100 ? 0 : 2;
        return new Intl.NumberFormat(locale, { minimumFractionDigits: decimals >= 0 ? decimals : 0, maximumFractionDigits: digits }).format(value);
    };
    const scaled = (value: number, axis: boolean) => {
        if (units > 1) {
            const suffix = units === 1000 ? "k" : units === 1000000 ? "M" : units === 1000000000 ? "B" : "";
            return plain(value / units, axis) + suffix;
        }
        return axis ? axisLabel(value, false, locale) : barLabel(value, false, locale);
    };
    return {
        label: (value, format) => {
            if (mode === "percent" || isPercentFormat(format) || (mode === "auto" && percentFallback && !format)) return formatPercent(value, decimals >= 0 ? decimals : 1, locale);
            if (mode === "number" || units === 1) return plain(value, false);
            return scaled(value, false);
        },
        axis: (value, _ticks, format) => {
            if (mode === "percent" || isPercentFormat(format) || (mode === "auto" && percentFallback && !format)) return formatPercent(value, 0, locale);
            if (mode === "number" || units === 1) return plain(value, true);
            return scaled(value, true);
        },
        share: (actual, budget) => formatPercent(actual / budget, 0, locale)
    };
}

function groupColor(label: string): string {
    let hash = 0;
    for (let index = 0; index < label.length; index += 1) hash = (hash * 31 + label.charCodeAt(index)) >>> 0;
    return GROUP_PALETTE[hash % GROUP_PALETTE.length];
}

function colorOf(value: unknown, fallback: string): string {
    if (typeof value === "string" && value.trim()) return value;
    if (value && typeof value === "object" && typeof (value as { color?: unknown }).color === "string" && (value as { color: string }).color) {
        return (value as { color: string }).color;
    }
    return fallback;
}

function num(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = typeof value === "number" ? value : parseFloat(String(value));
    if (!isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
}

function text(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim() ? value : fallback;
}

function choice<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    const raw = typeof value === "string" ? value : "";
    for (let index = 0; index < allowed.length; index += 1) {
        if (allowed[index] === raw) return allowed[index];
    }
    return fallback;
}
