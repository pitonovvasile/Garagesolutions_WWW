/** Date statice pentru modul demonstrativ (fără backend). */
export const DEMO_ORDERS = [
  {
    id: "GS-2026-1088",
    date: "2026-04-20",
    status: "Livrat",
    statusClass: "is-done",
    total: "412,50 RON",
    method: "Ramburs",
    address: "București, Sector 1 — curier DPD",
    items: [
      { ref: "MAN-CU-27001", name: "Filtru aer engine Mann", qty: 1, line: "189,00 RON" },
      { ref: "BOS-1987", name: "Set bujii NGK (4 buc.)", qty: 1, line: "156,00 RON" },
      { ref: "TAX-LIV", name: "Transport", qty: 1, line: "24,00 RON" },
    ],
  },
  {
    id: "GS-2026-1052",
    date: "2026-04-12",
    status: "In curs de expediere",
    statusClass: "is-pending",
    total: "678,00 RON",
    method: "Card online (demo)",
    address: "Punct ridicare: Depozit Sud",
    items: [
      { ref: "BRK-FR-5520", name: "Set plăcute frână față (axa F)", qty: 1, line: "428,00 RON" },
      { ref: "LUB-5W30-5L", name: "Ulei motor 5W-30 — 5L", qty: 1, line: "250,00 RON" },
    ],
  },
  {
    id: "GS-2025-9991",
    date: "2025-12-03",
    status: "Livrat",
    statusClass: "is-done",
    total: "96,00 RON",
    method: "Ramburs",
    address: "Prahova — locker EasyBox",
    items: [{ ref: "CAB-INT-12", name: "Filtru habitaclu carbon activ", qty: 2, line: "96,00 RON" }],
  },
];

export const DEMO_FAVORITES = [
  {
    name: "Ulei 5W-30 LongLife (VW 504.00/507.00)",
    ref: "GS-OIL-5W30-LL-5L",
    note: "Compatibil 2.0 TDI — verificat cu garajul salvat",
    price: "de la 268 RON / 5L",
  },
  {
    name: "Kit distribuție + pompă apă (set)",
    ref: "TIM-KIT-6PK",
    note: "Alternativă omologată OEM (referință piese in catalogul demo)",
    price: "1.245 – 1.580 RON",
  },
  {
    name: "Senzor presiune anvelope (TPMS) – set 4",
    ref: "TPMS-4X",
    note: "Programare ID — disponibil in service parteneri",
    price: "420 RON",
  },
];

export const DEMO_ACTIVITY = [
  { t: "2026-04-20 10:12", m: "Comandă GS-2026-1088: confirmare plată (demo)." },
  { t: "2026-04-19 16:40", m: "Alertă stoc: ulei 5W-30 — revenit in depozit." },
  { t: "2026-04-18 09:05", m: "Mașină actualizată din garaj: motorizare 2.0 TDI 110 kW." },
  { t: "2026-04-10 12:00", m: "Sesiune autentificare demo pornită (browserul acesta)." },
];
