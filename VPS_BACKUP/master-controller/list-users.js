const { db } = require('./src/db/supabase');

async function listUsers() {
    try {
        const users = await db.users.list();
        console.log('Users:', JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error listing users:', error);
    }
}

listUsers();
