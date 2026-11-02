# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01-public-pages.spec.mjs >> Public pages render without console errors >> renders /discovery
- Location: e2e\01-public-pages.spec.mjs:12:5

# Error details

```
Error: console errors on /discovery: Failed to load resource: the server responded with a status of 500 (Internal Server Error)

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "पाल मैट्रिमोनी gadariya.org" [ref=e4] [cursor=pointer]:
        - /url: /
        - generic [ref=e11]:
          - generic [ref=e12]: पाल मैट्रिमोनी
          - generic [ref=e13]: gadariya.org
      - navigation [ref=e14]:
        - link "खोज" [ref=e15] [cursor=pointer]:
          - /url: /discovery
        - link "संदेश" [ref=e16] [cursor=pointer]:
          - /url: /messages
        - link "मेरी प्रोफाइल" [ref=e17] [cursor=pointer]:
          - /url: /profile
        - button "Switch Language" [ref=e18] [cursor=pointer]:
          - generic [ref=e23]: English
        - link "लॉग इन" [ref=e24] [cursor=pointer]:
          - /url: /login
        - link "निःशुल्क पंजीकरण" [ref=e25] [cursor=pointer]:
          - /url: /register
  - main [ref=e26]:
    - generic [ref=e27]:
      - generic [ref=e28]:
        - generic [ref=e29]: Pal Matrimony Discovery
        - heading "समाज वैवाहिक खोज एवं रिश्ते" [level=1] [ref=e33]
        - paragraph [ref=e34]: पूर्ण गोपनीयता के साथ पाल (गड़ेरिया) समाज के सत्यापित योग्य वर-वधु प्रोफाइलों को खोजें।
        - generic [ref=e35]: "गोपनीयता नियम: सार्वजनिक प्रोफ़ाइल में सीधा मोबाइल नंबर एवं पता कभी नहीं दिखाया जाता।"
      - generic [ref=e39]:
        - generic [ref=e40]: फ़िल्टर
        - generic [ref=e44]:
          - generic [ref=e45]:
            - text: तलाश है
            - combobox [ref=e46]:
              - option "सभी" [selected]
              - option "वधु (महिला)"
              - option "वर (पुरुष)"
          - generic [ref=e47]:
            - text: आयु सीमा
            - generic [ref=e48]:
              - spinbutton [ref=e49]: "18"
              - generic [ref=e50]: to
              - spinbutton [ref=e51]: "45"
          - generic [ref=e52]:
            - text: राज्य / क्षेत्र
            - combobox [ref=e53]:
              - option "All Regions" [selected]
              - option "Uttar Pradesh"
              - option "Delhi-NCR"
              - option "Madhya Pradesh"
              - option "Rajasthan"
              - option "Haryana"
              - option "Bihar"
              - option "Maharashtra"
          - generic [ref=e54]:
            - text: उप-जाति / गोत्र
            - textbox "e.g. Dhangar, Baghel" [ref=e55]
          - button "Reset Filters" [ref=e57] [cursor=pointer]
      - generic [ref=e58]:
        - heading "आपके वर्तमान फ़िल्टर के अनुसार कोई प्रकाशित प्रोफ़ाइल उपलब्ध नहीं है।" [level=3] [ref=e62]
        - paragraph [ref=e63]: Try adjusting your age or regional filters to discover prospective matrimonial matches.
  - contentinfo [ref=e64]:
    - generic [ref=e65]:
      - generic [ref=e66]:
        - link "पाल मैट्रिमोनी gadariya.org" [ref=e67] [cursor=pointer]:
          - /url: /
          - generic [ref=e74]:
            - generic [ref=e75]: पाल मैट्रिमोनी
            - generic [ref=e76]: gadariya.org
        - paragraph [ref=e77]: पाल (गड़ेरिया) समाज के विवाह योग्य युवक-युवतियों के लिए सुरक्षित एवं मर्यादित मंच।
      - generic [ref=e78]:
        - generic [ref=e79]: गोपनीयता सुरक्षा गारंटी
        - list [ref=e80]:
          - listitem [ref=e81]:
            - generic [ref=e83]: खोज परिणामों में संपर्क विवरण कभी सार्वजनिक नहीं
          - listitem [ref=e84]:
            - generic [ref=e86]: दोनों पक्षों की पूर्व सहमति के बिना कोई विवरण साझा नहीं
          - listitem [ref=e87]:
            - generic [ref=e89]: वॉटरमार्क के साथ बायोडाटा पीडीएफ डाउनलोड
          - listitem [ref=e90]:
            - generic [ref=e92]: डीपीडीपी अधिनियम 2025 के अनुरूप पूर्ण ऑडिट ट्रेल
      - generic [ref=e93]:
        - generic [ref=e94]: रिश्तों की नई शुरुआत, विश्वास के साथ।
        - paragraph [ref=e95]: "संपर्क एवं सहयोग: support@palmatrimony.in. पाल (गड़ेरिया) समाज की आधिकारिक एवं मर्यादित सेवा।"
    - generic [ref=e96]: © 2026 पाल वैवाहिक मंच (gadariya.org)। सर्वाधिकार सुरक्षित।
  - alert [ref=e97]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | // Journey 1-2, 9: public pages render, no console errors, core UI present.
  4  | test.describe("Public pages render without console errors", () => {
  5  |   const pages = [
  6  |     { path: "/register", heading: /पंजीकरण/ },
  7  |     { path: "/login", heading: /लॉग|Sign in|Login/ },
  8  |     { path: "/discovery", heading: /खोज|Discovery/ },
  9  |   ];
  10 | 
  11 |   for (const p of pages) {
  12 |     test(`renders ${p.path}`, async ({ page }) => {
  13 |       const errors = [];
  14 |       page.on("console", (msg) => {
  15 |         if (msg.type() === "error") errors.push(msg.text());
  16 |       });
  17 |       page.on("pageerror", (err) => errors.push(String(err)));
  18 | 
  19 |       await page.goto(p.path, { waitUntil: "networkidle" });
  20 |       await expect(page).toHaveTitle(/Pal Matrimony/);
  21 |       await expect(page.locator("body")).toContainText(p.heading);
  22 | 
> 23 |       expect(errors, `console errors on ${p.path}: ${errors.join(" | ")}`).toEqual([]);
     |                                                                            ^ Error: console errors on /discovery: Failed to load resource: the server responded with a status of 500 (Internal Server Error)
  24 |     });
  25 |   }
  26 | });
  27 | 
```