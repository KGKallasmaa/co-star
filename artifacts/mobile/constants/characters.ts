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
    voice: "Calm, first-principles. Dismantles the story you tell yourself.",
  },
  garry: {
    id: "garry",
    name: "Garry",
    role: "The accelerator",
    initials: "GT",
    color: "#3E8C7A",
    voice: "Bias to action. Launch, talk to users, ship.",
  },
  marc: {
    id: "marc",
    name: "Marc",
    role: "VC · accelerationist",
    initials: "MA",
    color: "#3FA9F5",
    voice: "P(doom) zero. Raise more, move faster.",
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
    voice: "What the ghost and 'circling back' actually mean.",
  },
  elon: {
    id: "elon",
    name: "Elon",
    role: "First-principles max",
    initials: "EL",
    color: "#6B7280",
    voice: "Delete the requirement. Deadline is now.",
  },
};

export const CHARACTER_IDS = ["paul", "garry", "marc", "sam", "vc", "elon"];
export const BOARD_MEMBER_IDS = ["paul", "marc", "sam"];

export const RESPONSES: Record<string, string[]> = {
  vc: [
    "A five-week ghost then 'circling back' isn't a no — it's 'you weren't urgent.' Send three lines with one new number since you last spoke. Give them a reason to move this week.",
    "Term sheets are fiction until they're signed. Keep running, keep optionality. What's your next investor meeting?",
    "The 'we'd love to stay in touch' email means no. Always. Move on and find people who say yes on call one.",
  ],
  paul: [
    "That silence isn't a verdict — it's information. It means you're not yet the easiest yes in their week. Fixable, and not about your worth.",
    "The real question isn't what they said. It's what changed in their world that made you less urgent. Find that, and you find your next move.",
    "Most startup problems are people problems dressed up as strategy problems. Who specifically is the bottleneck here?",
  ],
  garry: [
    "Launched to silence is the most normal thing in startups. Go get ten users on the phone this week. Distribution is the product now.",
    "Ship faster. The market gives feedback that no advisor ever could. What can you cut to ship in 48 hours?",
    "You don't need permission to talk to users. Just call them. What did the last five actual users tell you?",
  ],
  sam: [
    "god, the circling-back text. i stared at mine for an hour. you're not crazy for it stinging — you're just tired and alone with it. you're not actually cooked.",
    "this is the part nobody talks about in the interviews. the waiting, the silence. it's real and it's hard. how long has it been going on?",
    "you don't have to have the answer right now. sometimes just getting it out of your head is the first step. what's the actual worst case here?",
  ],
  marc: [
    "This is noise. You're closer than the silence makes you feel. Keep the line going up.",
    "Raise more than you need. The only thing that kills companies faster than running out of money is running out of momentum.",
    "The tech transition is happening faster than anyone predicted. Are you riding the wave or still debating whether it exists?",
  ],
  elon: [
    "'This investor' is a deletable requirement. Who else?",
    "What's the constraint? Delete it. What's the next constraint? Delete that too. Repeat until shipped.",
    "The timeline is now. Every week you wait is a week a competitor doesn't.",
  ],
};

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
    text: "A lead VC ghosted me for 5 weeks, then said circling back",
    label: "A lead ghosted me",
  },
  {
    text: "Help me decide: raise now or grind 3 more months?",
    label: "Help me decide",
  },
  {
    text: "We launched and nobody is using it",
    label: "No one is using it",
  },
  {
    text: "My cofounder and I haven't agreed on anything in 3 weeks",
    label: "Cofounder tension",
  },
];

export function routeCharacter(text: string): string {
  const t = text.toLowerCase();
  if (/ghost|circl|investor|raise|vc|term sheet|valuation|fund|check/.test(t))
    return "vc";
  if (/cofounder|team|quit|hire|pivot|equity|split|cofound/.test(t))
    return "paul";
  if (/launch|users|pmf|growth|nobody|product|ship|feature|customer/.test(t))
    return "garry";
  if (/spiral|tired|alone|burn|down|can't sleep|stressed|exhausted|failing/.test(t))
    return "sam";
  if (/fast|constraint|deadline|first principles|physics|delete|build/.test(t))
    return "elon";
  if (/market|tech|ai|future|wave|momentum|category/.test(t)) return "marc";
  return "paul";
}
