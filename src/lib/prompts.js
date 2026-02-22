const verbs = [
    // Standard
    "Reinvent", "Revolutionize", "Disrupt", "Gamify", "Overhaul",
    "Redesign", "Hack", "Optimize", "Transform", "Decentralize",
    // Deconstruction & Reshaping
    "Weaponize", "Deconstruct", "Synthesize", "Subvert", "Invert",
    "Abolish", "Corrupt", "Glitch", "Eradicate", "Reverse-engineer",
    "Dismantle", "Sabotage", "Mutate", "Cannibalize", "Shatter",
    // High-tech & Systems
    "Virtualize", "Automate", "Quantify", "Democratize", "Monetize",
    "Tokenize", "Streamline", "Augment", "Simulate", "Crowdsource",
    "Outsource", "Micro-dose", "Algorithmize", "Digitize", "Render",
    // Exotic & Philosophy
    "Hallucinate", "Transcend", "Radicalize", "Recontextualize", "De-platform",
    "Hypnotize", "Gaslight", "Immortalize", "Zombify", "Overclock",
    "Brainwash", "Fossilize", "Philosophize", "Exorcise", "Resurrect"
];

const subjects = [
    // Standard
    "public transport", "eating soup", "sleeping", "doing laundry", "walking the dog",
    "grocery shopping", "brushing teeth", "commuting", "paying taxes", "attending meetings",
    "learning a language", "exercising", "meditating", "brewing coffee", "finding a partner",
    "job interviews", "reading books", "watching movies", "listening to music", "cleaning the house",
    // Extreme Mundane
    "breathing", "blinking", "small talk", "waiting in line", "getting a haircut",
    "choosing a Netflix show", "breaking up", "apologizing", "tying shoelaces", "peeling a banana",
    "staring at the ceiling", "procrastinating", "writing emails", "scrolling TikTok", "parallel parking",
    "remembering passwords", "waking up", "drinking water", "scratching an itch", "sneezing",
    // Social & Emotional & Surreal
    "having an existential crisis", "arguing with strangers online", "cutting fingernails", "waiting for the microwave", "holding your breath",
    "making eye contact", "ignoring phone calls", "dreaming", "feeling guilty", "faking a smile",
    "attending a funeral", "confessing a crime", "hiding a body", "surviving a hangover", "getting fired",
    "getting rejected", "losing your keys", "stepping on a Lego", "forgetting a name", "talking to yourself",
    // Systems & Abstract Concepts
    "capitalism", "the concept of time", "human memory", "gravity", "the alphabet",
    "the immune system", "democracy", "the food chain", "death", "boredom"
];

const constraints = [
    // Standard
    " using only sound.", " in zero gravity.", " with a budget of zero.",
    " using blockchain.", " in virtual reality.", " with AI agents.",
    " using telepathy.", " without electricity.", " underwater.", " in the dark.",
    // Physical Extremes
    " while falling from an airplane.", " while blindfolded.", " inside a lucid dream.", " with your hands tied behind your back.", " while running at full speed.",
    " inside a sensory deprivation tank.", " buried alive.", " standing on one leg.", " during an earthquake.", " at the bottom of the Mariana Trench.",
    // Bizarre Tech & System Constraints
    " communicating only in binary.", " using only 1 byte of RAM.", " powered by human tears.", " using only 1990s technology.", " inside a simulation.",
    " with an AI that actively hates you.", " using only a fax machine.", " running on Windows 95.", " connected to a dial-up modem.", " using a potato battery.",
    // Deconstruction of Communication & Rules
    " using only emojis.", " with a 5-second time limit.", " without using any vowels.", " communicating purely through interpretive dance.", " using only smells.",
    " while everyone is lying to you.", " without using the letter 'E'.", " using only movie quotes.", " speaking entirely in paradoxes.", " while forgetting everything every 10 seconds.",
    // Horror & Surrealism
    " using an army of rats.", " while being hunted by an assassin.", " on a moving rollercoaster.", " during a zombie apocalypse.", " while trapped in a time loop.",
    " by controlling other people's minds.", " using quantum entanglement.", " while hallucinating wildly.", " with a gun to your head.", " while slowly turning into a bug."
];

// Optimization: Assemble the prompt randomly from components when requested
export function getRandomPrompt() {
    const v = verbs[Math.floor(Math.random() * verbs.length)];
    const s = subjects[Math.floor(Math.random() * subjects.length)];
    const c = constraints[Math.floor(Math.random() * constraints.length)];

    return `${v} the experience of ${s}${c}`;
}