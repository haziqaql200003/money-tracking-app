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
