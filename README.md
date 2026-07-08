# ☕ Subscribe to Chai

Prepaid chai subscriptions for local tea stalls. Customers buy a monthly plan
(e.g. ₹300 for 30 cups), order from the app instead of paying cash every day,
and pick up using a name + token callout — like the name on a Starbucks cup.

## How the money works (escrow model)

The platform holds the subscription payment in **escrow**; the shop is paid
per cup, on delivery:

1. Customer subscribes → the full plan price is held by the platform.
2. Customer orders cups → owner accepts → owner marks **Delivered** →
   the per-cup value moves from escrow to the shop's payable balance.
3. Customer cancels → the shop keeps a small convenience fee (a percentage of
   the unused balance, set by the shop on the plan, capped at 25%); the rest
   goes to the customer's **wallet**, spendable at any other shop.

Every movement is recorded as a `LedgerEntry`, so balances are always auditable.

## Order flow (no QR scanning needed)

- Customer taps *Order cups* → cups are reserved from their subscription.
- Owner's queue shows **name + daily token** ("Sarvesh · #47"), with
  Accept / Reject / Delivered buttons. Rejecting returns the reserved cups.
- Shops can enable **auto-accept** for rush hours.

## Stack

| Part | Tech |
|------|------|
| `backend/` | ASP.NET Core 8 Web API, EF Core, SQLite (dev), JWT auth |
| `mobile/` | Ionic 8 + Angular 20 (standalone), Capacitor-ready |

SQLite is for development only — the connection string in
`appsettings.json` and the `UseSqlite` call in `Program.cs` are the only
things to change for PostgreSQL (`Npgsql.EntityFrameworkCore.PostgreSQL`).

## Run it

Backend (needs .NET 8 SDK):

```bash
cd backend/ChaiApi
dotnet run          # API on http://localhost:5238, Swagger at /swagger
```

Mobile app (needs Node 20+):

```bash
cd mobile
npm install
npm start           # app on http://localhost:4200 (or `ionic serve`)
```

Testing on a phone: replace `localhost` in
`mobile/src/app/core/api.service.ts` with your machine's LAN IP, then
`npx cap add android && npx cap run android` for a native build.

## Roadmap

- [x] Phase 1: shops, menus, plans, escrow subscriptions, order queue, wallet
- [ ] Real payments (Razorpay) instead of simulated collection
- [ ] Push notifications for order status
- [ ] Menu-item picker when creating plans; edit/delete for menu & plans
- [ ] Phase 3: rewards & coupons on subscription
