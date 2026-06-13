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
    color: "#5B8FA8",
    voice: "Finds the hidden assumption. Never tells you what to do.",
  },
  garry: {
    id: "garry",
    name: "Garry",
    role: "The accelerator",
    initials: "GT",
    color: "#3E9C7A",
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
    color: "#8A93B8",
    voice: "Pre-seed, in it now. Sits in it with you.",
  },
  vc: {
    id: "vc",
    name: "The VC",
    role: "The other side",
    initials: "VC",
    color: "#7080C8",
    voice: "Translates what the ghost and 'circling back' actually mean.",
  },
  elon: {
    id: "elon",
    name: "Elon",
    role: "First-principles max",
    initials: "EL",
    color: "#78828F",
    voice: "Two sentences. Finds the constraint. No softening.",
  },
};

export const CHARACTER_IDS = ["paul", "garry", "marc", "sam", "vc", "elon"];
export const BOARD_MEMBER_IDS = ["paul", "marc", "sam"];

// Short greeting from each advisor when the app opens fresh
export const ADVISOR_GREETINGS: Record<string, string> = {
  paul: "What's the real problem underneath this?",
  garry: "What are we figuring out today?",
  marc: "Tell me what's actually happening.",
  sam: "hey. how's it going for real?",
  vc: "I've seen this before. What's going on?",
  elon: "What's blocking you.",
};

// Rotating daily prompts — changes by day of year
export const DAILY_PROMPTS: Array<{ charId: string; text: string }> = [
  { charId: "paul", text: "What are you pretending not to know?" },
  { charId: "sam", text: "when did you last feel genuinely excited about what you're building?" },
  { charId: "marc", text: "What would you do if your runway was 3 months, not 18?" },
  { charId: "garry", text: "What's the one thing you'd ship this week if nothing else mattered?" },
  { charId: "vc", text: "If you were the investor, would you pass? Be honest." },
  { charId: "elon", text: "What requirement can you delete today?" },
  { charId: "paul", text: "What does your most honest user think that they haven't told you?" },
  { charId: "sam", text: "are you building for users or for your investors' story of you?" },
  { charId: "marc", text: "What's the version of your company that's 10× bigger? What's blocking it?" },
  { charId: "garry", text: "Have you talked to a real user in the last 48 hours?" },
  { charId: "vc", text: "What would you change about your pitch if you knew the answer was no?" },
  { charId: "elon", text: "What takes a week that should take a day?" },
  { charId: "paul", text: "What's the simplest true thing you could say about what you're building?" },
  { charId: "sam", text: "who on your team is carrying something they haven't said out loud?" },
  { charId: "marc", text: "Are you early to the wave or are you riding it wrong?" },
  { charId: "garry", text: "What would you do if your competitor shipped what you're planning?" },
  { charId: "vc", text: "What's the number you're most afraid to show an investor?" },
  { charId: "elon", text: "What's slowing you down 2× that you've just accepted?" },
  { charId: "paul", text: "What would you do differently if nobody was watching?" },
  { charId: "sam", text: "what does the version of you from 12 months ago think of where you are?" },
  { charId: "marc", text: "What category do you want to own in 5 years, and are you acting like it?" },
  { charId: "garry", text: "What does your best user do with your product that you didn't expect?" },
  { charId: "vc", text: "What are you fundraising for — the company, or the option to keep going?" },
  { charId: "paul", text: "What's the question you avoid because you're afraid of the answer?" },
  { charId: "sam", text: "do you actually want to build this, or do you want to have built it?" },
  { charId: "marc", text: "What's the contrarian belief your whole company depends on being right?" },
  { charId: "garry", text: "What's the one metric that, if it doubled, would change everything?" },
  { charId: "elon", text: "First principles: what's actually true here, ignoring what everyone believes?" },
  { charId: "paul", text: "What would a founder 5 years ahead of you tell you to stop doing?" },
  { charId: "vc", text: "When did you last have a conversation with an investor that felt real?" },
  { charId: "sam", text: "what's the thing you're most scared to admit isn't working?" },
];

export function getDailyPrompt(): { charId: string; text: string } {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start.getTime()) / 86400000);
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length]!;
}

export function getTimeGreeting(name?: string | null): string {
  const h = new Date().getHours();
  const suffix = name ? `, ${name}` : "";
  if (h < 6) return `Still up${suffix}`;
  if (h < 12) return `Good morning${suffix}`;
  if (h < 17) return `Good afternoon${suffix}`;
  if (h < 21) return `Good evening${suffix}`;
  return `Late night${suffix}`;
}

export const ROAST_LINES = [
  '"Thesis-driven" means he read one essay and now has opinions on your category. The thesis is vibes.',
  '"Backing relentless founders" — translation: he will text you on a Sunday and ghost you on a Tuesday.',
  '"Ex-operator" is doing Olympic-level lifting in that sentence. He was a PM for 14 months in 2019.',
  '"Angel in 40+ companies" — so a professional spray-and-pray with a Notion and a podcast. He\'s not on your cap table to help. He\'s on it for the screenshot.',
];

export const BOARD_INTRO: Array<{ charId: string; text: string }> = [
  { charId: "paul", text: "…so before he joined — you're here. We were just arguing about your raise." },
  { charId: "marc", text: "And I'm saying raise now. Momentum is a currency that decays." },
  { charId: "sam", text: "and i'm saying you look exhausted. when did you last sleep?" },
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
    prompt: "Help me write the email I'm scared of — to my lead investor about our missed metrics.",
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
  { text: "The Claude model my whole product runs on just got pulled, and I'm not a US founder so I can't get access through the normal channels. I literally can't build right now. What do I do?", label: "Model got pulled" },
  { text: "A lead VC ghosted me for 5 weeks then sent a 'circling back' email this morning. What do they actually mean?", label: "They circled back" },
  { text: "We launched to complete silence. Not a single signup after 3 days.", label: "Launched to silence" },
  { text: "My cofounder and I haven't genuinely agreed on anything in three weeks. We're just being polite now.", label: "Cofounder drift" },
  { text: "I don't know if I actually believe in this anymore. I'm going through the motions.", label: "Lost the belief" },
];

export function routeCharacter(text: string): string {
  const t = text.toLowerCase();
  if (/ghost|circl|investor|raise|vc|term sheet|valuation|fund|check|pitch|deck/.test(t)) return "vc";
  if (/cofounder|team|quit|hire|pivot|equity|split|cofound|disagree|agree/.test(t)) return "paul";
  if (/launch|users|pmf|growth|nobody|product|ship|feature|customer|signup|silent/.test(t)) return "garry";
  if (/spiral|tired|alone|burn|down|can't sleep|stressed|exhausted|failing|believe|motions/.test(t)) return "sam";
  if (/fast|constraint|deadline|first principles|physics|delete|build|api|model|available/.test(t)) return "elon";
  if (/market|tech|ai|future|wave|momentum|category/.test(t)) return "marc";
  return "paul";
}
