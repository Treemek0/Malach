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

    async addScore(score, user, friend, guild, type = 'message') {
        if(friend.bot || user.bot || friend.id === user.id) return;

        const col = await db.collection('friendships');
        const filter = { guildId: guild.id, userId: user.id };
        
        // Dot notation: friends.FRIEND_ID.TYPE
        const update = { $inc: { [`friends.${friend.id}.${type}`]: score } };
        
        await col.updateOne(filter, update, { upsert: true });
    },

    // 2. SET both scores at once
    async setScore(messageScore, voiceScore, user, friend, guild) {
        if(friend.bot || user.bot || friend.id === user.id) return;

        const col = await db.collection('friendships');
        const filter = { guildId: guild.id, userId: user.id };
        
        const update = { 
            $set: { 
                [`friends.${friend.id}.message`]: messageScore,
                [`friends.${friend.id}.voice`]: voiceScore
            } 
        };
        
        await col.updateOne(filter, update, { upsert: true });
    },

    // 3. GET score for a specific friend
    async getScore(user, friend, guild) {
        if(friend.bot || user.bot || friend.id === user.id) return [0,0,0];
        
        const col = await db.collection('friendships');
        const doc = await col.findOne({ guildId: guild.id, userId: user.id });
        
        const data = doc?.friends?.[friend.id];
        if (!data) return [0,0,0];

        const msg = data.message || 0;
        const vnc = data.voice || 0;
        return [msg, vnc, msg + vnc];
    },

    // 4. GET TOP FRIENDS (Leaderboard for one user)
    async getTopFriendships(user, guild) {
        const col = await db.collection('friendships');
        const doc = await col.findOne({ guildId: guild.id, userId: user.id });
        
        if (!doc || !doc.friends) return [];

        // Convert the friends object into a list we can sort
        const detailedTop = Object.entries(doc.friends).map(([friendId, data]) => {
            const msg = data.message || 0;
            const vnc = data.voice || 0;
            const total = msg + vnc;
            return {
                id: friendId,
                friendData: [msg, vnc, total],
                score: total
            };
        });

        // Sort by total score and take top 5
        return detailedTop
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    },

    // 5. TOTAL POINTS (Sum of all friendships for one user)
    async _getTotalUserPoints(user, guild) {
        const col = await db.collection('friendships');
        const doc = await col.findOne({ guildId: guild.id, userId: user.id });
        
        if (!doc || !doc.friends) return 0;

        return Object.values(doc.friends).reduce((acc, curr) => {
            return acc + (curr.message || 0) + (curr.voice || 0);
        }, 0);
    }
};