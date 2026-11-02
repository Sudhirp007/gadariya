import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function getAllKeys(obj, prefix = "") {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      keys = keys.concat(getAllKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe("Bilingual i18n Dictionary Integrity Check", () => {
  const hiRaw = fs.readFileSync(path.resolve("messages/hi.json"), "utf8");
  const enRaw = fs.readFileSync(path.resolve("messages/en.json"), "utf8");

  const hiData = JSON.parse(hiRaw);
  const enData = JSON.parse(enRaw);

  const hiKeys = getAllKeys(hiData).sort();
  const enKeys = getAllKeys(enData).sort();

  test("Hindi and English dictionaries have 100% key parity (no missing keys)", () => {
    assert.deepEqual(hiKeys, enKeys, "Hindi and English must define the exact same translation keys");
  });

  test("No untranslated empty strings in Hindi dictionary", () => {
    for (const key of hiKeys) {
      const parts = key.split(".");
      let val = hiData;
      for (const p of parts) val = val[p];
      assert.ok(typeof val === "string" && val.trim().length > 0, `Key ${key} in hi.json must not be empty`);
    }
  });

  test("No untranslated empty strings in English dictionary", () => {
    for (const key of enKeys) {
      const parts = key.split(".");
      let val = enData;
      for (const p of parts) val = val[p];
      assert.ok(typeof val === "string" && val.trim().length > 0, `Key ${key} in en.json must not be empty`);
    }
  });
});
