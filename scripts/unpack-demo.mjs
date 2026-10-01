import { access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";

const target = new URL("../public/demo.mp4", import.meta.url);
const source = new URL("./demo.mp4.b64", import.meta.url);

try {
  await access(target, constants.F_OK);
} catch {
  const encoded = await readFile(source, "utf8");
  await writeFile(target, Buffer.from(encoded.trim(), "base64"));
}
