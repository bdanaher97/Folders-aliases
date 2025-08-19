import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve("public/Portfolio");
const OUT = path.join(ROOT, ".folders");

function isHidden(name) {
  return name.startsWith(".");
}

async function listTopLevelDirs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !isHidden(e.name))
    .map((e) => e.name)
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
}

async function main() {
  const dirs = await listTopLevelDirs(ROOT);
  const content = dirs.join("\n") + "\n";
  try {
    const existing = await fs.readFile(OUT, "utf8");
    if (existing === content) {
      console.log(".folders unchanged");
      return;
    }
  } catch {}
  await fs.writeFile(OUT, content, "utf8");
  console.log(`Wrote ${OUT} with ${dirs.length} entries.`);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
