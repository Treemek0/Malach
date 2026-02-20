const db = require('./db');

/**
 * MongoDB structure:
 * {
 * guildId: "...",
 * userId: "...",
 * guildStreak: { current: 5, lastInteraction: "2026-02-20" },
 * friendStreaks: {
 * "friend_id_1": { current: 10, lastInteraction: "2026-02-19" },
 * "friend_id_2": { current: 3, lastInteraction: "2026-02-20" }
 * }
 * }
 */

function todayString() {
    return new Date().toISOString().split('T')[0];
}

async function _getUserDoc(guildId, userId) {
    const col = await db.collection('streaks');
    
    const result = await col.findOneAndUpdate(
        { guildId, userId }, 
        { 
            $setOnInsert: { 
                guildId, 
                userId, 
                guildStreak: { current: 0, lastInteraction: null }, 
                friendStreaks: {} 
            } 
        },
        { 
            upsert: true, 
            returnDocument: 'after'
        }
    );
    
    return result.value || result;
}

module.exports = {
    async addStreak(guild, user, target = null) {
        const guildId = guild.id;
        const userId = user.id;
        const now = todayString();
        const doc = await _getUserDoc(guildId, userId);
        
        const col = await db.collection('streaks');

        // Logic for Global Guild Streak (Target is null)
        if (!target) {
            let { current, lastInteraction } = doc.guildStreak;
            if (lastInteraction === now) return; // Already updated today

            if (lastInteraction) {
                const diff = Math.ceil((new Date(now) - new Date(lastInteraction)) / (1000 * 60 * 60 * 24));
                if (diff > 1) current = 0;
            }
            
            await col.updateOne(
                { guildId, userId },
                { $set: { "guildStreak.current": current + 1, "guildStreak.lastInteraction": now } }
            );
        } 
        // Logic for Friend-specific Streak
        else {
            const targetId = target.id;
            let friendData = doc.friendStreaks[targetId] || { current: 0, lastInteraction: null };
            
            if (friendData.lastInteraction === now) return;

            if (friendData.lastInteraction) {
                const diff = Math.ceil((new Date(now) - new Date(friendData.lastInteraction)) / (1000 * 60 * 60 * 24));
                if (diff > 1) friendData.current = 0;
            }

            await col.updateOne(
                { guildId, userId },
                { 
                    $set: { 
                        [`friendStreaks.${targetId}`]: { 
                            current: (friendData.current || 0) + 1, 
                            lastInteraction: now 
                        } 
                    } 
                }
            );
        }
    },

    async getStreak(user, target, guild) {
        const doc = await _getUserDoc(guild.id, user.id);
        const targetId = target.id;
        const now = todayString();

        const data = doc.friendStreaks[targetId];
        if (!data) return 0;

        const diff = Math.ceil((new Date(now) - new Date(data.lastInteraction)) / (1000 * 60 * 60 * 24));
        if (diff > 1) {
            // Expired - clean it up in DB
            await db.collection('streaks').updateOne(
                { guildId: guild.id, userId: user.id },
                { $set: { [`friendStreaks.${targetId}.current`]: 0 } }
            );
            return 0;
        }
        return data.current;
    },

    async getTopStreaks(user, guild, limit = 5) {
        const doc = await _getUserDoc(guild.id, user.id);
        const now = todayString();
        
        // Convert object to array and check for expiration
        const entries = Object.entries(doc.friendStreaks).map(([id, data]) => {
            const diff = Math.ceil((new Date(now) - new Date(data.lastInteraction)) / (1000 * 60 * 60 * 24));
            return {
                id,
                currentStreak: diff > 1 ? 0 : data.current
            };
        });

        return entries
            .filter(e => e.currentStreak > 0)
            .sort((a, b) => b.currentStreak - a.currentStreak)
            .slice(0, limit);
    },

    async getGuildStreak(user, guild) {
        const doc = await _getUserDoc(guild.id, user.id);
        const now = todayString();
        const { current, lastInteraction } = doc.guildStreak;

        if (!lastInteraction) return 0;

        const diff = Math.ceil((new Date(now) - new Date(lastInteraction)) / (1000 * 60 * 60 * 24));
        if (diff > 1) return 0;
        
        return current;
    }
};