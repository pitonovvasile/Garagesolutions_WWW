export type TransmissionCategoryDef = {
  id: string;
  title: string;
  dbCategoryKey: string;
  page: string;
  icon: string;
  items: string[];
};

export const TRANSMISSION_CATEGORIES: TransmissionCategoryDef[] = [
  {
    id: "clutch",
    title: "Clutch & Flywheel",
    dbCategoryKey: "clutch",
    page: "./transmission-clutch.html",
    icon: "🧲",
    items: ["Clutch Kits", "Flywheels", "Bearings & Braided Hoses", "Clutch Cylinders", "Reinforced Bolts"],
  },
  {
    id: "differential",
    title: "Differential & Rear Axle",
    dbCategoryKey: "differential",
    page: "./transmission-differential.html",
    icon: "🛞",
    items: [
      "Limited Slip Diff",
      "RacingDiffs Kits",
      "Short Ratio Diff",
      "LSD Oils",
      "Bushings",
      "Halfshafts",
      "Reinforced Bolts",
    ],
  },
  {
    id: "oil",
    title: "Transmission Oil",
    dbCategoryKey: "oil",
    page: "./transmission-oil.html",
    icon: "🛢",
    items: ["All Oils", "Manual Transmission Oil", "Auto Transmission Oil", "LSD Oils"],
  },
  {
    id: "mounts",
    title: "Transmission Mounts",
    dbCategoryKey: "mounts",
    page: "./transmission-mounts.html",
    icon: "🔩",
    items: ["Gearbox Mounts", "Differential Mounts", "Engine & Box Swap Kits"],
  },
  {
    id: "accessories",
    title: "Accessories",
    dbCategoryKey: "accessories",
    page: "./transmission-accessories.html",
    icon: "🧰",
    items: [
      "Short Shifters",
      "Shift Knobs",
      "BMW Prop Donuts",
      "Oil Coolers",
      "Electronic Shifters",
      "Shifters and Acc.",
    ],
  },
  {
    id: "gearbox",
    title: "Gearboxes",
    dbCategoryKey: "gearbox",
    page: "./transmission-gearbox.html",
    icon: "⚙️",
    items: ["Toyota Gearboxes", "Nissan Gearboxes"],
  },
];
