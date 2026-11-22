// Builds samples/pbip/BudgetBulletChart-sample.pbip (a Power BI project) from dist/*.pbiviz and generated sample data.
// Usage: npx pbiviz package && node samples/build-sample.mjs
import { execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const name = "BudgetBulletChart-sample";
const out = path.join(here, "pbip");
const report = path.join(out, `${name}.Report`);
const model = path.join(out, `${name}.SemanticModel`);

const pbiviz = JSON.parse(fs.readFileSync(path.join(root, "pbiviz.json"), "utf8"));
const guid = pbiviz.visual.guid;
const packageFile = fs.readdirSync(path.join(root, "dist")).find(file => file.startsWith(guid) && file.endsWith(".pbiviz"));
if (!packageFile) throw new Error("Run `npx pbiviz package` first.");

fs.rmSync(out, { recursive: true, force: true });
const write = (file, content) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof content === "string" ? content : JSON.stringify(content, null, 2));
};
const stableId = seed => {
    const hex = createHash("sha1").update(seed).digest("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

// ---------- sample data ----------
const months = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep"];
const departments = [["Noord", 1.0], ["Midden", 1.4], ["Zuid", 0.8]];
const kinds = [
    ["Opbrengsten", "Subsidies", 600000],
    ["Opbrengsten", "Verkopen", 600000],
    ["Kosten", "Personeel", 550000],
    ["Kosten", "Materieel", 250000],
    ["Kosten", "Overig", 150000]
];
const pace = (department, kind, month, year) => {
    const wave = Math.sin((month + 1) * 1.7 + department.length + kind.length * 0.3 + year) * 0.25;
    const drift = department === "Zuid" && kind === "Materieel" ? 0.45 : department === "Midden" && kind === "Verkopen" ? -0.25 : 0;
    return 1 + wave + drift;
};
const rows = [];
for (const [department, scale] of departments) {
    for (const [component, kind, annual] of kinds) {
        months.forEach((month, index) => {
            const budget2026 = Math.round(annual * scale);
            const budget2025 = Math.round(budget2026 * 0.94);
            rows.push({
                Maand: month, MaandNr: index + 1, Afdeling: department, Component: component, Soort: kind,
                Begroting2026: budget2026, Realisatie2026: Math.round(budget2026 / 12 * pace(department, kind, index, 2026)),
                Begroting2025: budget2025, Realisatie2025: Math.round(budget2025 / 12 * pace(department, kind, index, 2025))
            });
        });
    }
}
const columns = Object.keys(rows[0]);
write(path.join(here, "budget-sample.csv"), [columns.join(";"), ...rows.map(row => columns.map(column => row[column]).join(";"))].join("\n") + "\n");

// ---------- semantic model ----------
const mType = column => typeof rows[0][column] === "number" ? (column === "MaandNr" ? "Int64.Type" : "number") : "text";
const mValue = value => typeof value === "number" ? String(value) : `"${value}"`;
const mTable = `#table(type table [${columns.map(column => `${column} = ${mType(column)}`).join(", ")}], {\n${rows.map(row => `\t\t\t\t\t{${columns.map(column => mValue(row[column])).join(", ")}}`).join(",\n")}\n\t\t\t\t})`;
const tmdlColumn = column => {
    const numeric = typeof rows[0][column] === "number";
    const lines = [
        `\tcolumn ${column}`,
        `\t\tdataType: ${numeric ? (column === "MaandNr" ? "int64" : "double") : "string"}`,
        numeric && column !== "MaandNr" ? `\t\tformatString: #,0` : null,
        `\t\tlineageTag: ${stableId("col" + column)}`,
        `\t\tsummarizeBy: ${numeric && column !== "MaandNr" ? "sum" : "none"}`,
        `\t\tsourceColumn: ${column}`,
        column === "Maand" ? `\t\tsortByColumn: MaandNr` : null,
        numeric && column !== "MaandNr" ? `\t\tisHidden` : null,
        "",
        `\t\tannotation SummarizationSetBy = Automatic`,
        ""
    ];
    return lines.filter(line => line != null).join("\n");
};
const ytd = column => `\n\t\t\tVAR m = MAX ( Data[MaandNr] )\n\t\t\tRETURN\n\t\t\t\tCALCULATE ( SUM ( Data[${column}] ), FILTER ( ALL ( Data[Maand], Data[MaandNr] ), Data[MaandNr] <= m ) )`;
const measures = [
    ["Jaarbegroting", "SUM ( Data[Begroting2026] )"],
    ["Realisatie YTD", ytd("Realisatie2026")],
    ["Target YTD", "\n\t\t\tDIVIDE ( [Jaarbegroting] * MAX ( Data[MaandNr] ), 12 )"],
    ["Jaarbegroting 2025", "SUM ( Data[Begroting2025] )"],
    ["Realisatie YTD 2025", ytd("Realisatie2025")],
    ["Jaarbegroting 2026", "[Jaarbegroting]"],
    ["Realisatie YTD 2026", "[Realisatie YTD]"]
];
const tmdlMeasure = ([measure, expression]) => `\tmeasure '${measure}' = ${expression}\n\t\tformatString: #,0\n\t\tlineageTag: ${stableId("measure" + measure)}\n`;

write(path.join(model, "definition", "tables", "Data.tmdl"), `table Data
\tlineageTag: ${stableId("tableData")}

${measures.map(tmdlMeasure).join("\n")}
${columns.map(tmdlColumn).join("\n")}
\tpartition Data = m
\t\tmode: import
\t\tsource = \`\`\`
\t\t\t\tlet
\t\t\t\t    Source = ${mTable}
\t\t\t\tin
\t\t\t\t    Source
\t\t\t\t\`\`\`

\tannotation PBI_ResultType = Table
`);
write(path.join(model, "definition", "model.tmdl"), `model Model
\tculture: nl-NL
\tdefaultPowerBIDataSourceVersion: powerBI_V3
\tsourceQueryCulture: nl-NL
\tdataAccessOptions
\t\tlegacyRedirects
\t\treturnErrorValuesAsNull

annotation __PBI_TimeIntelligenceEnabled = 0

annotation PBI_QueryOrder = ["Data"]

ref table Data
`);
write(path.join(model, "definition", "database.tmdl"), "database\n\tcompatibilityLevel: 1606\n");
write(path.join(model, "definition.pbism"), {
    $schema: "https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json",
    version: "4.2",
    settings: {}
});
write(path.join(model, ".platform"), {
    $schema: "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
    metadata: { type: "SemanticModel", displayName: name },
    config: { version: "2.0", logicalId: randomUUID() }
});

// ---------- report ----------
const visualFolder = path.join(report, "CustomVisuals", guid);
fs.mkdirSync(visualFolder, { recursive: true });
execFileSync("tar", ["-xf", path.join(root, "dist", packageFile), "-C", visualFolder]);
const resources = fs.readdirSync(path.join(visualFolder, "resources"));

const literal = value => ({ expr: { Literal: { Value: typeof value === "string" ? `'${value}'` : typeof value === "number" ? `${value}D` : String(value) } } });
const color = value => ({ solid: { color: literal(value) } });
const objects = spec => Object.fromEntries(Object.entries(spec).map(([object, properties]) => [object, [{
    properties: Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, typeof value === "string" && value.startsWith("#") ? color(value) : literal(value)]))
}]]));
const column = property => ({ field: { Column: { Expression: { SourceRef: { Entity: "Data" } }, Property: property } }, queryRef: `Data.${property}`, nativeQueryRef: property, active: true });
const measure = property => ({ field: { Measure: { Expression: { SourceRef: { Entity: "Data" } }, Property: property } }, queryRef: `Data.${property}`, nativeQueryRef: property });
const title = text => ({ title: [{ properties: { show: literal(true), text: literal(text), fontSize: literal(12) } }] });

const pages = [];
const page = (id, displayName, visuals) => {
    pages.push(id);
    const folder = path.join(report, "definition", "pages", id);
    write(path.join(folder, "page.json"), {
        $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.0.0/schema.json",
        name: id, displayName, displayOption: "FitToPage", height: 768, width: 1366
    });
    visuals.forEach((visual, index) => write(path.join(folder, "visuals", visual.name, "visual.json"), {
        $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.4.0/schema.json",
        name: visual.name,
        position: { ...visual.position, z: index * 1000, tabOrder: index * 1000 },
        visual: {
            visualType: visual.type,
            query: { queryState: visual.query },
            ...(visual.objects ? { objects: objects(visual.objects) } : {}),
            visualContainerObjects: title(visual.title),
            drillFilterOtherVisuals: true
        }
    }));
};
const bullet = (name, titleText, position, query, settings) => ({ name, type: guid, title: titleText, position, query, objects: settings });
const afdelingChart = (name, position) => ({
    name, type: "clusteredBarChart", title: "Realisatie YTD per afdeling (klik om te highlighten)", position,
    query: { Category: { projections: [column("Afdeling")] }, Y: { projections: [measure("Realisatie YTD")] } }
});

page("p1overzicht000000001", "Begroting vs realisatie", [
    bullet("bullet_main", "Jaarbegroting vs realisatie YTD per afdeling", { x: 16, y: 16, width: 1000, height: 736 }, {
        period: { projections: [column("Maand")] },
        group: { projections: [column("Afdeling")] },
        component: { projections: [column("Component")] },
        budget: { projections: [measure("Jaarbegroting")] },
        actual: { projections: [measure("Realisatie YTD")] },
        target: { projections: [measure("Target YTD")] }
    }, { layout: { arrangement: "stack" }, grouping: { periodSort: "data" }, colors: { highlightOverrun: true }, target: { shape: "bar" } }),
    afdelingChart("bar_afdeling", { x: 1032, y: 16, width: 318, height: 300 })
]);
page("p2horizontaal0000002", "Horizontaal met target", [
    bullet("bullet_horizontal", "Horizontale weergave met target (stip)", { x: 16, y: 16, width: 1334, height: 736 }, {
        period: { projections: [column("Maand")] },
        group: { projections: [column("Afdeling")] },
        component: { projections: [column("Component")] },
        budget: { projections: [measure("Jaarbegroting")] },
        actual: { projections: [measure("Realisatie YTD")] },
        target: { projections: [measure("Target YTD")] }
    }, { layout: { orientation: "horizontal", arrangement: "row" }, grouping: { periodSort: "data" }, colors: { highlightOverrun: true }, target: { shape: "dot" } })
]);
page("p3jaarvergelijking03", "Jaarvergelijking", [
    bullet("bullet_years", "Jaarvergelijking 2025 vs 2026", { x: 16, y: 16, width: 1334, height: 736 }, {
        period: { projections: [column("Maand")] },
        component: { projections: [column("Component")] },
        budget: { projections: [measure("Jaarbegroting 2025"), measure("Jaarbegroting 2026")] },
        actual: { projections: [measure("Realisatie YTD 2025"), measure("Realisatie YTD 2026")] }
    }, { grouping: { periodSort: "data" }, colors: { highlightOverrun: true }, comparison: { pair1Name: "2025", pair2Name: "2026" } })
]);
page("p4legenda0000000004", "Legenda per soort", [
    bullet("bullet_legend", "Begroting gekleurd per soort (legenda-veld)", { x: 16, y: 16, width: 1000, height: 736 }, {
        period: { projections: [column("Maand")] },
        group: { projections: [column("Component")] },
        legend: { projections: [column("Soort")] },
        budget: { projections: [measure("Jaarbegroting")] },
        actual: { projections: [measure("Realisatie YTD")] }
    }, { grouping: { periodSort: "data" }, layout: { arrangement: "stack" } }),
    afdelingChart("bar_afdeling_legend", { x: 1032, y: 16, width: 318, height: 300 })
]);

write(path.join(report, "definition", "pages", "pages.json"), {
    $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.0.0/schema.json",
    pageOrder: pages, activePageName: pages[0]
});
write(path.join(report, "definition", "version.json"), {
    $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/versionMetadata/1.0.0/schema.json",
    version: "2.0.0"
});
write(path.join(report, "definition", "report.json"), {
    $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/report/3.3.0/schema.json",
    themeCollection: { baseTheme: { name: "CY24SU10", reportVersionAtImport: { visual: "1.8.95", report: "2.0.95", page: "1.3.95" }, type: "SharedResources" } },
    resourcePackages: [
        { name: "SharedResources", type: "SharedResources", items: [{ name: "CY24SU10", path: "BaseThemes/CY24SU10.json", type: "BaseTheme" }] },
        {
            name: guid, type: "CustomVisual", items: [
                ...resources.map(file => ({ name: file, path: file, type: "CustomVisualMetadata" }))
            ]
        }
    ],
    settings: { useStylableVisualContainerHeader: true, exportDataMode: "AllowSummarized", defaultDrillFilterOtherVisuals: true }
});
write(path.join(report, "definition.pbir"), {
    $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json",
    version: "4.0",
    datasetReference: { byPath: { path: `../${name}.SemanticModel` } }
});
write(path.join(report, ".platform"), {
    $schema: "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
    metadata: { type: "Report", displayName: name },
    config: { version: "2.0", logicalId: randomUUID() }
});
write(path.join(out, `${name}.pbip`), {
    $schema: "https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json",
    version: "1.0",
    artifacts: [{ report: { path: `${name}.Report` } }],
    settings: { enableAutoRecovery: true }
});
console.log(`Wrote ${path.join(out, name + ".pbip")} (${rows.length} rows)`);
