export interface BandScale {
    step: number;
    bandwidth: number;
    x(index: number): number;
}

export interface LinearScale {
    domain: [number, number];
    ticks: number[];
    map(value: number): number;
}

export function bandScale(count: number, width: number, paddingInner: number, paddingOuter: number): BandScale {
    const n = Math.max(1, count);
    const step = width / Math.max(1, n - paddingInner + paddingOuter * 2);
    const start = (width - step * (n - paddingInner)) / 2;
    return {
        step,
        bandwidth: step * (1 - paddingInner),
        x: index => start + step * index
    };
}

export function panelScale(values: number[], height: number, padding = 22, tickCount = 3): LinearScale {
    let low = 0;
    let high = 0;
    values.forEach(value => {
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
        map: value => height - ((value - domain[0]) / span) * height
    };
}

export function tickIncrement(start: number, stop: number, count: number): number {
    const step = (stop - start) / Math.max(0, count);
    const power = Math.floor(Math.log10(step));
    const error = step / Math.pow(10, power);
    const factor = error >= Math.sqrt(50) ? 10 : error >= Math.sqrt(10) ? 5 : error >= Math.sqrt(2) ? 2 : 1;
    return power >= 0 ? factor * Math.pow(10, power) : -Math.pow(10, -power) / factor;
}

export function nice(start: number, stop: number, count: number): [number, number] {
    let previous: number | undefined;
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

export function ticks(start: number, stop: number, count: number): number[] {
    const step = tickIncrement(start, stop, count);
    if (!isFinite(step) || step === 0) return [];
    const result: number[] = [];
    if (step > 0) {
        for (let index = Math.ceil(start / step); index <= Math.floor(stop / step); index += 1) result.push(index * step || 0);
    } else {
        const inverse = -step;
        for (let index = Math.ceil(start * inverse); index <= Math.floor(stop * inverse); index += 1) result.push(index / inverse || 0);
    }
    return result;
}
