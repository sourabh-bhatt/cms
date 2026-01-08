import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'editor' | 'viewer';
    avatar?: string;

    // Activity tracking
    stats: {
        coursesCreated: number;
        outlinesGenerated: number;
        topicsEdited: number;
        lastActive: Date;
    };

    createdAt: Date;
    updatedAt: Date;

    // Methods
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true,
            select: false // Don't include password in queries by default
        },
        role: {
            type: String,
            enum: ['admin', 'editor', 'viewer'],
            default: 'editor'
        },
        avatar: String,
        stats: {
            coursesCreated: { type: Number, default: 0 },
            outlinesGenerated: { type: Number, default: 0 },
            topicsEdited: { type: Number, default: 0 },
            lastActive: { type: Date, default: Date.now }
        }
    },
    {
        timestamps: true
    }
);

// Hash password before saving
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ name: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
