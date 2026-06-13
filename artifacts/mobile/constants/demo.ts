// Hardcoded demo scripts — bulletproof on stage. When the founder sends one of
// these (e.g. by tapping the featured home card), CoStar plays the crafted reply
// with simulated streaming instead of hitting the API. Each reply does the three
// things that make the wow land: real empathy, one concrete move, a question back.

export interface DemoScript {
  id: string;
  /** Short card title for the home screen. */
  label: string;
  /** Sub-label / context. */
  hint: string;
  /** Exact text sent when the card is tapped. */
  prompt: string;
  /** Distinctive phrase used to recognize the prompt if typed live. */
  signature: string;
  /** The crafted reply. charId "costar" renders as the blended CoStar voice. */
  reply: { charId: string; text: string };
}

export const DEMO_SCRIPTS: DemoScript[] = [
  {
    id: "payroll",
    label: "I can't make payroll",
    hint: "2am · the one you can't say out loud",
    prompt:
      "It's 2am. I don't think we make payroll next month, and I haven't told a single person.",
    signature: "make payroll",
    reply: {
      charId: "costar",
      text: "First — breathe. The heaviest part of this isn't the money, it's that you're carrying it alone at 2am and haven't said it out loud to anyone. That's not weakness. Almost every founder who made it had some version of this exact night.\n\nNow the move: payroll is a date, not a surprise, so we work backward from it. Tomorrow morning, get the real number — runway to the day — and split the gap across three levers: a bridge from an investor who's already in (the ones on your cap table are the fastest yes), 30–45 day prepay from your two biggest customers in exchange for a small discount, and the deferral you quietly take yourself first. And you tell your team before the date, not on it — the founders who get ahead of it keep their people; the ones who get caught lose them.\n\nSo tell me the part you haven't told anyone: how many weeks of runway do you actually have, to the day — and is this a one-month gap or a three-month one?",
    },
  },
  {
    id: "ainative",
    label: "We're not really 'AI-native'",
    hint: "the one you'd only admit here",
    prompt:
      "I told our investors we're 'AI-native' but it's honestly three if-statements and a Claude call. How cooked am I?",
    signature: "if-statements",
    reply: {
      charId: "costar",
      text: "Ha — first, welcome to the club nobody admits they're in. Half the 'AI-native' seed decks in this city are a prompt and a dream. You're not a fraud. You're early, and you said the words to buy yourself the time to make them true. That's just selling.\n\nHere's the move: stop selling the architecture and start selling the wedge. Investors don't actually care that it's three if-statements — they care that one real user would be genuinely upset if you turned it off tomorrow. Go find that user this week, get the before-and-after in their words, and let 'AI-native' become a roadmap slide instead of a load-bearing lie.\n\nSo who's the one customer that already gets weirdly excited when your three if-statements run — and what would it take to make ten more of them?",
    },
  },
  {
    id: "ghost",
    label: "A fund just 'circled back'",
    hint: "decode what they actually mean",
    prompt:
      "A tier-1 fund ghosted us for six weeks, then emailed 'let's reconnect' the morning after our competitor announced their raise. What do they actually want?",
    signature: "let's reconnect",
    reply: {
      charId: "costar",
      text: "Let's read the tape honestly: you didn't get more interesting in six weeks — your competitor did, and now they're scared they're about to miss the category. That email isn't conviction, it's FOMO insurance. Which is fine. Leverage is leverage, no matter where it comes from.\n\nThe move is to not act grateful. Reply warm but busy: you're heads-down, momentum's good, you've got a couple of conversations live, happy to find thirty minutes next week. You're not lying and you're not begging — you're repricing their option on you. Then go make the competing conversation real, so the scarcity isn't a bluff by the time you're in the room.\n\nGut check before you hit send: if they put a term sheet in front of you Friday at your last round's terms, would you take it — or do you now believe you're worth more than you did six weeks ago?",
    },
  },
];

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Returns the demo script for a message, matching exact text or its signature phrase. */
export function matchDemo(text: string): DemoScript | null {
  const n = norm(text);
  for (const s of DEMO_SCRIPTS) {
    if (n === norm(s.prompt) || n.includes(norm(s.signature))) return s;
  }
  return null;
}
