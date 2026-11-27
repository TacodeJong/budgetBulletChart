const PAIR_COLORS = ["#A5A5A5", "#118DFF", "#E66C37", "#6B007B", "#E044A7", "#744EC2", "#D9B300", "#197278", "#8A3FFC", "#005D5D"];

type Item = Record<string, unknown>;
type Option = [string, string];

function dropdown(ref: string, label: string, options: Option[], defaultValue: string, show?: (data: any) => boolean): Item {
    return {
        type: "string",
        component: "dropdown",
        label,
        ref: `props.${ref}`,
        options: options.map(([value, text]) => ({ value, label: text })),
        defaultValue,
        show
    };
}

function toggle(ref: string, label: string, defaultValue: boolean, show?: (data: any) => boolean): Item {
    return {
        type: "boolean",
        component: "switch",
        label,
        ref: `props.${ref}`,
        options: [{ value: true, label: "On" }, { value: false, label: "Off" }],
        defaultValue,
        show
    };
}

function slider(ref: string, label: string, min: number, max: number, defaultValue: number, show?: (data: any) => boolean): Item {
    return { type: "number", component: "slider", label, ref: `props.${ref}`, min, max, step: 1, defaultValue, show };
}

function integer(ref: string, label: string, min: number, max: number, defaultValue: number, show?: (data: any) => boolean): Item {
    return { type: "integer", label, ref: `props.${ref}`, min, max, defaultValue, show };
}

function textItem(ref: string, label: string, defaultValue = "", show?: (data: any) => boolean): Item {
    return { type: "string", label, ref: `props.${ref}`, defaultValue, show };
}

function colorItem(ref: string, label: string, color: string, show?: (data: any) => boolean): Item {
    return {
        type: "object",
        component: "color-picker",
        label,
        ref: `props.${ref}`,
        defaultValue: { color, index: -1 },
        show
    };
}

function section(label: string, items: Record<string, Item>): Item {
    return { type: "items", label, items };
}

const horizontal = (data: any) => data.props && data.props.orientation === "horizontal";
const vertical = (data: any) => !data.props || data.props.orientation !== "horizontal";
const actualBar = (data: any) => !data.props || data.props.actualStyle !== "marker";
const beside = (data: any) => actualBar(data) && data.props && data.props.actualBarPosition === "beside";
const pairs = (count: number) => (data: any) => data.props && Number(data.props.pairCount) >= count;
const hasTarget = (data: any) => data.props && data.props.hasTarget === true;
const grid = (data: any) => data.props && data.props.arrangement === "grid";
const split = (data: any) => !data.props || data.props.componentMode === "split";

function labelItems(prefix: string, positions: Option[], hPositions: Option[], bold: boolean): Record<string, Item> {
    const side = (data: any) => {
        const position = data.props && data.props[`${prefix}LabelPosition`];
        return position === "left" || position === "right" || position === "side";
    };
    return {
        mode: dropdown(`${prefix}LabelMode`, "Show", prefix === "budget"
            ? [["latest", "Latest period"], ["all", "All periods"], ["none", "Off"]]
            : [["auto", "Auto"], ["all", "All periods"], ["latest", "Latest period"], ["none", "Off"]], prefix === "budget" ? "latest" : "auto"),
        ...(prefix === "actual" ? {
            content: dropdown("actualContent", "Label shows", [["value", "Value"], ["share", "% of budget"], ["both", "Value and % of budget"]], "value")
        } : {}),
        position: dropdown(`${prefix}LabelPosition`, "Position", positions, positions[0][0], vertical),
        hPosition: dropdown(`${prefix}LabelHPosition`, "Position", hPositions, hPositions[0][0], horizontal),
        combine: toggle("budgetCombine", "Combine with actual label", true, prefix === "budget" ? horizontal : () => false),
        separator: textItem("budgetSeparator", "Separator", " / ", prefix === "budget" ? (data) => horizontal(data) && data.props.budgetCombine !== false : () => false),
        fontFamily: textItem(`${prefix}LabelFontFamily`, "Font", "Segoe UI"),
        fontSize: slider(`${prefix}LabelFontSize`, "Font size", 6, 24, 10),
        color: colorItem(`${prefix}LabelColor`, "Text color", prefix === "budget" ? "#333333" : "#111111"),
        bold: toggle(`${prefix}LabelBold`, "Bold", bold),
        italic: toggle(`${prefix}LabelItalic`, "Italic", false),
        underline: toggle(`${prefix}LabelUnderline`, "Underline", false),
        pointer: toggle(`${prefix}LabelPointer`, "Pointer to bar", true, (data) => vertical(data) && side(data)),
        pointerColor: colorItem(`${prefix}LabelPointerColor`, "Pointer color", "#605E5C", (data) => vertical(data) && side(data) && data.props[`${prefix}LabelPointer`] !== false),
        outline: toggle(`${prefix}LabelOutline`, "Text outline", true),
        outlineColor: colorItem(`${prefix}LabelOutlineColor`, "Outline color", "#FFFFFF"),
        outlineWidth: slider(`${prefix}LabelOutlineWidth`, "Outline thickness", 0, 10, 2),
        backdrop: toggle(`${prefix}LabelBackdrop`, "Backdrop", false),
        backdropColor: colorItem(`${prefix}LabelBackdropColor`, "Backdrop color", "#FFFFFF", (data) => data.props && data.props[`${prefix}LabelBackdrop`] === true),
        backdropTransparency: slider(`${prefix}LabelBackdropTransparency`, "Backdrop transparency (%)", 0, 100, 10, (data) => data.props && data.props[`${prefix}LabelBackdrop`] === true),
        padding: slider(`${prefix}LabelPadding`, "Backdrop padding", 0, 12, 3, (data) => data.props && data.props[`${prefix}LabelBackdrop`] === true),
        radius: slider(`${prefix}LabelRadius`, "Backdrop corner radius", 0, 12, 3, (data) => data.props && data.props[`${prefix}LabelBackdrop`] === true),
        borderWidth: slider(`${prefix}LabelBorderWidth`, "Border thickness", 0, 5, 0, (data) => data.props && data.props[`${prefix}LabelBackdrop`] === true),
        borderColor: colorItem(`${prefix}LabelBorderColor`, "Border color", "#605E5C", (data) => data.props && data.props[`${prefix}LabelBackdrop`] === true && Number(data.props[`${prefix}LabelBorderWidth`]) > 0)
    };
}

function pairFields(kind: "name" | "color" | "legend" | "show"): Record<string, Item> {
    const items: Record<string, Item> = {};
    for (let index = 1; index <= 10; index += 1) {
        const show = pairs(index);
        if (kind === "name") items[`name${index}`] = textItem(`pair${index}Name`, `Pair ${index} name`, "", show);
        if (kind === "color") items[`color${index}`] = colorItem(`pair${index}Color`, `Pair ${index} budget`, PAIR_COLORS[index - 1], (data) => show(data) && (!data.props || data.props.colorBy !== "group"));
        if (kind === "legend") items[`label${index}`] = textItem(`legendPair${index}`, `Pair ${index} label`, "", show);
        if (kind === "show") items[`show${index}`] = toggle(`legendShowPair${index}`, `Show pair ${index}`, true, show);
    }
    return items;
}

export function definition(): Item {
    return {
        type: "items",
        component: "accordion",
        items: {
            dimensions: { uses: "dimensions", min: 1, max: 8 },
            measures: { uses: "measures", min: 1, max: 40 },
            sorting: { uses: "sorting" },
            addons: {
                uses: "addons",
                items: {
                    dataHandling: { uses: "dataHandling" }
                }
            },
            dataMap: section("Data mapping", {
                about: {
                    component: "text",
                    label: "Dimensions, in order: period levels, then group, then component. Measures, in order: budget, actual, and target if enabled, repeated for each pair. Extra measures become tooltip fields."
                },
                periodDimensions: integer("periodDimensions", "Period dimensions", 1, 6, 1),
                hasGroup: toggle("hasGroup", "Next dimension is the group", true),
                hasComponent: toggle("hasComponent", "Next dimension is the component", true),
                pairCount: integer("pairCount", "Comparison pairs", 1, 10, 1),
                hasTarget: toggle("hasTarget", "Each pair has a target measure", false),
                panelMode: dropdown("panelMode", "Small multiples", [["split", "One panel per small multiple"], ["combine", "Combine into one panel"]], "split"),
                groupSort: dropdown("groupSort", "Sort panels", [["alpha", "Alphabetical"], ["data", "Load order"], ["budget", "Largest budget first"], ["actual", "Largest actual first"]], "alpha"),
                periodSort: dropdown("periodSort", "Sort periods", [["auto", "Auto"], ["asc", "Ascending"], ["desc", "Descending"], ["data", "Load order"]], "auto"),
                componentMode: dropdown("componentMode", "Components", [["split", "Revenue and costs side by side"], ["revenue", "Revenue only"], ["cost", "Costs only"], ["net", "Net result (revenue minus costs)"]], "split"),
                revenueValues: textItem("revenueValues", "Revenue values (comma separated)", "opbrengst, baten, inkomst, omzet, revenue, income"),
                totalGroupName: textItem("totalGroupName", "Panel title without small multiples", "Totaal"),
                revenueName: textItem("revenueName", "Revenue name", ""),
                costName: textItem("costName", "Cost name", ""),
                ...pairFields("name")
            }),
            layout: section("Layout", {
                orientation: dropdown("orientation", "Bar direction", [["vertical", "Vertical bars"], ["horizontal", "Horizontal bars"]], "vertical"),
                arrangement: dropdown("arrangement", "Panels", [["stack", "Stacked"], ["grid", "Grid"], ["row", "Side by side"]], "stack"),
                columns: integer("columns", "Columns (0 = auto)", 0, 12, 0, grid),
                sharedAxis: toggle("sharedAxis", "Same value axis for all panels", false),
                showYAxis: toggle("showYAxis", "Show value axis labels", true),
                showGrid: toggle("showGrid", "Show gridlines", true),
                minPlotHeight: integer("minPlotHeight", "Minimum panel height", 40, 600, 110),
                maxPlotHeight: integer("maxPlotHeight", "Maximum panel height", 40, 1000, 220),
                minPeriodWidth: integer("minPeriodWidth", "Minimum period size (0 = fit)", 0, 400, 0)
            }),
            bars: section("Bars", {
                budgetStyle: dropdown("budgetStyle", "Budget style", [["solid", "Solid"], ["light", "Light"], ["outline", "Outline"]], "solid"),
                budgetWidth: slider("budgetWidth", "Budget bar width (%)", 20, 100, 87),
                budgetRadius: slider("budgetRadius", "Budget corner radius", 0, 20, 0),
                actualStyle: dropdown("actualStyle", "Actual style", [["bar", "Bar"], ["marker", "Marker line"]], "bar"),
                actualRatio: slider("actualRatio", "Actual width (% of budget bar)", 5, 100, 38, actualBar),
                actualBarPosition: dropdown("actualBarPosition", "Actual position", [["overlay", "On top of budget"], ["beside", "Next to budget"]], "overlay", actualBar),
                actualGap: slider("actualGap", "Budget–actual gap (px)", 0, 30, 3, beside),
                actualRadius: slider("actualRadius", "Actual corner radius", 0, 20, 0),
                periodGap: slider("periodGap", "Gap between periods (%)", 0, 80, 40),
                kindGap: slider("kindGap", "Revenue–cost gap (%)", 0, 60, 0, split)
            }),
            axis: section("Category axis", {
                xShow: toggle("xShow", "Period labels", true),
                xFontFamily: textItem("xFontFamily", "Font", "Segoe UI"),
                xFontSize: slider("xFontSize", "Font size", 7, 24, 10),
                xBold: toggle("xBold", "Bold", false),
                xItalic: toggle("xItalic", "Italic", false),
                xUnderline: toggle("xUnderline", "Underline", false),
                xColor: colorItem("xColor", "Text color", "#605E5C"),
                xOrientation: dropdown("xOrientation", "Orientation", [["auto", "Auto (rotate when crowded)"], ["horizontal", "Horizontal"], ["diagonal", "Diagonal (45°)"], ["vertical", "Vertical (90°)"]], "auto", vertical),
                xLabelLength: dropdown("xLabelLength", "Label text", [["auto", "Shorten to fit"], ["full", "Full text"]], "auto", vertical),
                xMaxLabelWidth: slider("xMaxLabelWidth", "Max label width", 30, 300, 120),
                xShowParents: toggle("xShowParents", "Parent levels (year, quarter)", true),
                xShowSeparators: toggle("xShowSeparators", "Separator lines between parents", true),
                xShowComponents: toggle("xShowComponents", "Component names", true),
                xShowPairs: toggle("xShowPairs", "Pair names", true),
                xPairFontFamily: textItem("xPairFontFamily", "Pair font", "Segoe UI"),
                xPairFontSize: slider("xPairFontSize", "Pair font size", 7, 24, 10),
                xPairBold: toggle("xPairBold", "Pair bold", false),
                xPairItalic: toggle("xPairItalic", "Pair italic", false),
                xPairUnderline: toggle("xPairUnderline", "Pair underline", false),
                xPairOrientation: dropdown("xPairOrientation", "Pair names orientation", [["auto", "Auto (rotate when crowded)"], ["horizontal", "Horizontal"], ["diagonal", "Diagonal (45°)"], ["vertical", "Vertical (90°)"]], "auto", vertical),
                xPairColorMode: dropdown("xPairColorMode", "Pair names color", [["pair", "Pair budget color"], ["fixed", "Fixed color"]], "pair"),
                xPairColor: colorItem("xPairColor", "Pair names fixed color", "#605E5C", (data) => data.props && data.props.xPairColorMode === "fixed"),
                xShowLine: toggle("xShowLine", "Axis line", true),
                xLineColor: colorItem("xLineColor", "Line color", "#BBBBBB"),
                xShowTitle: toggle("xShowTitle", "Title", false),
                xTitle: textItem("xTitle", "Title text", "", (data) => data.props && data.props.xShowTitle === true)
            }),
            budgetLabels: section("Budget labels", labelItems("budget", [
                ["left", "Left of bar"],
                ["side", "Outer side"],
                ["above", "Above bar"],
                ["inside", "Inside bar"]
            ], [
                ["after", "Behind the bar"],
                ["insideEnd", "Inside bar, at the end"],
                ["insideBase", "Inside bar, after the actual"]
            ], false)),
            actualLabels: section("Actual labels", labelItems("actual", [
                ["right", "Right of bar"],
                ["side", "Outer side"],
                ["above", "Above bar"],
                ["inside", "Inside bar"]
            ], [
                ["end", "At the end of the actual bar"],
                ["after", "Behind the bar"],
                ["insideEnd", "Inside bar, at the end"],
                ["insideBase", "Inside bar, at the start"]
            ], true)),
            colors: section("Colors", {
                colorBy: dropdown("colorBy", "Color budget", [["component", "Per component or pair"], ["group", "By group"]], "component"),
                ...pairFields("color"),
                revenueColor: colorItem("revenueColor", "Revenue budget", "#118DFF", (data) => !data.props || data.props.colorBy !== "group"),
                costColor: colorItem("costColor", "Cost budget", "#E66C37", (data) => !data.props || data.props.colorBy !== "group"),
                netColor: colorItem("netColor", "Budget", "#118DFF", (data) => !data.props || data.props.colorBy !== "group"),
                actualColor: colorItem("actualColor", "Actual", "#252423"),
                highlightOverrun: toggle("highlightOverrun", "Flag actuals above budget", false),
                overrunColor: colorItem("overrunColor", "Overrun color", "#C4314B", (data) => data.props && data.props.highlightOverrun === true)
            }),
            numbers: section("Number format and text", {
                valueFormat: dropdown("valueFormat", "Value format", [["auto", "Auto"], ["compact", "Compact (12.3k)"], ["number", "Number"], ["percent", "Percentage"]], "auto"),
                displayUnits: dropdown("displayUnits", "Display units", [["0", "Auto"], ["1", "None"], ["1000", "Thousands"], ["1000000", "Millions"], ["1000000000", "Billions"]], "0"),
                decimals: integer("decimals", "Decimals (-1 = auto)", -1, 6, -1),
                fontFamily: textItem("fontFamily", "Axis and legend font", "Segoe UI"),
                fontSize: slider("fontSize", "Font size", 7, 20, 10),
                fontBold: toggle("fontBold", "Bold", false),
                fontItalic: toggle("fontItalic", "Italic", false),
                fontUnderline: toggle("fontUnderline", "Underline", false)
            }),
            legend: section("Legend and tooltip", {
                legendPosition: dropdown("legendPosition", "Position", [["top", "Top"], ["bottom", "Bottom"], ["left", "Left"], ["right", "Right"], ["none", "Off"]], "top"),
                legendFontFamily: textItem("legendFontFamily", "Font", "Segoe UI"),
                legendFontSize: slider("legendFontSize", "Font size", 7, 24, 11),
                legendBold: toggle("legendBold", "Bold", false),
                legendItalic: toggle("legendItalic", "Italic", false),
                legendUnderline: toggle("legendUnderline", "Underline", false),
                legendColor: colorItem("legendColor", "Text color", "#333333"),
                legendShowRevenue: toggle("legendShowRevenue", "Show revenue", true),
                legendRevenue: textItem("legendRevenue", "Revenue label", ""),
                legendShowCost: toggle("legendShowCost", "Show cost", true),
                legendCost: textItem("legendCost", "Cost label", ""),
                legendShowBudget: toggle("legendShowBudget", "Show budget", true),
                legendBudget: textItem("legendBudget", "Budget label", ""),
                ...pairFields("show"),
                ...pairFields("legend"),
                legendShowActual: toggle("legendShowActual", "Show actual", true),
                legendActual: textItem("legendActual", "Actual label", ""),
                legendShowTarget: toggle("legendShowTarget", "Show target", true, hasTarget),
                legendTarget: textItem("legendTarget", "Target label", "", hasTarget),
                legendShowOverrun: toggle("legendShowOverrun", "Show overrun", true, (data) => data.props && data.props.highlightOverrun === true),
                overrunText: textItem("overrunText", "Overrun label", "Boven begroting"),
                shareText: textItem("shareText", "Share text (tooltip)", "% van jaarbegroting")
            }),
            target: section("Target", {
                targetShape: dropdown("targetShape", "Shape", [["bar", "Bar"], ["dot", "Dot"]], "bar", hasTarget),
                targetBarLength: slider("targetBarLength", "Length (% of actual bar width)", 50, 400, 200, (data) => hasTarget(data) && (!data.props || data.props.targetShape !== "dot")),
                targetBarThickness: slider("targetBarThickness", "Thickness", 1, 30, 3, (data) => hasTarget(data) && (!data.props || data.props.targetShape !== "dot")),
                targetBarColor: colorItem("targetBarColor", "Color", "#C4314B", (data) => hasTarget(data) && (!data.props || data.props.targetShape !== "dot")),
                targetDotSize: slider("targetDotSize", "Size", 3, 40, 10, (data) => hasTarget(data) && data.props.targetShape === "dot"),
                targetDotFill: colorItem("targetDotFill", "Fill", "#FFFFFF", (data) => hasTarget(data) && data.props.targetShape === "dot"),
                targetDotBorderColor: colorItem("targetDotBorderColor", "Border color", "#C4314B", (data) => hasTarget(data) && data.props.targetShape === "dot"),
                targetDotBorderWidth: slider("targetDotBorderWidth", "Border thickness", 0, 10, 2, (data) => hasTarget(data) && data.props.targetShape === "dot")
            }),
            appearance: { uses: "settings" }
        }
    };
}

export const DEFAULT_PROPS: Record<string, unknown> = {
    periodDimensions: 1,
    hasGroup: true,
    hasComponent: true,
    pairCount: 1,
    hasTarget: false,
    panelMode: "split",
    groupSort: "alpha",
    periodSort: "auto",
    componentMode: "split",
    revenueValues: "opbrengst, baten, inkomst, omzet, revenue, income",
    totalGroupName: "Totaal",
    orientation: "vertical",
    arrangement: "stack",
    columns: 0,
    sharedAxis: false,
    showYAxis: true,
    showGrid: true,
    minPlotHeight: 110,
    maxPlotHeight: 220,
    minPeriodWidth: 0,
    budgetStyle: "solid",
    budgetWidth: 87,
    actualStyle: "bar",
    actualRatio: 38,
    actualBarPosition: "overlay",
    actualGap: 3,
    periodGap: 40,
    kindGap: 0,
    budgetRadius: 0,
    actualRadius: 0,
    valueFormat: "auto",
    displayUnits: "0",
    decimals: -1,
    fontFamily: "Segoe UI",
    fontSize: 10,
    legendPosition: "top",
    legendFontSize: 11,
    overrunText: "Boven begroting",
    shareText: "% van jaarbegroting",
    budgetLabelMode: "latest",
    budgetLabelPosition: "left",
    budgetLabelHPosition: "after",
    budgetCombine: true,
    budgetSeparator: " / ",
    actualLabelMode: "auto",
    actualContent: "value",
    actualLabelPosition: "right",
    actualLabelHPosition: "end",
    actualLabelBold: true,
    xShow: true,
    xFontSize: 10,
    xOrientation: "auto",
    xLabelLength: "auto",
    xMaxLabelWidth: 120,
    xShowParents: true,
    xShowSeparators: true,
    xShowComponents: true,
    xShowPairs: true,
    xShowLine: true,
    xFontFamily: "Segoe UI",
    xPairFontFamily: "Segoe UI",
    xColor: swatch("#605E5C"),
    xLineColor: swatch("#BBBBBB"),
    xPairColor: swatch("#605E5C"),
    colorBy: "component",
    revenueColor: swatch("#118DFF"),
    costColor: swatch("#E66C37"),
    netColor: swatch("#118DFF"),
    actualColor: swatch("#252423"),
    highlightOverrun: false,
    overrunColor: swatch("#C4314B"),
    legendFontFamily: "Segoe UI",
    legendColor: swatch("#333333"),
    legendShowRevenue: true,
    legendShowCost: true,
    legendShowBudget: true,
    legendShowActual: true,
    legendShowTarget: true,
    legendShowOverrun: true,
    budgetLabelFontFamily: "Segoe UI",
    budgetLabelColor: swatch("#333333"),
    budgetLabelPointer: true,
    budgetLabelOutline: true,
    actualLabelFontFamily: "Segoe UI",
    actualLabelColor: swatch("#111111"),
    actualLabelPointer: true,
    actualLabelOutline: true,
    targetShape: "bar",
    targetBarLength: 200,
    targetBarThickness: 3,
    targetBarColor: swatch("#C4314B"),
    targetDotSize: 10,
    targetDotFill: swatch("#FFFFFF"),
    targetDotBorderColor: swatch("#C4314B"),
    targetDotBorderWidth: 2,
    ...Object.fromEntries(PAIR_COLORS.flatMap((color, index) => [
        [`pair${index + 1}Color`, swatch(color)],
        [`legendShowPair${index + 1}`, true]
    ]))
};

function swatch(color: string): { color: string; index: number } {
    return { color, index: -1 };
}
