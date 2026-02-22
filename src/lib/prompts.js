const verbs = [
    "Reinvent", "Revolutionize", "Disrupt", "Gamify", "Overhaul",
    "Redesign", "Hack", "Optimize", "Transform", "Decentralize"
];

const subjects = [
    "public transport", "eating soup", "sleeping", "doing laundry", "walking the dog",
    "grocery shopping", "brushing teeth", "commuting", "paying taxes", "attending meetings",
    "learning a language", "exercising", "meditating", "brewing coffee", "finding a partner",
    "job interviews", "reading books", "watching movies", "listening to music", "cleaning the house"
];

const constraints = [
    " using only sound.", " in zero gravity.", " with a budget of zero.",
    " using blockchain.", " in virtual reality.", " with AI agents.",
    " using telepathy.", " without electricity.", " underwater.", " in the dark."
];

// Generate exactly 200 distinct creative prompts
export const RANDOM_PROMPTS = [];
let index = 0;
for (let v of verbs) {
    for (let s of subjects) {
        // Pick a constraint cyclically to guarantee exactly 200 combinations
        let constraint = constraints[index % constraints.length];
        RANDOM_PROMPTS.push(`${v} the experience of ${s}${constraint}`);
        index++;
    }
}
