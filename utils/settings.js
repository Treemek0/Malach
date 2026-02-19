const db = require('./db');

module.exports = {
    /**
     * Retrieve guild settings from MongoDB. Returns an empty object if none exist.
     */
    async get_settings(guildId) {
        const col = await db.collection('settings');
        const doc = await col.findOne({ guildId });
        return doc ? doc.settings : {};
    },

    /**
     * Update (or insert) guild settings in MongoDB.
     */
    async update_settings(guildId, settings) {
        const col = await db.collection('settings');
        await col.updateOne(
            { guildId },
            { $set: { settings } },
            { upsert: true }
        );
    }
};