const { EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('./db');

const streakModule = require('./streak');

module.exports = {
    async handleMessage(message) {
        if (message.author.bot) return;

        if (message.reference){ // replying to someone
            const originalMessage = await message.channel.messages.fetch(message.reference.messageId);
            if (originalMessage.author.bot) return;

            streakModule.addStreak(message.author, originalMessage.author, message.guild);
            this.addScore(1, message.author, originalMessage.author, message.guild, 'message');
            return;
        }

        const messages = await message.channel.messages.fetch({ limit: 5 });
        const humanMessages = messages.filter(msg => !msg.author.bot);

        const alreadyAdded = new Set();
        for (const msg of humanMessages.values()) {
            if (msg.id === message.id) continue;
            if (msg.author.id === message.author.id) {
                break; 
            }

            if (msg.author.id !== message.author.id && !alreadyAdded.has(msg.author.id)) {
                this.addScore(1, message.author, msg.author, message.guild, 'message');
                streakModule.addStreak(message.author, msg.author, message.guild);

                alreadyAdded.add(msg.author.id);
            }
        }
    },

    async handleTalking(user, channel){
        const members = channel.members.filter(m => !m.user.bot);

        if(user.deaf || user.serverDeaf) return;
        for (const member of members.values()) {
            if (member.id !== user.id) {
                if(member.mute || member.selfMute || member.deaf) continue;
                streakModule.addStreak(user, member.user, channel.guild);
                this.addScore(0.25, user, member.user, channel.guild, 'voice');
            }
        }
    },

    async getFriendshipScore(user1, score1to2, user2, guild) {
        const score2to1 = await this.getScore(user2, user1, guild);

        if (score1to2[2] === 0 && score2to1[2] === 0) return 0;

        const totalPointsUser1 = await this._getTotalUserPoints(user1, guild);
        const totalPointsUser2 = await this._getTotalUserPoints(user2, guild);

        const friendship1 = score1to2[2] / (totalPointsUser1 || 1);
        const friendship2 = score2to1[2] / (totalPointsUser2 || 1);

        let baseScore = (friendship1 * 0.7) + (friendship2 * 0.3);
        let scaledScore = Math.sqrt(baseScore);
        let dynamicMultiplier = 1 + (Math.min(score1to2[2], 200) * 0.34);
        let dynamicAddition = Math.min(score1to2[2], 100) * 0.31;
        let finalScore = (scaledScore * dynamicMultiplier) + dynamicAddition;

        return Math.min(Math.ceil(finalScore), 100);
    },

    async getTopFriendships(user, guild) {
        const col = await db.collection('friendships');
        const cursor = col.find({ guildId: guild.id, userId: user.id });
        const entries = await cursor.toArray();
        const limit = 10;
        const topByPoints = entries
            .map(f => ({ id: f.friendId, score: (f.message || 0) + (f.voice || 0) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        const detailedTop = await Promise.all(topByPoints.map(async (f) => {
            const targetUser = { id: f.id };
            const friendData = await this.getScore(user, targetUser, guild);
            const percentage = await this.getFriendshipScore(user, friendData, targetUser, guild);
            return { id: f.id, percentage, friendData };
        }));

        return detailedTop.sort((a, b) => b.percentage - a.percentage).slice(0, 5);
    },

    async addScore(score, user, friend, guild, type = 'message') {
        if(friend.bot || user.bot || friend.id === user.id) return;

        const col = await db.collection('friendships');
        const filter = { guildId: guild.id, userId: user.id, friendId: friend.id };
        const update = { $inc: { [type]: score } };
        await col.updateOne(filter, update, { upsert: true });
    },

    async setScore(score, user, friend, guild, type = 'message') {
        if(friend.bot || user.bot || friend.id === user.id) return;

        const col = await db.collection('friendships');
        const filter = { guildId: guild.id, userId: user.id, friendId: friend.id };
        const update = { $set: { [type]: score } };
        await col.updateOne(filter, update, { upsert: true });
    },

    async setScore(message, voice, user, friend, guild) {
        if(friend.bot || user.bot || friend.id === user.id) return;

        const col = await db.collection('friendships');
        const filter = { guildId: guild.id, userId: user.id, friendId: friend.id };
        const update = { $set: { message: message, voice: voice } };
        await col.updateOne(filter, update, { upsert: true });
    },

    async getScore(user, friend, guild) {
        if(friend.bot || user.bot || friend.id === user.id) return [0,0,0];
        const col = await db.collection('friendships');
        const doc = await col.findOne({ guildId: guild.id, userId: user.id, friendId: friend.id });
        if (!doc) return [0,0,0];
        return [(doc.message||0),(doc.voice||0),(doc.message||0)+(doc.voice||0)];
    },  

    async _getTotalUserPoints(user, guild) {
        const col = await db.collection('friendships');
        const cursor = col.find({ guildId: guild.id, userId: user.id });
        let total = 0;
        await cursor.forEach(d => { total += (d.message||0) + (d.voice||0); });
        return total;
    },
};