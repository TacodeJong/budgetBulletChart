const SI_PREFIXES = ["", "k", "M", "G", "T", "P", "E"];
const formatters = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
    const key = `${locale}|${JSON.stringify(options)}`;
    let formatter = formatters.get(key);
    if (!formatter) {
        try {
            formatter = new Intl.NumberFormat(locale, options);
        } catch {
            formatter = new Intl.NumberFormat("en-US", options);
        }
        formatters.set(key, formatter);
    }
    return formatter;
}

export function formatSi(value: number, locale: string): string {
    if (!isFinite(value)) return "";
    if (value === 0) return "0";
    const rounded = Number(value.toPrecision(3));
    const exponent = Math.max(0, Math.min(SI_PREFIXES.length - 1, Math.floor(Math.log10(Math.abs(rounded)) / 3)));
    const scaled = rounded / Math.pow(10, exponent * 3);
    return numberFormat(locale, { maximumSignificantDigits: 3, useGrouping: false }).format(scaled) + SI_PREFIXES[exponent];
}

export function formatCompact(value: number, locale: string): string {
    if (Math.abs(value) >= 1000) return formatSi(value, locale);
    return numberFormat(locale, { maximumFractionDigits: 2, useGrouping: false }).format(value);
}

export function formatPercent(value: number, decimals: number, locale: string): string {
    return numberFormat(locale, { style: "percent", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

export function axisLabel(value: number, percent: boolean, locale: string): string {
    return percent ? formatPercent(value, 0, locale) : formatCompact(value, locale);
}

export function barLabel(value: number, percent: boolean, locale: string): string {
    return percent ? formatPercent(value, 1, locale) : formatCompact(value, locale);
}

export function tooltipValue(value: number | null, percent: boolean, locale: string): string {
    if (value == null || !isFinite(value)) return "—";
    if (percent) return formatPercent(value, 1, locale);
    return numberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
