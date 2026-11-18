require('dotenv').config();
require('express-async-errors');
const cron = require('node-cron');

const mongoose = require('mongoose');
const Teacher = require('./src/models/teacher');
const { backfillUserAcademicProfile } = require('./src/migrations/backfillUserAcademicProfile');
const { scheduleQuestionFlow } = require('./src/jobs/questionFlow');

const app = require('./app');

if (!process.env.TOKEN_KEY) {
    console.log('Api secret token is missing!');
    return;
}
if (!process.env.MONGO_DATABASE_URL) {
    console.log('Mongo URL is missing!');
    return;
}

const createDefaultUser = async () => {
    const teacherCount = await Teacher.countDocuments({});
    if (teacherCount === 0) {
        const admin = new Teacher({
            email: 'superadmin@uniza.sk',
            isAdmin: true,
            isActive: true,
            name: 'Administrator',
            surname: 'System',
            emailConfirmed: true,
        });
        admin.setPassword('Skuska123456');
        await admin.save();
        console.log('Default admin created: superadmin@uniza.sk');
    }
};

const start = async () => {
    cron.schedule('0 1 * * *', () => {
        console.log('Execute cron task');
    });
    try {
        await mongoose.connect(process.env.MONGO_DATABASE_URL);
        console.log('Mongoose connected');
        const migrationResult = await backfillUserAcademicProfile();
        console.log('User academic profile migration finished:', migrationResult);
        await createDefaultUser();
        scheduleQuestionFlow();

        app.listen(5000, () => {
            console.log(`Listening at http://localhost:5000`);
        });
    } catch (err) {
        console.log(err);
    }
};

start();
