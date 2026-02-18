const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');

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
                this.addScore(0.1, user, member.user, channel.guild, 'voice');
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
        let dynamicMultiplier = 1 + (Math.min(score1to2[2], 80) * 0.69);
        let dynamicAddition = Math.min(score1to2[2], 40) * 0.30;
        let finalScore = (scaledScore * dynamicMultiplier) + dynamicAddition;

        return Math.min(Math.ceil(finalScore), 100);
    },

    async getTopFriendships(user, guild) {
        const usersPath = path.join(__dirname, './friendships/' + guild.id + '/' + user.id + '.json');
        if (!fs.existsSync(usersPath)) return [];

        try {
            const data = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

            const limit = 10;
            const topByPoints = Object.entries(data)
                .map(([id, info]) => ({ id, score: info.score }))
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

            const detailedTop = await Promise.all(topByPoints.map(async (f) => {
                const targetUser = { id: f.id }; 
                const friendData = await this.getScore(user, targetUser, guild);
                const percentage = await this.getFriendshipScore(user, friendData, targetUser, guild);
                return { id: f.id, percentage, friendData };
            }));

            return detailedTop.sort((a, b) => b.percentage - a.percentage).slice(0, 5);
        } catch (e) {
            console.error("Błąd rankingu procentowego:", e);
            return [];
        }
    },

    async addScore(score, user, friend, guild, type = 'message') {
        const usersPath = path.join(__dirname, './friendships/' + guild.id + '/' + user.id + '.json');
        const folderPath = path.dirname(usersPath);

        if(friend.bot || user.bot || friend.id === user.id) return;

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        let users = {};

        if (fs.existsSync(usersPath)) {
            const data = fs.readFileSync(usersPath, 'utf8');
            
            if (data.trim().length === 0) {
                users = {};
            } else {
                try {
                    users = JSON.parse(data);
                } catch (e) {
                    console.error("Plik JSON jest uszkodzony, resetuję dane.");
                    users = {};
                }
            }
        }

        const friendId = friend.id;

        if (!users[friendId]) {
            users[friendId] = {
                message: 0,
                voice: 0
            };
        }

        users[friendId][type] += score;

        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), async (err) => {
            if (err) {
                console.error(err);
                return;
            }
        });
    },

    async setScore(score, user, friend, guild, type = 'message') {
        const usersPath = path.join(__dirname, './friendships/' + guild.id + '/' + user.id + '.json');
        const folderPath = path.dirname(usersPath);

        if(friend.bot || user.bot || friend.id === user.id) return;

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }

        let users = {};

        if (fs.existsSync(usersPath)) {
            const data = fs.readFileSync(usersPath, 'utf8');
            
            if (data.trim().length === 0) {
                users = {};
            } else {
                try {
                    users = JSON.parse(data);
                } catch (e) {
                    console.error("Plik JSON jest uszkodzony, resetuję dane.");
                    users = {};
                }
            }
        }

        const friendId = friend.id;

        if (!users[friendId]) {
            users[friendId] = {
                message: 0,
                voice: 0
            };
        }

        users[friendId][type] = score;

        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), async (err) => {
            if (err) {
                console.error(err);
                return;
            }
        });
    },

    async getScore(user, friend, guild) {
        const usersPath = path.join(__dirname, './friendships/' + guild.id + '/' + user.id + '.json');

        if(friend.bot || user.bot || friend.id === user.id) return [0,0,0];

        if (fs.existsSync(usersPath)) {
            const data = fs.readFileSync(usersPath, 'utf8');
            if (data.trim().length === 0) {
                return [0,0,0];
            } else {
                try {
                    const users = JSON.parse(data);
                    if (!users[friend.id]) return [0,0,0];

                    return [users[friend.id].message || 0, users[friend.id].voice || 0, (users[friend.id].message || 0) + (users[friend.id].voice || 0)];
                } catch (e) {
                    console.error("Plik JSON jest uszkodzony, resetuję dane.");
                    return 0;
                }
            }
        } else {
            return [0,0,0];
        }
    },  

    async _getTotalUserPoints(user, guild) {
        const usersPath = path.join(__dirname, './friendships/' + guild.id + '/' + user.id + '.json');
        if (!fs.existsSync(usersPath)) return 0;
        
        try {
            const data = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
            return Object.values(data).reduce((total, info) => total + (info.message || 0) + (info.voice || 0), 0);
        } catch (e) {
            return 0;
        }
    },
};