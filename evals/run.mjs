import { runEvalSuite } from "./runner.ts";

try {
  const result = await runEvalSuite();
  for (const evalCase of result.report.cases) {
    console.log(`${evalCase.outcome === "pass" ? "PASS" : "FAIL"} ${evalCase.id}`);
  }
  console.log(`${result.report.totals.passed} passed, ${result.report.totals.failed} failed`);
  console.log(`Receipt SHA-256: ${result.digest}`);
  if (!result.passed) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error("Deterministic eval runner failed closed.");
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exitCode = 1;
}
