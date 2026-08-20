# Microsoft Store Submission Checklist

## Current verdict: BLOCKED — package identity required

The PWA is live and build-ready, but a Store package cannot be generated until a separate Partner Center product is reserved and its Product Identity values are supplied.

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

## Required before package generation

- [ ] In Partner Center, choose **New product > MSIX or PWA app**
- [ ] Reserve **Byte Sized Daily Brief**
- [ ] Copy the Package ID
- [ ] Copy the Publisher ID
- [ ] Copy the Publisher display name
- [ ] Generate the Windows package with PWABuilder

## Required before submission

- [ ] Install and launch the generated package locally
- [ ] Confirm the packaged start URL opens the current daily edition
- [ ] Confirm outbound article links open correctly
- [ ] Run the Windows App Certification Kit on the package
- [ ] Upload the `.msixbundle` and `.classic.appxbundle`
- [ ] Complete the IARC age-rating questionnaire
- [ ] Upload the Store logo and screenshots
- [ ] Add the certification contact
- [ ] Review Store policy declarations
- [ ] Submit for certification

## Release risk

- Change type: hosted PWA package; no database or API migration
- Rollback: remove or stop the Store submission; the website remains independently deployable
- Telemetry: currently disabled pending Azure provider permissions

