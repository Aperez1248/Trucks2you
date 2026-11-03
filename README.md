# Trucks2U

Trucks2U connects paving contractors with vetted dump truck owner-operators: 10 wheelers, 12 wheelers and super dumpers. It's built for jobs like hauling asphalt grindings out and bringing asphalt back in. Contractors post a job, it goes out to every vetted driver with the right truck, and the first drivers to accept get the spots. The platform takes a 5% fee, about half of what a broker charges.

This repo holds the **clickable prototype** with sample data. There are no real logins, payments or texts yet.

## What's here

| Folder | What it is |
| --- | --- |
| `prototype/index.html` | The whole prototype in one file. Open it in any browser. |
| `data/Trucks2U_Plant_Directory.xlsx` | 19 Bay Area asphalt plants (Caltrans active plant list, Sep 2025, merged with Al's list) |
| `manual/` | The user manual PDF, plus the scripts that rebuild it from screenshots of the prototype |

## Try the prototype

Open `prototype/index.html` in a browser. A switch at the top changes who you are:

- **Contractor:** post jobs with the load planner, pick an asphalt plant, watch trucks accept, see the live map, send dispatch notes, and approve hours and tickets.
- **Truck owner:** accept or pass on job requests, check in, add load tickets, read dispatch notes, manage drivers and get paid. Add `#signup` to the address to open the driver sign-up directly.
- **Broker:** dispatch your own trucks to your customers' jobs, for a flat per-truck fee.
- **Admin:** review driver documents and approve new owners.

Changes you make while clicking around are kept only until you reload the page.

## Rebuilding the manual

You need Node.js and Playwright (`npm install playwright`). Then run:

```
cd manual
node shoot.js   # takes fresh screenshots of the prototype into manual/shots
node pdf.js     # builds Trucks2U_User_Manual.pdf from manual.html
```

## Plan for the real app

The full plan is in the [Trucks2U MVP plan](https://claude.ai/artifact/7ZuQYXWN8wy9xoRePhsM8o). In short:

- **Web app:** Next.js, which works on phones.
- **Database, logins and document storage:** Supabase.
- **Payments:** Stripe Connect.
- **Maps:** Google Maps.
- **Checks and texts:** FMCSA lookups for DOT numbers, driving record checks, and Twilio for texts.
- **Later:** native phone apps and live GPS.
