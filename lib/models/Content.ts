
import mongoose from 'mongoose';

const ContentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, enum: ['folder', 'file'], required: true },
    path: { type: String, required: true, unique: true }, // Virtual path: "national_content/Section 1..."
    content: { type: String }, // For files (markdown)
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' }, // For tree structure
}, { timestamps: true });

// Prevent recompilation of model
export default mongoose.models.Content || mongoose.model('Content', ContentSchema);
