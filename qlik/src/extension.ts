import { BudgetCell } from "../../src/model";
import { renderChart } from "../../src/render";
import { buildFromCube, cubeFromLayout, fetchedRowCount, optionsFromProps } from "./cube";
import { DEFAULT_PROPS, definition } from "./properties";
import { styleFromProps, tooltipRows } from "./style";
import { VISUAL_CSS } from "./visual.css";

const STYLE_ID = "begroting-realisatie-style";
let tip: HTMLDivElement | null = null;

export function createExtension(qlik?: { currApp?: (owner: unknown) => any }) {
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
        paint(this: any, $element: any, layout: any) {
            ensureCss();
            hideTip();
            const node = hostOf($element);
            if (!node) return;
            const size = sizeOf($element, node);
            if (size.width < 20 || size.height < 20) return;
            node.classList.add("bva-host");
            node.style.width = `${size.width}px`;
            node.style.height = `${size.height}px`;
            const props = { ...DEFAULT_PROPS, ...((layout && layout.props) || {}) };
            const model = buildFromCube(cubeFromLayout(layout), optionsFromProps(props));
            const locale = readLocale(qlik, this);
            const style = styleFromProps(props, model, locale);
            const api = this;
            renderChart(node, {
                model,
                width: size.width,
                height: size.height,
                style,
                selectedKeys: new Set<string>(),
                handlers: {
                    select: (cell, multi) => selectCell(api, cell, multi),
                    clear: () => clearSelections(api),
                    tooltip: (cell, x, y) => showTip(cell, model, style, text(props.shareText, "% van jaarbegroting"), locale, x, y),
                    hideTooltip: hideTip,
                    contextMenu: () => hideTip()
                }
            });
            requestMore(api, node, layout);
        }
    };
}

function hostOf($element: any): HTMLElement | null {
    if (!$element) return null;
    if ($element.jquery || ($element[0] && $element[0].nodeType === 1 && typeof $element.width === "function")) return $element[0];
    if ($element.nodeType === 1) return $element;
    return null;
}

function sizeOf($element: any, node: HTMLElement): { width: number; height: number } {
    const width = $element && typeof $element.width === "function" ? $element.width() : node.clientWidth;
    const height = $element && typeof $element.height === "function" ? $element.height() : node.clientHeight;
    return { width: width || node.clientWidth || 0, height: height || node.clientHeight || 0 };
}

function readLocale(qlik: { currApp?: (owner: unknown) => any } | undefined, owner: unknown): string {
    try {
        const app = qlik && qlik.currApp && qlik.currApp(owner);
        const collation = app && app.model && app.model.layout && app.model.layout.qLocaleInfo && app.model.layout.qLocaleInfo.qCollation;
        if (typeof collation === "string" && collation) {
            Intl.NumberFormat(collation);
            return collation;
        }
    } catch {
        /* Qlik's collation is not always a valid Intl locale. */
    }
    return "nl-NL";
}

function requestMore(api: any, node: HTMLElement, layout: any): void {
    const cube = layout && layout.qHyperCube;
    const backend = api && api.backendApi;
    if (!cube || !cube.qSize || !backend || typeof backend.getData !== "function") return;
    const total = cube.qSize.qcy || 0;
    const fetched = fetchedRowCount(layout);
    const guard = (node as HTMLElement & { _bvaFetched?: number })._bvaFetched;
    if (fetched >= total || fetched === guard) return;
    (node as HTMLElement & { _bvaFetched?: number })._bvaFetched = fetched;
    const width = Math.max(1, cube.qSize.qcx || 1);
    const height = Math.max(1, Math.min(Math.floor(10000 / width), total - fetched));
    backend.getData([{ qTop: fetched, qLeft: 0, qWidth: width, qHeight: height }]);
}

function selectCell(api: any, cell: BudgetCell, toggle: boolean): void {
    const points = ((cell.selectionId as { points?: { dim: number; elem: number }[] } | null) || {}).points || [];
    let chain: Promise<unknown> = Promise.resolve();
    points.forEach(point => {
        chain = chain.then(() => selectDimension(api, point.dim, point.elem, toggle));
    });
}

function selectDimension(api: any, dim: number, elem: number, toggle: boolean): Promise<unknown> {
    const backend = api && api.backendApi;
    const call = backend && typeof backend.selectHyperCubeValues === "function"
        ? backend.selectHyperCubeValues("/qHyperCubeDef", dim, [elem], toggle)
        : api && typeof api.selectValues === "function"
            ? api.selectValues(dim, [elem], toggle)
            : null;
    return call && typeof call.then === "function" ? call : Promise.resolve(call);
}

function clearSelections(api: any): void {
    const backend = api && api.backendApi;
    if (backend && typeof backend.clearSelections === "function") backend.clearSelections();
}

function showTip(cell: BudgetCell, model: ReturnType<typeof buildFromCube>, style: ReturnType<typeof styleFromProps>, shareText: string, locale: string, x: number, y: number): void {
    hideTip();
    const node = document.createElement("div");
    node.className = "bva-tip";
    tooltipRows(cell, model, style, shareText, locale).forEach(row => {
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

function hideTip(): void {
    if (!tip) return;
    tip.remove();
    tip = null;
}

function ensureCss(): void {
    if (document.getElementById(STYLE_ID)) return;
    const node = document.createElement("style");
    node.id = STYLE_ID;
    node.textContent = VISUAL_CSS;
    document.head.appendChild(node);
}

function text(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim() ? value : fallback;
}

const amdDefine = (globalThis as { define?: (deps: string[], factory: (qlik: any) => unknown) => void }).define;
if (typeof amdDefine === "function") {
    amdDefine(["qlik"], qlik => createExtension(qlik));
}
