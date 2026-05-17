import { existsSync } from "node:fs";
import { mkdir, readdir, rm, copyFile } from "node:fs/promises";
import { join } from "node:path";

const isProduction = process.argv.includes("--prod");
const jsDir = "./public/js";
const cssDir = "./public/css";
const outDir = "./dist";

console.log(`\n🚀 ${isProduction ? "Production" : "Development"} build\n`);

if (existsSync(outDir)) {
	await rm(outDir, { recursive: true });
}
await mkdir(outDir, { recursive: true });

const jsFiles = await readdir(jsDir);
const jsEntrypoints = jsFiles
	.filter(f => f.endsWith(".js") && !f.startsWith("_"))
	.map(f => join(jsDir, f));

console.log(`📦 Bundling ${jsEntrypoints.length} JS files...`);

const jsConfig = {
	entrypoints: jsEntrypoints,
	outdir: outDir,
	minify: isProduction,
	sourcemap: !isProduction,
	format: "iife" as const,
	target: "browser" as const,
	treeshake: isProduction,
	drop: isProduction ? ["console", "debugger"] : [],
};

await Bun.build(jsConfig);

const cssFiles = await readdir(cssDir).catch(() => []);
if (cssFiles.length > 0) {
	console.log(`📋 Bundling ${cssFiles.length} CSS files...`);

	for (const file of cssFiles) {
		if (file.endsWith(".css")) {
			const srcPath = join(cssDir, file);
			const destPath = join(outDir, file);

			if (isProduction) {
				const css = await Bun.file(srcPath).text();
				const minified = css
					.replace(/\/\*[\s\S]*?\*\//g, "")
					.replace(/\s+/g, " ")
					.replace(/\s*([{}:;,])\s*/g, "$1")
					.trim();
				await Bun.write(destPath, minified);
			} else {
				await copyFile(srcPath, destPath);
			}
		}
	}
}

const totalSize = (await readdir(outDir)).length;
console.log(`\n✅ Build complete! ${totalSize} files in dist/\n`);