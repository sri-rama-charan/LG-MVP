const mongoose = require('mongoose');
require('dotenv').config();
const Group = require('./models/Group');
const GroupMember = require('./models/GroupMember');

async function debugCost() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('--- DIAGNOSTIC START ---');
        
        // Find the specific groups mentioned
        const groups = await Group.find({ 
            name: { $in: ['adidas_shoes_group_2', 'Lenovo Laptops', 'Max'] } 
        });

        console.log(`Found ${groups.length} matching groups.`);

        let calculatedTotal = 0;

        for (const g of groups) {
            const realMemberCount = await GroupMember.countDocuments({ group_id: g._id, is_opted_out: false });
            
            console.log(`\nGroup: "${g.name}"`);
            console.log(`  _id: ${g._id}`);
            console.log(`  Price/Msg (paisa): ${g.price_per_message}`);
            console.log(`  Stored Member Count: ${g.member_count}`);
            console.log(`  ACTUAL DB Member Count: ${realMemberCount}`);
            
            const cost = realMemberCount * g.price_per_message;
            console.log(`  Calculated Cost (paisa): ${cost}`);
            calculatedTotal += cost;
        }

        console.log(`\nTotal Calculated Cost (paisa): ${calculatedTotal}`);
        console.log(`Total Calculated Cost (INR): ${calculatedTotal / 100}`);
        console.log('--- DIAGNOSTIC END ---');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

debugCost();
