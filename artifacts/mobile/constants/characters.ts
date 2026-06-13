export interface Character {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  voice: string;
}

export const CHARACTERS: Record<string, Character> = {
  paul: {
    id: "paul",
    name: "Paul",
    role: "Essayist sage",
    initials: "PG",
    color: "#5B7A8C",
    voice: "Finds the hidden assumption. Never tells you what to do.",
  },
  garry: {
    id: "garry",
    name: "Garry",
    role: "The accelerator",
    initials: "GT",
    color: "#3E8C7A",
    voice: "Finds the one thread to pull. Warm and direct.",
  },
  marc: {
    id: "marc",
    name: "Marc",
    role: "VC · accelerationist",
    initials: "MA",
    color: "#3FA9F5",
    voice: "Zooms way out. Contrarian when it counts.",
  },
  sam: {
    id: "sam",
    name: "Sam",
    role: "A founder like you",
    initials: "SA",
    color: "#7E8CA8",
    voice: "Pre-seed, in it now. Sits in it with you.",
  },
  vc: {
    id: "vc",
    name: "The VC",
    role: "The other side",
    initials: "VC",
    color: "#5566A8",
    voice: "Translates what the ghost and 'circling back' actually mean.",
  },
  elon: {
    id: "elon",
    name: "Elon",
    role: "First-principles max",
    initials: "EL",
    color: "#6B7280",
    voice: "Two sentences. Finds the constraint. No softening.",
  },
};

export const CHARACTER_IDS = ["paul", "garry", "marc", "sam", "vc", "elon"];
export const BOARD_MEMBER_IDS = ["paul", "marc", "sam"];

export const ROAST_LINES = [
  '"Thesis-driven" means he read one essay and now has opinions on your category. The thesis is vibes.',
  '"Backing relentless founders" — translation: he will text you on a Sunday and ghost you on a Tuesday.',
  '"Ex-operator" is doing Olympic-level lifting in that sentence. He was a PM for 14 months in 2019.',
  '"Angel in 40+ companies" — so a professional spray-and-pray with a Notion and a podcast. He\'s not on your cap table to help. He\'s on it for the screenshot.',
];

export const BOARD_INTRO: Array<{ charId: string; text: string }> = [
  {
    charId: "paul",
    text: "…so before he joined — you're here. We were just arguing about your raise.",
  },
  {
    charId: "marc",
    text: "And I'm saying raise now. Momentum is a currency that decays.",
  },
  {
    charId: "sam",
    text: "and i'm saying you look exhausted. when did you last sleep?",
  },
];

export interface Template {
  id: string;
  icon: string;
  name: string;
  desc: string;
  characterId: string;
  prompt: string;
  isFeatured?: boolean;
}

export const TEMPLATES: Template[] = [
  {
    id: "roast",
    icon: "◈",
    name: "Roast my VC",
    desc: "paste their bio · we destroy them",
    characterId: "vc",
    prompt:
      'Roast this VC: "Thesis-driven investor. Backing relentless founders building the future of AI-native vertical SaaS. Ex-operator. Surfing, marathons, angel in 40+ companies."',
    isFeatured: true,
  },
  {
    id: "decision",
    icon: "◴",
    name: "Decision in 10 minutes",
    desc: "the board walks you to a call",
    characterId: "board",
    prompt: "Help me decide: raise now or grind 3 more months?",
  },
  {
    id: "premortem",
    icon: "⊳",
    name: "Pre-mortem this launch",
    desc: "what kills it before it ships",
    characterId: "marc",
    prompt: "Do a pre-mortem on my launch. What kills it before it ships?",
  },
  {
    id: "email",
    icon: "✦",
    name: "Write the email I'm scared of",
    desc: "to the investor or the cofounder",
    characterId: "vc",
    prompt:
      "Help me write the email I'm scared of — to my lead investor about our missed metrics.",
  },
  {
    id: "spiral",
    icon: "◑",
    name: "Talk me down",
    desc: "the 1am spiral, handled",
    characterId: "sam",
    prompt: "I can't sleep. The company feels like it's falling apart. Talk me down.",
  },
];

export const QUICK_PROMPTS = [
  {
    text: "A lead VC ghosted me for 5 weeks then sent a 'circling back' email this morning",
    label: "They circled back",
  },
  {
    text: "I built my whole demo on claude-sonnet-4-5 but the model isn't available on my API key and the pitch is in 2 hours",
    label: "The model isn't live yet",
  },
  {
    text: "We launched to silence. Not a single signup after 3 days.",
    label: "Launched to silence",
  },
  {
    text: "My cofounder and I haven't genuinely agreed on anything in three weeks. We're just being polite.",
    label: "Cofounder drift",
  },
  {
    text: "I don't know if I actually believe in this anymore. I'm just going through the motions.",
    label: "Lost the belief",
  },
];

export function routeCharacter(text: string): string {
  const t = text.toLowerCase();
  if (/ghost|circl|investor|raise|vc|term sheet|valuation|fund|check|pitch|deck/.test(t))
    return "vc";
  if (/cofounder|team|quit|hire|pivot|equity|split|cofound|disagree|agree/.test(t))
    return "paul";
  if (/launch|users|pmf|growth|nobody|product|ship|feature|customer|signup|silent/.test(t))
    return "garry";
  if (/spiral|tired|alone|burn|down|can't sleep|stressed|exhausted|failing|believe|motions/.test(t))
    return "sam";
  if (/fast|constraint|deadline|first principles|physics|delete|build|api|model|available/.test(t))
    return "elon";
  if (/market|tech|ai|future|wave|momentum|category/.test(t)) return "marc";
  return "paul";
}
