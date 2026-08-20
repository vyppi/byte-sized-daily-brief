# Microsoft Store Submission Checklist

## Current verdict: READY FOR PARTNER CENTER UPLOAD

The Store identity is reserved, both submission bundles are generated, the sideload package installs and launches, and the Windows App Certification Kit reports `PASS`.

## Ready

- [x] Public HTTPS production URL
- [x] Web app manifest
- [x] 192x192 and 512x512 PNG icons
- [x] Maskable icon declaration
- [x] Service worker and offline application shell
- [x] Responsive desktop UI
- [x] Public privacy policy
- [x] English listing copy
- [x] Suggested pricing, categories, age-rating guidance, and certification notes
- [x] 300x300 Store logo
- [x] Four desktop screenshot specifications
- [x] Existing GitHub Pages build and deployment pipeline
- [x] PWABuilder report: ready for packaging, zero errors
- [x] Live service-worker registration verified at the production scope
- [x] Partner Center product reserved
- [x] Package identity verified in the generated manifest
- [x] Desktop-only device family verified
- [x] Sideload package installed and launched successfully
- [x] Windows App Certification Kit overall result: PASS

PWABuilder currently shows one service-worker warning even though the production browser registration is present at `https://vyppi.github.io/byte-sized-daily-brief/`. Treat this as a report-card false negative and confirm offline launch again in the generated test package.

## Package generation

- [x] In Partner Center, choose **New product > MSIX or PWA app**
- [x] Reserve **Byte Sized Daily Brief**
- [x] Package ID: `Prequarto.ByteSizedDailyBrief`
- [x] Publisher ID: `CN=953DF968-4531-4D0A-8875-5FAE6E72A35C`
- [x] Publisher display name: `Vipul Bhojwani`
- [x] Generate the Windows packages with PWABuilder

## Required before submission

- [x] Install and launch the generated package locally
- [x] Confirm the packaged start URL targets the production daily edition
- [x] Run the Windows App Certification Kit on the package
- [ ] Upload `package/Byte-Sized/Byte Sized Daily Brief.msixbundle`
- [ ] Upload `package/Byte-Sized/Byte Sized Daily Brief.classic.appxbundle`
- [ ] Complete the IARC age-rating questionnaire
- [ ] Upload the Store logo and screenshots
- [ ] Add the certification contact
- [ ] Review Store policy declarations
- [ ] Submit for certification

## Release risk

- Change type: hosted PWA package; no database or API migration
- Rollback: remove or stop the Store submission; the website remains independently deployable
- Telemetry: currently disabled pending Azure provider permissions

## Package checksums

- ZIP: `CDA5E1020CA1161DC747038424B3ED01464BA110C65BB9E4CEEDD1639F63E5F5`
- MSIX bundle: `AC599D6BEAEFDB1E3C216D25CB2BA5437D4B67A06CF6E141E1C30DE258D0B7CE`
- Classic APPX bundle: `28B55D0AB1819E458B4F16E2D52D21B6EA6055B1679F884FF9025D87EE120214`
- Sideload MSIX: `BA9244FEF100A82966B7C8896FE5E175802372316CA3C18C685C10721E06CC76`

Do not upload `Byte Sized Daily Brief.sideload.msix`; it is only for local testing.
