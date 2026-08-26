import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const [assetDirectory = "dist/cloudflare/assets", rawLimit = "500000"] = process.argv.slice(2);
const limit = Number(rawLimit);

if (!Number.isFinite(limit) || limit <= 0) {
  throw new Error("La limite de bundle doit être un nombre positif en octets.");
}

const entries = await readdir(assetDirectory);
const bundles = await Promise.all(entries
  .filter(name => name.endsWith(".js"))
  .map(async name => ({ name, size: (await stat(path.join(assetDirectory, name))).size })));

const oversized = bundles.filter(bundle => bundle.size > limit).sort((a, b) => b.size - a.size);

if (oversized.length) {
  const details = oversized.map(bundle => `${bundle.name}: ${bundle.size} octets`).join(", ");
  throw new Error(`Chunk JavaScript supérieur à ${limit} octets : ${details}`);
}

const largest = bundles.sort((a, b) => b.size - a.size)[0];
console.log(`Contrôle bundle réussi : ${bundles.length} chunks, plus grand = ${largest?.name ?? "aucun"} (${largest?.size ?? 0} octets).`);
