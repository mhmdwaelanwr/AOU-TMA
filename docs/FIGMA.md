# Figma product design

Editable design file:
https://www.figma.com/design/nx6k9oAx6QXT90Rmn69SdT

## V2 — Premium Product
- Semantic Light/Dark color variables (one token system, two modes).
- Spacing/radius variables.
- Reusable Button, Faculty Chip and Course Card components.
- Desktop Catalog — Light (`7:3`).
- Desktop Catalog — Dark (`7:270`).
- Mobile Catalog Arabic — Light (`13:333`).
- Mobile Catalog Arabic — Dark (`13:479`).
- True RTL mobile composition using Cairo, while course codes/Latin UI use Inter.
- Search, country/currency, FX state, stats, catalog, filters, course cards and order journey.

The React implementation mirrors the V2 semantic tokens instead of copying isolated hex values per screen.

## V3 — Course titles + icons
- Course Card master (`4:80`) now includes an editable **Book Open** library icon and an official AOU course-title line.
- Desktop Light/Dark cards have exact title overrides for the visible sample courses, including `FIN301-F` to match the current Business catalogue code.
- Arabic mobile Light/Dark cards include the same source-derived English course titles without inventing Arabic translations.
- Mobile language controls use an editable Globe library icon.
- Desktop stats and the three order-process cards use editable Book/Globe/Clock/Check icons from the linked Simple Design System library.
- The visual hierarchy is now `course code → official title → faculty → semester/service → price/action`.


## V4 design sync

Figma design file:
`https://www.figma.com/design/nx6k9oAx6QXT90Rmn69SdT`

V4 screens include:
- course code + official title + official-description summary;
- semantic course icon chosen from the course title/description;
- Light and Dark catalog screens;
- payment section for electronic wallets, InstaPay and USDT;
- checkout/payment method screen;
- source labeling for AOU-derived course descriptions.

The React implementation mirrors the same information hierarchy and semantic icon model.
