const verbs = [
    // 기존
    "Reinvent", "Revolutionize", "Disrupt", "Gamify", "Overhaul",
    "Redesign", "Hack", "Optimize", "Transform", "Decentralize",
    // 파괴 및 재구성
    "Weaponize", "Deconstruct", "Synthesize", "Subvert", "Invert",
    "Abolish", "Corrupt", "Glitch", "Eradicate", "Reverse-engineer",
    "Dismantle", "Sabotage", "Mutate", "Cannibalize", "Shatter",
    // 첨단 기술 및 시스템
    "Virtualize", "Automate", "Quantify", "Democratize", "Monetize",
    "Tokenize", "Streamline", "Augment", "Simulate", "Crowdsource",
    "Outsource", "Micro-dose", "Algorithmize", "Digitize", "Render",
    // 기괴 & 철학
    "Hallucinate", "Transcend", "Radicalize", "Recontextualize", "De-platform",
    "Hypnotize", "Gaslight", "Immortalize", "Zombify", "Overclock",
    "Brainwash", "Fossilize", "Philosophize", "Exorcise", "Resurrect"
];

const subjects = [
    // 기존
    "public transport", "eating soup", "sleeping", "doing laundry", "walking the dog",
    "grocery shopping", "brushing teeth", "commuting", "paying taxes", "attending meetings",
    "learning a language", "exercising", "meditating", "brewing coffee", "finding a partner",
    "job interviews", "reading books", "watching movies", "listening to music", "cleaning the house",
    // 극단적인 일상
    "breathing", "blinking", "small talk", "waiting in line", "getting a haircut",
    "choosing a Netflix show", "breaking up", "apologizing", "tying shoelaces", "peeling a banana",
    "staring at the ceiling", "procrastinating", "writing emails", "scrolling TikTok", "parallel parking",
    "remembering passwords", "waking up", "drinking water", "scratching an itch", "sneezing",
    // 사회 & 감정 & 기괴한 상황
    "having an existential crisis", "arguing with strangers online", "cutting fingernails", "waiting for the microwave", "holding your breath",
    "making eye contact", "ignoring phone calls", "dreaming", "feeling guilty", "faking a smile",
    "attending a funeral", "confessing a crime", "hiding a body", "surviving a hangover", "getting fired",
    "getting rejected", "losing your keys", "stepping on a Lego", "forgetting a name", "talking to yourself",
    // 시스템 & 추상적 개념
    "capitalism", "the concept of time", "human memory", "gravity", "the alphabet",
    "the immune system", "democracy", "the food chain", "death", "boredom"
];

const constraints = [
    // 기존
    " using only sound.", " in zero gravity.", " with a budget of zero.",
    " using blockchain.", " in virtual reality.", " with AI agents.",
    " using telepathy.", " without electricity.", " underwater.", " in the dark.",
    // 물리적 극한
    " while falling from an airplane.", " while blindfolded.", " inside a lucid dream.", " with your hands tied behind your back.", " while running at full speed.",
    " inside a sensory deprivation tank.", " buried alive.", " standing on one leg.", " during an earthquake.", " at the bottom of the Mariana Trench.",
    // 기괴한 테크 & 시스템 제약
    " communicating only in binary.", " using only 1 byte of RAM.", " powered by human tears.", " using only 1990s technology.", " inside a simulation.",
    " with an AI that actively hates you.", " using only a fax machine.", " running on Windows 95.", " connected to a dial-up modem.", " using a potato battery.",
    // 소통 & 규칙의 파괴
    " using only emojis.", " with a 5-second time limit.", " without using any vowels.", " communicating purely through interpretive dance.", " using only smells.",
    " while everyone is lying to you.", " without using the letter 'E'.", " using only movie quotes.", " speaking entirely in paradoxes.", " while forgetting everything every 10 seconds.",
    // 호러 & 초현실
    " using an army of rats.", " while being hunted by an assassin.", " on a moving rollercoaster.", " during a zombie apocalypse.", " while trapped in a time loop.",
    " by controlling other people's minds.", " using quantum entanglement.", " while hallucinating wildly.", " with a gun to your head.", " while slowly turning into a bug."
];

// 최적화된 부분: 배열을 미리 만들지 않고, 필요할 때마다 랜덤으로 하나씩 뽑아서 조립함
export function getRandomPrompt() {
    const v = verbs[Math.floor(Math.random() * verbs.length)];
    const s = subjects[Math.floor(Math.random() * subjects.length)];
    const c = constraints[Math.floor(Math.random() * constraints.length)];

    return `${v} the experience of ${s}${c}`;
}