
import mongoose from 'mongoose';

const ResourceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, enum: ['pdf', 'link'], required: true },
    state: { type: String, required: true }, // e.g. 'VT', 'TX'
    url: { type: String }, // For links
    data: { type: Buffer }, // For PDF binary
    contentType: { type: String }, // e.g. 'application/pdf'
    size: { type: Number },
}, { timestamps: true });

export default mongoose.models.Resource || mongoose.model('Resource', ResourceSchema);
