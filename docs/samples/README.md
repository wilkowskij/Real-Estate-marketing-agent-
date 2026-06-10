# Sample brand kit — for testing

A fictional brokerage (**NorthStar Realty**, Austin / Travis County, TX) you can
use to exercise the brand + white-label flows end-to-end. Nothing here is real.

| File | Use it to test |
| --- | --- |
| `northstar-realty-brand-guide.md` | **Company → Brand & documents → Import a brand guide.** The extractor should pull the name, colors (`#15564E` / `#EFE7D6` / `#D9694C`), fonts (Cormorant Garamond / Inter), disclaimer, and voice. |
| `northstar-logo-dark.svg` | The **dark-background logo** — upload as *Logo (dark bg)*; shown in the white-label sidebar. |
| `northstar-logo-light.svg` | The **light-background logo** — upload as *Logo (light bg)*; shown on the mobile header and white-labeled lead landing pages. |

## Suggested test run
1. Sign in as an org **admin**.
2. Import the brand guide → review the extracted values → **Save**.
3. Upload both logos to their slots; set Market area to **TX / Travis** and MLS
   to **ACTRIS**; **Save**.
4. Turn on **White-label the app** → reload → the sidebar shows the NorthStar
   logo; the area card reads "Travis County, TX".
5. Create a **New Listing** post → confirm the disclaimer appears and copy
   references Austin/hill-country towns.
6. Create a lead form → open `/l/<slug>` → it wears the NorthStar logo.

> SVG uploads display fine in the app shell and landing pages. If your image
> pipeline needs raster logos for rendered post graphics, export these to PNG
> first (e.g. open the SVG in a browser and screenshot, or run it through any
> SVG→PNG tool).
