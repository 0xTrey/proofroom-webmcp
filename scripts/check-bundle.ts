import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

export const BUNDLE_BUDGETS = {
  totalClientJsGzipBytes: 150 * 1024,
  totalClientCssGzipBytes: 40 * 1024,
  individualClientJsRawBytes: 600 * 1024,
} as const;

type Metric = {
  actualBytes: number;
  budgetBytes: number;
  pass: boolean;
};

type FileMeasurement = {
  path: string;
  rawBytes: number;
};

type AssetMetric = FileMeasurement & Metric;

export type BundleBudgetReport = {
  status: "pass" | "fail";
  distPath: string;
  files: string[];
  requiredOutputs: Record<string, boolean>;
  reportedExcludedAssets: {
    sourceMaps: {
      files: FileMeasurement[];
      totalRawBytes: number;
    };
    selfHostedFonts: {
      files: FileMeasurement[];
      totalRawBytes: number;
    };
  };
  metrics: {
    totalClientJsGzip: Metric;
    totalClientCssGzip: Metric;
    individualClientJsRaw: AssetMetric[];
  };
  errors: string[];
};

function listFiles(root: string, directory = root): string[] {
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const absolute = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(root, absolute) : [relative(root, absolute)];
    });
}

function sumGzip(root: string, files: readonly string[]): number {
  return files.reduce(
    (total, path) => total + gzipSync(readFileSync(join(root, path)), { level: 9 }).length,
    0,
  );
}

function metric(actualBytes: number, budgetBytes: number): Metric {
  return { actualBytes, budgetBytes, pass: actualBytes <= budgetBytes };
}

function measureFiles(root: string, files: readonly string[]): FileMeasurement[] {
  return files.map((path) => ({ path, rawBytes: statSync(join(root, path)).size }));
}

function totalRawBytes(files: readonly FileMeasurement[]): number {
  return files.reduce((total, file) => total + file.rawBytes, 0);
}

export function inspectBundle(distPath = "dist"): BundleBudgetReport {
  const root = resolve(distPath);
  const files = listFiles(root);
  const clientJs = files.filter(
    (path) => path.startsWith("client/assets/") && path.endsWith(".js"),
  );
  const clientCss = files.filter(
    (path) => path.startsWith("client/assets/") && path.endsWith(".css"),
  );
  const sourceMaps = measureFiles(
    root,
    files.filter((path) => path.endsWith(".map")),
  );
  const selfHostedFonts = measureFiles(
    root,
    files.filter((path) => /\.(?:woff2?|ttf|otf)$/i.test(path)),
  );
  const workerEntry = "proofroom_webmcp/index.js";
  const requiredOutputs = {
    clientHtml: files.includes("client/index.html"),
    clientJavaScript: clientJs.length > 0,
    clientCss: clientCss.length > 0,
    workerEntry: files.includes(workerEntry),
    workerConfiguration: files.includes("proofroom_webmcp/wrangler.json"),
  };
  const individualClientJsRaw = clientJs.map((path) => ({
    path,
    rawBytes: statSync(join(root, path)).size,
    ...metric(statSync(join(root, path)).size, BUNDLE_BUDGETS.individualClientJsRawBytes),
  }));
  const metrics = {
    totalClientJsGzip: metric(
      sumGzip(root, clientJs),
      BUNDLE_BUDGETS.totalClientJsGzipBytes,
    ),
    totalClientCssGzip: metric(
      sumGzip(root, clientCss),
      BUNDLE_BUDGETS.totalClientCssGzipBytes,
    ),
    individualClientJsRaw,
  };
  const errors = [
    ...Object.entries(requiredOutputs)
      .filter(([, present]) => !present)
      .map(([name]) => `Missing required output: ${name}.`),
    ...Object.entries({
      totalClientJsGzip: metrics.totalClientJsGzip,
      totalClientCssGzip: metrics.totalClientCssGzip,
    })
      .filter(([, value]) => !value.pass)
      .map(([name, value]) => `${name} is ${value.actualBytes} bytes, budget is ${value.budgetBytes}.`),
    ...individualClientJsRaw
      .filter((asset) => !asset.pass)
      .map(
        (asset) =>
          `${asset.path} is ${asset.rawBytes} bytes, budget is ${asset.budgetBytes} bytes.`,
      ),
  ];
  return {
    status: errors.length === 0 ? "pass" : "fail",
    distPath: root,
    files,
    requiredOutputs,
    reportedExcludedAssets: {
      sourceMaps: {
        files: sourceMaps,
        totalRawBytes: totalRawBytes(sourceMaps),
      },
      selfHostedFonts: {
        files: selfHostedFonts,
        totalRawBytes: totalRawBytes(selfHostedFonts),
      },
    },
    metrics,
    errors,
  };
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  const report = inspectBundle(process.argv[2] ?? "dist");
  console.log(JSON.stringify(report, null, 2));
  if (report.status === "fail") {
    process.exitCode = 1;
  }
}
