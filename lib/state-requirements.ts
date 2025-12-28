
export interface StateRequirement {
    state: string;
    totalHours: number;
    mandatoryTopics: {
        name: string;
        hours: number;
        keywords: string[]; // Used to find matches in National Content
    }[];
}

export const STATE_REQUIREMENTS: Record<string, StateRequirement> = {
    "VT": {
        state: "Vermont",
        totalHours: 40,
        mandatoryTopics: [
            { name: "Real Estate Law", hours: 8, keywords: ["law", "legislation", "liability"] },
            { name: "Vermont Specific Laws", hours: 4, keywords: ["vermont", "vt", "statute"] },
            { name: "Agency", hours: 6, keywords: ["agency", "agent", "fiduciary"] },
            { name: "Finance", hours: 6, keywords: ["finance", "mortgage", "loan", "lending"] },
            { name: "Ethics", hours: 4, keywords: ["ethics", "conduct", "professional"] },
            { name: "Fair Housing", hours: 4, keywords: ["fair housing", "discrimination", "equity"] },
            { name: "RE Contracts", hours: 8, keywords: ["contract", "lease", "purchase", "agreement"] }
        ]
    },
    "TX": {
        state: "Texas",
        totalHours: 180,
        mandatoryTopics: [
            { name: "Principles I", hours: 30, keywords: ["principles", "intro", "basics"] },
            { name: "Principles II", hours: 30, keywords: ["principles", "land", "titles"] },
            { name: "Law of Agency", hours: 30, keywords: ["agency", "agent", "brokerage"] },
            { name: "Law of Contracts", hours: 30, keywords: ["contract", "legal", "binding"] },
            { name: "Contract Forms & Addenda", hours: 30, keywords: ["forms", "addenda", "trec"] },
            { name: "Real Estate Finance", hours: 30, keywords: ["finance", "lending", "banking"] }
        ]
    }
};

export function getRequirementForState(stateCode: string): StateRequirement | undefined {
    return STATE_REQUIREMENTS[stateCode.toUpperCase()];
}
