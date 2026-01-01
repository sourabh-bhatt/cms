import mongoose from 'mongoose';

const StateRequirementSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Agency"
    hours: { type: Number, required: true },
    keywords: [{ type: String }] // keywords for mapping to national content
});

const ContactSchema = new mongoose.Schema({
    name: { type: String },
    role: { type: String },
    email: { type: String },
    phone: { type: String },
    notes: { type: String }
});

const ActivitySchema = new mongoose.Schema({
    type: { type: String, enum: ['email', 'call', 'note', 'submission'], required: true },
    summary: { type: String, required: true },
    date: { type: Date, default: Date.now },
    user: { type: String } // "Sourabh" or "System"
});

const RawSourceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true }, // or base64 data if small, let's assume we store ID or Path
    size: { type: String },
    type: { type: String },
    uploadedAt: { type: Date, default: Date.now }
});

const StateSchema = new mongoose.Schema({
    name: { type: String, required: true }, // "Vermont"
    code: { type: String, required: true, unique: true, uppercase: true }, // "VT"
    status: {
        type: String,
        enum: ['NOT_STARTED', 'RESEARCHING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED'],
        default: 'NOT_STARTED'
    },
    totalHours: { type: Number, default: 0 },
    regulatoryUrl: { type: String },

    // Requirements (Replacing hardcoded state-requirements.ts)
    mandatoryTopics: [StateRequirementSchema],

    // Raw Sources
    rawSources: [RawSourceSchema],

    // CRM
    contacts: [ContactSchema],
    activityLog: [ActivitySchema],

    // Timestamps
}, { timestamps: true });

export default mongoose.models.State || mongoose.model('State', StateSchema);
