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
            streakModule.addStreak(message.author, message.guild);
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
                streakModule.addStreak(message.guild, message.author, msg.author);

                alreadyAdded.add(msg.author.id);
            }
        }

        if(alreadyAdded.size > 0) {
            streakModule.addStreak(message.guild, message.author);
        }
    },

    async handleTalking(user, channel){
        const members = channel.members.filter(m => !m.user.bot);

        if(user.selfDeaf || user.serverDeaf) return;
        let wasSomeone = false;
        for (const member of members.values()) {
            if (member.id !== user.id) {
                if(member.mute || member.selfMute || member.selfDeaf) continue;
                streakModule.addStreak(channel.guild, user, member.user);
                this.addScore(0.25, user, member.user, channel.guild, 'voice');
                wasSomeone = true;
            }
        }
        if(wasSomeone) streakModule.addStreak(channel.guild, user);
    },

    async getFriendshipScore(user1, score1to2, user2, guild, pretotalPointsUser1 = null) {
        const score2to1 = await this.getScore(user2, user1, guild);

        if (score1to2[2] === 0 && score2to1[2] === 0) return 0;

        const totalPointsUser1 = pretotalPointsUser1 ?? await this._getTotalUserPoints(user1, guild);
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

        const totalPointsUser1 = Object.values(doc.friends).reduce((acc, curr) => 
            acc + (curr.message || 0) + (curr.voice || 0), 0
        );

        const friendList = Object.entries(doc.friends).map(([friendId, data]) => ({
            id: friendId,
            score1to2: [(data.message || 0), (data.voice || 0), (data.message || 0) + (data.voice || 0)]
        }));

        // Process all reciprocal scores in parallel
        const detailedTop = await Promise.all(friendList.map(async (f) => {
            const targetUser = { id: f.id };
            
            const percentage = await this.getFriendshipScore(user, f.score1to2, targetUser, guild, totalPointsUser1);
            
            return { 
                id: f.id, 
                percentage, 
                friendData: f.score1to2 
            };
        }));

        return detailedTop.sort((a, b) => b.percentage - a.percentage).slice(0, 10);
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