# Product telemetry

Byte Sized emits privacy-conscious custom events to Azure Application Insights. No telemetry is sent when `VITE_APPINSIGHTS_CONNECTION_STRING` is absent, Do Not Track is enabled, or `byte-sized-analytics-opt-out` is `true` in local storage.

## Event definitions

| Event | Purpose |
|---|---|
| `brief_viewed` | Edition reach and anonymous retention |
| `article_opened` | Current-story CTR by rank, source and topic |
| `optional_read_opened` | Evergreen recommendation CTR |
| `engaged_30_seconds` | Meaningful attention |
| `scroll_depth_reached` | 50% and 90% content discovery |
| `page_session_ended` | Zero-click exits, engagement and maximum depth |
| `feed_load_failed` | Edition availability |

## Starter KQL

### Daily readers and activation

```kusto
let views = customEvents
| where name == "brief_viewed"
| extend visitor = tostring(customDimensions.anonymousVisitorId)
| summarize readers=dcount(visitor) by bin(timestamp, 1d);
let opens = customEvents
| where name == "article_opened"
| extend visitor = tostring(customDimensions.anonymousVisitorId)
| summarize activated=dcount(visitor) by bin(timestamp, 1d);
views
| join kind=leftouter opens on timestamp
| extend activationRate = round(100.0 * activated / readers, 1)
| project timestamp, readers, activated, activationRate
```

### CTR by rank and source

```kusto
customEvents
| where name == "article_opened"
| extend rank=toint(customDimensions.rank), source=tostring(customDimensions.source)
| summarize opens=count(), readers=dcount(tostring(customDimensions.anonymousVisitorId)) by rank, source
| order by rank asc, opens desc
```

### Zero-click exits and scroll drop-off

```kusto
customEvents
| where name == "page_session_ended"
| extend opens=toint(customMeasurements.articleOpenCount),
         depth=toint(customMeasurements.maxScrollDepth),
         seconds=toint(customMeasurements.engagedSeconds)
| summarize sessions=count(),
            zeroClick=countif(opens == 0),
            reachedHalf=countif(depth >= 50),
            reachedEnd=countif(depth >= 90),
            shortBounce=countif(opens == 0 and seconds < 10)
| extend zeroClickRate=round(100.0 * zeroClick / sessions, 1),
         halfRate=round(100.0 * reachedHalf / sessions, 1),
         endRate=round(100.0 * reachedEnd / sessions, 1),
         shortBounceRate=round(100.0 * shortBounce / sessions, 1)
```

### Three active days in seven

```kusto
customEvents
| where name == "brief_viewed"
| extend visitor=tostring(customDimensions.anonymousVisitorId), day=startofday(timestamp)
| summarize activeDays=dcount(day) by visitor, week=startofweek(timestamp)
| summarize retainedReaders=countif(activeDays >= 3), weeklyReaders=count() by week
| extend retainedRate=round(100.0 * retainedReaders / weeklyReaders, 1)
```
