# Epix Dashboard

The control panel for your [EpixNet](https://epixnet.io) node.

## Features

- Site management (add, clone, update, delete, favorite)
- File browser with size limit controls
- Real-time network statistics and charts
- Bandwidth, request, and peer analytics
- World map peer visualization
- Activity feed with search
- Content muting and site blocking
- Server console log viewer
- Port, Tor, and tracker status monitoring
- Light/dark/system theme toggle
- 19 language translations

## Structure

```
epix1dashuu6pvsut7aw9dx44f543mv7xt9zlydsj9t/
├── index.html
├── content.json
├── LICENSE                # MIT
├── css/
│   └── all.css            # Bundled stylesheet
├── chartjs/
│   └── chart.bundle.min.js
├── img/
│   ├── logo.png
│   └── world.png
├── js/
│   ├── EpixDash.js        # Main app (extends EpixFrame)
│   ├── Head.js            # Header with theme/language
│   ├── Dashboard.js       # Status indicators
│   ├── Site.js            # Site row component
│   ├── SiteList.js        # Site listing
│   ├── FeedList.js        # Activity feed
│   ├── MuteList.js        # Muted content
│   ├── ConsoleList.js     # Server logs
│   ├── Trigger.js         # Event handler
│   ├── PageFiles.js       # File browser
│   ├── SiteFiles.js       # Per-site files
│   ├── Bigfiles.js        # Large file display
│   ├── FilesResult.js     # File search results
│   ├── PageStats.js       # Statistics page
│   ├── Chart.js           # Base chart
│   ├── ChartBig.js        # Bandwidth/request charts
│   ├── ChartLegend.js     # Chart legends
│   ├── ChartRadar.js      # Per-site radar chart
│   ├── ChartTimeline.js   # Timeline chart
│   ├── ChartWorld.js      # World map visualization
│   ├── StatList.js        # Stats list
│   ├── lib/               # Maquette, EpixFrame, marked
│   └── utils/             # Animation, Deferred, Text, Time, Menu, etc.
├── languages/             # 19 languages
└── template-new/
    └── index.html          # Template for new sites
```

## Modes

1. **Sites** — Browse and manage your EpixNet sites
2. **Files** — File browser with storage limit management
3. **Stats** — Network analytics with interactive charts

## Tech Stack

- Vanilla ES6 JavaScript (no build step)
- Maquette virtual DOM
- Chart.js for data visualization
- EpixFrame WebSocket bridge
- All JS wrapped in IIFEs

## License

MIT
