import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Brand UI Specification Verification (Option A — Royal Heritage)", () => {
  const tailwindRaw = fs.readFileSync(path.resolve("tailwind.config.ts"), "utf8");

  test("Tailwind config contains approved brand palette tokens", () => {
    assert.ok(tailwindRaw.includes("#702747"), "Royal Plum (#702747) must be defined");
    assert.ok(tailwindRaw.includes("#FFF9F2"), "Warm Ivory (#FFF9F2) must be defined");
    assert.ok(tailwindRaw.includes("#C6A15B"), "Antique Gold (#C6A15B) must be defined");
    assert.ok(tailwindRaw.includes("#E8C7CF"), "Dusty Rose (#E8C7CF) must be defined");
    assert.ok(tailwindRaw.includes("#344A42"), "Forest Green (#344A42) must be defined");
    assert.ok(tailwindRaw.includes("#45404A"), "Charcoal (#45404A) must be defined");
    assert.ok(tailwindRaw.includes("#E9E2DA"), "Warm Grey (#E9E2DA) must be defined");
  });

  test("Google Fonts Noto Sans Devanagari & Inter configured in layout", () => {
    const layoutRaw = fs.readFileSync(path.resolve("src/app/layout.tsx"), "utf8");
    assert.ok(layoutRaw.includes("Noto_Sans_Devanagari"), "Noto Sans Devanagari font must be loaded");
    assert.ok(layoutRaw.includes("Inter"), "Inter font must be loaded");
  });

  test("Approved Brand Icon SVG exists with plum and gold vectors", () => {
    const iconRaw = fs.readFileSync(path.resolve("src/app/icon.svg"), "utf8");
    assert.ok(iconRaw.includes("#702747"), "Icon must use Royal Plum");
    assert.ok(iconRaw.includes("#C6A15B"), "Icon must use Antique Gold");
  });
});
