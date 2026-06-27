import { cp } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL("..", import.meta.url));
const source = resolve(__dirname, "node_modules/@codegouvfr/react-dsfr");
const target = resolve(__dirname, "public/dsfr");

await cp(`${source}/dsfr`, target, { recursive: true, force: true });
await cp(`${source}/favicon`, `${target}/favicon`, { recursive: true, force: true });

console.log("DSFR assets copied to public/dsfr");
