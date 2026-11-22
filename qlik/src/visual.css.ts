export const VISUAL_CSS = `
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
