import { Category } from "@prisma/client";

type Rule = { category: Category; keywords: string[] };

export const CATEGORY_RULES: Rule[] = [
  { category: Category.POLITICS_CONFLICT, keywords: ["စစ်", "တိုက်ပွဲ", "တပ်", "PDF", "NUG", "ရွေးကောက်ပွဲ", "ကာကွယ်ရေး", "ပစ်ခတ်", "တိုက်ခိုက်", "အရေးပေါ်", "ပြည်ထဲရေး", "လက်နက်"] },
  { category: Category.ECONOMY_BUSINESS, keywords: ["စီးပွားရေး", "ဈေးကွက်", "ငွေကြေး", "ဒေါ်လာ", "ရင်းနှီးမြှုပ်နှံ", "ကုမ္ပဏီ", "ရင်းနှီး", "ကုန်သွယ်", "တင်ပို့", "သွင်းကုန်", "ဘဏ်", "အလုပ်အကိုင်"] },
  { category: Category.SOCIETY, keywords: ["လူမှု", "အလုပ်သမား", "အိမ်ရာ", "ရွှေ့ပြောင်း", "ဆန္ဒပြ", "အကူအညီ", "ဒုက္ခသည်", "အခွင့်အရေး"] },
  { category: Category.HEALTH, keywords: ["ကျန်းမာရေး", "ရောဂါ", "ဆေးရုံ", "ကာကွယ်ဆေး", "COVID", "အန္တရာယ်", "သက်သာ", "လူနာ"] },
  { category: Category.EDUCATION, keywords: ["ပညာရေး", "ကျောင်း", "တက္ကသိုလ်", "စာမေးပွဲ", "ကျောင်းသား", "ဆရာ", "သင်ကြား"] },
  { category: Category.ENVIRONMENT, keywords: ["ပတ်ဝန်းကျင်", "ရာသီဥတု", "မိုးလေဝသ", "ရေကြီး", "မီးလောင်", "သစ်တော", "မြေငလျင်", "တိရစ္ဆာန်"] },
  { category: Category.INTERNATIONAL, keywords: ["နိုင်ငံတကာ", "အမေရိကန်", "တရုတ်", "ရုရှား", "အာဆီယံ", "UN", "ကုလသမဂ္ဂ", "ဥရောပ", "ဂျပန်", "ထိုင်း", "အိန္ဒိယ"] },
  { category: Category.CRIME_COURTS, keywords: ["တရားရုံး", "အမှု", "ဖမ်းဆီး", "ထောင်", "ပြစ်မှု", "ရဲ", "စုံစမ်း", "တရားစီရင်"] },
  { category: Category.TECH, keywords: ["နည်းပညာ", "AI", "အင်တာနက်", "ဖုန်း", "ဆော့ဖ်ဝဲ", "ဟက်", "ဒေတာ", "ဆက်သွယ်ရေး"] },
  { category: Category.CULTURE, keywords: ["ယဉ်ကျေးမှု", "ရုပ်ရှင်", "ဂီတ", "စာပေ", "အနုပညာ", "ပွဲတော်", "ဘာသာရေး"] },
];

export function categorizeMyanmarTitle(title: string): Category {
  const t = (title || "").toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => t.includes(k.toLowerCase()))) return rule.category;
  }
  return Category.OTHER;
}
