import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = join(process.cwd(), ".next", "static");
const limits = { totalJavaScript: 3.8 * 1024 * 1024, largestJavaScript: 1.05 * 1024 * 1024, totalCss: 400 * 1024 };

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : Promise.resolve([join(directory, entry.name)])))).flat();
}

function format(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

try {
  const assets = await files(root);
  const measured = await Promise.all(assets.map(async (file) => ({ file, bytes: (await stat(file)).size })));
  const javascript = measured.filter((asset) => asset.file.endsWith(".js"));
  const css = measured.filter((asset) => asset.file.endsWith(".css"));
  const totalJavaScript = javascript.reduce((sum, asset) => sum + asset.bytes, 0);
  const totalCss = css.reduce((sum, asset) => sum + asset.bytes, 0);
  const largest = javascript.sort((a, b) => b.bytes - a.bytes)[0];
  const failures = [];
  if (totalJavaScript > limits.totalJavaScript) failures.push(`total JavaScript ${format(totalJavaScript)} exceeds ${format(limits.totalJavaScript)}`);
  if (largest && largest.bytes > limits.largestJavaScript) failures.push(`largest chunk ${relative(process.cwd(), largest.file)} is ${format(largest.bytes)}, above ${format(limits.largestJavaScript)}`);
  if (totalCss > limits.totalCss) failures.push(`total CSS ${format(totalCss)} exceeds ${format(limits.totalCss)}`);
  console.log(`Performance budget: JS ${format(totalJavaScript)} total; largest ${largest ? format(largest.bytes) : "0 KiB"}; CSS ${format(totalCss)} total.`);
  if (failures.length) {
    failures.forEach((failure) => console.error(`BUDGET FAILURE: ${failure}`));
    process.exitCode = 1;
  }
} catch (error) {
  console.error("Performance budget requires a successful `npm run build` first.", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
