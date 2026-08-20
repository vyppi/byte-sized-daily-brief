# Byte Sized Product and Telemetry Plan

## 1. Status

**Status:** Validated

## 2. Application Context

- **Mode:** Modify an existing production PWA
- **Repository:** `vyppi/byte-sized-daily-brief`
- **Hosting:** Public GitHub Pages
- **Framework:** React 19, Vite and static generated JSON/HTML
- **Audience after this change:** Software engineers and technical leads only
- **Data classification:** Anonymous product-usage telemetry; no account, email, article body or user-entered text
- **Azure subscription:** Visual Studio Enterprise Subscription (`641161ef-d1e3-4f3d-8ca1-6def3e70bc2d`)
- **Azure tenant:** Personal Default Directory (`bcd96a10-5d49-45b0-aaba-52a50038c604`)
- **Azure location:** Central India

## 3. Product Changes

The visible MVP will become one opinionated daily engineering brief.

1. Remove Engineering/Management mode selection.
2. Remove News, Saved and Archive from primary navigation.
3. Remove progress tracking, search and resume-next UI.
4. Remove the prominent install call to action.
5. Present five current engineering selections followed by one optional evergreen recommendation.
6. Keep permanent edition pages and sitemap in the background for SEO, without exposing product-internal navigation.
7. Explain the selection promise and publication schedule directly:
   - five technical ideas worth knowing;
   - updated every weekday;
   - no endless feed.
8. Retain outbound links, publication date, reading estimate and concise “Why it matters” context.

## 4. Telemetry Architecture

**Recipe type:** Bicep infrastructure plus browser-side Application Insights SDK.

```text
GitHub Pages PWA
      |
Anonymous custom product events
      |
Azure Application Insights
      |
Log Analytics workspace
      |
KQL funnels, retention cohorts and content-quality reports
```

### Azure resources

- One resource group for Byte Sized observability.
- One Log Analytics workspace with conservative retention.
- One workspace-based Application Insights resource.

No application backend, database or paid compute is required. The browser connection string is configuration, not an authentication secret, and will be supplied through a GitHub Actions repository variable.

## 5. Privacy Boundaries

- Generate a random anonymous visitor identifier in local storage.
- Never collect names, email addresses, IP-derived custom fields, search terms or article bodies.
- Do not record full external URLs or referrer query strings.
- Record article IDs, source names, rank and edition date only.
- Do not enable session replay.
- Add a clear analytics disclosure to the privacy page.
- Provide a local opt-out flag and respect browser Do Not Track.
- Use telemetry sampling if traffic or ingestion volume grows.

## 6. Event Contract

| Event | Trigger | Important properties |
|---|---|---|
| `brief_viewed` | Once when an edition loads | edition date, new/returning visitor, days since last visit |
| `article_opened` | User opens a selected article | article ID, source, rank, current/evergreen, seconds before click |
| `engaged_30_seconds` | Visible page engagement reaches 30 seconds | edition date |
| `scroll_depth_reached` | First reach of 50% and 90% | depth, edition date |
| `optional_read_opened` | Evergreen recommendation is opened | article ID, source |
| `page_session_ended` | Page becomes hidden or closes | engaged seconds, maximum scroll depth, article-open count |

Events fire once per applicable state to control cost and avoid noisy dashboards.

## 7. Success Metrics

### North-star metric

**Weekly retained readers:** anonymous visitors who view Byte Sized on at least three distinct days within a rolling seven-day window.

### Activation

- Percentage of first-time visitors who open at least one article.
- Time from first page load to first article open.

### Value

- Percentage opening two or more articles.
- CTR by article rank, source and topic.
- Evergreen recommendation CTR.

### Retention

- Day-1 and Day-7 return rate.
- Three-active-days-in-seven retention.
- Returning-reader share by acquisition source.

### Friction and drop-off

- Visits shorter than 10 seconds with no article opened.
- Users reaching 50% or 90% scroll depth.
- Editions with unusually low first-article or overall CTR.
- Sources consistently ignored despite receiving high rank.

## 8. Initial Decision Thresholds

These are learning thresholds, not forecasts:

- At least 25% of new visitors open one article.
- At least 10% open two articles.
- At least 15% return the next day.
- At least 8% become three-day readers within their first week.
- No source should occupy more than two of the five daily positions.

After 200–500 unique visitors, adjust these thresholds using observed acquisition quality.

## 9. Planned Artifacts

- `infra/main.bicep` for Log Analytics and Application Insights.
- `src/lib/analytics.js` for privacy-safe event collection.
- Product event calls in the simplified React experience.
- GitHub Actions configuration using `VITE_APPINSIGHTS_CONNECTION_STRING`.
- Updated privacy documentation.
- `docs/TELEMETRY.md` containing event definitions and KQL queries for activation, funnels, drop-offs and retention.

## 10. Validation Proof

- [x] All validation checks pass
  - [x] Bicep compilation
  - [x] Template validation
  - [x] What-if preview
  - [x] Azure authentication
  - [x] Bicep linting
  - [x] Azure Policy validation
  - [x] Application build verification
  - [x] Static role verification

- `az bicep build --file .\infra\main.bicep`: passed.
- `az bicep lint --file .\infra\main.bicep`: passed with no findings.
- `az deployment group validate --resource-group Hackathon ...`: passed without provisioning resources.
- `az deployment group what-if --resource-group Hackathon ...`: passed; exactly one Log Analytics workspace and one Application Insights component would be created.
- `az account show`: confirmed the enabled personal Visual Studio Enterprise Subscription.
- Azure Policy assignment check: zero applicable assignments.
- `npm test`: five tests passed.
- `npm run build`: production PWA build passed with five current stories and one evergreen item.
- `npm audit --omit=dev --audit-level=high`: zero production vulnerabilities.
- Static RBAC review: no managed identity or cross-service data-plane access exists, so no role assignments are required.
- Application Insights is lazy-loaded and remains disabled without configuration.

## 11. Rollback

- Application Insights initialization remains a no-op when no connection string is supplied.
- Product UI can be reverted independently from telemetry infrastructure.
- Deleting Azure resources is destructive and requires explicit approval.

## 12. Deployment Status

- GitHub Pages product deployment: approved.
- Azure telemetry deployment: blocked before resource creation.
- Blocker: the personal account has resource-group access but cannot register the `Microsoft.OperationalInsights` and `Microsoft.Insights` providers at subscription scope.
- Current behavior: telemetry remains disabled because `VITE_APPINSIGHTS_CONNECTION_STRING` is not configured.
- Recovery: grant provider-registration permission at subscription scope, register both providers, rerun the validated Bicep deployment, then add the deployment output as the GitHub repository variable.
