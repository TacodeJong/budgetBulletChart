// @ts-ignore The stylesheet is bundled by the visual tools.
import "../style/visual.less";
import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";
import { axisLabel, barLabel, formatPercent, tooltipValue } from "./format";
import {
    BudgetCell,
    BudgetModel,
    ComponentMode,
    GroupSort,
    PeriodSort,
    buildModel,
    comparisonPairCount,
    emptyModel,
    isPercentFormat,
    parseRevenueValues
} from "./model";
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
    XAxisOrientation,
    renderChart
} from "./render";
import { VisualSettings, enumValue } from "./settings";

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

type ValueFormat = "auto" | "compact" | "number" | "percent";

export class Visual implements IVisual {
    private host: IVisualHost;
    private target: HTMLElement;
    private selectionManager: ISelectionManager;
    private formattingSettingsService: FormattingSettingsService;
    private settings: VisualSettings;
    private model: BudgetModel = emptyModel();
    private locale = "nl-NL";
    private viewport = { width: 0, height: 0 };
    private selectedKeys = new Set<string>();
    private renderQueued = 0;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.target = options.element;
        this.target.classList.add("bva-host");
        this.formattingSettingsService = new FormattingSettingsService();
        this.settings = new VisualSettings();
        this.selectionManager = this.host.createSelectionManager();
        const manager = this.selectionManager as any;
        if (typeof manager.registerOnSelectCallback === "function") {
            manager.registerOnSelectCallback((ids: { getKey(): string }[]) => {
                this.selectedKeys = new Set((ids || []).map(id => id.getKey()));
                this.scheduleRender();
            });
        }
    }

    public update(options: VisualUpdateOptions): void {
        this.viewport = options.viewport;
        this.locale = this.host.locale || this.locale;
        const dataView = options.dataViews && options.dataViews[0];
        if (dataView) {
            this.settings = this.formattingSettingsService.populateFormattingSettingsModel(VisualSettings, dataView);
            const grouping = this.settings.grouping;
            this.model = buildModel(dataView, this.host, {
                totalGroupName: textValue(grouping.totalGroupName.value, "Totaal"),
                combineGroups: enumValue(grouping.panelMode.value) === "combine",
                groupSort: choice<GroupSort>(grouping.groupSort.value, ["alpha", "data", "budget", "actual"], "alpha"),
                periodSort: choice<PeriodSort>(grouping.periodSort.value, ["auto", "asc", "desc", "data"], "auto"),
                componentMode: choice<ComponentMode>(grouping.componentMode.value, ["split", "revenue", "cost", "net"], "split"),
                revenueValues: parseRevenueValues(grouping.revenueValues.value),
                pairNames: this.settings.comparison.names(),
                formatValue: (value, format) => valueFormatter.format(value, format, false, this.locale)
            });
        } else {
            this.model = emptyModel();
        }
        if (this.renderQueued) {
            cancelAnimationFrame(this.renderQueued);
            this.renderQueued = 0;
        }
        this.syncSelection(false);
        this.paint();
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        this.settings.applyVisibility(this.model.zoneFieldCount || 0);
        const { revenue, cost } = this.componentNames();
        const series = this.model.series || [];
        const pairCount = comparisonPairCount(this.model);
        const hasRevenue = this.model.kinds.indexOf("revenue") >= 0;
        const hasCost = this.model.kinds.indexOf("cost") >= 0;
        this.settings.comparison.visible = pairCount > 1 || hasRevenue || hasCost;
        this.settings.comparison.setComponents(
            { shown: hasRevenue, dataName: this.model.names.revenue || "Opbrengsten" },
            { shown: hasCost, dataName: this.model.names.cost || "Kosten" }
        );
        const pairs = Array.from({ length: pairCount }, (_, index) => {
            const item = series.find(entry => entry.order === index);
            return { name: item ? item.pairName || item.name : "", fieldName: item && item.fieldName || "" };
        });
        this.settings.comparison.setPairs(pairs);
        const hasSingle = this.model.kinds.some(kind => kind === "net" || kind === "total") || !this.model.kinds.length;
        const legendValues = this.model.legendValues || [];
        const hasLegend = legendValues.length > 0;
        const style = this.readStyle();
        this.settings.colors.setTargets({
            pairs: hasLegend ? [] : pairs.map((pair, index) => pair.name || `Pair ${index + 1}`),
            revenue: hasRevenue ? revenue : null,
            cost: hasCost ? cost : null,
            single: hasSingle ? this.model.names.budget || "Budget" : null,
            legend: legendValues.map((value, index) => ({
                name: value.name,
                color: style.legendColor(value.name, index),
                selector: value.selectionId && value.selectionId.getSelector ? value.selectionId.getSelector() : null
            }))
        });
        const budgetName = this.model.names.budget || "Budget";
        const pairLegend = !hasLegend && pairCount > 1 && enumValue(this.settings.colors.colorBy.value) !== "group";
        this.settings.legend.setTargets({
            pairs: pairLegend ? pairs.map((pair, index) => pair.name || `Pair ${index + 1}`) : [],
            revenue: hasRevenue && !hasLegend ? `${budgetName} · ${revenue}` : null,
            cost: hasCost && !hasLegend ? `${budgetName} · ${cost}` : null,
            budget: !hasLegend && (hasSingle || !this.model.kinds.length) ? budgetName : null,
            actual: this.model.names.actual || "Actual YTD",
            target: this.model.hasTarget ? this.model.names.target || "Target" : null,
            overrun: this.settings.colors.highlightOverrun.value
        });
        this.settings.target.applyVisibility(!!this.model.hasTarget);
        this.settings.budgetZones.applyVisibility(this.model.zoneFieldCount || 0);
        this.settings.xAxis.applyVisibility(this.model.levelCount, this.model.kinds.length > 1, pairCount > 1 || hasLegend, this.model.names.period || "Periode", this.settings.isHorizontal());
        return this.formattingSettingsService.buildFormattingModel(this.settings);
    }

    private paint(): void {
        const style = this.readStyle();
        renderChart(this.target, {
            model: this.model,
            width: this.viewport.width,
            height: this.viewport.height,
            style,
            selectedKeys: this.selectedKeys,
            handlers: {
                select: (cell, multi) => this.select(cell, multi),
                clear: () => this.clearSelection(),
                tooltip: (cell, x, y) => this.showTooltip(cell, style, x, y),
                hideTooltip: () => this.hideTooltip(),
                contextMenu: (cell, x, y) => this.showContextMenu(cell, x, y)
            }
        });
    }

    private scheduleRender(): void {
        if (this.renderQueued || this.viewport.width <= 0) return;
        this.renderQueued = requestAnimationFrame(() => {
            this.renderQueued = 0;
            this.paint();
        });
    }

    private select(cell: BudgetCell, multi: boolean): void {
        if (!cell.selectionId) return;
        const result = this.selectionManager.select(cell.selectionId as any, multi) as any;
        if (result && typeof result.then === "function") {
            result.then((ids: { getKey(): string }[]) => {
                if (ids) this.selectedKeys = new Set(ids.map(id => id.getKey()));
                else this.syncSelection(false);
                this.scheduleRender();
            });
        } else {
            this.syncSelection(true);
        }
    }

    private clearSelection(): void {
        if (!this.selectedKeys.size) return;
        const result = this.selectionManager.clear() as any;
        const done = () => {
            this.selectedKeys = new Set();
            this.scheduleRender();
        };
        if (result && typeof result.then === "function") result.then(done);
        else done();
    }

    private syncSelection(repaint: boolean): void {
        const current = this.selectionManager.getSelectionIds() as any;
        const apply = (ids: { getKey(): string }[]) => {
            this.selectedKeys = new Set((ids || []).map(id => id.getKey()));
            if (repaint) this.scheduleRender();
        };
        if (current && typeof current.then === "function") current.then(apply);
        else apply(current || []);
    }

    private showTooltip(cell: BudgetCell, style: ChartStyle, x: number, y: number): void {
        const names = this.model.names;
        const legend = this.settings.legend;
        const items: VisualTooltipDataItem[] = [
            { displayName: names.group, value: cell.group },
            { displayName: names.period, value: cell.period }
        ];
        if (cell.kind === "revenue" || cell.kind === "cost") {
            items.push({ displayName: names.component, value: cell.kind === "revenue" ? style.revenueName : style.costName });
        }
        if (cell.legend != null) items.push({ displayName: names.legend || "Legend", value: cell.legend });
        if (comparisonPairCount(this.model) > 1) {
            const index = cell.comparisonIndex || 0;
            items.push({ displayName: "Comparison", value: cell.seriesName || `Pair ${index + 1}` });
        }
        items.push({ displayName: style.budgetText, value: this.tooltipNumber(cell.budget, cell.budgetFormat) });
        items.push({ displayName: style.actualText, value: this.tooltipNumber(cell.actual, cell.actualFormat) });
        if (this.model.hasHighlights) {
            items.push({ displayName: `${style.budgetText} (highlighted)`, value: this.tooltipNumber(cell.budgetHighlight == null ? null : cell.budgetHighlight, cell.budgetFormat) });
            items.push({ displayName: `${style.actualText} (highlighted)`, value: this.tooltipNumber(cell.actualHighlight == null ? null : cell.actualHighlight, cell.actualFormat) });
        }
        if (this.model.hasTarget) {
            const targetName = textValue(legend.targetLabel.value, style.targetText || "Target");
            items.push({ displayName: targetName, value: this.tooltipNumber(cell.target == null ? null : cell.target, cell.targetFormat || cell.budgetFormat) });
        }
        if (cell.budget != null && cell.actual != null && cell.budget !== 0) {
            items.push({ displayName: textValue(legend.shareText.value, "% van jaarbegroting"), value: formatPercent(cell.actual / cell.budget, 1, this.locale) });
        }
        cell.tooltips.forEach(field => items.push({ displayName: field.name, value: field.value }));
        this.host.tooltipService.show({
            coordinates: [x, y],
            isTouchEvent: false,
            identities: cell.selectionId ? [cell.selectionId as any] : [],
            dataItems: items
        });
    }

    private tooltipNumber(value: number | null, format: string | null): string {
        if (value == null) return "—";
        const mode = this.valueFormat();
        if (mode === "auto" && format) return valueFormatter.format(value, format, false, this.locale);
        return tooltipValue(value, mode === "percent" || (mode === "auto" && this.model.percentHint), this.locale);
    }

    private hideTooltip(): void {
        this.host.tooltipService.hide({ immediately: true, isTouchEvent: false });
    }

    private showContextMenu(cell: BudgetCell | null, x: number, y: number): void {
        this.selectionManager.showContextMenu((cell && cell.selectionId ? cell.selectionId : {}) as any, { x, y });
    }

    private valueFormat(): ValueFormat {
        return choice<ValueFormat>(this.settings.labels.valueFormat.value, ["auto", "compact", "number", "percent"], "auto");
    }

    private buildFormatters(): ValueFormatters {
        const labels = this.settings.labels;
        const mode = this.valueFormat();
        const units = Math.max(0, numberValue(enumValue(labels.displayUnits.value), 0, 0, 1e9));
        const decimals = Math.round(numberValue(labels.decimals.value, -1, -1, 6));
        const precision = decimals >= 0 ? decimals : undefined;
        const locale = this.locale;
        const percentFallback = this.model.percentHint;
        const axisCache = new Map<string, { format(value: number): string }>();

        const plain = (value: number, axis: boolean) => {
            const digits = decimals >= 0 ? decimals : axis || Math.abs(value) >= 100 ? 0 : 2;
            return new Intl.NumberFormat(locale, { minimumFractionDigits: decimals >= 0 ? decimals : 0, maximumFractionDigits: digits }).format(value);
        };

        return {
            label: (value, format) => {
                if (mode === "auto" && format) {
                    if (isPercentFormat(format)) return valueFormatter.create({ format, precision, cultureSelector: locale }).format(value);
                    return valueFormatter.create({ format, value: units === 0 ? Math.abs(value) : units, precision, cultureSelector: locale }).format(value);
                }
                if (mode === "percent" || (mode === "auto" && percentFallback)) return formatPercent(value, decimals >= 0 ? decimals : 1, locale);
                if (mode === "number") return plain(value, false);
                return barLabel(value, false, locale);
            },
            axis: (value, ticks, format) => {
                if (mode === "auto" && format) {
                    const largest = ticks.reduce((max, tick) => Math.max(max, Math.abs(tick)), 0);
                    const key = `${format}|${largest}|${ticks.length}`;
                    let formatter = axisCache.get(key);
                    if (!formatter) {
                        formatter = isPercentFormat(format)
                            ? valueFormatter.create({ format, value: largest, tickCount: ticks.length, cultureSelector: locale })
                            : valueFormatter.create({ format, value: units === 0 ? largest : units, tickCount: ticks.length, cultureSelector: locale });
                        axisCache.set(key, formatter);
                    }
                    return formatter.format(value);
                }
                if (mode === "percent" || (mode === "auto" && percentFallback)) return formatPercent(value, 0, locale);
                if (mode === "number") return plain(value, true);
                return axisLabel(value, false, locale);
            },
            share: (actual, budget) => formatPercent(actual / budget, 0, locale)
        };
    }

    private componentNames(): { revenue: string; cost: string } {
        const { comparison } = this.settings;
        return {
            revenue: textValue(comparison.revenueName.value, this.model.names.revenue || "Opbrengsten"),
            cost: textValue(comparison.costName.value, this.model.names.cost || "Kosten")
        };
    }

    private readStyle(): ChartStyle {
        const { layout, bars, xAxis, colors, legend, labels, budgetLabel, actualLabel, target, budgetZones } = this.settings;
        const palette = this.host.colorPalette;
        const { revenue: revenueName, cost: costName } = this.componentNames();
        const budgetName = this.model.names.budget || "Budget";
        const actualName = this.model.names.actual || "Actual YTD";
        const zoneState = budgetZones.state();
        const zoneNames = zoneState.names.map((name, index) => {
            if (name && name !== `Zone ${index + 1}`) return name;
            return this.model.zoneFieldNames?.[index] || name;
        });
        return {
            orientation: this.settings.isHorizontal() ? "horizontal" : "vertical",
            arrangement: choice<Arrangement>(layout.arrangement.value, ["stack", "grid", "row"], "stack"),
            columns: Math.round(numberValue(layout.columns.value, 0, 0, 12)),
            sharedAxis: layout.sharedAxis.value,
            showYAxis: layout.showYAxis.value,
            showGrid: layout.showGrid.value,
            minPlotHeight: numberValue(layout.minPlotHeight.value, 110, 40, 600),
            maxPlotHeight: numberValue(layout.maxPlotHeight.value, 220, 40, 1000),
            minPeriodWidth: numberValue(layout.minPeriodWidth.value, 0, 0, 400),
            budgetStyle: choice<BudgetStyle>(bars.budgetStyle.value, ["solid", "light", "outline"], "solid"),
            budgetWidth: numberValue(bars.budgetWidth.value, 87, 20, 100) / 100,
            actualStyle: choice<ActualStyle>(bars.actualStyle.value, ["bar", "marker"], "bar"),
            actualRatio: numberValue(bars.actualRatio.value, 38, 5, 100) / 100,
            actualPosition: choice<ActualPosition>(bars.actualPosition.value, ["overlay", "beside"], "overlay"),
            actualGap: numberValue(bars.actualGap.value, 3, 0, 30),
            groupWidth: 1 - numberValue(bars.periodGap.value, 40, 0, 80) / 100,
            kindGap: numberValue(bars.kindGap.value, 0, 0, 60) / 100,
            budgetRadius: numberValue(bars.budgetRadius.value, 0, 0, 20),
            actualRadius: numberValue(bars.actualRadius.value, 0, 0, 20),
            showComparisonLabels: xAxis.showPairs.value,
            xAxis: {
                show: xAxis.show.value,
                fontFamily: textValue(xAxis.fontFamily.value, "Segoe UI"),
                fontSize: numberValue(xAxis.fontSize.value, 10, 7, 24),
                color: colorValue(xAxis.color.value, "#605E5C"),
                bold: xAxis.bold.value,
                italic: xAxis.italic.value,
                underline: xAxis.underline.value,
                orientation: choice<XAxisOrientation>(xAxis.orientation.value, ["auto", "horizontal", "diagonal", "vertical"], "auto"),
                labelLength: choice<XAxisLabelLength>(xAxis.labelLength.value, ["auto", "full"], "auto"),
                maxLabelWidth: numberValue(xAxis.maxLabelWidth.value, 120, 30, 300),
                showParents: xAxis.showParents.value,
                showSeparators: xAxis.showSeparators.value,
                showComponents: xAxis.showComponents.value,
                showPairs: xAxis.showPairs.value,
                pairFontFamily: textValue(xAxis.pairFontFamily.value, "Segoe UI"),
                pairFontSize: numberValue(xAxis.pairFontSize.value, 10, 7, 24),
                pairBold: xAxis.pairBold.value,
                pairItalic: xAxis.pairItalic.value,
                pairUnderline: xAxis.pairUnderline.value,
                pairOrientation: choice<XAxisOrientation>(xAxis.pairOrientation.value, ["auto", "horizontal", "diagonal", "vertical"], "auto"),
                pairColorMode: choice<"pair" | "fixed">(xAxis.pairColorMode.value, ["pair", "fixed"], "pair"),
                pairColor: colorValue(xAxis.pairColor.value, "#605E5C"),
                showLine: xAxis.showLine.value,
                lineColor: colorValue(xAxis.lineColor.value, "#BBBBBB"),
                showTitle: xAxis.showTitle.value,
                title: textValue(xAxis.title.value, "")
            },
            comparisonColors: colors.pairColors.map(slice => colorValue(slice.value, "#118DFF")),
            colorBy: choice<ColorBy>(colors.colorBy.value, ["component", "group"], "component"),
            revenueColor: colorValue(colors.revenueColor.value, "#118DFF"),
            costColor: colorValue(colors.costColor.value, "#E66C37"),
            netColor: colorValue(colors.netColor.value, "#118DFF"),
            actualColor: colorValue(colors.actualColor.value, "#252423"),
            highlightOverrun: colors.highlightOverrun.value,
            overrunColor: colorValue(colors.overrunColor.value, "#C4314B"),
            groupColor: label => (palette ? palette.getColor(label).value : "#118DFF"),
            legendColor: (name, index) => {
                const stored = (this.model.legendValues || [])[index];
                if (stored && stored.name === name && stored.color) return stored.color;
                return palette ? palette.getColor(`legend:${name}`).value : "#118DFF";
            },
            legendPosition: choice<LegendPosition>(legend.position.value, ["top", "bottom", "left", "right", "none"], "top"),
            revenueText: `${budgetName} · ${revenueName}`,
            costText: `${budgetName} · ${costName}`,
            budgetText: budgetName,
            actualText: actualName,
            overrunText: textValue(legend.overrunText.value, "Boven begroting"),
            legend: {
                fontFamily: textValue(legend.fontFamily.value, "Segoe UI"),
                fontSize: numberValue(legend.fontSize.value, 11, 7, 24),
                color: colorValue(legend.color.value, "#333333"),
                bold: legend.bold.value,
                italic: legend.italic.value,
                underline: legend.underline.value,
                revenue: textValue(legend.revenueLabel.value, ""),
                cost: textValue(legend.costLabel.value, ""),
                budget: textValue(legend.budgetLabel.value, ""),
                actual: textValue(legend.actualLabel.value, ""),
                target: textValue(legend.targetLabel.value, ""),
                pairs: legend.pairTexts(),
                hidden: legend.hiddenEntries()
            },
            targetText: this.model.names.target || "Target",
            target: {
                shape: choice<"bar" | "dot">(target.shape.value, ["bar", "dot"], "bar"),
                barLength: numberValue(target.barLength.value, 200, 50, 400) / 100,
                barThickness: numberValue(target.barThickness.value, 3, 1, 30),
                barColor: colorValue(target.barColor.value, "#C4314B"),
                dotSize: numberValue(target.dotSize.value, 10, 3, 40),
                dotFill: colorValue(target.dotFill.value, "#FFFFFF"),
                dotBorderColor: colorValue(target.dotBorderColor.value, "#C4314B"),
                dotBorderWidth: numberValue(target.dotBorderWidth.value, 2, 0, 10)
            },
            zones: {
                show: zoneState.show,
                mode: choice(zoneState.mode, ["equal", "fields", "percent"], "equal"),
                count: zoneState.count,
                colors: zoneState.colors,
                names: zoneNames,
                percents: zoneState.percents
            },
            budgetLabel: {
                ...readLabelStyle(budgetLabel, "#333333", false, ["left", "side", "above", "inside"], "left"),
                hPosition: choice<HorizontalLabelPosition>(budgetLabel.hPosition.value, ["after", "insideEnd", "insideBase"], "after"),
                combine: budgetLabel.combine.value,
                separator: textValue(budgetLabel.separator.value, " / "),
                mode: choice<BudgetLabelMode>(budgetLabel.show.value, ["latest", "all", "none"], "latest")
            },
            actualLabel: {
                ...readLabelStyle(actualLabel, "#111111", true, ["right", "side", "above", "inside"], "right"),
                hPosition: choice<HorizontalLabelPosition>(actualLabel.hPosition.value, ["end", "after", "insideEnd", "insideBase"], "end"),
                mode: choice<ActualLabelMode>(actualLabel.show.value, ["auto", "all", "latest", "none"], "auto"),
                content: choice<ActualContent>(actualLabel.content.value, ["value", "share", "both"], "value")
            },
            fontFamily: textValue(labels.fontFamily.value, "Segoe UI"),
            fontSize: numberValue(labels.fontSize.value, 10, 7, 20),
            fontBold: labels.bold.value,
            fontItalic: labels.italic.value,
            fontUnderline: labels.underline.value,
            revenueName,
            costName,
            formatters: this.buildFormatters()
        };
    }
}

function readLabelStyle(card: VisualSettings["budgetLabel"] | VisualSettings["actualLabel"], textColor: string, bold: boolean, positions: LabelPosition[], position: LabelPosition): ValueLabelStyle {
    return {
        position: choice<LabelPosition>(card.position.value, positions, position),
        fontFamily: textValue(card.fontFamily.value, "Segoe UI"),
        fontSize: numberValue(card.fontSize.value, 10, 6, 24),
        color: colorValue(card.color.value, textColor),
        bold: typeof card.bold.value === "boolean" ? card.bold.value : bold,
        italic: card.italic.value,
        underline: card.underline.value,
        pointer: card.pointer.value,
        pointerColor: colorValue(card.pointerColor.value, "#605E5C"),
        box: {
            outline: card.outline.value,
            outlineColor: colorValue(card.outlineColor.value, "#FFFFFF"),
            outlineWidth: numberValue(card.outlineWidth.value, 2, 0, 10),
            backdrop: card.backdrop.value,
            backdropColor: colorValue(card.backdropColor.value, "#FFFFFF"),
            backdropOpacity: 1 - numberValue(card.backdropTransparency.value, 10, 0, 100) / 100,
            padding: numberValue(card.padding.value, 3, 0, 12),
            radius: numberValue(card.radius.value, 3, 0, 12),
            borderColor: colorValue(card.borderColor.value, "#605E5C"),
            borderWidth: numberValue(card.borderWidth.value, 0, 0, 5)
        }
    };
}

function numberValue(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = typeof value === "number" ? value : parseFloat(String(value));
    if (!isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
}

function textValue(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim() ? value : fallback;
}

function colorValue(value: unknown, fallback: string): string {
    if (typeof value === "string" && value) return value;
    if (value && typeof value === "object" && typeof (value as { value?: unknown }).value === "string") {
        const inner = (value as { value: string }).value;
        if (inner) return inner;
    }
    return fallback;
}

function choice<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    const raw = enumValue(value);
    for (let index = 0; index < allowed.length; index += 1) {
        if (allowed[index] === raw) return allowed[index];
    }
    return fallback;
}
