import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

function options(...pairs: [string, string][]): powerbi.IEnumMember[] {
    return pairs.map(([displayName, value]) => ({ displayName, value }));
}

const chartOrientations = options(["Vertical bars", "vertical"], ["Horizontal bars", "horizontal"]);
const arrangements = options(["Stacked", "stack"], ["Grid", "grid"], ["Side by side", "row"]);
const panelModes = options(["One panel per group", "split"], ["Combine into one panel", "combine"]);
const groupSorts = options(["Alphabetical", "alpha"], ["Report order", "data"], ["Largest budget first", "budget"], ["Largest actual first", "actual"]);
const periodSorts = options(["Auto", "auto"], ["Ascending", "asc"], ["Descending", "desc"], ["Report order", "data"]);
const componentModes = options(["Revenue and costs side by side", "split"], ["Revenue only", "revenue"], ["Costs only", "cost"], ["Net result (revenue minus costs)", "net"]);
const budgetStyles = options(["Solid", "solid"], ["Light", "light"], ["Outline", "outline"]);
const actualStyles = options(["Bar", "bar"], ["Marker line", "marker"]);
const actualPositions = options(["On top of budget", "overlay"], ["Next to budget", "beside"]);
const colorModes = options(["Per component or pair", "component"], ["By group (theme colors)", "group"]);
const MAX_PAIRS = 10;
const xAxisOrientations = options(["Auto (rotate when crowded)", "auto"], ["Horizontal", "horizontal"], ["Diagonal (45°)", "diagonal"], ["Vertical (90°)", "vertical"]);
const pairColorModes = options(["Pair budget color", "pair"], ["Fixed color", "fixed"]);
const xAxisLabelLengths = options(["Shorten to fit", "auto"], ["Full text", "full"]);
const targetShapes = options(["Bar", "bar"], ["Dot", "dot"]);
const legendPositions = options(["Top", "top"], ["Bottom", "bottom"], ["Left", "left"], ["Right", "right"], ["Off", "none"]);
const budgetLabelModes = options(["Latest period", "latest"], ["All periods", "all"], ["Off", "none"]);
const actualLabelModes = options(["Auto", "auto"], ["All periods", "all"], ["Latest period", "latest"], ["Off", "none"]);
const actualContents = options(["Value", "value"], ["% of budget", "share"], ["Value and % of budget", "both"]);
const budgetPositions = options(
    ["Left of bar", "left"],
    ["Outer side (left bars left, right bars right)", "side"],
    ["Above bar", "above"],
    ["Inside bar", "inside"]
);
const actualLabelPositions = options(
    ["Right of bar", "right"],
    ["Outer side (left bars left, right bars right)", "side"],
    ["Above bar", "above"],
    ["Inside bar", "inside"]
);
const budgetHPositions = options(
    ["Behind the bar", "after"],
    ["Inside bar, at the end", "insideEnd"],
    ["Inside bar, after the actual", "insideBase"]
);
const actualHPositions = options(
    ["At the end of the actual bar", "end"],
    ["Behind the bar", "after"],
    ["Inside bar, at the end", "insideEnd"],
    ["Inside bar, at the start", "insideBase"]
);
const valueFormats = options(["Auto (measure format)", "auto"], ["Compact (12.3k)", "compact"], ["Number", "number"], ["Percentage", "percent"]);
const displayUnits = options(["Auto", "0"], ["None", "1"], ["Thousands", "1000"], ["Millions", "1000000"], ["Billions", "1000000000"]);

function dropdown(name: string, displayName: string, items: powerbi.IEnumMember[], index = 0): formattingSettings.ItemDropdown {
    return new formattingSettings.ItemDropdown({ name, displayName, items, value: items[index] });
}

function color(name: string, displayName: string, value: string): formattingSettings.ColorPicker {
    return new formattingSettings.ColorPicker({ name, displayName, value: { value } });
}

function textInput(name: string, displayName: string, value: string): formattingSettings.TextInput {
    return new formattingSettings.TextInput({ name, displayName, value, placeholder: value });
}

function autoTextInput(name: string, displayName: string): formattingSettings.TextInput {
    return new formattingSettings.TextInput({ name, displayName, value: "", placeholder: "Auto (from data)" });
}

function legendToggle(name: string, displayName: string): formattingSettings.ToggleSwitch {
    return new formattingSettings.ToggleSwitch({ name, displayName: `Show ${displayName}`, value: true });
}

export interface LegendHidden {
    revenue: boolean;
    cost: boolean;
    budget: boolean;
    actual: boolean;
    target: boolean;
    overrun: boolean;
    pairs: boolean[];
}

function slider(name: string, displayName: string, value: number, min: number, max: number): formattingSettings.Slider {
    return new formattingSettings.Slider({
        name,
        displayName,
        value,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: min },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: max }
        }
    });
}

class LayoutCard extends formattingSettings.CompositeCard {
    public orientation = dropdown("orientation", "Bar direction", chartOrientations);
    public arrangement = dropdown("arrangement", "Panels", arrangements);
    public columns = new formattingSettings.NumUpDown({ name: "columns", displayName: "Columns (0 = auto)", value: 0 });
    public sharedAxis = new formattingSettings.ToggleSwitch({ name: "sharedAxis", displayName: "Same y-axis for all panels", value: false });
    public showYAxis = new formattingSettings.ToggleSwitch({ name: "showYAxis", displayName: "Show y-axis labels", value: true });
    public showGrid = new formattingSettings.ToggleSwitch({ name: "showGrid", displayName: "Show gridlines", value: true });
    public minPlotHeight = new formattingSettings.NumUpDown({ name: "minPlotHeight", displayName: "Minimum panel height", value: 110 });
    public maxPlotHeight = new formattingSettings.NumUpDown({ name: "maxPlotHeight", displayName: "Maximum panel height", value: 220 });
    public minPeriodWidth = new formattingSettings.NumUpDown({ name: "minPeriodWidth", displayName: "Minimum period width (0 = fit)", value: 0 });

    name: string = "layout";
    displayName: string = "Layout";
    groups: formattingSettings.Group[] = [
        new formattingSettings.Group({
            name: "panels",
            displayName: "Panels",
            slices: [this.orientation, this.arrangement, this.columns, this.sharedAxis, this.showYAxis, this.showGrid]
        }),
        new formattingSettings.Group({
            name: "responsiveLayout",
            displayName: "Advanced sizing",
            collapsible: true,
            slices: [this.minPlotHeight, this.maxPlotHeight, this.minPeriodWidth]
        })
    ];
}

class GroupingCard extends formattingSettings.CompositeCard {
    public panelMode = dropdown("panelMode", "Groups", panelModes);
    public groupSort = dropdown("groupSort", "Sort panels", groupSorts);
    public periodSort = dropdown("periodSort", "Sort periods", periodSorts);
    public componentMode = dropdown("componentMode", "Components", componentModes);
    public revenueValues = textInput("revenueValues", "Revenue values (comma separated)", "opbrengst, baten, inkomst, omzet, revenue, income");
    public totalGroupName = textInput("totalGroupName", "Panel title without group", "Totaal");

    name: string = "grouping";
    displayName: string = "Data and grouping";
    groups: formattingSettings.Group[] = [
        new formattingSettings.Group({
            name: "groupingMain",
            displayName: "Grouping",
            slices: [this.panelMode, this.groupSort, this.periodSort, this.componentMode]
        }),
        new formattingSettings.Group({
            name: "groupingNames",
            displayName: "Names and detection",
            collapsible: true,
            slices: [this.totalGroupName, this.revenueValues]
        })
    ];
}

class BarsCard extends formattingSettings.CompositeCard {
    public budgetStyle = dropdown("budgetStyle", "Budget style", budgetStyles);
    public budgetWidth = slider("budgetWidth", "Budget bar width (%)", 87, 20, 100);
    public actualStyle = dropdown("actualStyle", "Actual style", actualStyles);
    public actualRatio = slider("actualRatio", "Actual width (% of budget bar)", 38, 5, 100);
    public actualPosition = dropdown("actualPosition", "Actual position", actualPositions);
    public actualGap = slider("actualGap", "Budget–actual gap (px)", 3, 0, 30);
    public periodGap = slider("periodGap", "Gap between periods (%)", 40, 0, 80);
    public kindGap = slider("kindGap", "Revenue–cost gap (%)", 0, 0, 60);
    public budgetRadius = slider("budgetRadius", "Budget corner radius", 0, 0, 20);
    public actualRadius = slider("actualRadius", "Actual corner radius", 0, 0, 20);

    name: string = "bars";
    displayName: string = "Bars";
    groups: formattingSettings.Group[] = [
        new formattingSettings.Group({
            name: "budgetBar",
            displayName: "Budget",
            slices: [this.budgetStyle, this.budgetWidth, this.budgetRadius]
        }),
        new formattingSettings.Group({
            name: "actualBar",
            displayName: "Actual",
            slices: [this.actualStyle, this.actualRatio, this.actualPosition, this.actualGap, this.actualRadius]
        }),
        new formattingSettings.Group({
            name: "barSpacing",
            displayName: "Spacing",
            collapsible: true,
            slices: [this.periodGap, this.kindGap]
        })
    ];
}

class ComparisonCard extends formattingSettings.SimpleCard {
    public pairNames = Array.from({ length: MAX_PAIRS }, (_, index) => new formattingSettings.TextInput({
        name: `pair${index + 1}Name`,
        displayName: `Pair ${index + 1} name`,
        value: "",
        placeholder: "Field name"
    }));

    public revenueName = autoTextInput("revenueName", "Revenue name");
    public costName = autoTextInput("costName", "Cost name");

    name: string = "comparison";
    displayName: string = "Names and pairs";
    slices: formattingSettings.Slice[] = [
        this.revenueName,
        this.costName,
        ...this.pairNames
    ];

    public setComponents(revenue: { shown: boolean; dataName: string }, cost: { shown: boolean; dataName: string }): void {
        this.revenueName.visible = revenue.shown;
        this.revenueName.placeholder = revenue.dataName;
        this.costName.visible = cost.shown;
        this.costName.placeholder = cost.dataName;
    }

    public names(): string[] {
        return this.pairNames.map(slice => (slice.value || "").trim());
    }

    public setPairs(pairs: { name: string; fieldName: string }[]): void {
        const count = pairs.length;
        this.pairNames.forEach((slice, index) => {
            slice.visible = count > 1 && index < count;
            if (index < count) slice.placeholder = pairs[index].fieldName || `Pair ${index + 1}`;
        });
    }
}

class XAxisCard extends formattingSettings.CompositeCard {
    public show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Period labels", value: true });
    public fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", displayName: "Font", value: "Segoe UI" });
    public fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Font size", value: 10 });
    public bold = new formattingSettings.ToggleSwitch({ name: "bold", displayName: "Bold", value: false });
    public italic = new formattingSettings.ToggleSwitch({ name: "italic", displayName: "Italic", value: false });
    public underline = new formattingSettings.ToggleSwitch({ name: "underline", displayName: "Underline", value: false });
    public font = new formattingSettings.FontControl({
        name: "font",
        displayName: "Font",
        fontFamily: this.fontFamily,
        fontSize: this.fontSize,
        bold: this.bold,
        italic: this.italic,
        underline: this.underline
    });
    public color = color("color", "Text color", "#605E5C");
    public orientation = dropdown("orientation", "Orientation", xAxisOrientations);
    public labelLength = dropdown("labelLength", "Label text", xAxisLabelLengths);
    public maxLabelWidth = slider("maxLabelWidth", "Max rotated label width", 120, 30, 300);
    public showParents = new formattingSettings.ToggleSwitch({ name: "showParents", displayName: "Parent levels (year, quarter)", value: true });
    public showSeparators = new formattingSettings.ToggleSwitch({ name: "showSeparators", displayName: "Separator lines between parents", value: true });
    public showComponents = new formattingSettings.ToggleSwitch({ name: "showComponents", displayName: "Component names", value: true });
    public showPairs = new formattingSettings.ToggleSwitch({ name: "showPairs", displayName: "Pair names", value: true });
    public pairFontFamily = new formattingSettings.FontPicker({ name: "pairFontFamily", displayName: "Font", value: "Segoe UI" });
    public pairFontSize = new formattingSettings.NumUpDown({ name: "pairFontSize", displayName: "Font size", value: 10 });
    public pairBold = new formattingSettings.ToggleSwitch({ name: "pairBold", displayName: "Bold", value: false });
    public pairItalic = new formattingSettings.ToggleSwitch({ name: "pairItalic", displayName: "Italic", value: false });
    public pairUnderline = new formattingSettings.ToggleSwitch({ name: "pairUnderline", displayName: "Underline", value: false });
    public pairFont = new formattingSettings.FontControl({
        name: "pairFont",
        displayName: "Pair names font",
        fontFamily: this.pairFontFamily,
        fontSize: this.pairFontSize,
        bold: this.pairBold,
        italic: this.pairItalic,
        underline: this.pairUnderline
    });
    public pairOrientation = dropdown("pairOrientation", "Pair names orientation", xAxisOrientations);
    public pairColorMode = dropdown("pairColorMode", "Pair names color", pairColorModes);
    public pairColor = color("pairColor", "Pair names fixed color", "#605E5C");
    public showLine = new formattingSettings.ToggleSwitch({ name: "showLine", displayName: "Axis line", value: true });
    public lineColor = color("lineColor", "Line color", "#BBBBBB");
    public showTitle = new formattingSettings.ToggleSwitch({ name: "showTitle", displayName: "Title", value: false });
    public title = autoTextInput("title", "Title text");

    name: string = "xAxis";
    displayName: string = "X-axis";
    groups: formattingSettings.Group[] = [
        new formattingSettings.Group({
            name: "xAxisLabels",
            displayName: "Labels",
            slices: [this.show, this.font, this.color, this.orientation, this.labelLength, this.maxLabelWidth]
        }),
        new formattingSettings.Group({
            name: "xAxisRows",
            displayName: "Rows below the bars",
            collapsible: true,
            slices: [this.showParents, this.showSeparators, this.showComponents, this.showPairs, this.pairFont, this.pairOrientation, this.pairColorMode, this.pairColor]
        }),
        new formattingSettings.Group({
            name: "xAxisLine",
            displayName: "Line and title",
            collapsible: true,
            slices: [this.showLine, this.lineColor, this.showTitle, this.title]
        })
    ];

    public applyVisibility(levels: number, components: boolean, pairs: boolean, periodName: string, horizontalChart = false): void {
        const shown = this.show.value;
        [this.font, this.color, this.orientation, this.labelLength].forEach(slice => slice.visible = shown);
        this.maxLabelWidth.visible = shown && enumValue(this.orientation.value) !== "horizontal";
        this.showParents.visible = shown && levels > 1;
        this.showSeparators.visible = shown && levels > 1 && this.showParents.value;
        this.showComponents.visible = components;
        this.showPairs.visible = pairs;
        this.pairFont.visible = pairs && this.showPairs.value;
        this.pairColorMode.visible = this.pairFont.visible;
        this.pairOrientation.visible = this.pairFont.visible;
        this.maxLabelWidth.visible = this.maxLabelWidth.visible
            || (this.pairFont.visible && enumValue(this.pairOrientation.value) !== "horizontal");
        this.pairColor.visible = this.pairFont.visible && enumValue(this.pairColorMode.value) === "fixed";
        this.groups[1].visible = this.showParents.visible || components || pairs;
        this.lineColor.visible = this.showLine.value;
        this.title.visible = this.showTitle.value;
        this.title.placeholder = periodName;
        this.displayName = horizontalChart ? "Category axis" : "X-axis";
        this.maxLabelWidth.displayName = horizontalChart ? "Max label width" : "Max rotated label width";
        if (horizontalChart) {
            this.orientation.visible = false;
            this.pairOrientation.visible = false;
            this.labelLength.visible = false;
            this.maxLabelWidth.visible = shown || this.pairFont.visible;
        }
    }
}

abstract class ValueLabelCard extends formattingSettings.CompositeCard {
    public fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", displayName: "Font", value: "Segoe UI" });
    public fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Font size", value: 10 });
    public color: formattingSettings.ColorPicker;
    public bold: formattingSettings.ToggleSwitch;
    public italic = new formattingSettings.ToggleSwitch({ name: "italic", displayName: "Italic", value: false });
    public underline = new formattingSettings.ToggleSwitch({ name: "underline", displayName: "Underline", value: false });
    public font: formattingSettings.FontControl;
    public outline = new formattingSettings.ToggleSwitch({ name: "outline", displayName: "Text outline", value: true });
    public outlineColor = color("outlineColor", "Outline color", "#FFFFFF");
    public outlineWidth = slider("outlineWidth", "Outline thickness", 2, 0, 10);
    public backdrop = new formattingSettings.ToggleSwitch({ name: "backdrop", displayName: "Backdrop", value: false });
    public backdropColor = color("backdropColor", "Backdrop color", "#FFFFFF");
    public backdropTransparency = slider("backdropTransparency", "Backdrop transparency (%)", 10, 0, 100);
    public padding = slider("padding", "Backdrop size (padding)", 3, 0, 12);
    public radius = slider("radius", "Backdrop corner radius", 3, 0, 12);
    public borderWidth = slider("borderWidth", "Border thickness", 0, 0, 5);
    public borderColor = color("borderColor", "Border color", "#605E5C");
    public pointer = new formattingSettings.ToggleSwitch({ name: "pointer", displayName: "Pointer to bar", value: true });
    public pointerColor: formattingSettings.ColorPicker;
    public abstract show: formattingSettings.ItemDropdown;
    public abstract position: formattingSettings.ItemDropdown;
    public abstract hPosition: formattingSettings.ItemDropdown;
    groups: formattingSettings.Group[] = [];

    constructor(textColor: string, bold: boolean) {
        super();
        this.color = color("color", "Text color", textColor);
        this.bold = new formattingSettings.ToggleSwitch({ name: "bold", displayName: "Bold", value: bold });
        this.font = new formattingSettings.FontControl({
            name: "font",
            displayName: "Font",
            fontFamily: this.fontFamily,
            fontSize: this.fontSize,
            bold: this.bold,
            italic: this.italic,
            underline: this.underline
        });
        this.pointerColor = color("pointerColor", "Pointer color", "#605E5C");
    }

    protected appearanceSlices(): formattingSettings.Slice[] {
        return [
            this.outline, this.outlineColor, this.outlineWidth, this.backdrop,
            this.backdropColor, this.backdropTransparency, this.padding, this.radius, this.borderWidth, this.borderColor
        ];
    }

    protected commonSlices(): formattingSettings.Slice[] {
        return [this.font, this.color, this.pointer, this.pointerColor];
    }

    public applyVisibility(horizontal = false): void {
        const enabled = enumValue(this.show.value) !== "none";
        const side = !horizontal && ["left", "right", "side"].includes(enumValue(this.position.value));
        this.position.visible = enabled && !horizontal;
        this.hPosition.visible = enabled && horizontal;
        this.font.visible = enabled;
        this.color.visible = enabled;
        this.pointer.visible = enabled && side;
        this.pointerColor.visible = enabled && side && this.pointer.value;
        if (this.groups[1]) this.groups[1].visible = enabled;
        this.outlineColor.visible = this.outline.value;
        this.outlineWidth.visible = this.outline.value;
        [this.backdropColor, this.backdropTransparency, this.padding, this.radius, this.borderWidth].forEach(slice => slice.visible = this.backdrop.value);
        this.borderColor.visible = this.backdrop.value && Number(this.borderWidth.value) > 0;
    }
}

class BudgetLabelCard extends ValueLabelCard {
    public show = dropdown("show", "Show", budgetLabelModes);
    public position = dropdown("position", "Position", budgetPositions);
    public hPosition = dropdown("hPosition", "Position", budgetHPositions);
    public combine = new formattingSettings.ToggleSwitch({ name: "combine", displayName: "Combine with actual label (budget / actual)", value: true });
    public separator = textInput("separator", "Separator", " / ");

    name: string = "budgetLabel";
    displayName: string = "Budget labels";
    constructor() {
        super("#333333", false);
        this.groups = [
            new formattingSettings.Group({
                name: "budgetLabelMain",
                displayName: "Label",
                slices: [this.show, this.position, this.hPosition, this.combine, this.separator, ...this.commonSlices()]
            }),
            new formattingSettings.Group({
                name: "budgetLabelAppearance",
                displayName: "Advanced appearance",
                collapsible: true,
                slices: this.appearanceSlices()
            })
        ];
    }
}

class ActualLabelCard extends ValueLabelCard {
    public show = dropdown("show", "Show", actualLabelModes);
    public content = dropdown("content", "Label shows", actualContents);
    public position = dropdown("position", "Position", actualLabelPositions);
    public hPosition = dropdown("hPosition", "Position", actualHPositions);

    name: string = "actualLabel";
    displayName: string = "Actual labels";
    constructor() {
        super("#111111", true);
        this.groups = [
            new formattingSettings.Group({
                name: "actualLabelMain",
                displayName: "Label",
                slices: [this.show, this.content, this.position, this.hPosition, ...this.commonSlices()]
            }),
            new formattingSettings.Group({
                name: "actualLabelAppearance",
                displayName: "Advanced appearance",
                collapsible: true,
                slices: this.appearanceSlices()
            })
        ];
    }
}

const PAIR_COLORS = ["#A5A5A5", "#118DFF", "#E66C37", "#6B007B", "#E044A7", "#744EC2", "#D9B300", "#197278", "#8A3FFC", "#005D5D"];

export interface ColorTargets {
    pairs: string[];
    revenue: string | null;
    cost: string | null;
    single: string | null;
    legend?: { name: string; color: string; selector: unknown }[];
}

class ColorsCard extends formattingSettings.SimpleCard {
    private legendColors: formattingSettings.ColorPicker[] = [];
    public colorBy = dropdown("colorBy", "Color budget", colorModes);
    public revenueColor = color("revenueColor", "Revenue budget", "#118DFF");
    public costColor = color("costColor", "Cost budget", "#E66C37");
    public netColor = color("netColor", "Budget", "#118DFF");
    public pairColors = PAIR_COLORS.map((value, index) => color(`pair${index + 1}Color`, `Pair ${index + 1} budget`, value));
    public actualColor = color("actualColor", "Actual", "#252423");
    public highlightOverrun = new formattingSettings.ToggleSwitch({ name: "highlightOverrun", displayName: "Flag actuals above budget", value: false });
    public overrunColor = color("overrunColor", "Overrun color", "#C4314B");

    name: string = "colors";
    displayName: string = "Colors";
    slices: formattingSettings.Slice[] = [
        this.colorBy, ...this.pairColors, this.revenueColor, this.costColor, this.netColor,
        this.actualColor, this.highlightOverrun, this.overrunColor
    ];

    public setTargets(targets: ColorTargets): void {
        const legend = targets.legend || [];
        this.legendColors = legend.map(item => new formattingSettings.ColorPicker({
            name: "legendFill",
            displayName: item.name,
            value: { value: item.color },
            selector: item.selector as powerbi.data.Selector
        }));
        this.slices = [
            this.colorBy, ...this.legendColors, ...this.pairColors, this.revenueColor, this.costColor, this.netColor,
            this.actualColor, this.highlightOverrun, this.overrunColor
        ];
        this.colorBy.visible = !legend.length;
        const byComponent = !legend.length && enumValue(this.colorBy.value) !== "group";
        const pairs = targets.pairs.length > 1;
        this.pairColors.forEach((slice, index) => {
            slice.visible = byComponent && pairs && index < targets.pairs.length;
            if (index < targets.pairs.length) slice.displayName = `${targets.pairs[index]} budget`;
        });
        const entries: [formattingSettings.ColorPicker, string | null][] = [
            [this.revenueColor, targets.revenue],
            [this.costColor, targets.cost],
            [this.netColor, targets.single]
        ];
        entries.forEach(([slice, label]) => {
            slice.visible = byComponent && !pairs && label != null;
            if (label != null) slice.displayName = `${label} budget`;
        });
        this.overrunColor.visible = this.highlightOverrun.value;
    }
}

export interface LegendTargets {
    pairs: string[];
    revenue: string | null;
    cost: string | null;
    budget: string | null;
    actual: string;
    target: string | null;
    overrun: boolean;
}

class LegendCard extends formattingSettings.CompositeCard {
    public position = dropdown("position", "Position", legendPositions);
    public fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", displayName: "Font", value: "Segoe UI" });
    public fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Font size", value: 11 });
    public bold = new formattingSettings.ToggleSwitch({ name: "bold", displayName: "Bold", value: false });
    public italic = new formattingSettings.ToggleSwitch({ name: "italic", displayName: "Italic", value: false });
    public underline = new formattingSettings.ToggleSwitch({ name: "underline", displayName: "Underline", value: false });
    public font = new formattingSettings.FontControl({
        name: "font",
        displayName: "Font",
        fontFamily: this.fontFamily,
        fontSize: this.fontSize,
        bold: this.bold,
        italic: this.italic,
        underline: this.underline
    });
    public color = color("color", "Text color", "#333333");
    public revenueLabel = autoTextInput("revenueLabel", "Revenue budget");
    public costLabel = autoTextInput("costLabel", "Cost budget");
    public budgetLabel = autoTextInput("budgetLabel", "Budget");
    public pairLabels = Array.from({ length: MAX_PAIRS }, (_, index) => autoTextInput(`pair${index + 1}Label`, `Pair ${index + 1}`));
    public actualLabel = autoTextInput("actualLabel", "Actual");
    public targetLabel = autoTextInput("targetLabel", "Target");
    public overrunText = textInput("overrunText", "Overrun", "Boven begroting");
    public showRevenue = legendToggle("showRevenue", "Revenue budget");
    public showCost = legendToggle("showCost", "Cost budget");
    public showBudget = legendToggle("showBudget", "Budget");
    public showPairs = Array.from({ length: MAX_PAIRS }, (_, index) => legendToggle(`showPair${index + 1}`, `Pair ${index + 1}`));
    public showActual = legendToggle("showActual", "Actual");
    public showTarget = legendToggle("showTarget", "Target");
    public showOverrun = legendToggle("showOverrun", "overrun");
    public shareText = textInput("shareText", "Share text (tooltip)", "% van jaarbegroting");

    name: string = "legend";
    displayName: string = "Legend and tooltip";
    groups: formattingSettings.Group[] = [
        new formattingSettings.Group({
            name: "legendMain",
            displayName: "Legend",
            slices: [this.position, this.font, this.color]
        }),
        new formattingSettings.Group({
            name: "legendLabels",
            displayName: "Legend labels",
            slices: [
                this.showRevenue, this.revenueLabel, this.showCost, this.costLabel, this.showBudget, this.budgetLabel,
                ...this.pairLabels.flatMap((slice, index) => [this.showPairs[index], slice]),
                this.showActual, this.actualLabel, this.showTarget, this.targetLabel, this.showOverrun, this.overrunText
            ]
        }),
        new formattingSettings.Group({
            name: "legendTooltip",
            displayName: "Tooltip",
            collapsible: true,
            slices: [this.shareText]
        })
    ];

    public pairTexts(): string[] {
        return this.pairLabels.map(slice => (slice.value || "").trim());
    }

    public setTargets(targets: LegendTargets): void {
        const shown = enumValue(this.position.value) !== "none";
        const pairs = targets.pairs.length > 1;
        this.font.visible = shown;
        this.color.visible = shown;
        this.groups[1].visible = shown;
        const entries: [formattingSettings.ToggleSwitch, formattingSettings.TextInput, string | null][] = [
            [this.showRevenue, this.revenueLabel, pairs ? null : targets.revenue],
            [this.showCost, this.costLabel, pairs ? null : targets.cost],
            [this.showBudget, this.budgetLabel, pairs ? null : targets.budget],
            [this.showActual, this.actualLabel, targets.actual],
            [this.showTarget, this.targetLabel, targets.target],
            ...this.pairLabels.map((slice, index): [formattingSettings.ToggleSwitch, formattingSettings.TextInput, string | null] =>
                [this.showPairs[index], slice, pairs && index < targets.pairs.length ? targets.pairs[index] : null])
        ];
        entries.forEach(([toggle, slice, auto]) => {
            toggle.visible = auto != null;
            slice.visible = auto != null && toggle.value;
            if (auto == null) return;
            toggle.displayName = `Show ${auto}`;
            slice.displayName = "Label";
            slice.placeholder = auto;
        });
        this.showOverrun.visible = targets.overrun;
        this.showOverrun.displayName = "Show overrun";
        this.overrunText.visible = targets.overrun && this.showOverrun.value;
        this.overrunText.displayName = "Label";
    }

    public hiddenEntries(): LegendHidden {
        return {
            revenue: !this.showRevenue.value,
            cost: !this.showCost.value,
            budget: !this.showBudget.value,
            actual: !this.showActual.value,
            target: !this.showTarget.value,
            overrun: !this.showOverrun.value,
            pairs: this.showPairs.map(toggle => !toggle.value)
        };
    }
}

class TargetCard extends formattingSettings.CompositeCard {
    public shape = dropdown("shape", "Shape", targetShapes);
    public barLength = slider("barLength", "Length (% of actual bar width)", 200, 50, 400);
    public barThickness = slider("barThickness", "Thickness", 3, 1, 30);
    public barColor = color("barColor", "Color", "#C4314B");
    public dotSize = slider("dotSize", "Size", 10, 3, 40);
    public dotFill = color("dotFill", "Fill", "#FFFFFF");
    public dotBorderColor = color("dotBorderColor", "Border color", "#C4314B");
    public dotBorderWidth = slider("dotBorderWidth", "Border thickness", 2, 0, 10);

    name: string = "target";
    displayName: string = "Target";
    groups: formattingSettings.Group[] = [
        new formattingSettings.Group({ name: "targetShape", displayName: "Shape", slices: [this.shape] }),
        new formattingSettings.Group({ name: "targetBar", displayName: "Bar", slices: [this.barLength, this.barThickness, this.barColor] }),
        new formattingSettings.Group({ name: "targetDot", displayName: "Dot", slices: [this.dotSize, this.dotFill, this.dotBorderColor, this.dotBorderWidth] })
    ];

    public applyVisibility(hasTarget: boolean): void {
        this.visible = hasTarget;
        const dot = enumValue(this.shape.value) === "dot";
        this.groups[1].visible = !dot;
        this.groups[2].visible = dot;
    }
}

class LabelsCard extends formattingSettings.CompositeCard {
    public valueFormat = dropdown("valueFormat", "Value format", valueFormats);
    public displayUnits = dropdown("displayUnits", "Display units", displayUnits);
    public decimals = new formattingSettings.NumUpDown({ name: "decimals", displayName: "Decimals (-1 = auto)", value: -1 });
    public fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", displayName: "Font", value: "Segoe UI" });
    public fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Font size", value: 10 });
    public bold = new formattingSettings.ToggleSwitch({ name: "bold", displayName: "Bold", value: false });
    public italic = new formattingSettings.ToggleSwitch({ name: "italic", displayName: "Italic", value: false });
    public underline = new formattingSettings.ToggleSwitch({ name: "underline", displayName: "Underline", value: false });
    public font = new formattingSettings.FontControl({
        name: "font",
        displayName: "Font",
        fontFamily: this.fontFamily,
        fontSize: this.fontSize,
        bold: this.bold,
        italic: this.italic,
        underline: this.underline
    });

    name: string = "labels";
    displayName: string = "Number format and text";
    groups: formattingSettings.Group[] = [
        new formattingSettings.Group({
            name: "numberFormat",
            displayName: "Number format",
            slices: [this.valueFormat, this.displayUnits, this.decimals]
        }),
        new formattingSettings.Group({
            name: "axisText",
            displayName: "Axis and legend text",
            slices: [this.font]
        })
    ];
}

export class VisualSettings extends formattingSettings.Model {
    public layout = new LayoutCard();
    public grouping = new GroupingCard();
    public bars = new BarsCard();
    public comparison = new ComparisonCard();
    public xAxis = new XAxisCard();
    public colors = new ColorsCard();
    public legend = new LegendCard();
    public labels = new LabelsCard();
    public budgetLabel = new BudgetLabelCard();
    public actualLabel = new ActualLabelCard();
    public target = new TargetCard();
    public cards: formattingSettings.Cards[] = [
        this.layout, this.grouping, this.bars, this.target, this.comparison, this.xAxis, this.budgetLabel, this.actualLabel,
        this.colors, this.labels, this.legend
    ];

    public applyVisibility(): void {
        this.layout.columns.visible = enumValue(this.layout.arrangement.value) === "grid";
        const horizontal = this.isHorizontal();
        this.layout.sharedAxis.displayName = horizontal ? "Same value axis for all panels" : "Same y-axis for all panels";
        this.layout.showYAxis.displayName = horizontal ? "Show value axis labels" : "Show y-axis labels";
        this.layout.minPeriodWidth.displayName = horizontal ? "Minimum period height (0 = fit)" : "Minimum period width (0 = fit)";
        const actualBar = enumValue(this.bars.actualStyle.value) === "bar";
        this.bars.actualRatio.visible = actualBar;
        this.bars.actualPosition.visible = actualBar;
        this.bars.actualGap.visible = actualBar && enumValue(this.bars.actualPosition.value) === "beside";
        const auto = enumValue(this.labels.valueFormat.value) === "auto";
        this.labels.displayUnits.visible = auto;
        this.bars.kindGap.visible = enumValue(this.grouping.componentMode.value) === "split";
        this.budgetLabel.applyVisibility(horizontal);
        this.actualLabel.applyVisibility(horizontal);
        const actualShown = enumValue(this.actualLabel.show.value) !== "none";
        const budgetShown = enumValue(this.budgetLabel.show.value) !== "none";
        this.actualLabel.content.visible = actualShown;
        this.budgetLabel.combine.visible = horizontal && budgetShown && actualShown;
        this.budgetLabel.separator.visible = this.budgetLabel.combine.visible && this.budgetLabel.combine.value;
    }

    public isHorizontal(): boolean {
        return enumValue(this.layout.orientation.value) === "horizontal";
    }
}

export function enumValue(value: unknown): string {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "value" in value) return String((value as { value: unknown }).value);
    return "";
}
