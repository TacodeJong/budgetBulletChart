(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/model.ts
  var DEFAULT_REVENUE_VALUES = ["opbrengst", "baten", "inkomst", "omzet", "revenue", "income"];
  function emptyModel() {
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
        period: "Periode",
        group: "Indeling",
        component: "Onderdeel",
        budget: "Budget",
        actual: "Actual YTD",
        target: "Target",
        revenue: "Opbrengsten",
        cost: "Kosten"
      },
      hasPeriodRole: false,
      hasValueRole: false
    };
  }
  function comparisonPairCount(model) {
    const series = model.series || [];
    const paired = model.kinds.some((kind) => series.filter((item) => item.kind === kind).length > 1);
    if (!paired) return Math.min(1, series.length);
    return Math.max(...series.map((item) => item.order)) + 1;
  }
  function parseRevenueValues(text5) {
    const values = String(text5 == null ? "" : text5).split(/[,;\n]+/).map((value) => value.trim().toLowerCase()).filter((value) => value.length > 0);
    return values.length ? values : DEFAULT_REVENUE_VALUES;
  }
  function classifyKind(value, revenueValues = DEFAULT_REVENUE_VALUES) {
    const text5 = value == null ? "" : String(value).trim().toLowerCase();
    if (!text5) return "cost";
    return revenueValues.some((prefix) => text5.indexOf(prefix) === 0) ? "revenue" : "cost";
  }
  function isPercentFormat(format) {
    if (!format) return false;
    const unquoted = format.replace(/"[^"]*"|'[^']*'|\\./g, "");
    return unquoted.indexOf("%") >= 0 || /^\s*p\d*\s*$/i.test(unquoted) || /^percent$/i.test(unquoted.trim());
  }

  // src/scale.ts
  function bandScale(count, width, paddingInner, paddingOuter) {
    const n = Math.max(1, count);
    const step = width / Math.max(1, n - paddingInner + paddingOuter * 2);
    const start = (width - step * (n - paddingInner)) / 2;
    return {
      step,
      bandwidth: step * (1 - paddingInner),
      x: (index) => start + step * index
    };
  }
  function panelScale(values, height, padding = 22, tickCount = 3) {
    let low = 0;
    let high = 0;
    values.forEach((value) => {
      if (!isFinite(value)) return;
      low = Math.min(low, value);
      high = Math.max(high, value);
    });
    if (low === high) high = low + 1;
    const padLow = low < 0;
    const padHigh = high > 0;
    const padded = (padLow ? 1 : 0) + (padHigh ? 1 : 0);
    if (height > padding * padded) {
      const extra = (high - low) * padding / (height - padding * padded);
      if (padLow) low -= extra;
      if (padHigh) high += extra;
    }
    const domain = nice(low, high, 10);
    const span = domain[1] - domain[0];
    return {
      domain,
      ticks: ticks(domain[0], domain[1], tickCount),
      map: (value) => height - (value - domain[0]) / span * height
    };
  }
  function tickIncrement(start, stop, count) {
    const step = (stop - start) / Math.max(0, count);
    const power = Math.floor(Math.log10(step));
    const error = step / Math.pow(10, power);
    const factor = error >= Math.sqrt(50) ? 10 : error >= Math.sqrt(10) ? 5 : error >= Math.sqrt(2) ? 2 : 1;
    return power >= 0 ? factor * Math.pow(10, power) : -Math.pow(10, -power) / factor;
  }
  function nice(start, stop, count) {
    let previous;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const step = tickIncrement(start, stop, count);
      if (step === previous || !isFinite(step) || step === 0) break;
      if (step > 0) {
        start = Math.floor(start / step) * step;
        stop = Math.ceil(stop / step) * step;
      } else {
        start = Math.ceil(start * step) / step;
        stop = Math.floor(stop * step) / step;
      }
      previous = step;
    }
    return [start, stop];
  }
  function ticks(start, stop, count) {
    const step = tickIncrement(start, stop, count);
    if (!isFinite(step) || step === 0) return [];
    const result = [];
    if (step > 0) {
      for (let index = Math.ceil(start / step); index <= Math.floor(stop / step); index += 1) result.push(index * step || 0);
    } else {
      const inverse = -step;
      for (let index = Math.ceil(start * inverse); index <= Math.floor(stop * inverse); index += 1) result.push(index / inverse || 0);
    }
    return result;
  }

  // src/render.ts
  var SVG_NS = "http://www.w3.org/2000/svg";
  var FONT = '"Segoe UI", "Segoe UI Web", sans-serif';
  var HEADER = 19;
  var GAP = 8;
  var BOTTOM = 12;
  var RIGHT = 16;
  var INNER_LEFT = 8;
  var LEGEND = 30;
  var SCROLLBAR = 12;
  var INSIDE_LABEL_MIN = 22;
  var POINTER_SIZE = 5;
  var AXIS_COLOR = "#605E5C";
  var NEUTRAL = "#7F7F7F";
  function columnCount(style, panelCount, width) {
    const groups = Math.max(1, panelCount);
    if (style.arrangement === "stack") return 1;
    if (style.arrangement === "row") return groups;
    if (style.columns > 0) return Math.min(groups, Math.round(style.columns));
    return clamp(Math.floor(width / 360), 1, groups);
  }
  function periodLabelTop(kindRow, fontSize, comparisonRow = false, pairFontSize = fontSize, pairRowHeight = pairFontSize + 6) {
    if (!kindRow && !comparisonRow) return 6;
    return (kindRow ? fontSize + 6 : 0) + (comparisonRow ? pairRowHeight : 0) + 9;
  }
  function axisHeight(levelCount, fontSize, kindRow = true, comparisonRow = false, rows = {}) {
    const rowHeight = fontSize + 6;
    const show = rows.show !== false;
    const lowest = show ? rows.labelHeight == null ? rowHeight : rows.labelHeight : 0;
    const parents = show && rows.parents !== false ? (Math.max(1, levelCount) - 1) * rowHeight : 0;
    const title = rows.title ? rowHeight : 0;
    return periodLabelTop(kindRow, fontSize, comparisonRow, rows.pairFontSize, rows.pairRowHeight) + lowest + parents + title + 3;
  }
  function xAxisOf(style) {
    const fontSize = style.xAxis && style.xAxis.fontSize || style.fontSize || 10;
    return {
      pairFontFamily: style.xAxis && style.xAxis.fontFamily || style.fontFamily || FONT,
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
      ...style.xAxis || {}
    };
  }
  function rotatedLabelHeight(labelWidth, fontSize, angle) {
    if (!angle) return fontSize + 6;
    const radians = angle * Math.PI / 180;
    return Math.ceil(labelWidth * Math.sin(radians) + fontSize * Math.cos(radians)) + 8;
  }
  function computeLayout(periodCount, panelCount, style, width, height, axisWidth, levelCount = 1, kindRow = true, sideMargins = { left: 0, right: 0 }, comparisonRow = false, labelAngle = 0, labelHeight, legendWidth = 0, pairAngle = 0, pairHeight) {
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
  function slotsFor(kinds, groupWidth = 0.6, kindGap = 0) {
    const slots = /* @__PURE__ */ new Map();
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
  function seriesSlotsFor(series, kinds, groupWidth = 0.6, kindGap = 0) {
    const outer = slotsFor(kinds, groupWidth, kindGap);
    const result = /* @__PURE__ */ new Map();
    kinds.forEach((kind) => {
      const componentSlot = outer.get(kind);
      if (!componentSlot) return;
      const matches = series.filter((item) => item.kind === kind);
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
  function renderChart(target, input) {
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
    const comparisonRow = xAxis.showPairs && model.kinds.some((kind) => series.filter((item) => item.kind === kind).length > 1);
    const slots = seriesSlotsFor(series, model.kinds, style.groupWidth, style.kindGap);
    const sideMargins = measureSideMargins(model, style, slots);
    const multipleKinds = model.kinds.length > 1 && xAxis.showComponents;
    const lowestLabels = periodLevelLabels(model);
    const measureX = (value) => measure(value, xAxis.fontSize, xAxis.bold ? "bold" : "normal", xAxis.fontFamily, xAxis.italic);
    const rotatedWidth = Math.min(xAxis.maxLabelWidth, Math.max(0, ...lowestLabels.map(measureX)));
    const legendWidth = measureLegendWidth(model, style);
    const pairNames = Array.from(new Set(series.map((item) => item.name)));
    const measurePair = (value) => measure(value, xAxis.pairFontSize, xAxis.pairBold ? "bold" : "normal", xAxis.pairFontFamily, xAxis.pairItalic);
    const pairWidth = Math.min(xAxis.maxLabelWidth, Math.max(0, ...pairNames.map(measurePair)));
    let pairAngle = comparisonRow ? fixedAngle(xAxis.pairOrientation) : 0;
    const build = (angle) => {
      const labelHeight = rotatedLabelHeight(rotatedWidth, xAxis.fontSize, angle);
      const pairHeight = pairAngle ? rotatedLabelHeight(pairWidth, xAxis.pairFontSize, pairAngle) : void 0;
      const sized = (axisWidth2, kinds) => computeLayout(
        model.periods.length,
        model.panels.length,
        style,
        input.width,
        input.height,
        axisWidth2,
        levels,
        kinds,
        sideMargins,
        comparisonRow,
        angle,
        labelHeight,
        legendWidth,
        pairAngle,
        pairHeight
      );
      const provisional2 = sized(40, multipleKinds);
      const scales2 = buildScales(model, provisional2.plotHeight, style.sharedAxis);
      const axisWidth = style.showYAxis ? measureAxis(model, scales2, style) : 0;
      const withKinds = sized(axisWidth, multipleKinds);
      const firstSlot = slots.get(series[0] && series[0].key) || { position: 0.5, width: style.groupWidth, labelWidth: style.groupWidth };
      const slotWidth = bandScale(model.periods.length, withKinds.plotWidth, 0.1, 0.04).bandwidth * (firstSlot.labelWidth || firstSlot.width);
      const kindRow = multipleKinds && (comparisonRow || kindNamesFit(style, slotWidth));
      return { provisional: provisional2, scales: scales2, layout: kindRow || !multipleKinds ? withKinds : sized(axisWidth, false) };
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
      const pairSlot = series.map((item) => slots.get(item.key)).find((slot) => slot && slot.labelWidth != null && slot.width < slot.labelWidth - 1e-9);
      const room = pairSlot ? currentBand().bandwidth * pairSlot.width + 4 : Infinity;
      if (pairNames.some((name) => measurePair(name) > room)) {
        const centers = series.map((item) => slots.get(item.key)).filter((slot) => !!slot).map((slot) => slot.position).sort((a, b) => a - b);
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
  function createRoot(target, input, width, height) {
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
    root.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      input.handlers.contextMenu(null, event.clientX, event.clientY);
    });
    return root;
  }
  function periodLevelLabels(model) {
    const levels = model.periodLevels.length ? model.periodLevels : model.periods.map((label) => [label]);
    const lowest = Math.max(1, model.levelCount) - 1;
    return levels.map((parts, index) => parts[lowest] || model.periods[index] || "");
  }
  function fixedAngle(orientation) {
    if (orientation === "diagonal") return 45;
    if (orientation === "vertical") return 90;
    return 0;
  }
  function labelsCrowded(values, room, width, length) {
    if (length === "full") return values.some((value) => width(value) > room);
    return periodLabels(values, room, width).some((label, index) => !label && !!values[index]);
  }
  function measureSideMargins(model, style, slots) {
    let left = 0;
    let right = 0;
    const marginFor = (content, options) => {
      const pointer = options.pointer ? POINTER_SIZE + 7 : 4;
      return measure(content, options.fontSize, weightOf(options), options.fontFamily, options.italic) + boxExtent(options.box) * 2 + pointer + 4;
    };
    model.panels.forEach((panel) => panel.cells.forEach((cell) => {
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
  function buildScales(model, plotHeight, shared) {
    const valuesOf = (panel) => {
      const values = [];
      panel.cells.forEach((cell) => {
        if (cell.budget != null) values.push(cell.budget);
        if (cell.actual != null) values.push(cell.actual);
        if (cell.target != null) values.push(cell.target);
      });
      return values;
    };
    if (shared) {
      const all = [].concat(...model.panels.map(valuesOf));
      const scale2 = panelScale(all, plotHeight);
      return model.panels.map(() => scale2);
    }
    return model.panels.map((panel) => panelScale(valuesOf(panel), plotHeight));
  }
  function panelFormat(panel) {
    for (const cell of panel.cells) {
      if (cell.budgetFormat) return cell.budgetFormat;
      if (cell.actualFormat) return cell.actualFormat;
    }
    return null;
  }
  function measureAxis(model, scales, style) {
    let widest = 0;
    model.panels.forEach((panel, index) => {
      const scale2 = scales[index];
      const format = panelFormat(panel);
      scale2.ticks.forEach((tick) => {
        widest = Math.max(widest, measure(style.formatters.axis(tick, scale2.ticks, format), style.fontSize, style.fontBold ? "bold" : "normal", style.fontFamily, style.fontItalic));
      });
    });
    return Math.max(16, widest);
  }
  function targetStyleOf(style) {
    return {
      shape: "bar",
      barLength: 2,
      barThickness: 3,
      barColor: "#C4314B",
      dotSize: 10,
      dotFill: "#FFFFFF",
      dotBorderColor: "#C4314B",
      dotBorderWidth: 2,
      ...style.target || {}
    };
  }
  function targetLegendSwatch(item, x, cy, size, horizontalChart) {
    const target = item.target;
    if (target.shape === "dot") {
      const radius = Math.min(size, Math.max(3, target.dotSize)) / 2;
      return svg("circle", { cx: x + size / 2, cy, r: radius, fill: target.dotFill, stroke: target.dotBorderColor, "stroke-width": Math.min(target.dotBorderWidth, radius) });
    }
    const thickness = Math.min(size, Math.max(1, target.barThickness));
    return svg("rect", horizontalChart ? { x: x + size / 2 - thickness / 2, y: cy - size / 2, width: thickness, height: size, fill: target.barColor } : { x, y: cy - thickness / 2, width: size, height: thickness, fill: target.barColor });
  }
  function legendFontSize(style) {
    return style.legend && style.legend.fontSize || (style.fontSize || 10) + 1;
  }
  function legendFont(style) {
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
  function legendSwatch(size) {
    return Math.max(9, Math.round(size * 0.8));
  }
  function measureLegendWidth(model, style) {
    if (style.legendPosition !== "left" && style.legendPosition !== "right") return 0;
    const font = legendFont(style);
    const widest = Math.max(0, ...legendItems(model, style).map((item) => measure(item.label, font.size, font.weight, font.family, font.italic)));
    return Math.ceil(Math.min(widest, 220) + legendSwatch(font.size) + 5 + 24);
  }
  function legendItems(model, style) {
    const legend = style.legend || {};
    const own = (custom, fallback) => custom && custom.trim() ? custom : fallback;
    const hidden = legend.hidden || {};
    const comparisonCount = comparisonPairCount(model);
    const items = comparisonCount > 1 && style.colorBy !== "group" ? Array.from({ length: comparisonCount }, (_, index) => {
      var _a;
      return {
        label: own((legend.pairs || [])[index], ((_a = (model.series || []).find((series) => series.order === index)) == null ? void 0 : _a.name) || `Pair ${index + 1}`),
        color: style.comparisonColors[index] || style.comparisonColors[0] || style.netColor,
        budget: true
      };
    }).filter((_, index) => !(hidden.pairs || [])[index]) : model.kinds.filter((kind) => !hidden[kind === "revenue" || kind === "cost" ? kind : "budget"]).map((kind) => ({
      label: kind === "revenue" ? own(legend.revenue, style.revenueText) : kind === "cost" ? own(legend.cost, style.costText) : own(legend.budget, style.budgetText),
      color: style.colorBy === "group" ? kind === "cost" ? mix(NEUTRAL, "#FFFFFF", 0.45) : NEUTRAL : kindColor(kind, style),
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
  function drawLegend(root, model, style, layout, legendWidth) {
    const font = legendFont(style);
    const swatchSize = legendSwatch(font.size);
    const lineHeight = font.size + 9;
    let x = layout.legendX;
    let y = layout.legendY;
    legendItems(model, style).forEach((item) => {
      if (item.target) {
        root.appendChild(targetLegendSwatch(item, x, y + 4.5, swatchSize, style.orientation === "horizontal"));
      } else {
        const swatch2 = svg("rect", { x, y: y + 4.5 - swatchSize / 2, width: swatchSize, height: swatchSize, rx: Math.min(2, style.budgetRadius), fill: item.color });
        if (item.budget) applyBudgetStyle(swatch2, item.color, style.budgetStyle);
        root.appendChild(swatch2);
      }
      const label = layout.legendVertical ? fit(item.label, legendWidth - swatchSize - 5 - 20, font.size, font.weight, font.family, font.italic) : item.label;
      root.appendChild(text(label, x + swatchSize + 5, y + 4.5, { ...font, baseline: "middle" }));
      if (layout.legendVertical) y += lineHeight;
      else x += swatchSize + 5 + measure(item.label, font.size, font.weight, font.family, font.italic) + 28;
    });
  }
  function seriesOf(model) {
    return model.series && model.series.length ? model.series : model.kinds.map((kind, order) => ({ key: kind, kind, name: kind, order }));
  }
  var LABEL_GAP = 8;
  function horizontalColumns(model, style, pairRow, kindRow) {
    const axis = xAxisOf(style);
    const weight = axis.bold ? "bold" : "normal";
    const width = (value, bold = weight) => measure(value, axis.fontSize, bold, axis.fontFamily, axis.italic);
    const levels = model.periodLevels.length ? model.periodLevels : model.periods.map((label) => [label]);
    const depth = Math.max(1, model.levelCount);
    const cap = axis.maxLabelWidth;
    const widest = (values) => Math.ceil(Math.min(cap, Math.max(0, ...values)));
    const pair = pairRow ? widest(seriesOf(model).map((item) => measure(item.name, axis.pairFontSize, axis.pairBold ? "bold" : "normal", axis.pairFontFamily, axis.pairItalic))) : 0;
    const kind = kindRow ? widest([width(style.revenueName), width(style.costName)]) : 0;
    const period = axis.show ? widest(periodLevelLabels(model).map((value) => width(value))) : 0;
    const parents = axis.show && axis.showParents ? Array.from({ length: depth - 1 }, (_, level) => widest(periodSpans(levels, level).map((span) => width(span.label, axis.bold ? "bold" : "600")))) : [];
    const title = axis.showTitle ? axis.fontSize + 8 : 0;
    const used = [pair, kind, period, ...parents].filter((value) => value > 0);
    return { title, parents, period, kind, pair, area: 6 + used.reduce((sum, value) => sum + value + LABEL_GAP, 0) + title };
  }
  function horizontalRightMargin(model, style) {
    let margin = 0;
    const widthOf = (content, options) => measure(content, options.fontSize, weightOf(options), options.fontFamily, options.italic) + boxExtent(options.box) * 2 + 6;
    const insideAt = (position) => position === "insideEnd" || position === "insideBase";
    model.panels.forEach((panel) => panel.cells.forEach((cell) => {
      const showBudget = cell.budget != null && showBudgetLabel(style.budgetLabel.mode, cell);
      const showActual = cell.actual != null && showActualLabel(style.actualLabel.mode, cell, model.periods.length);
      const budgetWidth = showBudget ? widthOf(style.formatters.label(cell.budget, cell.budgetFormat), style.budgetLabel) : 0;
      const actualWidth = showActual ? widthOf(actualLabel(cell, style.actualLabel, Infinity, style.formatters), style.actualLabel) : 0;
      let needed;
      if (showBudget && showActual && style.budgetLabel.combine !== false) {
        const separator = style.budgetLabel.separator == null ? " / " : style.budgetLabel.separator;
        needed = budgetWidth + actualWidth + measure(separator, style.budgetLabel.fontSize, weightOf(style.budgetLabel), style.budgetLabel.fontFamily, style.budgetLabel.italic);
      } else {
        needed = (insideAt(style.budgetLabel.hPosition) ? 0 : budgetWidth) + (insideAt(style.actualLabel.hPosition) ? 0 : actualWidth);
      }
      margin = Math.max(margin, needed);
    }));
    return Math.ceil(Math.min(260, margin) + RIGHT);
  }
  function computeHorizontalLayout(periodCount, panelCount, slotCount, style, width, height, labelArea, rightMargin, legendWidth = 0) {
    const axis = xAxisOf(style);
    const groups = Math.max(1, panelCount);
    const columns = columnCount(style, groups, width);
    const rows = Math.ceil(groups / columns);
    const legendLine = Math.max(LEGEND, legendFontSize(style) + 16);
    const legendTop = style.legendPosition === "top" ? legendLine + 8 : 10;
    const legendBottom = style.legendPosition === "bottom" ? legendLine : 0;
    const legendLeft = style.legendPosition === "left" ? legendWidth : 0;
    const legendRight = style.legendPosition === "right" ? legendWidth : 0;
    const axisHeight2 = style.showYAxis ? style.fontSize + 10 : 6;
    const rowMin = Math.max(style.minPeriodWidth, Math.max(1, slotCount) * 7 + 6, axis.fontSize + 6);
    const minPlot = Math.max(40, style.minPlotHeight, Math.max(1, periodCount) * rowMin);
    const maxPlot = Math.max(minPlot, style.maxPlotHeight, Math.max(1, periodCount) * (Math.max(1, slotCount) * 18 + 8));
    const viewportHeight = Math.max(200, height);
    const fitted = (viewportHeight - legendTop - BOTTOM - legendBottom - (rows - 1) * GAP) / rows - HEADER - axisHeight2;
    const plotHeight = Math.floor(clamp(fitted, minPlot, maxPlot));
    const panelHeight = HEADER + plotHeight + axisHeight2;
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
      axisHeight: axisHeight2,
      legendX: legendLeft ? 8 : legendRight ? panelsRight + 8 : INNER_LEFT,
      legendY: style.legendPosition === "bottom" ? legendTop + panelsHeight + 14 : sideLegend ? legendTop + HEADER : 10,
      legendVertical: sideLegend,
      positions
    };
  }
  function horizontalScales(model, plotWidth, shared) {
    const tickCount = Math.max(2, Math.min(8, Math.floor(plotWidth / 90)));
    const flip = (scale2) => ({ domain: scale2.domain, ticks: scale2.ticks, map: (value) => plotWidth - scale2.map(value) });
    const valuesOf = (panel) => {
      const values = [];
      panel.cells.forEach((cell) => {
        if (cell.budget != null) values.push(cell.budget);
        if (cell.actual != null) values.push(cell.actual);
        if (cell.target != null) values.push(cell.target);
      });
      return values;
    };
    if (shared) {
      const scale2 = flip(panelScale([].concat(...model.panels.map(valuesOf)), plotWidth, 4, tickCount));
      return model.panels.map(() => scale2);
    }
    return model.panels.map((panel) => flip(panelScale(valuesOf(panel), plotWidth, 4, tickCount)));
  }
  function renderHorizontal(target, input) {
    const { model, style } = input;
    const axis = xAxisOf(style);
    const series = seriesOf(model);
    const slots = seriesSlotsFor(series, model.kinds, style.groupWidth, style.kindGap);
    const pairRow = axis.showPairs && model.kinds.some((kind) => series.filter((item) => item.kind === kind).length > 1);
    const kindRow = model.kinds.length > 1 && axis.showComponents;
    const columns = horizontalColumns(model, style, pairRow, kindRow);
    const rightMargin = horizontalRightMargin(model, style);
    const legendWidth = measureLegendWidth(model, style);
    const layout = computeHorizontalLayout(model.periods.length, model.panels.length, slots.size, style, input.width, input.height, columns.area, rightMargin, legendWidth);
    const root = createRoot(target, input, layout.width, layout.height);
    if (style.legendPosition !== "none") drawLegend(root, model, style, layout, legendWidth);
    const band = bandScale(model.periods.length, layout.plotHeight, 0.1, 0.04);
    const scales = horizontalScales(model, layout.plotWidth, style.sharedAxis);
    model.panels.forEach((panel, index) => drawHorizontalPanel(root, panel, index, layout, columns, band, scales[index], slots, pairRow, kindRow, input));
  }
  function drawHorizontalPanel(root, panel, index, layout, columns, band, x, slots, pairRow, kindRow, input) {
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
    x.ticks.forEach((tick) => {
      const tx = x.map(tick);
      if (style.showGrid) plot.appendChild(svg("line", { x1: tx, x2: tx, y1: 0, y2: layout.plotHeight, stroke: "#E8E8E8", "pointer-events": "none" }));
      if (showAxisLabels) {
        plot.appendChild(text(style.formatters.axis(tick, x.ticks, format), tx, layout.plotHeight + 5, {
          size: style.fontSize,
          fill: AXIS_COLOR,
          anchor: "middle",
          baseline: "top"
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
    panel.cells.forEach((cell) => {
      const slot = slots.get(cell.seriesKey || cell.kind);
      if (slot) drawHorizontalCell(bars, labels, placed, panel, cell, layout, columns, band, x, slot, pairRow, kindRow, input);
    });
  }
  function drawHorizontalCategories(plot, model, layout, columns, band, style) {
    const axis = xAxisOf(style);
    const weight = axis.bold ? "bold" : "normal";
    const font = { size: axis.fontSize, fill: axis.color, family: axis.fontFamily, italic: axis.italic, underline: axis.underline, weight };
    const levels = model.periodLevels.length ? model.periodLevels : model.periods.map((label) => [label]);
    const depth = Math.max(1, model.levelCount);
    let edge = -6;
    if (columns.pair) edge -= columns.pair + LABEL_GAP;
    if (columns.kind) edge -= columns.kind + LABEL_GAP;
    if (axis.show) {
      const every = Math.max(1, Math.ceil((axis.fontSize + 2) / Math.max(1, band.step)));
      periodLevelLabels(model).forEach((value, periodIndex) => {
        if (!value || periodIndex % every) return;
        plot.appendChild(text(fit(value, columns.period, axis.fontSize, weight, axis.fontFamily, axis.italic), edge, band.x(periodIndex) + band.bandwidth / 2, {
          ...font,
          anchor: "end",
          baseline: "middle"
        }));
      });
      edge -= columns.period + LABEL_GAP;
      for (let level = depth - 2; level >= 0 && axis.showParents; level -= 1) {
        const width = columns.parents[level] || 0;
        periodSpans(levels, level).forEach((span, spanIndex) => {
          const top = band.x(span.first) - (band.step - band.bandwidth) / 2;
          const bottom = band.x(span.last) + band.bandwidth + (band.step - band.bandwidth) / 2;
          plot.appendChild(text(fit(span.label, width, axis.fontSize, axis.bold ? "bold" : "600", axis.fontFamily, axis.italic), edge, (top + bottom) / 2, {
            ...font,
            weight: axis.bold ? "bold" : "600",
            anchor: "end",
            baseline: "middle"
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
        ...font,
        weight: axis.bold ? "bold" : "600",
        anchor: "middle",
        baseline: "middle"
      });
      node.setAttribute("transform", `rotate(-90 ${cx} ${cy})`);
      plot.appendChild(node);
    }
  }
  function drawCombinedLabel(parent, placed, parts, edge, rowY, side) {
    const pieces = parts.filter((part) => part.content).map((part) => {
      const weight = weightOf(part.options);
      const content = part.content.replace(/ /g, "\xA0");
      return { ...part, content, weight, width: measure(content, part.options.fontSize, weight, part.options.fontFamily, part.options.italic) };
    });
    if (!pieces.length) return;
    const extra = Math.max(...pieces.map((piece) => boxExtent(piece.options.box)));
    const total = pieces.reduce((sum, piece) => sum + piece.width, 0);
    const height = Math.max(...pieces.map((piece) => piece.options.fontSize * 1.2)) + extra * 2;
    const left = side > 0 ? edge + 4 + extra : edge - 4 - extra - total;
    const top = placed.place({ x: left - extra, y: rowY - height / 2, width: total + extra * 2, height }, 0);
    const y = top + height / 2;
    let cursor = left;
    pieces.forEach((piece) => {
      const options = piece.options;
      const node = text(piece.content, cursor, y, {
        size: options.fontSize,
        weight: piece.weight,
        family: options.fontFamily,
        italic: options.italic,
        underline: options.underline,
        fill: options.color,
        anchor: "start",
        baseline: "middle"
      });
      decorateLabel(parent, node, piece.content, cursor, y, "start", "middle", piece.weight, options);
      parent.appendChild(node);
      cursor += piece.width;
    });
  }
  function horizontalBarPath(y, height, valueX, zeroX, radius) {
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
  function horizontalBar(cy, thickness, valueX, zeroX, radius, fill) {
    return svg("path", { d: horizontalBarPath(cy - thickness / 2, Math.max(0, thickness), valueX, zeroX, radius), fill, "pointer-events": "none" });
  }
  function drawHorizontalCell(plot, labelLayer, placed, panel, cell, layout, columns, band, x, slot, pairRow, kindRow, input) {
    const { model, style, selectedKeys } = input;
    const axis = xAxisOf(style);
    const cy = band.x(cell.periodIndex) + band.bandwidth * slot.position;
    const thickness = band.bandwidth * slot.width;
    const geometry = barGeometry(cy, thickness, style);
    const dimmed = selectedKeys.size > 0 && !(cell.selectionKey && selectedKeys.has(cell.selectionKey)) || model.hasHighlights && !cell.highlighted;
    const cellGroup = svg("g", { opacity: dimmed ? 0.35 : 1 });
    plot.appendChild(cellGroup);
    const labelGroup = svg("g", { opacity: dimmed ? 0.35 : 1 });
    labelLayer.appendChild(labelGroup);
    const zero = x.map(0);
    const color = budgetColor(cell, panel, style, model);
    if (cell.budget != null) {
      const shape = horizontalBar(geometry.budgetX, geometry.budgetWidth, x.map(cell.budget), zero, style.budgetRadius, color);
      applyBudgetStyle(shape, color, style.budgetStyle);
      cellGroup.appendChild(shape);
    }
    const actualColor = isOverrun(cell, style) ? style.overrunColor : style.actualColor;
    const marker = style.actualStyle === "marker";
    if (cell.actual != null) {
      const ax2 = x.map(cell.actual);
      if (marker) {
        const height = Math.max(6, geometry.budgetWidth + 6);
        cellGroup.appendChild(svg("rect", { x: ax2 - 1.5, y: cy - height / 2, width: 3, height, rx: Math.min(1.5, style.actualRadius), fill: actualColor, "pointer-events": "none" }));
      } else {
        cellGroup.appendChild(horizontalBar(geometry.actualX, geometry.actualWidth, ax2, zero, style.actualRadius, actualColor));
      }
    }
    if (cell.target != null) {
      const actualCenter = marker ? geometry.budgetX : geometry.actualX;
      const actualHalf = marker ? Math.max(6, geometry.budgetWidth + 6) / 2 : geometry.actualWidth / 2;
      cellGroup.appendChild(targetShape(targetStyleOf(style), actualCenter, actualHalf * 2, x.map(cell.target), true));
    }
    const draw = (content, options, labelX, labelY, anchor, fill, decorate) => {
      const weight = weightOf(options);
      const node = text(content, labelX, labelY, {
        size: options.fontSize,
        weight,
        family: options.fontFamily,
        italic: options.italic,
        underline: options.underline,
        fill,
        anchor,
        baseline: "middle"
      });
      if (decorate) decorateLabel(labelGroup, node, content, labelX, labelY, anchor, "middle", weight, options);
      labelGroup.appendChild(node);
    };
    const boxFor = (content, options) => {
      const extra = boxExtent(options.box);
      return {
        width: measure(content, options.fontSize, weightOf(options), options.fontFamily, options.italic) + extra * 2,
        height: options.fontSize * 1.2 + extra * 2,
        extra
      };
    };
    const positive = (cell.budget != null ? cell.budget : cell.actual || 0) >= 0;
    const side = positive ? 1 : -1;
    const further = (left, right) => positive ? Math.max(left, right) : Math.min(left, right);
    const target = targetStyleOf(style);
    const targetReach = target.shape === "dot" ? target.dotSize / 2 + target.dotBorderWidth / 2 : target.barThickness / 2;
    const targetEdge = cell.target != null ? x.map(cell.target) + side * targetReach : null;
    const ax = cell.actual != null ? x.map(cell.actual) : zero;
    const bx = cell.budget != null ? x.map(cell.budget) : zero;
    let outerEdge = [ax, bx, targetEdge].reduce((edge2, value) => value == null ? edge2 : further(edge2, value), zero);
    const outside = (content, options, from, rowY) => {
      const box = boxFor(content, options);
      const labelX = from + side * (4 + box.extra);
      const top = placed.place({ x: positive ? labelX - box.extra : labelX - box.width + box.extra, y: rowY - box.height / 2, width: box.width, height: box.height }, 0);
      draw(content, options, labelX, top + box.height / 2, positive ? "start" : "end", options.color, true);
      return labelX + side * (box.width - box.extra);
    };
    const inside = (content, options, start, end, rowY, thick, fill, atEnd) => {
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
    const actualText = showActual ? actualLabel(cell, style.actualLabel, Infinity, style.formatters) : "";
    const budgetText = showBudget ? style.formatters.label(cell.budget, cell.budgetFormat) : "";
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
        let placedEdge = null;
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
      const pairColor = axis.pairColorMode === "fixed" || style.colorBy === "group" ? axis.pairColor : style.comparisonColors[cell.comparisonIndex || 0] || axis.pairColor;
      const pairWeight = axis.pairBold ? "bold" : "normal";
      cellGroup.appendChild(text(fit(comparisonLabel(cell, style), columns.pair, axis.pairFontSize, pairWeight, axis.pairFontFamily, axis.pairItalic), edge, cy, {
        size: axis.pairFontSize,
        family: axis.pairFontFamily,
        weight: pairWeight,
        italic: axis.pairItalic,
        underline: axis.pairUnderline,
        fill: pairColor,
        anchor: "end",
        baseline: "middle"
      }));
    }
    if (pairRow) edge -= columns.pair + LABEL_GAP;
    if (kindRow && slot.showKindLabel !== false) {
      const name = cell.kind === "revenue" ? style.revenueName : style.costName;
      const labelY = band.x(cell.periodIndex) + band.bandwidth * (slot.labelPosition == null ? slot.position : slot.labelPosition);
      cellGroup.appendChild(text(fit(name, columns.kind, axis.fontSize, axis.bold ? "bold" : "normal", axis.fontFamily, axis.italic), edge, labelY, {
        size: axis.fontSize,
        family: axis.fontFamily,
        weight: axis.bold ? "bold" : "normal",
        italic: axis.italic,
        underline: axis.underline,
        fill: axis.color,
        anchor: "end",
        baseline: "middle"
      }));
    }
    cellGroup.appendChild(hitArea(0, cy - thickness / 2, layout.plotWidth, thickness, panel, cell, input));
  }
  function isOverrun(cell, style) {
    if (!style.highlightOverrun || cell.budget == null || cell.actual == null) return false;
    return Math.abs(cell.actual) > Math.abs(cell.budget) && Math.sign(cell.actual) * Math.sign(cell.budget) >= 0;
  }
  function targetShape(target, across, actualWidth, valuePos, horizontal2) {
    if (target.shape === "dot") {
      const radius = Math.max(1.5, target.dotSize / 2);
      return svg("circle", {
        cx: horizontal2 ? valuePos : across,
        cy: horizontal2 ? across : valuePos,
        r: radius,
        fill: target.dotFill,
        stroke: target.dotBorderColor,
        "stroke-width": Math.max(0, target.dotBorderWidth),
        "pointer-events": "none"
      });
    }
    const thickness = Math.max(1, target.barThickness);
    const length = Math.max(2, actualWidth * target.barLength);
    return svg("rect", horizontal2 ? { x: valuePos - thickness / 2, y: across - length / 2, width: thickness, height: length, fill: target.barColor, "pointer-events": "none" } : { x: across - length / 2, y: valuePos - thickness / 2, width: length, height: thickness, fill: target.barColor, "pointer-events": "none" });
  }
  function drawPanel(root, panel, index, layout, band, y, slots, input) {
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
    y.ticks.forEach((tick) => {
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
    panel.cells.forEach((cell) => drawCell(bars, labels, placed, panel, cell, layout, band, y, slots.get(cell.seriesKey || cell.kind), input));
  }
  function periodSpans(periodLevels, level) {
    const spans = [];
    let previousKey = null;
    periodLevels.forEach((levels, index) => {
      const key = levels.slice(0, level + 1).join("");
      if (key === previousKey) spans[spans.length - 1].last = index;
      else spans.push({ label: levels[level] || "", first: index, last: index });
      previousKey = key;
    });
    return spans;
  }
  function drawPeriodAxis(plot, model, layout, band, style) {
    const axis = xAxisOf(style);
    const levels = model.periodLevels.length ? model.periodLevels : model.periods.map((label) => [label]);
    const depth = Math.max(1, model.levelCount);
    const rowHeight = axis.fontSize + 6;
    const lowest = depth - 1;
    const weight = axis.bold ? "bold" : "normal";
    const font = { size: axis.fontSize, fill: axis.color, family: axis.fontFamily, italic: axis.italic, underline: axis.underline, weight };
    const width = (value) => measure(value, axis.fontSize, weight, axis.fontFamily, axis.italic);
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
        const labels = axis.labelLength === "full" ? values.map((value) => fit(value, room, axis.fontSize, weight, axis.fontFamily, axis.italic)) : periodLabels(values, room, width);
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
  function drawCell(plot, labelLayer, placed, panel, cell, layout, band, y, slot, input) {
    const { model, style, selectedKeys } = input;
    const cx = band.x(cell.periodIndex) + band.bandwidth * slot.position;
    const slotWidth = band.bandwidth * slot.width;
    const geometry = barGeometry(cx, slotWidth, style);
    const budgetWidth = geometry.budgetWidth;
    const dimmed = selectedKeys.size > 0 && !(cell.selectionKey && selectedKeys.has(cell.selectionKey)) || model.hasHighlights && !cell.highlighted;
    const cellGroup = svg("g", { opacity: dimmed ? 0.35 : 1 });
    plot.appendChild(cellGroup);
    const labelGroup = svg("g", { opacity: dimmed ? 0.35 : 1 });
    labelLayer.appendChild(labelGroup);
    const zero = y.map(0);
    if (cell.budget != null) {
      const color = budgetColor(cell, panel, style, model);
      const shape = bar(geometry.budgetX, budgetWidth, y.map(cell.budget), zero, style.budgetRadius, color);
      applyBudgetStyle(shape, color, style.budgetStyle);
      cellGroup.appendChild(shape);
    }
    const actualColor = isOverrun(cell, style) ? style.overrunColor : style.actualColor;
    const marker = style.actualStyle === "marker";
    if (cell.actual != null) {
      const ay = y.map(cell.actual);
      if (marker) {
        const width = Math.max(6, budgetWidth + 6);
        cellGroup.appendChild(svg("rect", {
          x: cx - width / 2,
          y: ay - 1.5,
          width,
          height: 3,
          rx: Math.min(1.5, style.actualRadius),
          fill: actualColor,
          "pointer-events": "none"
        }));
      } else {
        cellGroup.appendChild(bar(geometry.actualX, geometry.actualWidth, ay, zero, style.actualRadius, actualColor));
      }
    }
    const actualWidth = marker ? Math.max(6, budgetWidth + 6) : geometry.actualWidth;
    const actualX = marker ? geometry.budgetX : geometry.actualX;
    const groupLeft = Math.min(geometry.budgetX - budgetWidth / 2, actualX - actualWidth / 2);
    const groupRight = Math.max(geometry.budgetX + budgetWidth / 2, actualX + actualWidth / 2);
    if (cell.target != null) cellGroup.appendChild(targetShape(targetStyleOf(style), actualX, actualWidth, y.map(cell.target), false));
    let actualLabelTop = null;
    if (cell.actual != null && showActualLabel(style.actualLabel.mode, cell, model.periods.length)) {
      const options = style.actualLabel;
      const content = actualLabel(cell, options, slotWidth + 8, style.formatters);
      actualLabelTop = placeLabel(labelGroup, content, options, {
        x: actualX,
        width: actualWidth,
        valueY: y.map(cell.actual),
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
    if (cell.budget != null && showBudgetLabel(style.budgetLabel.mode, cell)) {
      const overlay = !geometry.beside && cell.budget >= 0 && cell.actual != null && cell.actual > 0;
      let ceiling = overlay ? y.map(cell.actual) : null;
      if (overlay && actualLabelTop != null) ceiling = Math.min(ceiling, actualLabelTop + 4);
      placeLabel(labelGroup, style.formatters.label(cell.budget, cell.budgetFormat), style.budgetLabel, {
        x: geometry.budgetX,
        width: budgetWidth,
        valueY: y.map(cell.budget),
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
        const pairColor = axis.pairColorMode === "fixed" || style.colorBy === "group" ? axis.pairColor : style.comparisonColors[cell.comparisonIndex || 0] || axis.pairColor;
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
  function hitArea(x, y, width, height, panel, cell, input) {
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
    hit.addEventListener("mousemove", (event) => handlers.tooltip(cell, event.clientX, event.clientY));
    hit.addEventListener("mouseleave", () => handlers.hideTooltip());
    hit.addEventListener("click", (event) => {
      event.stopPropagation();
      handlers.select(cell, event.ctrlKey || event.metaKey || event.shiftKey);
    });
    hit.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      handlers.select(cell, event.ctrlKey || event.metaKey || event.shiftKey);
    });
    hit.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handlers.contextMenu(cell, event.clientX, event.clientY);
    });
    return hit;
  }
  function barGeometry(cx, slotWidth, style) {
    let budgetWidth = slotWidth * style.budgetWidth;
    let actualWidth = Math.max(1, budgetWidth * style.actualRatio);
    const beside2 = style.actualStyle === "bar" && style.actualPosition === "beside";
    if (!beside2) return { budgetX: cx, budgetWidth, actualX: cx, actualWidth, beside: beside2 };
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
      beside: beside2
    };
  }
  function actualLabel(cell, options, room, formatters2) {
    const value = formatters2.label(cell.actual, cell.actualFormat);
    if (options.content === "value" || cell.budget == null || cell.budget === 0) return value;
    const share = formatters2.share(cell.actual, cell.budget);
    if (options.content === "share") return share;
    const both = `${value} \xB7 ${share}`;
    return measure(both, options.fontSize, weightOf(options), options.fontFamily, options.italic) <= room ? both : value;
  }
  function comparisonLabel(cell, style) {
    const index = cell.comparisonIndex || 0;
    void style;
    return cell.seriesName || `Pair ${index + 1}`;
  }
  function fitComparison(value, width, style) {
    const axis = xAxisOf(style);
    const weight = axis.pairBold ? "bold" : "normal";
    const size = (candidate) => measure(candidate, axis.pairFontSize, weight, axis.pairFontFamily, axis.pairItalic);
    if (size(value) <= width) return value;
    const words = value.trim().split(/\s+/).filter(Boolean);
    const initials = words.length > 1 ? words.map((word) => (word.match(/[\p{L}\p{N}]/u) || [word[0]])[0]).join("").toUpperCase() : value.slice(0, 3);
    if (size(initials) <= width) return initials;
    return initials.slice(0, 1);
  }
  var LabelPlacer = class {
    constructor() {
      __publicField(this, "boxes", []);
    }
    place(box, preferred) {
      let top = box.y;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const hit = this.boxes.find((other) => overlaps({ ...box, y: top }, other));
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
    reserve(box) {
      this.boxes.push(box);
    }
  };
  function overlaps(a, b) {
    return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  }
  function weightOf(options) {
    return options.bold ? "bold" : "normal";
  }
  function placeLabel(parent, content, options, target) {
    const weight = weightOf(options);
    const size = options.fontSize;
    const positive = target.valueY <= target.zeroY;
    const direction = positive ? 1 : -1;
    const extra = boxExtent(options.box);
    const textWidth = measure(content, size, weight, options.fontFamily, options.italic);
    const fitsInside = target.canInside && Math.abs(target.valueY - target.zeroY) >= Math.max(INSIDE_LABEL_MIN, size + 10) && textWidth <= target.width + 2;
    const wantsInside = options.position === "inside" || options.position === "auto" && target.insideByDefault;
    if (wantsInside && fitsInside) {
      const labelY2 = target.valueY + direction * 5;
      const textHeight = size * 1.2;
      target.placed.reserve({ x: target.x - textWidth / 2, y: positive ? labelY2 : labelY2 - textHeight, width: textWidth, height: textHeight });
      parent.appendChild(text(content, target.x, labelY2, {
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
      const tip2 = options.pointer ? POINTER_SIZE + 2 : 0;
      const labelX = (right ? target.groupRight : target.groupLeft) + side * (4 + tip2 + extra);
      const anchor = right ? "start" : "end";
      const left = right ? labelX - extra : labelX - textWidth - extra;
      const labelY2 = target.placed.place({ x: left, y: target.valueY - height / 2, width, height }, 0) + height / 2;
      if (options.pointer) {
        const barEdge = target.x + side * target.width / 2;
        drawPointer(parent, barEdge, labelX - side * (extra + 2), target.valueY, labelY2, side, options.pointerColor);
      }
      const node2 = text(content, labelX, labelY2, {
        size,
        weight,
        family: options.fontFamily,
        italic: options.italic,
        underline: options.underline,
        fill: options.color,
        anchor,
        baseline: "middle"
      });
      decorateLabel(parent, node2, content, labelX, labelY2, anchor, "middle", weight, options);
      parent.appendChild(node2);
      return null;
    }
    let labelY = target.valueY - direction * (5 + extra);
    if (positive && target.ceiling != null) labelY = Math.min(labelY, target.ceiling - 6 - extra);
    const top = positive ? labelY - size * 1.2 - extra : labelY - extra;
    labelY += target.placed.place({ x: target.x - width / 2, y: top, width, height }, positive ? -1 : 1) - top;
    const baseline = positive ? "bottom" : "top";
    const node = text(content, target.x, labelY, {
      size,
      weight,
      family: options.fontFamily,
      italic: options.italic,
      underline: options.underline,
      fill: options.color,
      anchor: "middle",
      baseline
    });
    decorateLabel(parent, node, content, target.x, labelY, "middle", baseline, weight, options);
    parent.appendChild(node);
    return positive ? labelY - size - 1 - extra : null;
  }
  function outerSide(slot) {
    if (!slot) return 1;
    const paired = slot.labelPosition != null && slot.labelWidth != null && slot.width < slot.labelWidth - 1e-9;
    const center = paired ? slot.labelPosition : 0.5;
    return slot.position < center - 1e-9 ? -1 : 1;
  }
  function labelSide(position, outer) {
    if (position === "left") return -1;
    if (position === "right") return 1;
    if (position === "side") return outer;
    return 0;
  }
  function kindName(name, style, slotWidth) {
    const axis = xAxisOf(style);
    const fitted = fit(name, slotWidth + 4, axis.fontSize, axis.bold ? "bold" : "normal", axis.fontFamily, axis.italic);
    return fitted === name || fitted.length >= 6 ? fitted : "";
  }
  function kindNamesFit(style, slotWidth) {
    return !!kindName(style.revenueName, style, slotWidth) && !!kindName(style.costName, style, slotWidth);
  }
  function drawPointer(parent, barEdge, labelEdge, y, labelY, side, color) {
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
  function boxExtent(box) {
    return box.backdrop ? box.padding + box.borderWidth : 0;
  }
  function decorateLabel(parent, node, value, x, y, anchor, baseline, weight, options) {
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
    const attrs = {
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
  function showBudgetLabel(mode, cell) {
    return mode === "all" || mode === "latest" && cell.latest;
  }
  function showActualLabel(mode, cell, periodCount) {
    if (mode === "all") return true;
    if (mode === "latest") return cell.latest;
    if (mode === "auto") return periodCount <= 4 || cell.latest;
    return false;
  }
  function kindColor(kind, style) {
    if (kind === "revenue") return style.revenueColor;
    if (kind === "cost") return style.costColor;
    return style.netColor;
  }
  function budgetColor(cell, panel, style, model) {
    if (model && comparisonPairCount(model) > 1 && style.colorBy !== "group") {
      return style.comparisonColors[cell.comparisonIndex || 0] || style.comparisonColors[0] || style.netColor;
    }
    if (style.colorBy !== "group") return kindColor(cell.kind, style);
    const base = style.groupColor(panel.label);
    return cell.kind === "cost" ? mix(base, "#FFFFFF", 0.45) : base;
  }
  function applyBudgetStyle(node, color, budgetStyle) {
    if (budgetStyle === "light") {
      node.setAttribute("fill-opacity", "0.35");
    } else if (budgetStyle === "outline") {
      node.setAttribute("fill-opacity", "0.1");
      node.setAttribute("stroke", color);
      node.setAttribute("stroke-width", "1.5");
    }
  }
  function barPath(x, width, valueY, zeroY, radius) {
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
  function bar(cx, width, valueY, zeroY, radius, fill) {
    return svg("path", { d: barPath(cx - width / 2, Math.max(0, width), valueY, zeroY, radius), fill, "pointer-events": "none" });
  }
  function parseHex(color) {
    const value = color.replace("#", "").trim();
    const full = value.length === 3 ? value.split("").map((part) => part + part).join("") : value;
    const parsed = parseInt(full.slice(0, 6), 16);
    if (!isFinite(parsed) || full.length < 6) return null;
    return [parsed >> 16 & 255, parsed >> 8 & 255, parsed & 255];
  }
  function mix(color, other, amount) {
    const left = parseHex(color);
    const right = parseHex(other);
    if (!left || !right) return color;
    const channel = (index) => Math.round(left[index] + (right[index] - left[index]) * amount).toString(16).padStart(2, "0");
    return `#${channel(0)}${channel(1)}${channel(2)}`;
  }
  function contrastText(background) {
    const rgb = parseHex(background);
    if (!rgb) return "#FFFFFF";
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    return luminance > 0.6 ? "#111111" : "#FFFFFF";
  }
  function emptyState(model) {
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
  function labelVariants(value) {
    const variants = [value];
    const words = value.trim().split(/\s+/);
    if (words.length > 1) variants.push(words[words.length - 1]);
    else if (/^\p{L}{4,}$/u.test(value)) variants.push(value.slice(0, 3), value.slice(0, 1));
    return variants;
  }
  function periodLabels(values, room, width) {
    const options = values.map(labelVariants);
    const depth = Math.max(1, ...options.map((variants) => variants.length));
    for (let level = 0; level < depth; level += 1) {
      const chosen = options.map((variants) => variants[Math.min(level, variants.length - 1)]);
      if (chosen.every((label) => width(label) <= room)) return chosen;
    }
    const shortest = options.map((variants) => variants[variants.length - 1]);
    const widest = Math.max(...shortest.map(width));
    const every = Math.max(1, Math.ceil((widest + 4) / Math.max(1, room + 4)));
    return shortest.map((label, index) => index % every === 0 ? label : "");
  }
  var measureContext = null;
  function measure(value, size, weight, family = FONT, italic = false) {
    if (!measureContext) measureContext = document.createElement("canvas").getContext("2d");
    if (!measureContext) return value.length * size * 0.55;
    measureContext.font = `${italic ? "italic " : ""}${weight} ${size}px ${family}`;
    return measureContext.measureText(value).width;
  }
  function fit(value, width, size, weight, family = FONT, italic = false) {
    if (measure(value, size, weight, family, italic) <= width) return value;
    let low = 0;
    let high = value.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (measure(`${value.slice(0, mid)}\u2026`, size, weight, family, italic) <= width) low = mid;
      else high = mid - 1;
    }
    return low > 0 ? `${value.slice(0, low)}\u2026` : "";
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function el(tag, className = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }
  function svg(name, attrs) {
    const node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach((key) => node.setAttribute(key, String(attrs[key])));
    return node;
  }
  function group(parent, x, y) {
    const node = svg("g", { transform: `translate(${x},${y})` });
    parent.appendChild(node);
    return node;
  }
  function text(value, x, y, options) {
    const baselines = { top: "text-before-edge", middle: "central", bottom: "text-after-edge" };
    const attrs = {
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

  // qlik/src/cube.ts
  var KIND_ORDER = ["revenue", "cost", "net", "total"];
  var COST_TERMS = ["kosten", "kost", "lasten", "uitgaven", "uitgaaf", "cost", "expense"];
  var START_HELP = "Add dimensions in this order: one or more period levels (year, quarter, month), then a group, then a component such as Opbrengsten or Kosten. Add measures in this order: budget, actual, and target when Target is on. Repeat that set for every comparison pair. Measures after the pairs are shown in the tooltip. Set Data mapping so the counts match the fields you added.";
  var EMPTY_HELP = "There are no rows with a period for the current selections.";
  function cubeFromLayout(layout) {
    const cube = layout && layout.qHyperCube || {};
    const dimensions = (cube.qDimensionInfo || []).map((column) => ({
      title: columnTitle(column, "Dimension"),
      format: null
    }));
    const measures = (cube.qMeasureInfo || []).map((column) => ({
      title: columnTitle(column, "Measure"),
      format: column.qNumFormat && column.qNumFormat.qFmt || null
    }));
    const pages = [...cube.qDataPages || []].sort((left, right) => pageTop(left) - pageTop(right));
    const rows = [];
    pages.forEach((page) => {
      (page && page.qMatrix || []).forEach((matrixRow) => {
        const cells = (matrixRow || []).map(toCell);
        rows.push({ dims: cells.slice(0, dimensions.length), measures: cells.slice(dimensions.length) });
      });
    });
    return { dimensions, measures, rows };
  }
  function optionsFromProps(props) {
    const revenueValues = parseRevenueValues(props.revenueValues);
    return {
      periodDimensions: clampInt(props.periodDimensions, 1, 1, 6),
      hasGroup: props.hasGroup !== false,
      hasComponent: props.hasComponent !== false,
      pairCount: clampInt(props.pairCount, 1, 1, 10),
      hasTarget: props.hasTarget === true,
      totalGroupName: text2(props.totalGroupName, "Totaal"),
      combineGroups: props.panelMode === "combine",
      groupSort: choice(props.groupSort, ["alpha", "data", "budget", "actual"], "alpha"),
      periodSort: choice(props.periodSort, ["auto", "asc", "desc", "data"], "auto"),
      componentMode: choice(props.componentMode, ["split", "revenue", "cost", "net"], "split"),
      revenueValues,
      pairNames: Array.from({ length: 10 }, (_, index) => text2(props[`pair${index + 1}Name`], ""))
    };
  }
  function buildFromCube(data, options) {
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
      period: dimensions.slice(0, periodCount).map((column) => column.title).filter(Boolean).join(" / ") || model.names.period,
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
    const mode = componentIndex >= 0 ? options.componentMode : "split";
    const periods = /* @__PURE__ */ new Map();
    const cells = /* @__PURE__ */ new Map();
    let numericPeriods = true;
    let percentHint = false;
    const selectionDims = periodIndexes(periodCount).concat(!options.combineGroups && groupIndex >= 0 ? [groupIndex] : []).concat(mode !== "net" && componentIndex >= 0 ? [componentIndex] : []);
    data.rows.forEach((row) => {
      const periodCells = periodIndexes(periodCount).map((index) => row.dims[index] || blankCell());
      if (periodCells.every((cell) => !cell.text && cell.num == null)) return;
      const componentCell = componentIndex >= 0 ? row.dims[componentIndex] || blankCell() : null;
      const component = componentCell ? classifyKind(componentCell.text, options.revenueValues) : null;
      if (component && componentCell && componentCell.text) model.names[component] = componentCell.text;
      if (mode === "revenue" && component !== "revenue") return;
      if (mode === "cost" && component !== "cost") return;
      const kind = !component ? "total" : mode === "net" ? "net" : component;
      const sign = mode === "net" && component === "cost" ? -1 : 1;
      const periodKey = periodCells.map((cell) => cell.elem >= 0 ? `#${cell.elem}` : cell.text).join("");
      if (!periods.has(periodKey)) {
        const sort = periodCells.map((cell) => cell.num == null ? cell.text : cell.num);
        if (sort.some((value) => typeof value !== "number")) numericPeriods = false;
        const levels = periodCells.map((cell) => cell.text || "(Blank)");
        periods.set(periodKey, { label: levels.join(" "), levels, sort, order: periods.size });
      }
      const period = periods.get(periodKey);
      const group2 = options.combineGroups || groupIndex < 0 ? options.totalGroupName : row.dims[groupIndex] && row.dims[groupIndex].text || options.totalGroupName;
      for (let pair = 0; pair < pairCount; pair += 1) {
        const budgetIndex = pair * stride;
        const actualIndex = budgetIndex + 1;
        const targetIndex = options.hasTarget ? budgetIndex + 2 : -1;
        const budgetColumn = measures[budgetIndex] || null;
        const actualColumn = measures[actualIndex] || null;
        const namedKind = measurePairKind(budgetColumn, actualColumn, options.revenueValues);
        const fallbackKind = pairCount === 2 ? pair === 0 ? "revenue" : "cost" : null;
        if (component && (namedKind || fallbackKind) && component !== (namedKind || fallbackKind)) continue;
        const budget = scale(readNumber(row.measures[budgetIndex]), sign);
        const actual = scale(readNumber(row.measures[actualIndex]), sign);
        const target = targetIndex >= 0 ? scale(readNumber(row.measures[targetIndex]), sign) : null;
        if (budget == null && actual == null && target == null) continue;
        const budgetFormat = budgetColumn && budgetColumn.format || null;
        const actualFormat = actualColumn && actualColumn.format || null;
        const targetFormat = targetIndex >= 0 && measures[targetIndex] ? measures[targetIndex].format : null;
        if (target != null) model.hasTarget = true;
        if (isPercentFormat(budgetFormat) || isPercentFormat(actualFormat)) percentHint = true;
        const seriesKey = `${kind}:${pair}`;
        const customName = (options.pairNames[pair] || "").trim();
        const fieldName = budgetColumn && budgetColumn.title || actualColumn && actualColumn.title || `Pair ${pair + 1}`;
        const key = `${group2}${periodKey}${seriesKey}`;
        const highlighted = selectionDims.every((index) => isSelected(row.dims[index]));
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
        const points = selectionDims.map((dim) => ({ dim, elem: row.dims[dim] ? row.dims[dim].elem : -2 })).filter((point) => point.elem >= 0);
        const selection = {
          points,
          getKey: () => points.map((point) => `${point.dim}:${point.elem}`).join("|")
        };
        cells.set(key, {
          group: group2,
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
    const periodIndex = /* @__PURE__ */ new Map();
    ordered.forEach((entry, index) => periodIndex.set(entry[0], index));
    model.periods = ordered.map((entry) => entry[1].label);
    model.periodLevels = ordered.map((entry) => entry[1].levels);
    model.percentHint = percentHint;
    const panels = /* @__PURE__ */ new Map();
    const kinds = /* @__PURE__ */ new Set();
    const series = /* @__PURE__ */ new Map();
    const latest = /* @__PURE__ */ new Map();
    cells.forEach((draft) => {
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
    panels.forEach((entry) => entry.panel.cells.forEach((cell) => {
      const seriesKey = `${cell.group}${cell.seriesKey || cell.kind}`;
      const current = latest.get(seriesKey);
      if (!current || cell.periodIndex > current.periodIndex) latest.set(seriesKey, cell);
    }));
    latest.forEach((cell) => {
      cell.latest = true;
      const entry = panels.get(cell.group);
      if (!entry) return;
      entry.budget += Math.abs(cell.budget || 0);
      entry.actual += Math.abs(cell.actual || 0);
    });
    model.hasHighlights = Array.from(cells.values()).some((cell) => cell.highlighted) && Array.from(cells.values()).some((cell) => !cell.highlighted);
    model.kinds = KIND_ORDER.filter((kind) => kinds.has(kind));
    model.series = Array.from(series.values()).sort((left, right) => KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind) || left.order - right.order);
    model.panels = sortPanels(Array.from(panels.values()), options.groupSort);
    model.panels.forEach((panel) => panel.cells.sort((left, right) => left.periodIndex - right.periodIndex || KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind) || (left.comparisonIndex || 0) - (right.comparisonIndex || 0)));
    return model;
  }
  function fetchedRowCount(layout) {
    const pages = layout && layout.qHyperCube && layout.qHyperCube.qDataPages || [];
    return pages.reduce((sum, page) => sum + (page.qMatrix && page.qMatrix.length || 0), 0);
  }
  function stripDraft(draft) {
    const cell = { ...draft };
    delete cell.periodKey;
    delete cell.order;
    return cell;
  }
  function sortPeriods(entries, numeric, mode) {
    const ascending = (left, right) => {
      for (let level = 0; level < left[1].sort.length; level += 1) {
        const difference = numeric ? left[1].sort[level] - right[1].sort[level] : String(left[1].levels[level]).localeCompare(String(right[1].levels[level]), void 0, { numeric: true, sensitivity: "base" });
        if (difference) return difference;
      }
      return 0;
    };
    const byOrder = (left, right) => left[1].order - right[1].order;
    if (mode === "data") return entries.sort(byOrder);
    if (mode === "asc") return entries.sort(ascending);
    if (mode === "desc") return entries.sort((left, right) => ascending(right, left));
    return entries.sort(numeric ? ascending : byOrder);
  }
  function sortPanels(entries, mode) {
    const byLabel = (left, right) => left.panel.label.localeCompare(right.panel.label, void 0, { numeric: true, sensitivity: "base" });
    if (mode === "data") entries.sort((left, right) => left.order - right.order);
    else if (mode === "budget") entries.sort((left, right) => right.budget - left.budget || byLabel(left, right));
    else if (mode === "actual") entries.sort((left, right) => right.actual - left.actual || byLabel(left, right));
    else entries.sort(byLabel);
    return entries.map((entry) => entry.panel);
  }
  function tooltipFields(columns, measures, start) {
    const fields = [];
    for (let index = start; index < measures.length; index += 1) {
      const value = measures[index] && measures[index].text;
      if (!value || value === "-") continue;
      fields.push({ name: columns[index] && columns[index].title || "Tooltip", value });
    }
    return fields;
  }
  function measurePairKind(budget, actual, revenueValues) {
    return measureKind(budget, revenueValues) || measureKind(actual, revenueValues);
  }
  function measureKind(column, revenueValues) {
    const name = normalizeName(column && column.title);
    if (!name) return null;
    const revenueTerms = revenueValues.map(normalizeName).filter(Boolean);
    if (revenueTerms.some((term) => name.includes(term))) return "revenue";
    if (COST_TERMS.some((term) => name.includes(term))) return "cost";
    return null;
  }
  function normalizeName(value) {
    return String(value == null ? "" : value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }
  function columnTitle(column, fallback) {
    if (!column) return fallback;
    if (column.qFallbackTitle) return String(column.qFallbackTitle);
    if (Array.isArray(column.qGroupFallbackTitles) && column.qGroupFallbackTitles.length) return String(column.qGroupFallbackTitles[0]);
    return fallback;
  }
  function pageTop(page) {
    return page && page.qArea && typeof page.qArea.qTop === "number" ? page.qArea.qTop : 0;
  }
  function toCell(cell) {
    if (!cell) return blankCell();
    const numeric = typeof cell.qNum === "number" && isFinite(cell.qNum) ? cell.qNum : null;
    const text5 = cell.qText == null ? "" : String(cell.qText);
    const missing = !!cell.qIsNull || numeric == null && (text5 === "" || text5 === "-");
    return {
      text: missing ? "" : text5,
      num: missing ? null : numeric,
      elem: typeof cell.qElemNumber === "number" ? cell.qElemNumber : -2,
      state: cell.qState || "O"
    };
  }
  function blankCell() {
    return { text: "", num: null, elem: -2, state: "O" };
  }
  function periodIndexes(count) {
    return Array.from({ length: count }, (_, index) => index);
  }
  function isSelected(cell) {
    const state = cell && cell.state;
    return state === "S" || state === "L" || state === "XS" || state === "XL";
  }
  function readNumber(cell) {
    if (!cell || cell.num == null || !isFinite(cell.num)) return null;
    return cell.num;
  }
  function displayOf(cell) {
    if (!cell || cell.num == null || !cell.text || cell.text === "-") return null;
    return cell.text;
  }
  function measureTitle(columns, index, fallback) {
    return columns[index] && columns[index].title || fallback;
  }
  function scale(value, sign) {
    return value == null ? null : value * sign;
  }
  function addNullable(left, right) {
    if (left == null) return right;
    if (right == null) return left;
    return left + right;
  }
  function text2(value, fallback) {
    return typeof value === "string" && value.trim() ? value : fallback;
  }
  function clampInt(value, fallback, min, max) {
    const parsed = typeof value === "number" ? value : parseInt(String(value), 10);
    if (!isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.round(parsed)));
  }
  function choice(value, allowed, fallback) {
    const raw = typeof value === "string" ? value : "";
    for (let index = 0; index < allowed.length; index += 1) {
      if (allowed[index] === raw) return allowed[index];
    }
    return fallback;
  }

  // qlik/src/properties.ts
  var PAIR_COLORS = ["#A5A5A5", "#118DFF", "#E66C37", "#6B007B", "#E044A7", "#744EC2", "#D9B300", "#197278", "#8A3FFC", "#005D5D"];
  function dropdown(ref, label, options, defaultValue, show) {
    return {
      type: "string",
      component: "dropdown",
      label,
      ref: `props.${ref}`,
      options: options.map(([value, text5]) => ({ value, label: text5 })),
      defaultValue,
      show
    };
  }
  function toggle(ref, label, defaultValue, show) {
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
  function slider(ref, label, min, max, defaultValue, show) {
    return { type: "number", component: "slider", label, ref: `props.${ref}`, min, max, step: 1, defaultValue, show };
  }
  function integer(ref, label, min, max, defaultValue, show) {
    return { type: "integer", label, ref: `props.${ref}`, min, max, defaultValue, show };
  }
  function textItem(ref, label, defaultValue = "", show) {
    return { type: "string", label, ref: `props.${ref}`, defaultValue, show };
  }
  function colorItem(ref, label, color, show) {
    return {
      type: "object",
      component: "color-picker",
      label,
      ref: `props.${ref}`,
      defaultValue: { color, index: -1 },
      show
    };
  }
  function section(label, items) {
    return { type: "items", label, items };
  }
  var horizontal = (data) => data.props && data.props.orientation === "horizontal";
  var vertical = (data) => !data.props || data.props.orientation !== "horizontal";
  var actualBar = (data) => !data.props || data.props.actualStyle !== "marker";
  var beside = (data) => actualBar(data) && data.props && data.props.actualBarPosition === "beside";
  var pairs = (count) => (data) => data.props && Number(data.props.pairCount) >= count;
  var hasTarget = (data) => data.props && data.props.hasTarget === true;
  var grid = (data) => data.props && data.props.arrangement === "grid";
  var split = (data) => !data.props || data.props.componentMode === "split";
  function labelItems(prefix, positions, hPositions, bold) {
    const side = (data) => {
      const position = data.props && data.props[`${prefix}LabelPosition`];
      return position === "left" || position === "right" || position === "side";
    };
    return {
      mode: dropdown(`${prefix}LabelMode`, "Show", prefix === "budget" ? [["latest", "Latest period"], ["all", "All periods"], ["none", "Off"]] : [["auto", "Auto"], ["all", "All periods"], ["latest", "Latest period"], ["none", "Off"]], prefix === "budget" ? "latest" : "auto"),
      ...prefix === "actual" ? {
        content: dropdown("actualContent", "Label shows", [["value", "Value"], ["share", "% of budget"], ["both", "Value and % of budget"]], "value")
      } : {},
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
  function pairFields(kind) {
    const items = {};
    for (let index = 1; index <= 10; index += 1) {
      const show = pairs(index);
      if (kind === "name") items[`name${index}`] = textItem(`pair${index}Name`, `Pair ${index} name`, "", show);
      if (kind === "color") items[`color${index}`] = colorItem(`pair${index}Color`, `Pair ${index} budget`, PAIR_COLORS[index - 1], (data) => show(data) && (!data.props || data.props.colorBy !== "group"));
      if (kind === "legend") items[`label${index}`] = textItem(`legendPair${index}`, `Pair ${index} label`, "", show);
      if (kind === "show") items[`show${index}`] = toggle(`legendShowPair${index}`, `Show pair ${index}`, true, show);
    }
    return items;
  }
  function definition() {
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
          panelMode: dropdown("panelMode", "Groups", [["split", "One panel per group"], ["combine", "Combine into one panel"]], "split"),
          groupSort: dropdown("groupSort", "Sort panels", [["alpha", "Alphabetical"], ["data", "Load order"], ["budget", "Largest budget first"], ["actual", "Largest actual first"]], "alpha"),
          periodSort: dropdown("periodSort", "Sort periods", [["auto", "Auto"], ["asc", "Ascending"], ["desc", "Descending"], ["data", "Load order"]], "auto"),
          componentMode: dropdown("componentMode", "Components", [["split", "Revenue and costs side by side"], ["revenue", "Revenue only"], ["cost", "Costs only"], ["net", "Net result (revenue minus costs)"]], "split"),
          revenueValues: textItem("revenueValues", "Revenue values (comma separated)", "opbrengst, baten, inkomst, omzet, revenue, income"),
          totalGroupName: textItem("totalGroupName", "Panel title without a group", "Totaal"),
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
          maxPlotHeight: integer("maxPlotHeight", "Maximum panel height", 40, 1e3, 220),
          minPeriodWidth: integer("minPeriodWidth", "Minimum period size (0 = fit)", 0, 400, 0)
        }),
        bars: section("Bars", {
          budgetStyle: dropdown("budgetStyle", "Budget style", [["solid", "Solid"], ["light", "Light"], ["outline", "Outline"]], "solid"),
          budgetWidth: slider("budgetWidth", "Budget bar width (%)", 20, 100, 87),
          budgetRadius: slider("budgetRadius", "Budget corner radius", 0, 20, 0),
          actualStyle: dropdown("actualStyle", "Actual style", [["bar", "Bar"], ["marker", "Marker line"]], "bar"),
          actualRatio: slider("actualRatio", "Actual width (% of budget bar)", 5, 100, 38, actualBar),
          actualBarPosition: dropdown("actualBarPosition", "Actual position", [["overlay", "On top of budget"], ["beside", "Next to budget"]], "overlay", actualBar),
          actualGap: slider("actualGap", "Budget\u2013actual gap (px)", 0, 30, 3, beside),
          actualRadius: slider("actualRadius", "Actual corner radius", 0, 20, 0),
          periodGap: slider("periodGap", "Gap between periods (%)", 0, 80, 40),
          kindGap: slider("kindGap", "Revenue\u2013cost gap (%)", 0, 60, 0, split)
        }),
        axis: section("Category axis", {
          xShow: toggle("xShow", "Period labels", true),
          xFontFamily: textItem("xFontFamily", "Font", "Segoe UI"),
          xFontSize: slider("xFontSize", "Font size", 7, 24, 10),
          xBold: toggle("xBold", "Bold", false),
          xItalic: toggle("xItalic", "Italic", false),
          xUnderline: toggle("xUnderline", "Underline", false),
          xColor: colorItem("xColor", "Text color", "#605E5C"),
          xOrientation: dropdown("xOrientation", "Orientation", [["auto", "Auto (rotate when crowded)"], ["horizontal", "Horizontal"], ["diagonal", "Diagonal (45\xB0)"], ["vertical", "Vertical (90\xB0)"]], "auto", vertical),
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
          xPairOrientation: dropdown("xPairOrientation", "Pair names orientation", [["auto", "Auto (rotate when crowded)"], ["horizontal", "Horizontal"], ["diagonal", "Diagonal (45\xB0)"], ["vertical", "Vertical (90\xB0)"]], "auto", vertical),
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
  var DEFAULT_PROPS = {
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
  function swatch(color) {
    return { color, index: -1 };
  }

  // src/format.ts
  var SI_PREFIXES = ["", "k", "M", "G", "T", "P", "E"];
  var formatters = /* @__PURE__ */ new Map();
  function numberFormat(locale, options) {
    const key = `${locale}|${JSON.stringify(options)}`;
    let formatter = formatters.get(key);
    if (!formatter) {
      try {
        formatter = new Intl.NumberFormat(locale, options);
      } catch (e) {
        formatter = new Intl.NumberFormat("en-US", options);
      }
      formatters.set(key, formatter);
    }
    return formatter;
  }
  function formatSi(value, locale) {
    if (!isFinite(value)) return "";
    if (value === 0) return "0";
    const rounded = Number(value.toPrecision(3));
    const exponent = Math.max(0, Math.min(SI_PREFIXES.length - 1, Math.floor(Math.log10(Math.abs(rounded)) / 3)));
    const scaled = rounded / Math.pow(10, exponent * 3);
    return numberFormat(locale, { maximumSignificantDigits: 3, useGrouping: false }).format(scaled) + SI_PREFIXES[exponent];
  }
  function formatCompact(value, locale) {
    if (Math.abs(value) >= 1e3) return formatSi(value, locale);
    return numberFormat(locale, { maximumFractionDigits: 2, useGrouping: false }).format(value);
  }
  function formatPercent(value, decimals, locale) {
    return numberFormat(locale, { style: "percent", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  }
  function axisLabel(value, percent, locale) {
    return percent ? formatPercent(value, 0, locale) : formatCompact(value, locale);
  }
  function barLabel(value, percent, locale) {
    return percent ? formatPercent(value, 1, locale) : formatCompact(value, locale);
  }

  // qlik/src/style.ts
  var PAIR_COLORS2 = ["#A5A5A5", "#118DFF", "#E66C37", "#6B007B", "#E044A7", "#744EC2", "#D9B300", "#197278", "#8A3FFC", "#005D5D"];
  var GROUP_PALETTE = ["#118DFF", "#12239E", "#E66C37", "#6B007B", "#E044A7", "#744EC2", "#D9B300", "#197278"];
  function styleFromProps(props, model, locale) {
    const revenueName = text3(props.revenueName, model.names.revenue || "Opbrengsten");
    const costName = text3(props.costName, model.names.cost || "Kosten");
    const budgetName = model.names.budget || "Budget";
    const actualName = model.names.actual || "Actual YTD";
    const horizontal2 = props.orientation === "horizontal";
    return {
      orientation: horizontal2 ? "horizontal" : "vertical",
      arrangement: choice2(props.arrangement, ["stack", "grid", "row"], "stack"),
      columns: Math.round(num(props.columns, 0, 0, 12)),
      sharedAxis: props.sharedAxis === true,
      showYAxis: props.showYAxis !== false,
      showGrid: props.showGrid !== false,
      minPlotHeight: num(props.minPlotHeight, 110, 40, 600),
      maxPlotHeight: num(props.maxPlotHeight, 220, 40, 1e3),
      minPeriodWidth: num(props.minPeriodWidth, 0, 0, 400),
      budgetStyle: choice2(props.budgetStyle, ["solid", "light", "outline"], "solid"),
      budgetWidth: num(props.budgetWidth, 87, 20, 100) / 100,
      actualStyle: choice2(props.actualStyle, ["bar", "marker"], "bar"),
      actualRatio: num(props.actualRatio, 38, 5, 100) / 100,
      actualPosition: choice2(props.actualBarPosition, ["overlay", "beside"], "overlay"),
      actualGap: num(props.actualGap, 3, 0, 30),
      groupWidth: 1 - num(props.periodGap, 40, 0, 80) / 100,
      kindGap: num(props.kindGap, 0, 0, 60) / 100,
      budgetRadius: num(props.budgetRadius, 0, 0, 20),
      actualRadius: num(props.actualRadius, 0, 0, 20),
      showComparisonLabels: props.xShowPairs !== false,
      comparisonColors: PAIR_COLORS2.map((fallback, index) => colorOf(props[`pair${index + 1}Color`], fallback)),
      colorBy: choice2(props.colorBy, ["component", "group"], "component"),
      revenueColor: colorOf(props.revenueColor, "#118DFF"),
      costColor: colorOf(props.costColor, "#E66C37"),
      netColor: colorOf(props.netColor, "#118DFF"),
      actualColor: colorOf(props.actualColor, "#252423"),
      highlightOverrun: props.highlightOverrun === true,
      overrunColor: colorOf(props.overrunColor, "#C4314B"),
      groupColor,
      legendPosition: choice2(props.legendPosition, ["top", "bottom", "left", "right", "none"], "top"),
      revenueText: text3(props.legendRevenue, "") || `${budgetName} \xB7 ${revenueName}`,
      costText: text3(props.legendCost, "") || `${budgetName} \xB7 ${costName}`,
      budgetText: text3(props.legendBudget, "") || budgetName,
      actualText: text3(props.legendActual, "") || actualName,
      overrunText: text3(props.overrunText, "Boven begroting"),
      revenueName,
      costName,
      fontFamily: text3(props.fontFamily, "Segoe UI"),
      fontSize: num(props.fontSize, 10, 7, 20),
      fontBold: props.fontBold === true,
      fontItalic: props.fontItalic === true,
      fontUnderline: props.fontUnderline === true,
      legend: {
        fontFamily: text3(props.legendFontFamily, "Segoe UI"),
        fontSize: num(props.legendFontSize, 11, 7, 24),
        color: colorOf(props.legendColor, "#333333"),
        bold: props.legendBold === true,
        italic: props.legendItalic === true,
        underline: props.legendUnderline === true,
        revenue: text3(props.legendRevenue, ""),
        cost: text3(props.legendCost, ""),
        budget: text3(props.legendBudget, ""),
        actual: text3(props.legendActual, ""),
        target: text3(props.legendTarget, ""),
        pairs: Array.from({ length: 10 }, (_, index) => text3(props[`legendPair${index + 1}`], "")),
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
      targetText: text3(props.legendTarget, "") || model.names.target || "Target",
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
        fontFamily: text3(props.xFontFamily, "Segoe UI"),
        fontSize: num(props.xFontSize, 10, 7, 24),
        color: colorOf(props.xColor, "#605E5C"),
        bold: props.xBold === true,
        italic: props.xItalic === true,
        underline: props.xUnderline === true,
        orientation: choice2(props.xOrientation, ["auto", "horizontal", "diagonal", "vertical"], "auto"),
        labelLength: choice2(props.xLabelLength, ["auto", "full"], "auto"),
        maxLabelWidth: num(props.xMaxLabelWidth, 120, 30, 300),
        showParents: props.xShowParents !== false,
        showSeparators: props.xShowSeparators !== false,
        showComponents: props.xShowComponents !== false,
        showPairs: props.xShowPairs !== false,
        pairFontFamily: text3(props.xPairFontFamily, "Segoe UI"),
        pairFontSize: num(props.xPairFontSize, 10, 7, 24),
        pairBold: props.xPairBold === true,
        pairItalic: props.xPairItalic === true,
        pairUnderline: props.xPairUnderline === true,
        pairOrientation: choice2(props.xPairOrientation, ["auto", "horizontal", "diagonal", "vertical"], "auto"),
        pairColorMode: props.xPairColorMode === "fixed" ? "fixed" : "pair",
        pairColor: colorOf(props.xPairColor, "#605E5C"),
        showLine: props.xShowLine !== false,
        lineColor: colorOf(props.xLineColor, "#BBBBBB"),
        showTitle: props.xShowTitle === true,
        title: text3(props.xTitle, "")
      },
      budgetLabel: {
        ...labelStyle("budget", props, "#333333", false, ["left", "side", "above", "inside"], "left"),
        hPosition: choice2(props.budgetLabelHPosition, ["after", "insideEnd", "insideBase"], "after"),
        combine: props.budgetCombine !== false,
        separator: typeof props.budgetSeparator === "string" ? props.budgetSeparator : " / ",
        mode: choice2(props.budgetLabelMode, ["latest", "all", "none"], "latest")
      },
      actualLabel: {
        ...labelStyle("actual", props, "#111111", true, ["right", "side", "above", "inside"], "right"),
        hPosition: choice2(props.actualLabelHPosition, ["end", "after", "insideEnd", "insideBase"], "end"),
        mode: choice2(props.actualLabelMode, ["auto", "all", "latest", "none"], "auto"),
        content: choice2(props.actualContent, ["value", "share", "both"], "value")
      },
      formatters: buildFormatters(props, model, locale)
    };
  }
  function tooltipRows(cell, model, style, shareText, locale) {
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
    cell.tooltips.forEach((field) => rows.push({ name: field.name, value: field.value }));
    return rows;
  }
  function shown(display, value, format, model, locale) {
    if (value == null) return "\u2014";
    if (display) return display;
    const percent = isPercentFormat(format) || model.percentHint;
    return percent ? formatPercent(value, 1, locale) : new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  }
  function labelStyle(prefix, props, textColor, bold, positions, position) {
    const key = (name) => props[`${prefix}Label${name}`];
    const boldValue = key("Bold");
    return {
      position: choice2(key("Position"), positions, position),
      fontFamily: text3(key("FontFamily"), "Segoe UI"),
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
  function buildFormatters(props, model, locale) {
    const mode = choice2(props.valueFormat, ["auto", "compact", "number", "percent"], "auto");
    const units = Math.max(0, num(props.displayUnits, 0, 0, 1e9));
    const decimals = Math.round(num(props.decimals, -1, -1, 6));
    const percentFallback = model.percentHint;
    const plain = (value, axis) => {
      const digits = decimals >= 0 ? decimals : axis || Math.abs(value) >= 100 ? 0 : 2;
      return new Intl.NumberFormat(locale, { minimumFractionDigits: decimals >= 0 ? decimals : 0, maximumFractionDigits: digits }).format(value);
    };
    const scaled = (value, axis) => {
      if (units > 1) {
        const suffix = units === 1e3 ? "k" : units === 1e6 ? "M" : units === 1e9 ? "B" : "";
        return plain(value / units, axis) + suffix;
      }
      return axis ? axisLabel(value, false, locale) : barLabel(value, false, locale);
    };
    return {
      label: (value, format) => {
        if (mode === "percent" || isPercentFormat(format) || mode === "auto" && percentFallback && !format) return formatPercent(value, decimals >= 0 ? decimals : 1, locale);
        if (mode === "number" || units === 1) return plain(value, false);
        return scaled(value, false);
      },
      axis: (value, _ticks, format) => {
        if (mode === "percent" || isPercentFormat(format) || mode === "auto" && percentFallback && !format) return formatPercent(value, 0, locale);
        if (mode === "number" || units === 1) return plain(value, true);
        return scaled(value, true);
      },
      share: (actual, budget) => formatPercent(actual / budget, 0, locale)
    };
  }
  function groupColor(label) {
    let hash = 0;
    for (let index = 0; index < label.length; index += 1) hash = hash * 31 + label.charCodeAt(index) >>> 0;
    return GROUP_PALETTE[hash % GROUP_PALETTE.length];
  }
  function colorOf(value, fallback) {
    if (typeof value === "string" && value.trim()) return value;
    if (value && typeof value === "object" && typeof value.color === "string" && value.color) {
      return value.color;
    }
    return fallback;
  }
  function num(value, fallback, min, max) {
    const parsed = typeof value === "number" ? value : parseFloat(String(value));
    if (!isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
  }
  function text3(value, fallback) {
    return typeof value === "string" && value.trim() ? value : fallback;
  }
  function choice2(value, allowed, fallback) {
    const raw = typeof value === "string" ? value : "";
    for (let index = 0; index < allowed.length; index += 1) {
      if (allowed[index] === raw) return allowed[index];
    }
    return fallback;
  }

  // qlik/src/visual.css.ts
  var VISUAL_CSS = `
.bva-host {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    background: transparent;
    color: #252423;
    font-family: "Segoe UI", "Segoe UI Web", sans-serif;
    user-select: none;
}
.bva-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
}
.bva-scroll::-webkit-scrollbar { width: 12px; height: 12px; }
.bva-scroll::-webkit-scrollbar-thumb {
    background: #c8c6c4;
    border-radius: 6px;
    border: 3px solid #ffffff;
}
.bva-scroll svg { display: block; }
.bva-hit { cursor: pointer; }
.bva-hit:focus {
    outline: none;
    stroke: #605e5c;
    stroke-width: 2px;
    stroke-dasharray: 4 2;
}
.bva-empty {
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
    padding: 24px;
    box-sizing: border-box;
    text-align: center;
}
.bva-empty-title { margin-bottom: 8px; font-size: 14px; font-weight: 600; }
.bva-empty-body {
    max-width: 560px;
    margin: 0 auto;
    color: #605e5c;
    font-size: 12px;
    line-height: 1.45;
}
.bva-tip {
    position: fixed;
    z-index: 100000;
    max-width: 320px;
    padding: 8px 10px;
    background: #ffffff;
    border: 1px solid #d2d0ce;
    border-radius: 2px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
    color: #252423;
    font-family: "Segoe UI", sans-serif;
    font-size: 12px;
    line-height: 1.35;
    pointer-events: none;
}
.bva-tip-row { display: flex; justify-content: space-between; gap: 16px; }
.bva-tip-name { color: #605e5c; }
.bva-tip-value { font-variant-numeric: tabular-nums; text-align: right; }
`;

  // qlik/src/extension.ts
  var STYLE_ID = "begroting-realisatie-style";
  var tip = null;
  function createExtension(qlik) {
    return {
      initialProperties: {
        qHyperCubeDef: {
          qDimensions: [],
          qMeasures: [],
          qSuppressMissing: true,
          qSuppressZero: false,
          qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 50, qHeight: 200 }]
        },
        props: DEFAULT_PROPS
      },
      definition: definition(),
      support: {
        snapshot: true,
        export: true,
        exportData: true
      },
      paint($element, layout) {
        ensureCss();
        hideTip();
        const node = hostOf($element);
        if (!node) return;
        const size = sizeOf($element, node);
        if (size.width < 20 || size.height < 20) return;
        node.classList.add("bva-host");
        node.style.width = `${size.width}px`;
        node.style.height = `${size.height}px`;
        const props = { ...DEFAULT_PROPS, ...layout && layout.props || {} };
        const model = buildFromCube(cubeFromLayout(layout), optionsFromProps(props));
        const locale = readLocale(qlik, this);
        const style = styleFromProps(props, model, locale);
        const api = this;
        renderChart(node, {
          model,
          width: size.width,
          height: size.height,
          style,
          selectedKeys: /* @__PURE__ */ new Set(),
          handlers: {
            select: (cell, multi) => selectCell(api, cell, multi),
            clear: () => clearSelections(api),
            tooltip: (cell, x, y) => showTip(cell, model, style, text4(props.shareText, "% van jaarbegroting"), locale, x, y),
            hideTooltip: hideTip,
            contextMenu: () => hideTip()
          }
        });
        requestMore(api, node, layout);
      }
    };
  }
  function hostOf($element) {
    if (!$element) return null;
    if ($element.jquery || $element[0] && $element[0].nodeType === 1 && typeof $element.width === "function") return $element[0];
    if ($element.nodeType === 1) return $element;
    return null;
  }
  function sizeOf($element, node) {
    const width = $element && typeof $element.width === "function" ? $element.width() : node.clientWidth;
    const height = $element && typeof $element.height === "function" ? $element.height() : node.clientHeight;
    return { width: width || node.clientWidth || 0, height: height || node.clientHeight || 0 };
  }
  function readLocale(qlik, owner) {
    try {
      const app = qlik && qlik.currApp && qlik.currApp(owner);
      const collation = app && app.model && app.model.layout && app.model.layout.qLocaleInfo && app.model.layout.qLocaleInfo.qCollation;
      if (typeof collation === "string" && collation) {
        Intl.NumberFormat(collation);
        return collation;
      }
    } catch (e) {
    }
    return "nl-NL";
  }
  function requestMore(api, node, layout) {
    const cube = layout && layout.qHyperCube;
    const backend = api && api.backendApi;
    if (!cube || !cube.qSize || !backend || typeof backend.getData !== "function") return;
    const total = cube.qSize.qcy || 0;
    const fetched = fetchedRowCount(layout);
    const guard = node._bvaFetched;
    if (fetched >= total || fetched === guard) return;
    node._bvaFetched = fetched;
    const width = Math.max(1, cube.qSize.qcx || 1);
    const height = Math.max(1, Math.min(Math.floor(1e4 / width), total - fetched));
    backend.getData([{ qTop: fetched, qLeft: 0, qWidth: width, qHeight: height }]);
  }
  function selectCell(api, cell, toggle2) {
    const points = (cell.selectionId || {}).points || [];
    let chain = Promise.resolve();
    points.forEach((point) => {
      chain = chain.then(() => selectDimension(api, point.dim, point.elem, toggle2));
    });
  }
  function selectDimension(api, dim, elem, toggle2) {
    const backend = api && api.backendApi;
    const call = backend && typeof backend.selectHyperCubeValues === "function" ? backend.selectHyperCubeValues("/qHyperCubeDef", dim, [elem], toggle2) : api && typeof api.selectValues === "function" ? api.selectValues(dim, [elem], toggle2) : null;
    return call && typeof call.then === "function" ? call : Promise.resolve(call);
  }
  function clearSelections(api) {
    const backend = api && api.backendApi;
    if (backend && typeof backend.clearSelections === "function") backend.clearSelections();
  }
  function showTip(cell, model, style, shareText, locale, x, y) {
    hideTip();
    const node = document.createElement("div");
    node.className = "bva-tip";
    tooltipRows(cell, model, style, shareText, locale).forEach((row) => {
      const line = document.createElement("div");
      line.className = "bva-tip-row";
      const name = document.createElement("span");
      name.className = "bva-tip-name";
      name.textContent = row.name;
      const value = document.createElement("span");
      value.className = "bva-tip-value";
      value.textContent = row.value;
      line.appendChild(name);
      line.appendChild(value);
      node.appendChild(line);
    });
    document.body.appendChild(node);
    const box = node.getBoundingClientRect();
    node.style.left = `${Math.max(8, Math.min(x + 14, window.innerWidth - box.width - 8))}px`;
    node.style.top = `${Math.max(8, Math.min(y + 14, window.innerHeight - box.height - 8))}px`;
    tip = node;
  }
  function hideTip() {
    if (!tip) return;
    tip.remove();
    tip = null;
  }
  function ensureCss() {
    if (document.getElementById(STYLE_ID)) return;
    const node = document.createElement("style");
    node.id = STYLE_ID;
    node.textContent = VISUAL_CSS;
    document.head.appendChild(node);
  }
  function text4(value, fallback) {
    return typeof value === "string" && value.trim() ? value : fallback;
  }
  var amdDefine = globalThis.define;
  if (typeof amdDefine === "function") {
    amdDefine(["qlik"], (qlik) => createExtension(qlik));
  }
})();
