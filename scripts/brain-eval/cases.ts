import { en } from '@/i18n/en';
import { ms } from '@/i18n/ms';
import { fillTemplate, TEMPLATES, type SlotValues } from '@/services/ai/shortcuts';

/**
 * Conversations the brain must handle. Each step says what must come back.
 * `follow: true` keeps the memory from the step before (a follow-up); otherwise each case starts fresh.
 */
export type Expect = {
  handled?: boolean;
  intent?: string;
  /** Chart kinds that must be in the answer. */
  visuals?: string[];
  /** Text that must appear (case-insensitive). */
  has?: (string | RegExp)[];
  /** Text that must NOT appear. */
  not?: (string | RegExp)[];
  proposals?: number;
  chips?: boolean;
  /** The first transaction card's "category/subcategory" must start with this. */
  category?: string;
};
export type Step = { say: string; expect: Expect };
export type Case = { name: string; lang: 'en' | 'ms'; steps: Step[]; empty?: boolean; bigSpend?: boolean; souqa?: boolean };

export const CASES: Case[] = [
  // 1. simple questions
  { name: 'balance (ms)', lang: 'ms', steps: [{ say: 'baki aku berapa', expect: { intent: 'balance', has: ['RM7,833.70'], visuals: ['bars'] } }] },
  { name: 'balance one account (en)', lang: 'en', steps: [{ say: "what's in my maybank", expect: { intent: 'balance', has: ['Maybank has RM2,450.50'] } }] },
  // 2. category analysis
  { name: 'where (en) donut', lang: 'en', steps: [{ say: 'where did my money go this month', expect: { intent: 'where', visuals: ['donut'], has: [/biggest part went to/i, /a day/], chips: true } }] },
  { name: 'food this week (en)', lang: 'en', steps: [{ say: 'how much did i spend on food this week', expect: { intent: 'where', has: ['Food & Drinks', 'in the last 7 days'] } }] },
  { name: 'where (ms) + simple + why', lang: 'ms', steps: [
    { say: 'bulan ni duit aku pergi mana', expect: { intent: 'where', visuals: ['donut'], has: ['Anda dah belanja'] } },
    { say: 'Terangkan dengan mudah', expect: { intent: 'explain', has: ['Mudahnya', 'setiap RM10'] } },
    { say: 'Kenapa?', expect: { intent: 'explain', has: ['terutamanya disebabkan'] } },
  ] },
  { name: 'period follow-up', lang: 'ms', steps: [
    { say: 'bulan ni duit aku pergi mana', expect: { intent: 'where' } },
    { say: 'bulan lepas pula?', expect: { intent: 'where', has: ['bulan lepas'] } },
  ] },
  // 3. monthly comparison
  { name: 'compare (en)', lang: 'en', steps: [{ say: 'did i spend more than last month', expect: { intent: 'compare', visuals: ['stats', 'compare'], has: [/same point last month/] } }] },
  { name: 'why spending up (ms)', lang: 'ms', steps: [
    { say: 'belanja bulan ni lebih ke bulan lepas', expect: { intent: 'compare' } },
    { say: 'kenapa naik', expect: { intent: 'explain', has: ['Kebanyakan perubahan datang daripada'] } },
  ] },
  // 4. budgets
  { name: 'budgets (en)', lang: 'en', steps: [{ say: 'how are my budgets', expect: { intent: 'budget', visuals: ['meter'] } }] },
  { name: 'food budget (ms)', lang: 'ms', steps: [{ say: 'bajet makan tinggal berapa', expect: { intent: 'budget', has: ['Food & Drinks'] } }] },
  // 5. trends
  { name: '6 month trend (en)', lang: 'en', steps: [{ say: 'show my spending trend for the last six months', expect: { visuals: ['trend'] } }] },
  { name: 'spend more than earn (en)', lang: 'en', steps: [{ say: 'am i spending more than i earn', expect: { visuals: ['trend'], has: [/income/i] } }] },
  // 6. saving advice
  { name: 'boost saving (ms)', lang: 'ms', steps: [
    { say: 'Mcm mana saya nak boost saving saya', expect: { intent: 'advice', has: ['Sekarang anda simpan', 'jimat'], visuals: ['bars'], not: ['Ini yang saya boleh buat'] } },
    { say: 'tak faham', expect: { intent: 'explain', has: ['Mudahnya'] } },
  ] },
  { name: 'save more (en)', lang: 'en', steps: [{ say: 'how can i save more', expect: { intent: 'advice', has: ['Right now you save'] } }] },
  // 7. scenarios
  { name: 'what if food -20% (en)', lang: 'en', steps: [{ say: 'what happens if i reduce my food spending by 20%', expect: { has: [/20%/, /a month/] , visuals: ['compare'] } }] },
  { name: 'afford phone (en)', lang: 'en', steps: [{ say: 'can i afford a new phone rm3000', expect: { has: ['RM3,000'] } }] },
  { name: 'afford (ms)', lang: 'ms', steps: [{ say: 'mampu tak saya beli laptop rm4500', expect: { has: ['RM4,500'] } }] },
  // 8. missing data
  { name: 'no records', lang: 'en', empty: true, steps: [{ say: 'where did my money go this month', expect: { has: ["don't see any records"] } }] },
  { name: 'no records advice', lang: 'ms', empty: true, steps: [{ say: 'macam mana nak jimat', expect: { intent: 'advice', has: ['belum nampak pendapatan'] } }] },
  // 9. ambiguous / out of scope
  { name: 'out of scope', lang: 'en', steps: [{ say: 'what is the capital of france', expect: { handled: false } }] },
  { name: 'explain with nothing before', lang: 'ms', steps: [{ say: 'kenapa ringgit jatuh', expect: { handled: false } }] },
  // Insight cards ("Explain: ..." buttons)
  { name: 'explain insight card (en)', lang: 'en', steps: [
    { say: 'Explain: Spending this week is higher than usual', expect: { intent: 'explain', has: ['What it means', 'The numbers behind it'], visuals: ['donut'] } },
    { say: 'Explain simply', expect: { intent: 'explain', has: ['Simply put'] } },
  ] },
  { name: 'explain card that is gone', lang: 'en', steps: [{ say: 'Explain: where did my money go this month', expect: { intent: 'where' } }] },
  // The developer's own messages (30 Oct 2026)
  { name: 'search then narrow', lang: 'en', steps: [
    { say: 'Show purchases under RM20', expect: { intent: 'find' } },
    { say: 'Only show me past 14 weeks', expect: { intent: 'find', not: ['RM60.00'] } },
    { say: 'Im sorry not 14 weeks but 14 days', expect: { intent: 'find', proposals: 0, not: ['RM60.00'] } },
  ] },
  { name: 'records past 14 days', lang: 'en', steps: [{ say: 'Show me records for the past 14 days', expect: { intent: 'find', not: ['2026-10-14 '] } }] },
  { name: 'expenses past 2 weeks', lang: 'en', steps: [{ say: 'Show me expenses for the past 2 weeks', expect: { intent: 'where', has: ['in the last 14 days'], visuals: ['donut'] } }] },
  { name: 'save RM100 plan (ms)', lang: 'ms', steps: [
    { say: 'From the past records, dalam masa bulan ni apa yang patut saya buat untuk dapatkan saving 100.. apa yang patut saya kurangkan, apa yang saya patut elakkan, show me in graph juga forcasting to achieve that', expect: { intent: 'advice', has: ['RM100', 'dielakkan|harian paling besar'.split('|')[1]], visuals: ['stats', 'bars'] } },
  ] },
  { name: 'save big target (en)', lang: 'en', steps: [{ say: 'how can i save rm2500 this month', expect: { intent: 'advice', has: ['in total', 'short of', 'next month'], visuals: ['stats', 'bars'] } }] },
  { name: 'save 500 after a big purchase (ms)', lang: 'ms', bigSpend: true, steps: [
    { say: 'Saya nak saving 500 hujung bulan ini', expect: { intent: 'advice', has: ['RM500 (jumlah)', 'lebih daripada', 'Deposit kereta'], not: ['RM500 sehari'] } },
    { say: 'Maksud aku, aku nak save total rm 500 bukan everyday 500', expect: { intent: 'advice', has: ['RM500 (jumlah)'] } },
    { say: 'Apasal ada short rm 18,230 pula', expect: { intent: 'explain', has: ['Cara saya kira'], proposals: 0 } },
  ] },
  { name: 'receipt typed line by line (en)', lang: 'en', steps: [
    { say: 'Track expenses yesterday Nasi Kerabu Pokdie with details below:\n2x Nasi Kerabu Daging RM 10\n2x Telur Masin Rm2\nBayar skali dengan ahmad nya hutang rm 0\nFrom maybank', expect: { intent: 'expense', proposals: 1, has: ['Nasi Kerabu Pokdie', 'RM12.00', '2 items'] } },
  ] },
  { name: 'instalment asks months then card', lang: 'en', steps: [
    { say: 'Record installment in spaylater about Subscription Claude AI rm 99 . It bnpl', expect: { has: ['How many months'], proposals: 0 } },
    { say: '3 months', expect: { has: ["Here's what I'll set up"] } },
  ] },
  { name: 'instalment with 0% and first payment date', lang: 'en', steps: [
    { say: 'Installment 3 month about Glace2Glow Tiktokpaylater rm 36.70 with 0% interest first payment 10 november 2026', expect: { has: ["Here's what I'll set up", 'Glace2Glow', 'TikTok PayLater', 'RM36.70', '2026-11-10', 'RM12.23'] } },
  ] },
  { name: 'add breakdown to an existing record (en)', lang: 'en', souqa: true, steps: [
    { say: 'Help me to update souqa pasta by adding this breakdown\n1 x Seafood Aglio Oglio Spagehtti rm24.90\n1x seafood gigi hadid spaghetti rm 26.90\n1 x lychee crusher rm 7.90\n1x strawberry crusher rm 7.90', expect: { proposals: 0, has: ["Here's what I'll set up", 'Souqa Pasta', 'RM67.60', '1x Seafood Gigi Hadid Spaghetti', '1x Lychee Crusher', 'RM24.90'] } },
  ] },
  { name: 'breakdown title in CAPITALS (ms)', lang: 'ms', souqa: true, steps: [
    { say: 'KEMASKINI SOUQA PASTA dengan butiran ini:\n1x NASI GORENG rm10\n2x TEH AIS rm 5', expect: { proposals: 0, has: ['Ini yang saya akan sediakan', 'Souqa Pasta', '1x Nasi Goreng', '2x Teh Ais', 'RM15.00'] } },
  ] },
  { name: 'breakdown for a record that does not exist', lang: 'en', souqa: true, steps: [
    { say: 'Update mamak corner with this breakdown\n1x roti canai rm2\n1x teh tarik rm3', expect: { proposals: 0, has: ["can't find a record called \"Mamak Corner\""] } },
  ] },
  { name: 'lunch with details (en)', lang: 'en', steps: [
    { say: 'Record expenses Lunch Rm3.50 with details nasi kuah dan telur mata today', expect: { category: 'food/Lunch', intent: 'expense', proposals: 1, has: ['Lunch (Nasi Kuah, Telur Mata) RM3.5'] } },
    { say: 'REKOD MAKAN TENGAH HARI rm 8 dengan butiran NASI AYAM, TEH AIS kat maybank', expect: { proposals: 1, has: ['Makan Tengah Hari (Nasi Ayam, Teh Ais) RM8'] } },
  ] },
  { name: 'title and remarks given (en)', lang: 'en', steps: [
    { say: 'Record expenses with tajuk Transfer to Syafiq RM 28 with remarks duit bowling on 30 oct 2026', expect: { category: 'entertainment/', intent: 'expense', proposals: 1, has: ['Transfer to Syafiq (Duit Bowling) RM28'] } },
    { say: 'rekod belanja tajuk bayar hutang ali rm 15 catatan makan malam', expect: { intent: 'expense', proposals: 1, has: ['Bayar Hutang Ali (Makan Malam) RM15'] } },
  ] },
  { name: 'real transfer still works', lang: 'en', steps: [
    { say: 'transfer RM50 from maybank to cash', expect: { intent: 'transfer', proposals: 1 } },
  ] },
  { name: 'total on first line, items below (en)', lang: 'en', steps: [
    { say: 'Record expenses Transfer to Danisha RM 10 with details as follows \nDuit MyLabourHub (Nov) rm 5\nDuit MyLabourHub (Dec) rm 5\n\nThis transactions was made on  3 nov 2026', expect: { intent: 'expense', proposals: 1, has: ['Transfer to Danisha RM10', '2 items'] } },
    { say: 'Record expenses Transfer to Danisha RM 10 with details as follows\nDuit A rm 5\nDuit B rm 4', expect: { proposals: 1, has: ['add up to RM9.00', 'Transfer to Danisha RM10'] } },
  ] },
  { name: 'Soru Station receipt 2, total first (en)', lang: 'en', steps: [
    { say: 'Record expenses Soru Station RM 7.30 with details as follows\n1x Onion Ring rm 6.90\nSST rm 0.41\n3 nov 2026', expect: { category: 'food/', intent: 'expense', proposals: 1, has: ['Soru Station RM7.3', '2 items', 'SST 0.41'] } },
  ] },
  { name: 'one item, date and bank on own lines (en)', lang: 'en', steps: [
    { say: 'Record expense T-Mart RM 3.50 with details as follows 1x Air A&W\n4 nov 2026\nMaybank', expect: { category: 'food/', intent: 'expense', proposals: 1, has: ['T-Mart (Air A&W) RM3.5'] } },
    { say: 'beli air suam rm1', expect: { category: 'food/', proposals: 1, has: ['Air suam'] } },
  ] },
  { name: 'items plus a "baki" remainder (en)', lang: 'en', steps: [
    { say: 'Record expense Dodo Korea RM 44.50 with details as follows \n2 x Dodo Dosirak Rm 38\n\nBaki 1 x mineral water\nSST and tax\nYesterday\nMaybank', expect: { category: 'food/', intent: 'expense', proposals: 1, has: ['Dodo Korea RM44.5', '2 items'] } },
  ] },
  { name: 'unpriced item lines under a total (en)', lang: 'en', steps: [
    { say: 'Ayam Gepuk Shilla RM 15.45 pay with maybank yesterday with details as below\n1x Set C Ayam Gepuk Crispy\n1x Ais Kosong', expect: { category: 'food/', intent: 'expense', proposals: 1, has: ['Ayam Gepuk Shilla (Set C Ayam Gepuk Crispy, Ais Kosong) RM15.45'] } },
    { say: 'Ayam Gepuk Shilla RM 15.45 pay with maybank yesterday with details as below\n1x Set C Ayam Gepuk Crispy RM 13.90\n1x Ais Kosong', expect: { intent: 'expense', proposals: 1, has: ['Ayam Gepuk Shilla RM15.45', '2 items', '1x Ais Kosong'] } },
  ] },
  { name: 'details with brackets and a typo in the shop (en)', lang: 'en', steps: [
    { say: 'Record McDonals Rm12.90 pay with maybank details as follows\n1x Spicy McChicken\n1x French Fries (M)\n1x Medium Coke', expect: { category: 'food/Fast Food', intent: 'expense', proposals: 1, has: ['McDonals (Spicy McChicken, French Fries (M), Medium Coke) RM12.9'] } },
    { say: 'Record McDonals Rm 7.70 pay with maybank details as follows\n2x French Fries (M)', expect: { category: 'food/Fast Food', intent: 'expense', proposals: 1, has: ['McDonals (2x French Fries (M)) RM7.7'] } },
  ] },
  { name: 'curly apostrophe in the shop name (en)', lang: 'en', steps: [
    { say: 'Record McDonald\u2019s Rm12.90 pay with maybank details as follows\n1x Spicy McChicken\n1x French Fries (M)\n1x Medium Coke', expect: { category: 'food/Fast Food', intent: 'expense', proposals: 1, has: ["McDonald's (Spicy McChicken, French Fries (M), Medium Coke) RM12.9"] } },
  ] },
  { name: 'a set: priced main item, sides without price (en)', lang: 'en', steps: [
    { say: 'Record McDonald\u2019s Rm12.90 pay with maybank details as follows\n1x Spicy Chicken McDeluxe RM12.90\n1x French Fries (M)\n1x Medium Coke', expect: { category: 'food/Fast Food', intent: 'expense', proposals: 1, has: ["McDonald's (Spicy Chicken McDeluxe Set) RM12.9", 'French Fries (M), Medium Coke came with the set', '1x Spicy Chicken McDeluxe 12.9', '1x French Fries (M) 0', '1x Medium Coke 0'], not: ['Record McDonald'] } },
  ] },
  { name: 'receipt pasted as JSON', lang: 'en', steps: [
    { say: '{\n  "merchant": "Soru Station",\n  "date": "2026-10-27",\n  "time": "21:01",\n  "receipt_no": "261103AAN485P",\n  "category": "Food & Dining",\n  "payment_method": "Card",\n  "currency": "MYR",\n  "items": [\n    {\n      "name": "Homemade Meatball",\n      "quantity": 1,\n      "price": 6.9\n    },\n    {\n      "name": "Korean Chicken Wing",\n      "quantity": 1,\n      "price": 14.9\n    },\n    {\n      "name": "Creamy Mushroom Chicken Grill",\n      "quantity": 1,\n      "price": 11.9\n    },\n    {\n      "name": "Chicken XL",\n      "quantity": 1,\n      "price": 18.9\n    },\n    {\n      "name": "Chicken Chop Crispy",\n      "quantity": 1,\n      "price": 11.9\n    },\n    {\n      "name": "Chicken Chop Crispy",\n      "quantity": 1,\n      "price": 11.9\n    },\n    {\n      "name": "Air Suam",\n      "quantity": 1,\n      "price": 0.5\n    },\n    {\n      "name": "Tower Mango",\n      "quantity": 1,\n      "price": 15.9\n    },\n    {\n      "name": "Nasi Lemak Ayam Berempah",\n      "quantity": 1,\n      "price": 10.9\n    },\n    {\n      "name": "Nasi Goreng Chicken Grill",\n      "quantity": 1,\n      "price": 10.9\n    }\n  ],\n  "subtotal": 114.6,\n  "sst": 6.88,\n  "rounding": 0.02,\n  "total": 121.5,\n  "payment_status": "Paid"\n}', expect: { intent: 'expense', proposals: 1, has: ['Soru Station RM121.5', '12 items', '1x Chicken XL 18.9', 'SST / Tax 6.88', 'Rounding 0.02'], category: 'food/' } },
    { say: '{\n  "merchant": "Soru Station",\n  "date": "2026-10-27",\n  "items": [\n    {\n      "name": "Onion Ring",\n      "quantity": 1,\n      "price": 6.9\n    }\n  ],\n  "subtotal": 6.9,\n  "sst": 0.41,\n  "rounding": -0.01,\n  "total": 7.3,\n  "currency": "MYR"\n}', expect: { proposals: 1, has: ['Soru Station RM7.3', '3 items', 'Rounding -0.01'] } },
    { say: '```json\n{"store": "Kedai Runcit", "items": [{"name": "Telur", "qty": 2, "price": 5.4}, {"name": "Beras", "qty": 1, "price": 20}], "subtotal": 30.8, "total": 30.8}\n```', expect: { proposals: 1, has: ['Kedai Runcit RM30.8', '2x Telur 10.8'] } },
    { say: '{"merchant": "Amazon", "total": 20, "currency": "USD", "items": [{"name": "Book", "price": 20}]}', expect: { proposals: 0, has: ['USD'] } },
  ] },
  { name: 'instalment one go (ms)', lang: 'ms', steps: [{ say: 'rekod ansuran atome iphone case rm150 3 bulan', expect: { has: ['Ini yang saya akan sediakan'] } }] },
  { name: 'debts question', lang: 'ms', steps: [{ say: 'berapa hutang saya', expect: { has: ['RM1,200.00', 'Ali'.length ? 'RM50.00' : ''], visuals: ['bars'] } }] },
  { name: 'iou owed (ms)', lang: 'ms', steps: [{ say: 'Ali hutang saya rm50', expect: { has: ['Ini yang saya akan sediakan'], proposals: 0 } }] },
  { name: 'iou owe (en)', lang: 'en', steps: [{ say: 'I owe Siti rm30', expect: { has: ["Here's what I'll set up"] } }] },
  { name: 'set budget (ms)', lang: 'ms', steps: [{ say: 'set bajet makan rm600', expect: { has: ['Ini yang saya akan sediakan'] } }] },
  { name: 'goal (ms)', lang: 'ms', steps: [{ say: 'nak simpan rm5000 untuk kahwin sebelum disember 2027', expect: { has: ['Ini yang saya akan sediakan'] } }] },
  { name: 'recurring bill (ms)', lang: 'ms', steps: [{ say: 'bayar unifi rm129 setiap bulan', expect: { has: ['Ini yang saya akan sediakan'], proposals: 0 } }] },
  // recording still works
  { name: 'record multi (ms)', lang: 'ms', steps: [{ say: 'rm8 teh tarik, roti canai 3.50 dan kopi 5', expect: { intent: 'expense', proposals: 3 } }] },
  { name: 'transfer (ms)', lang: 'ms', steps: [{ say: 'pindah 200 dari maybank ke tunai', expect: { intent: 'transfer', proposals: 1 } }] },
  { name: 'ask amount then answer', lang: 'en', steps: [
    { say: 'netflix', expect: { has: ['How much'] } },
    { say: '17', expect: { proposals: 1 } },
  ] },
  // chips must be understood by the brain itself
  { name: 'chips (ms)', lang: 'ms', steps: [
    { say: 'Banding dengan bulan lepas', expect: { intent: 'compare' } },
    { say: 'Macam mana nak jimat?', expect: { intent: 'advice' } },
    { say: 'Ramalan bulan depan', expect: { intent: 'forecast', visuals: ['trend'] } },
    { say: 'Bajet saya macam mana?', expect: { intent: 'budget' } },
    { say: 'Tunjuk belanja bawah RM20', expect: { intent: 'find', not: ['RM60.00'] } },
    { say: 'Duit saya pergi mana?', expect: { intent: 'where' } },
    { say: 'Baki saya berapa?', expect: { intent: 'balance' } },
  ] },
  { name: 'chips (en)', lang: 'en', steps: [
    { say: 'Compare with last month', expect: { intent: 'compare' } },
    { say: 'How can I save more?', expect: { intent: 'advice' } },
    { say: 'How does next month look?', expect: { intent: 'forecast' } },
    { say: 'How are my budgets?', expect: { intent: 'budget' } },
    { say: 'Show purchases under RM20', expect: { intent: 'find' } },
    { say: 'Explain simply', expect: { intent: 'explain' } },
    { say: 'Why?', expect: { intent: 'explain' } },
    { say: 'What about last month?', expect: {} },
  ] },
];

/* ---------------------------------------------------------------- shortcut templates
 * Every template in Ask WaKira's Shortcuts, filled with sample answers, in both languages, must give the right answer.
 * If a template's wording changes in src/i18n/{en,ms}/ai.ts, these cases catch a message the brain no longer understands.
 */
const SAMPLE: Record<string, SlotValues> = {
  expense: { title: 'Lunch', amount: '12.90', account: 'a2', date: 'yesterday' },
  receipt: { title: 'Kedai Runcit', amount: '25.40', account: 'a2', details: '1x Beras RM 20\n1x Telur RM 5.40' },
  income: { title: 'Freelance', amount: '500', account: 'a1' },
  transfer: { amount: '50', from: 'a1', to: 'a2' },
  instalment: { title: 'iPhone case', amount: '150', months: '3', provider: 'Atome', account: 'a1' },
  owedToMe: { person: 'Ali', amount: '20', title: 'lunch' },
  iOwe: { person: 'Ali', amount: '20', title: 'lunch' },
  budget: { category: 'food', amount: '600' },
  goal: { amount: '5000', title: 'Wedding', deadline: '2027-12-31' },
  recurring: { title: 'Netflix', amount: '17', account: 'a1' },
  afford: { amount: '300' },
  saveTarget: { amount: '500' },
};
const WANT: Record<string, (lang: 'en' | 'ms') => Expect> = {
  expense: () => ({ intent: 'expense', proposals: 1, has: ['Lunch RM12.9'], category: 'food/Lunch' }),
  receipt: () => ({ intent: 'expense', proposals: 1, has: ['Kedai Runcit RM25.4', '1x Beras 20'] }),
  income: () => ({ intent: 'income', proposals: 1, has: ['Freelance RM500'] }),
  transfer: () => ({ intent: 'transfer', proposals: 1 }),
  instalment: (l) => ({ proposals: 0, has: [l === 'en' ? 'set up' : 'sediakan', 'iPhone case', 'Atome'] }),
  owedToMe: (l) => ({ proposals: 0, has: [l === 'en' ? 'set up' : 'sediakan', 'Ali'] }),
  iOwe: (l) => ({ proposals: 0, has: [l === 'en' ? 'set up' : 'sediakan', 'Ali'] }),
  budget: (l) => ({ proposals: 0, has: [l === 'en' ? 'set up' : 'sediakan', 'RM600.00'] }),
  goal: (l) => ({ proposals: 0, has: [l === 'en' ? 'set up' : 'sediakan', 'Wedding', '2027-12-31'] }),
  recurring: (l) => ({ proposals: 0, has: [l === 'en' ? 'set up' : 'sediakan', 'Netflix'], not: ['from Maybank', 'dari Maybank'] }),
  where: () => ({ intent: 'where', visuals: ['donut'] }),
  afford: () => ({ intent: 'forecast', has: ['RM300.00'] }),
  saveTarget: () => ({ intent: 'advice', has: ['RM500'] }),
  compare: () => ({ intent: 'compare' }),
  bills: () => ({ intent: 'forecast' }),
  balance: () => ({ intent: 'balance', has: ['RM7,833.70'] }),
  biggest: () => ({ intent: 'find' }),
  saveMore: () => ({ intent: 'advice' }),
};
const ACCOUNT_NAMES: Record<string, string> = { a1: 'Maybank', a2: 'Cash', a3: 'TNG eWallet', a4: 'ASB' };
for (const lang of ['en', 'ms'] as const) {
  const dict = (lang === 'en' ? en : ms) as unknown as Record<string, string>;
  for (const tpl of TEMPLATES) {
    const say = fillTemplate(dict[tpl.msgKey], SAMPLE[tpl.id] ?? {}, {
      lang,
      todayKey: '2026-10-29',
      accountName: (id) => ACCOUNT_NAMES[id],
      categoryName: (id) => (id === 'food' ? 'Food & Drinks' : undefined),
    });
    if (!say) throw new Error(`template ${tpl.id} (${lang}) could not be filled`);
    CASES.push({ name: `shortcut template ${tpl.id} (${lang})`, lang, steps: [{ say, expect: WANT[tpl.id](lang) }] });
  }
}
