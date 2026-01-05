const mongoose = require('mongoose');
require('dotenv').config();
const Group = require('./models/Group');
const GroupMember = require('./models/GroupMember');

async function debugGroups() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const groups = await Group.find({});
        console.log(`Found ${groups.length} groups.`);

        for (const g of groups) {
            const count = await GroupMember.countDocuments({ group_id: g._id });
            console.log(`Group: ${g.name} (ID: ${g._id})`);
            console.log(`  - Price: ${g.price_per_message}`);
            console.log(`  - Members in DB: ${count}`);
            console.log(`  - Member Count in Group Doc: ${g.member_count}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

debugGroups();
