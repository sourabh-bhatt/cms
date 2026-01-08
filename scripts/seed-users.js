/**
 * Seed script to create the 3 admin users
 * Run with: npx ts-node --project tsconfig.json scripts/seed-users.ts
 * Or: npx tsx scripts/seed-users.ts
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection string - adjust as needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/course-creator';

// User schema (simplified for seeding)
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: { type: String, default: 'admin' },
    stats: {
        coursesCreated: { type: Number, default: 0 },
        outlinesGenerated: { type: Number, default: 0 },
        topicsEdited: { type: Number, default: 0 },
        lastActive: { type: Date, default: Date.now }
    }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Users to create
const users = [
    { name: 'Sourabh', email: 'sourabh@bluesky.com', password: 'sourabh@123' },
    { name: 'Kaveh', email: 'kaveh@bluesky.com', password: 'kaveh@123' },
    { name: 'Ayush', email: 'ayush@bluesky.com', password: 'ayush@123' }
];

async function seedUsers() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const userData of users) {
            // Check if user exists
            const existing = await User.findOne({ email: userData.email });

            if (existing) {
                console.log(`User ${userData.name} already exists, skipping...`);
                continue;
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.password, salt);

            // Create user
            const user = await User.create({
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
                role: 'admin',
                stats: {
                    coursesCreated: 0,
                    outlinesGenerated: 0,
                    topicsEdited: 0,
                    lastActive: new Date()
                }
            });

            console.log(`✅ Created user: ${user.name} (${user.email})`);
        }

        console.log('\n🎉 Seed complete! Users created:');
        console.log('   sourabh@bluesky.com / sourabh@123');
        console.log('   kaveh@bluesky.com / kaveh@123');
        console.log('   ayush@bluesky.com / ayush@123');

    } catch (error) {
        console.error('Error seeding users:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

seedUsers();
