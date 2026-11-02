# PAL MATRIMONY — Brand Identity & UI/UX Spec (Approved)

**Version:** 1.0 · **Status:** APPROVED (designer/PM) · **Applies to:** all UI screens, components, logo, favicon, theming

This is the single source of truth for the visual brand. It overrides the generic/starter styling currently in the codebase. Builder must implement this before any visual milestone is signed off.

---

## 1. Brand direction (chosen: Option A — Royal Heritage)

Traditional, trustworthy, elegant, and modern — **not** a typical wedding-invitation look. Feels familiar to Indian families, sophisticated enough for younger brides/grooms and NRI users.

---

## 2. Colour palette (Tai)

| Role | Colour | Hex | Usage |
| ---- | ------ | --- | ----- |
| Primary brand | **Royal Plum** | `#702747` | Headers, primary CTA, section headings |
| Page background | **Warm Ivory** | `#FFF9F2` | Site background |
| Premium accent | **Antique Gold** | `#C6A15B` | Premium accents (sparingly) |
| Romantic highlight | **Dusty Rose** | `#E8C7CF` | Notifications, soft highlights |
| Success/verified | **Forest Green** | `#344A42` | Verified badges, success states |
| Body text | **Charcoal** | `#45404A` | Body text |
| Neutral | Warm grey | e.g. `#E9E2DA` | Form borders |

### Usage proportions (approx)
| Colour | % |
| ------ | - |
| Warm ivory / white | 55% |
| Royal plum | 25% |
| Charcoal / neutral | 12% |
| Antique gold | 5% (premium details only; never small body text on ivory) |
| Dusty rose | 3% |

### UI application rules
| Element | Colour |
| ------- | ------ |
| Header | Royal Plum |
| Primary CTA buttons | Royal Plum, white text |
| Secondary CTA | Antique Gold bg, dark text |
| Website background | Warm Ivory |
| Profile cards | White |
| Section headings | Royal Plum |
| Normal text | Charcoal |
| Verified badge | Forest Green |
| Premium badge | Antique Gold |
| Notifications | Soft rose |
| Form borders | Warm grey |

### Accessibility
Test all text/background pairs against WCAG AA. Use dark plum/charcoal on gold and ivory — **never** white text on pale gold.

---

## 3. Typography (Hindi-first)

- **Primary Hindi font:** Noto Sans Devanagari (navigation, forms, profile info, readable Hindi).
- **Alternative Hindi font:** Mukta (friendly, family-focused).
- **English font:** Inter (alongside Hindi for English UI / international users).
- **Choice:** Noto Sans Devanagari + Inter. Consistent weights, generous line spacing. Avoid very thin Hindi fonts on mobile.

---

## 4. Logo & favicon direction

Three elements:
1. Subtle heart symbol (relationships).
2. Two interlocking forms (two families coming together).
3. Minimal Indian architectural/ornamental influence.

Avoid: large couple illustrations, elaborate crowns, generic heart-and-ring clip art, excessive gradients, too many colours.

Wordmark works in both languages: `पाल मैट्रिमोनी` / `Pal Matrimony`.
Tagline: "रिश्तों की नई शुरुआत, विश्वास के साथ।" / "Where Trust Begins, Relationships Blossom."

---

## 5. Language & copy requirements

- Hindi is default; Hindi/English toggle prominently visible in header.
- Toggle persists per user.
- All buttons, notifications, profile fields, privacy explanations, help content available in **both** languages — not just homepage.

---

## 6. Technical delivery notes for builder

- Implement via Tailwind theme tokens (extend `tailwind.config.ts` with `royal-plum`, `warm-ivory`, `antique-gold`, `dusty-rose`, `forest-green`, `charcoal`).
- Use Next.js font loader: `Noto_Sans_Devanagari` + `Inter` from `next/font/google`.
- Update `globals.css` background/foreground + default font to the palette.
- Replace generic orange/stone accents currently in `LanguageToggle.tsx`, `page.tsx`, header/footer with brand classes.
- Provide favicon + logo placeholder matching the logo direction.

---

## 7. Acceptance (brand gates)
- [ ] Palette tokens exist and are used across header, CTAs, cards, badges, forms.
- [ ] Fonts loaded (Noto Sans Devanagari + Inter) and used as default.
- [ ] Logo/favicon present with approved direction.
- [ ] No leftover generic fallback colors (orange/stone) on public UI.
- [ ] WCAG AA contrast respected on key text/background pairs.
- [ ] Language toggle still works and persists after theming.
