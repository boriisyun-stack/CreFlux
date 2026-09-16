// --- EXPANSIVE CREATIVE PROMPT TEMPLATES & ARCHETYPES ---

// Exotic domains for Bisociation (cross-domain collision)
const exoticDomains = [
    "Formula 1 Pitstop Telemetry", "Deep-Sea Bioluminescent Cephalopods", "Mycelium Nutrient Networks",
    "Origami & Kirigami Kinetic Structures", "Air Traffic Control Conflict Detection", "Trappist Monastic Silence",
    "Street Sleight-of-Hand & Misdirection", "Quantum-Key Cryptography", "Three-Star Michelin Kitchen Plating",
    "ER Level-1 Trauma Resuscitation", "Ancient Polynesian Star-Wayfinding", "Beekeeping Superorganism Swarms",
    "Swiss Watchmaking Tourbillon Mechanics", "High-Altitude Glider Thermals", "Renaissance Fresco Restoration",
    "Nuclear Submarine Sensory Deprivation", "Parkour Urban Flow Dynamics", "Desert Nomadic Water Harvesting",
    "Falconry Aerial Kinematics", "Damascus Steel Layered Folding", "Volcanology Pyroclastic Monitoring",
    "Underground Speakeasy Mixology", "Ant Colony Pheromone Stigmergy", "Kintsugi Gold-Seam Pottery",
    "Jazz Polyphonic Improvisation", "Bonsai Decadal Micro-Pruning", "Puppetry & Marionette Tension Cables",
    "Glacier Core Ice Paleoclimatology", "Circus High-Wire Aerial Balance", "Termite Mound Passive Thermoregulation",
    "Gecko Foot Nanoscale Van der Waals Setae", "Spider Silk Tensile Spinning", "Stradivarius Violin Resonance Varnishing",
    "High-Frequency Stock Dark Pools", "Carnival Hall of Mirrors Optics", "Olympic Bobsled G-Force Cornering",
    "Deep-Mine Geothermal Drilling", "Bespoke Savile Row Tailoring", "Bioluminescent Algae Wave Surfing",
    "Lighthouse Fresnel Lens Beam Focusing", "Origami Satellite Solar Array Deployment", "Falcon Dive Terminal Velocity",
    "Symphonic Conductor Baton Gestures", "Space Station Closed-Loop Water Recovery", "Traditional Japanese Joinery (Kanawa Tsugi)",
    "Sub-Zero Cryo-Preservation", "Wildfire Aerial Smoke-Jumping", "Venetian Glassblowing Heat Manipulation"
];

// Target human & industry challenges
const targetChallenges = [
    "Urban Commuter Burnout & Micro-Delays", "Late-Night Insomnia & Circadian Rhythm Disruption",
    "Remote Team Creative Alignment & Video Fatigue", "Language Learning Beyond the Intermediate Plateau",
    "Personal Finance & Micro-Investment for Gen Z", "Household Food Leftovers & Zero-Waste Cooking",
    "Cognitive Decline & Memory Retention in Elders", "Wardrobe Longevity & Fast-Fashion Addiction",
    "Quiet Loneliness in Densely Populated Megacities", "Daily Chronic Back Pain & Sedentary Ergonomics",
    "ADHD Hyperfocus & Task Paralysis in Knowledge Work", "Public Library Revitalization in Digital Eras",
    "Neighbor-to-Neighbor Trust & Tool Sharing", "Scientific Paper Digestion for Curious Amateurs",
    "Digital Identity Privacy & Passive Tracker Evasion", "Creative Writer's Block & Narrative Plot Holes",
    "Parent-Child Screen Time Negotiation", "Solo Dining Social Stigma & Meal Enjoyment",
    "Home Composting in Confined City Apartments", "Subconscious Anxiety During Important Job Interviews",
    "Cross-Cultural Conflict De-escalation", "Pet Separation Anxiety & Cognitive Enrichment",
    "Daily Water Hydration Discipline Without Annoying Alarms", "Mindful Morning Wake-Up Without Blaring Screens",
    "Gym Exercise Intimidation for Beginners", "Household Clutter Accumulation & Decision Fatigue",
    "Artisan Craft Preservation Against Mass Production", "Eco-Friendly Micro-Mobility for Rainy Seasons",
    "Digital Photo Overload & Forgotten Memories", "Emergency Disaster Preparedness in Modern High-Rises"
];

// Provocation & Movement (PO) - Disrupting sacred cows of industries
const provocations = [
    "PO: What if cars had zero wheels, zero steering, and glided like magnetic slugs?",
    "PO: What if restaurants had no menus, no kitchens, and charged diners by how much they laughed?",
    "PO: What if smartphones had zero screens, zero buttons, and operated exclusively via micro-haptics?",
    "PO: What if universities had zero professors, zero lectures, and students graduated on day one?",
    "PO: What if hospital waiting rooms were designed to heal mild symptoms before seeing a physician?",
    "PO: What if clothing was a living photosynthetic skin that cleansed user sweat into clean water?",
    "PO: What if bank balances expired at midnight every Sunday unless gifted to a stranger?",
    "PO: What if buildings grew from seeds, repaired their own cracks, and shed leaves in winter?",
    "PO: What if search engines only presented credible arguments that contradict your current beliefs?",
    "PO: What if shoes generated electricity and warmed the wearer only when walking in sync with others?",
    "PO: What if books rewrote their character arcs based on the reader's real-time biometric pulse?",
    "PO: What if workplace meetings were conducted in complete darkness with spatial sound only?",
    "PO: What if refrigerators locked themselves shut whenever a user was emotionally stressed?",
    "PO: What if audio headphones amplified ambient nature and deleted human complaints in real time?",
    "PO: What if airplanes allowed passengers to pedal together to lower ticket prices?",
    "PO: What if supermarkets gave groceries away for free and only sold the empty packaging back?",
    "PO: What if watches counted down to zero instead of telling what time it currently is?",
    "PO: What if social media platforms rewarded users with cash for turning off their phones?",
    "PO: What if dental hygiene tools tasted like Michelin-star desserts and cleaned teeth while chewing?",
    "PO: What if luggage carried the traveler rather than the traveler hauling the luggage?",
    "PO: What if city streetlights only illuminated when two pedestrians walked past each other?",
    "PO: What if email clients destroyed unread messages after 24 hours to enforce peace of mind?",
    "PO: What if hotel rooms transformed their entire acoustic interior to match the guest's childhood bedroom?",
    "PO: What if fitness apps penalized you with embarrassing confessions if you skipped 3 workouts?"
];

// Inversion (Jacobi Principle) - How to deliberately ruin or reverse the premise
const inversionPrompts = [
    { target: "Customer Support", evil: "Keep callers trapped in infinite automated loops and insult their questions", remedy: "an anti-support concierge that anticipates faults 24 hours before the customer notices" },
    { target: "Online Dating", evil: "Maximize superficial swipes, addict users to rejection, and prevent real meetings", remedy: "a friction-rich matchmaking system where users only meet in person without photos" },
    { target: "Alarm Clocks", evil: "Scream deafening panic tones that induce cortisol spikes and morning dread", remedy: "a gentle biological wake-up system using circadian aroma, rising temperature, and binaural warmth" },
    { target: "Personal Productivity", evil: "Overload users with 50 complex color-coded tags until they abandon the app", remedy: "a zero-task system that forces deliberate boredom to trigger subconscious clarity" },
    { target: "Public Commuting", evil: "Pack strangers like sardines in silent misery with zero personal agency", remedy: "a commuter pod experience that converts commute transit into rejuvenating micro-spas" },
    { target: "Grocery Shopping", evil: "Trick shoppers into impulse buying junk food near checkout queues", remedy: "a cart that physically repels ultra-processed snacks and calculates nutritional life expectancy" },
    { target: "Language Apps", evil: "Force repetitive multiple-choice trivia without ever making the user speak", remedy: "a high-stakes voice roleplay simulator that forces clumsy speaking to survive funny crises" },
    { target: "E-Commerce", evil: "Pressure buyers with fake countdown timers and FOMO discounts for useless items", remedy: "a buyer guardian that pays users cash interest for delaying non-essential purchases for 7 days" },
    { target: "Job Interviews", evil: "Interrogate candidates with trick riddles and cold corporate poker faces", remedy: "a bidirectional simulation where candidates audit the company's real culture before signing" },
    { target: "Remote Collaboration", evil: "Hold 8-hour marathon webcam stares where 90% of attendees stay muted", remedy: "an asynchronous hive-mind canvas that eliminates all live video in favor of kinetic spatial artifacts" }
];

// Oblique Paradoxical Constraints
const obliqueRules = [
    "Honor your most embarrassing failure as the core hero feature.",
    "Eliminate all visual UI: the user must operate the product purely through tactile peripheral feedback.",
    "Design it as if electricity costs $500 per minute.",
    "Make the slowest, most tedious part of the process the primary emotional selling point.",
    "The product must be operable by a blindfolded astronaut wearing thick winter mittens.",
    "Invert the pricing model: the customer receives money when they use the product correctly.",
    "The entire user experience must conclude in under 12 seconds with zero cognitive friction.",
    "Every user action must generate a physical acoustic chime or tactile resonance.",
    "Design the product exclusively for two sworn enemies to successfully cooperate.",
    "Remove the expert: the product must be completely self-evident to a 6-year-old in pitch darkness.",
    "The product must become 10x more valuable each time it is broken or dropped.",
    "Silence is the primary interface: if the user speaks or types, the system temporarily halts.",
    "Use 1970s analog mechanical switches as the physical trigger for hyper-modern AI models.",
    "The product must work flawlessly underground with zero radio connectivity.",
    "Transform the byproduct or waste of the process into the actual luxury flagship output."
];

// Biomimicry & Evolutionary Marvels
const biomimicryMechanisms = [
    { creature: "Tardigrade Cryptobiosis", concept: "Extreme resilience and dormancy until ideal conditions arise" },
    { creature: "Kingfisher Beak Hydrodynamics", concept: "Silent entry between air and water without splash or sonic shock" },
    { creature: "Gecko Setae Adhesion", concept: "Reversible, residue-free dry adhesion at molecular scales" },
    { creature: "Lotus Leaf Micro-Structure", concept: "Superhydrophobic self-cleaning surfaces that repel all grime" },
    { creature: "Nautilus Buoyancy Chambers", concept: "Passive hydraulic ballast regulation without external energy" },
    { creature: "Chameleon Photonic Crystal Skin", concept: "Structural color modulation through lattice spacing adjustments" },
    { creature: "Electric Eel Electrolytes", concept: "Biochemical voltage cascading through stacked cell membranes" },
    { creature: "Owl Wing Serrations", concept: "Micro-fringe turbulence disruption for completely silent stealth flight" }
];

// Naming Lab Phonetics & Brand Archetypes
const namingLabFocuses = [
    "Sharp Plosive Consonants (P, T, K, B, D) for High-Tech Precision",
    "Soft Bouba Vowels and Liquid Resonants (L, M, N, R) for Sensory Comfort",
    "Punchy Portmanteau Blends (Two Unexpected Words Fused into a Single Trademark)",
    "Evocative Metaphoric Brand Names Derived from Mythology & Astronomy",
    "Action-Oriented Verbs That Double as Nouns (Google, Uber, Slack style)",
    "Latin & Greek Root Hybrids with Futuristic Neo-Minimalist Suffixes (-is, -ex, -o, -va)"
];

/**
 * Generates an extraordinarily diverse, high-concept innovation prompt across 8 distinct archetypes.
 */
export function getRandomPrompt() {
    const archetype = Math.floor(Math.random() * 8);

    if (archetype === 0) {
        // Bisociation (Cross-Domain Collision)
        const a = exoticDomains[Math.floor(Math.random() * exoticDomains.length)];
        const b = targetChallenges[Math.floor(Math.random() * targetChallenges.length)];
        return `Apply Bisociation: Collide the mechanics and philosophy of [${a}] with [${b}] to invent 15 radical solutions with killer, trademark-ready brand names.`;
    }

    if (archetype === 1) {
        // Provocation & Movement (PO)
        const po = provocations[Math.floor(Math.random() * provocations.length)];
        return `Provocation & Movement: Start with "${po}" and pivot that apparent impossibility into 15 viable, breakthrough products with sticky SMILE brand names.`;
    }

    if (archetype === 2) {
        // Inversion (Jacobi Principle)
        const inv = inversionPrompts[Math.floor(Math.random() * inversionPrompts.length)];
        return `Inversion Thinking on ${inv.target}: Instead of conventional thinking, imagine a malicious competitor trying to: "${inv.evil}". Invert each sabotage point into 15 ingenious, market-dominating products like "${inv.remedy}".`;
    }

    if (archetype === 3) {
        // Oblique Paradoxical Constraints
        const rule = obliqueRules[Math.floor(Math.random() * obliqueRules.length)];
        const challenge = targetChallenges[Math.floor(Math.random() * targetChallenges.length)];
        return `Oblique Strategy Constraint: Reimagine [${challenge}] under the strict rule: "${rule}". Invent 15 unexpected innovations with memorable brand identities.`;
    }

    if (archetype === 4) {
        // Biomimicry & Evolutionary R&D
        const bio = biomimicryMechanisms[Math.floor(Math.random() * biomimicryMechanisms.length)];
        const challenge = targetChallenges[Math.floor(Math.random() * targetChallenges.length)];
        return `Biomimetic Innovation: Harness [${bio.creature}] (${bio.concept}) to revolutionize [${challenge}]. Generate 15 bionic-inspired breakthrough products with punchy names.`;
    }

    if (archetype === 5) {
        // SMILE Brand Naming & Phonetics Lab
        const focus = namingLabFocuses[Math.floor(Math.random() * namingLabFocuses.length)];
        const challenge = targetChallenges[Math.floor(Math.random() * targetChallenges.length)];
        const domain = exoticDomains[Math.floor(Math.random() * exoticDomains.length)];
        return `SMILE Brand Naming Lab: Focusing on [${focus}], create 15 high-market-value startups addressing [${challenge}], drawing conceptual inspiration from [${domain}]. Ensure each title passes the SMILE test.`;
    }

    if (archetype === 6) {
        // Cyberpunk 2050 / Deep Future Retrofit
        const challenge = targetChallenges[Math.floor(Math.random() * targetChallenges.length)];
        const tech = exoticDomains[Math.floor(Math.random() * exoticDomains.length)];
        return `Sci-Fi 2050 Retrofit: Fast-forward 30 years into the future. How would post-scarcity society resolve [${challenge}] using advanced [${tech}]? Propose 15 commercially viable seeds of these future products today.`;
    }

    // SCAMPER Extreme Redesign
    const operations = [
        "Substitute the core material", "Combine with an unrelated daily ritual",
        "Adapt an ancient survival mechanism", "Magnify the smallest micro-detail into the whole product",
        "Eliminate the primary industry component", "Reverse the direction of user control"
    ];
    const op = operations[Math.floor(Math.random() * operations.length)];
    const challenge = targetChallenges[Math.floor(Math.random() * targetChallenges.length)];
    return `SCAMPER Extreme Redesign: Take [${challenge}] and aggressively [${op}]. Synthesize 15 radically fresh product blueprints with magnetic brand names.`;
}
