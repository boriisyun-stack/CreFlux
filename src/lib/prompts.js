const domainsA = [
    "Formula 1 Pitstop Crew", "Deep-Sea Bioluminescence", "Mycelium Networks", "Origami Architecture",
    "Air Traffic Control", "Monastic Silence", "Street Magic & Illusion", "Quantum Cryptography",
    "Michelin-Star Plating", "Emergency Room Triage", "Ancient Cartography", "Jazz Improvisation",
    "Symbiotic Parasitism", "High-Frequency Trading", "Watchmaking Micro-Mechanics"
];

const domainsB = [
    "Urban Commute & Transit", "Mental Health & Burnout", "Personal Finance & Debt", "Sleep & Circadian Rhythms",
    "Collaborative Remote Work", "Language Learning", "Food Waste & Leftovers", "Memory Retention & Aging",
    "Neighborhood Security", "Wardrobe & Sustainable Fashion", "Online Dating & Connection", "Physical Rehabilitation"
];

const provocations = [
    "PO: What if cars had zero wheels?",
    "PO: What if restaurants had no menus or food?",
    "PO: What if phones had no screens or speakers?",
    "PO: What if school had no teachers or curriculum?",
    "PO: What if hospitals only treated healthy people?",
    "PO: What if books read the human instead?",
    "PO: What if bank accounts started at zero every Monday?",
    "PO: What if clothing was completely intangible?"
];

const obliqueRules = [
    "Honor your most embarrassing failure as the core feature.",
    "Eliminate all vowels from the communication channel.",
    "Make the slowest part of the process the main selling point.",
    "Design it as if it must run entirely on 1980s analog technology.",
    "Remove the expert: the product must be operable by a 5-year-old in darkness.",
    "Invert the pricing: the user gets paid when they use it correctly.",
    "Use tactical silence as the primary user interface."
];

const subjects = [
    "public transport", "personal sleep hygiene", "job interviews", "reading complex books",
    "neighborhood community building", "learning programming", "brewing artisan coffee",
    "mindful meditation", "remote team alignment", "grocery shopping with zero waste",
    "creative writing blocks", "managing personal energy cycles", "cross-cultural negotiation"
];

export function getRandomPrompt() {
    const archetype = Math.floor(Math.random() * 5);

    if (archetype === 0) {
        // Bisociation (Cross-domain collision)
        const a = domainsA[Math.floor(Math.random() * domainsA.length)];
        const b = domainsB[Math.floor(Math.random() * domainsB.length)];
        return `Apply Bisociation: Collide the mechanics of ${a} with ${b} to invent a radical solution with a killer brand name.`;
    }

    if (archetype === 1) {
        // Provocation & Movement (PO)
        const po = provocations[Math.floor(Math.random() * provocations.length)];
        return `Provocation & Movement: Start with "${po}" and pivot that absurdity into 15 viable, game-changing products.`;
    }

    if (archetype === 2) {
        // Inversion (Jacobi Principle)
        const s = subjects[Math.floor(Math.random() * subjects.length)];
        return `Inversion Thinking: How would a malicious competitor completely ruin ${s}? Invert each failure point into a breakthrough product.`;
    }

    if (archetype === 3) {
        // Oblique Strategy
        const s = subjects[Math.floor(Math.random() * subjects.length)];
        const r = obliqueRules[Math.floor(Math.random() * obliqueRules.length)];
        return `Oblique Constraint: Reimagine ${s} under the strict rule: "${r}".`;
    }

    // SMILE Brand Naming & Innovation
    const a = domainsA[Math.floor(Math.random() * domainsA.length)];
    const s = subjects[Math.floor(Math.random() * subjects.length)];
    return `SMILE Naming Lab: Create 15 inventive startup concepts for ${s} inspired by ${a}, each with a punchy, memorable brand name (Portmanteau or Metaphor).`;
}
