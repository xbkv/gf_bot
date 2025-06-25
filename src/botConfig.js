import { readFileSync, writeFileSync } from "fs";

const botConfig = JSON.parse(readFileSync("./config.json"));

export default botConfig;

export function writeCurrentConfig() {
  writeFileSync("./config.json", JSON.stringify(botConfig, null, 2));
}
