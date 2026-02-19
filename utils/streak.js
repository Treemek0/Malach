const db = require('./db');

/**
 * Stores streak information in a MongoDB collection named "streaks".
 * Each document has: { guildId, userId, targetId, currentStreak, lastInteraction }
 * Use targetId = '__guild__' to record the guild-wide streak for the user.
 */

function todayString() {
    return new Date().toISOString().split('T')[0];
}

async function _getDoc(guildId, userId, targetId) {
    const col = await db.collection('streaks');
    let doc = await col.findOne({ guildId, userId, targetId });
    if (!doc) {
        await col.insertOne({ guildId, userId, targetId, currentStreak: 0, lastInteraction: null });
        doc = await col.findOne({ guildId, userId, targetId });
    }
    return doc;
}

async function _updateDoc(guildId, userId, targetId, fields) {
    const col = await db.collection('streaks');
    await col.updateOne({ guildId, userId, targetId }, { $set: fields }, { upsert: true });
}

module.exports = {
    async addStreak(user, target, guild) {
        const guildId = guild.id;
        const userId = user.id;
        const targetId = target.id || '__guild__';
        const last = todayString();

        const doc = await _getDoc(guildId, userId, targetId);
        let currentStreak = doc.currentStreak;
        const lastDate = doc.lastInteraction;

        if (lastDate !== last) {
            if (lastDate) {
                const diff = Math.ceil((new Date(last) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
                if (diff > 1) {
                    currentStreak = 0;
                }
            }
            currentStreak = (currentStreak || 0) + 1;
            await _updateDoc(guildId, userId, targetId, { currentStreak, lastInteraction: last });
        }
    },

    async getStreak(user, target, guild) {
        const guildId = guild.id;
        const userId = user.id;
        const targetId = target.id;

        const col = await db.collection('streaks');
        const doc = await col.findOne({ guildId, userId, targetId });
        if (!doc) return 0;

        const last = todayString();
        const lastDate = doc.lastInteraction;
        let currentStreak = doc.currentStreak;

        if (lastDate && lastDate !== last) {
            const diff = Math.ceil((new Date(last) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
            if (diff > 1 && currentStreak > 0) {
                currentStreak = 0;
                await _updateDoc(guildId, userId, targetId, { currentStreak, lastInteraction: last });
            }
        }

        return currentStreak || 0;
    },

    async getTopStreaks(user, guild, limit = 5) {
        const guildId = guild.id;
        const userId = user.id;
        const col = await db.collection('streaks');

        const now = todayString();
        const cursor = col.find({ guildId, userId, targetId: { $ne: '__guild__' } })
            .sort({ currentStreak: -1 })
            .limit(limit);

        const entries = await cursor.toArray();

        // reset any expired streaks
        let changedDocs = [];
        for (const doc of entries) {
            const lastDate = doc.lastInteraction;
            const diff = lastDate ? Math.floor((new Date(now) - new Date(lastDate)) / (1000 * 60 * 60 * 24)) : 0;
            if (diff > 1 && doc.currentStreak > 0) {
                changedDocs.push(doc);
            }
        }
        if (changedDocs.length) {
            for (const doc of changedDocs) {
                await _updateDoc(guildId, userId, doc.targetId, { currentStreak: 0, lastInteraction: now });
            }
        }

        return entries.map(d => ({ id: d.targetId, currentStreak: d.currentStreak }));
    },

    async getGuildStreak(user, guild) {
        const guildId = guild.id;
        const userId = user.id;
        const targetId = '__guild__';
        const col = await db.collection('streaks');

        const doc = await col.findOne({ guildId, userId, targetId });
        if (!doc) return 0;

        const now = todayString();
        const lastDate = doc.lastInteraction;
        let currentStreak = doc.currentStreak;
        if (lastDate && lastDate !== now) {
            const diff = Math.ceil((new Date(now) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
            if (diff > 1) {
                currentStreak = 0;
                await _updateDoc(guildId, userId, targetId, { currentStreak, lastInteraction: now });
            }
        }
        return currentStreak || 0;
    },
};