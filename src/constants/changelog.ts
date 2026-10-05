export type ChangeKind = 'new' | 'improved' | 'fixed';
export type ChangeEntry = { kind: ChangeKind; text: string };
export type Release = { version: string; date: string; title: string; changes: ChangeEntry[] };

export const CURRENT_VERSION = '1.0.11';

export const CHANGELOG: Release[] = [
  {
    version: '1.0.11',
    date: '2026-10-05',
    title: 'Songket Diraja, Batik, Titanium & a new Glass',
    changes: [
      { kind: 'new', text: 'Songket Diraja card — royal merah hati songket woven with gold: bunga tabur across the cloth, a kepala kain edged with pucuk rebung, gold threads that glint and a gold shimmer.' },
      { kind: 'new', text: 'Batik card — a hand-drawn Malaysian batik: a large bunga raya that sways gently, leaves and awan larat outlined in wax, colours that bleed like dye and a silk sheen.' },
      { kind: 'new', text: 'Titanium card — a black titanium card with brushed-metal grain, a fine engraved wave pattern, a metal chip, a chamfered edge and a soft band of light that glides across. Find it under Premium when you add or edit an account.' },
      { kind: 'improved', text: 'Aurora card reimagined — northern lights dancing over snowy peaks, a still lake that mirrors them, pines on the shore and a cabin with a warm light on. Stars twinkle and a shooting star crosses the sky now and then.' },
      { kind: 'improved', text: 'Glass card redesigned — coloured light inside polished glass, a bright reflection across the surface, bevelled edges and a rainbow glint along the bottom edge.' },
      { kind: 'improved', text: 'The Premium design picker now has six cards in two rows: Songket, Glass, Aurora, Titanium, Diraja and Batik.' },
      { kind: 'improved', text: 'Fresh look for the free card designs — Aurora gets a soft mesh of light, Gradient gets glowing rings, Stripes gets bold bands and Solid gets a gentle sheen. All of them have a polished edge and work with any colour.' },
    ],
  },
  {
    version: '1.0.10',
    date: '2026-10-05',
    title: 'Your settings are remembered',
    changes: [
      { kind: 'fixed', text: 'Light / dark / system theme is now remembered, so the app opens the way you left it.' },
      { kind: 'fixed', text: 'The warning percentage and daily spending guideline are saved per account instead of resetting every time you open the app.' },
      { kind: 'fixed', text: 'The "hide amounts" eye stays on or off between visits.' },
    ],
  },
  {
    version: '1.0.9',
    date: '2026-10-05',
    title: 'Flip cards & a clearer Glass design',
    changes: [
      { kind: 'new', text: 'Flip your premium card — tap the flip button next to the eye to turn it over and see your income and spending for the month. Tap it again to flip back.' },
      { kind: 'improved', text: 'Glass card redesigned — a frosted glass plate over soft colour, with light rings that blur where the glass covers them.' },
      { kind: 'improved', text: 'Aurora card redesigned — northern lights over a starry sky and hills, with slow-moving light curtains and twinkling stars.' },
      { kind: 'fixed', text: 'Removed a stray horizontal line that cut across the premium cards.' },
    ],
  },
  {
    version: '1.0.8',
    date: '2026-10-01',
    title: 'Liquid glass',
    changes: [
      { kind: 'new', text: 'Liquid Glass on iPhone with iOS 26 or later: a floating glass tab bar, glass cards and a soft colour glow behind Home.' },
      { kind: 'new', text: 'A glass lens that swells when you touch it, glides under the tab you pick, stretches with your speed, and follows your finger when you drag. Sideways drags no longer wobble the screen up and down. Same lens on the switches for Expense / Income, periods and filters.' },
      { kind: 'improved', text: 'Older iPhones and Android phones get a real frosted-glass blur that follows the same design (the tab bar blurs what scrolls behind it on Android 12 and newer).' },
    ],
  },
  {
    version: '1.0.7',
    date: '2026-10-01',
    title: 'A fresh look for WaKira',
    changes: [
      { kind: 'improved', text: 'New colour palette: ink indigo, pandan green and a touch of songket gold, in both light and dark mode.' },
      { kind: 'improved', text: 'Cleaner foundations under the hood: shared buttons, chips, forms and sheets so every screen looks and behaves the same.' },
    ],
  },
  {
    version: '1.0.6',
    date: '2026-10-01',
    title: 'Premium card designs: Songket, Glass & Aurora',
    changes: [
      { kind: 'new', text: 'Songket card — black and gold with a woven songket pattern, a pucuk rebung border and a gold shimmer that sweeps across the card.' },
      { kind: 'new', text: 'Glass card — frosted glass with soft, slowly moving colours behind it.' },
      { kind: 'new', text: 'Aurora card — a dark card with slow-moving northern lights.' },
      { kind: 'improved', text: 'The new cards follow the hide-amounts setting, just like your other account cards.' },
      { kind: 'new', text: 'Premium cards tilt in 3D under your finger, with a light sheen that follows. Turn on “Tilt with phone” in Settings to let them lean as you move your phone.' },
      { kind: 'new', text: 'Pick a premium design when you add or edit an account — it shows on your Home cards.' },
      { kind: 'new', text: 'Add your own account types with the + button, e.g. Savings, ASB or Crypto.' },
      { kind: 'improved', text: 'Add/edit account: the design picker now sits right under the card preview.' },
      { kind: 'improved', text: 'Add/edit account: pick the card design right under the preview, and add your own account types with +.' },
    ],
  },
  {
    version: '1.0.5',
    date: '2026-10-01',
    title: 'Smarter set-up & refreshed tutorial',
    changes: [
      { kind: 'new', text: 'New accounts can now add their net salary (fixed or "confirm each time") and a first savings goal while setting up. Both are optional.' },
      { kind: 'improved', text: 'The tutorial now covers Analyse, Rancang, Recurring, transfers, Assets under More and reminders.' },
    ],
  },
  {
    version: '1.0.4',
    date: '2026-10-01',
    title: 'Rancang: savings goals, upcoming bills & reminders',
    changes: [
      { kind: 'new', text: 'Rancang — a new planning hub under More: savings goals, upcoming bills, your budget at a glance and reminders in one place.' },
      { kind: 'new', text: 'Savings goals — set a target and an optional deadline, add or take out money, and see how much to set aside each month and whether you are on track. Goals never change your account balances.' },
      { kind: 'new', text: 'Upcoming bills — what is due in the next 30 days, taken from your Recurring items.' },
      { kind: 'new', text: 'Reminders — optional notifications before bills are due, a nudge to enter your real pay, and budget alerts when a category nears or passes its limit.' },
      { kind: 'fixed', text: 'Fixed the menu link type for Assets under More.' },
    ],
  },
  {
    version: '1.0.3',
    date: '2026-10-01',
    title: 'Analyse tab & Assets moved to More',
    changes: [
      { kind: 'improved', text: 'The Faham insights now live in the new Analyse tab, right where Assets used to be.' },
      { kind: 'improved', text: 'Assets moved to More → Assets (accounts, net worth and transfers work exactly as before).' },
    ],
  },
  {
    version: '1.0.2',
    date: '2026-09-30',
    title: 'Faham tab, transfers & recurring',
    changes: [
      { kind: 'new', text: 'Faham tab — income vs spending month by month, where your money goes (with subcategories and change vs before), your priciest weekday, biggest expense and a few plain-language insights.' },
      { kind: 'new', text: 'Transfers — move money between your own accounts (Bank → Cash, top up an e-wallet) from the + button or the Assets tab. Balances update, but transfers never count as income or spending.' },
      { kind: 'new', text: 'Recurring transactions — schedule rent, salary or subscriptions (daily, weekly, monthly or yearly) under More → Recurring. They are recorded automatically when the date arrives.' },
      { kind: 'new', text: 'Recurring "Confirm each time" — for pay that changes or bills like electricity. On each date you enter the real amount (e.g. your net pay) and only then is it recorded. A banner on Home reminds you.' },
    ],
  },
  {
    version: '1.0.1',
    date: '2026-09-29',
    title: 'WaKira, budgets, custom categories & itemised transactions',
    changes: [
      { kind: 'new', text: 'Money Tracker is now WaKira — Kira. Faham. Rancang. (Track, understand, plan.)' },
      { kind: 'new', text: 'Budgeting — set a monthly limit per category and track pace, projections and status under More → Budgets.' },
      { kind: 'new', text: 'Custom categories — add your own expense or income categories with icons, colours and subcategories under More → Categories.' },
      { kind: 'new', text: 'Itemised transactions — break a purchase into line items (food, drinks, service charge, SST, etc.) and the total adds up automatically.' },
      { kind: 'new', text: 'Vector icons replace emoji on accounts and categories, with a searchable icon picker.' },
      { kind: 'new', text: 'Assets now shows a donut chart of your accounts, switchable between "By account" and "By type".' },
      { kind: 'new', text: 'Edit and delete transactions and accounts by tapping them.' },
      { kind: 'new', text: 'Settings screen — theme (System/Light/Dark), hide-amounts, budget warning threshold, export & reset.' },
      { kind: 'improved', text: 'Transactions screen redesigned with month switching, search, category breakdown and CSV export.' },
      { kind: 'improved', text: 'Home screen groups recent transactions by day with quick filters.' },
      { kind: 'fixed', text: 'Removed a leftover startup pop-up that referenced settings which no longer exist.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-09-28',
    title: 'Initial release',
    changes: [
      { kind: 'new', text: 'Track spending and income across bank, cash and other accounts.' },
      { kind: 'new', text: 'Home dashboard with a balance carousel and spending chart.' },
      { kind: 'new', text: 'Basic categories with monthly limits.' },
    ],
  },
];
