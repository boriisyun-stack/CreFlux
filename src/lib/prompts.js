const verbs = [
    "Reimagine", "Redesign", "Simplify", "Personalize", "Localize",
    "Prototype", "Remix", "Map", "Curate", "Streamline",
    "Augment", "Visualize", "Forecast", "Translate", "Archive",
    "Choreograph", "Recontextualize", "Invert", "Blend", "Layer",
    "Compress", "Expand", "Humanize", "Modularize", "Democratize",
    "Coordinate", "Document", "Celebrate", "Refresh", "Make accessible"
];

const subjects = [
    "public transport", "eating lunch", "sleeping", "doing laundry", "grocery shopping",
    "brushing teeth", "commuting", "paying taxes", "attending meetings", "learning a language",
    "exercising", "meditating", "brewing coffee", "job interviews", "reading books",
    "watching movies", "listening to music", "cleaning the house", "breathing exercises", "small talk",
    "waiting in line", "getting a haircut", "choosing a show", "apologizing", "tying shoelaces",
    "staring at the ceiling", "procrastinating", "writing emails", "parallel parking", "remembering passwords",
    "waking up", "drinking water", "making eye contact", "ignoring phone calls", "dreaming",
    "feeling guilty", "getting rejected", "losing your keys", "forgetting a name", "talking to yourself",
    "the concept of time", "human memory", "the alphabet", "the immune system", "democracy",
    "the food chain", "boredom", "community events", "remote work", "neighborhood planning"
];

const constraints = [
    " using only sound.", " in zero gravity.", " with a budget of zero.",
    " using open data.", " in virtual reality.", " with AI agents.",
    " without electricity.", " underwater.", " in the dark.", " while blindfolded.",
    " inside a lucid dream.", " with a five-minute time limit.", " for a public library.", " for a classroom.", " for a neighborhood group.",
    " communicating only in icons.", " using only one page.", " powered by community participation.", " using only 1990s technology.", " inside a simulation.",
    " using only a spreadsheet.", " running on a slow connection.", " designed for accessibility first.", " built from recyclable materials.", " with no screen.",
    " using only emojis.", " without using any vowels.", " communicating through movement.", " using only smells.", " without using the letter E.",
    " using only movie quotes.", " speaking entirely in questions.", " while forgetting everything every 10 seconds.", " during a citywide festival.", " at the bottom of the Mariana Trench.",
    " using quantum entanglement as a metaphor.", " for people with limited time.", " as a weekend prototype.", " as a tabletop activity.", " for a tiny team."
];

export function getRandomPrompt() {
    const v = verbs[Math.floor(Math.random() * verbs.length)];
    const s = subjects[Math.floor(Math.random() * subjects.length)];
    const c = constraints[Math.floor(Math.random() * constraints.length)];

    return `${v} the experience of ${s}${c}`;
}
