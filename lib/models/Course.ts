
import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // The complex course JSON structure
}, { timestamps: true });

export default mongoose.models.Course || mongoose.model('Course', CourseSchema);
