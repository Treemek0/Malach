const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    async addStreak(user, target, guild) {
        const streaksPath = path.join(__dirname, './streaks/' + guild.id + '/' + user.id +'.json');
        let streaksData = {};

        if (fs.existsSync(streaksPath)) {
            const data = fs.readFileSync(streaksPath, 'utf8');
            streaksData = JSON.parse(data);
        }

        if (!streaksData[target.id]) {
            streaksData[target.id] = {
                currentStreak: -1,
                lastInteraction: null
            };
        }

        if(!streaksData["guildStreak"]) {
            streaksData["guildStreak"] = {
                currentStreak: -1,
                lastInteraction: null
            };
        }

        const last = new Date().toISOString().split('T')[0];
        if(streaksData[target.id].lastInteraction !== last) {
            if(streaksData[target.id].lastInteraction) {
                const lastDate = new Date(streaksData[target.id].lastInteraction);
                const currentDate = new Date(last);
                const diffTime = Math.abs(currentDate - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if(diffDays > 1) {
                    streaksData[target.id].currentStreak = -1;
                }
            }

            streaksData[target.id].currentStreak = (streaksData[target.id].currentStreak || 0) + 1;
            streaksData[target.id].lastInteraction = last;
        }

        if(streaksData["guildStreak"].lastInteraction !== last) {
            if(streaksData["guildStreak"].lastInteraction) {
                const lastDate = new Date(streaksData["guildStreak"].lastInteraction);
                const currentDate = new Date(last);
                const diffTime = Math.abs(currentDate - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if(diffDays > 1) {
                    streaksData["guildStreak"].currentStreak = -1;
                }
            }

            streaksData["guildStreak"].currentStreak = (streaksData["guildStreak"].currentStreak || 0) + 1;
            streaksData["guildStreak"].lastInteraction = last;
        }
        
        const guildData = streaksData["guildStreak"];
        delete streaksData["guildStreak"];

        const sortedEntries = Object.entries(streaksData).sort(([, a], [, b]) => b.currentStreak - a.currentStreak);

        const finalSortedData = {
            guildStreak: guildData,
            ...Object.fromEntries(sortedEntries)
        };

        if (!fs.existsSync(path.dirname(streaksPath))) {
            fs.mkdirSync(path.dirname(streaksPath), { recursive: true });
        }
        
        fs.writeFileSync(streaksPath, JSON.stringify(finalSortedData, null, 2));
    },

    async getStreak(user, target, guild) {
        const streaksPath = path.join(__dirname, './streaks/' + guild.id + '/' + user.id +'.json');
        if (fs.existsSync(streaksPath)) {
            const data = fs.readFileSync(streaksPath, 'utf8');
            const streaksData = JSON.parse(data);

            if(streaksData[target.id].lastInteraction) {
                const last = new Date().toISOString().split('T')[0];
                const lastDate = new Date(streaksData[target.id].lastInteraction);
                const currentDate = new Date(last);
                const diffTime = Math.abs(currentDate - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if(diffDays > 1) {
                    streaksData[target.id].currentStreak = 0;
                    streaksData[target.id].lastInteraction = last;
                    fs.writeFileSync(streaksPath, JSON.stringify(streaksData, null, 2));
                }
            }

            return streaksData[target.id]?.currentStreak || 0;
        }
        return 0;
    },

    async getTopStreaks(user, guild, limit = 5) {
        const streaksPath = path.join(__dirname, './streaks/' + guild.id + '/' + user.id +'.json');
        if (fs.existsSync(streaksPath)) {
            const data = fs.readFileSync(streaksPath, 'utf8');
            const streaksData = JSON.parse(data);
            const entries = Object.entries(streaksData).filter(([key]) => key !== "guildStreak").sort(([, a], [, b]) => b.currentStreak - a.currentStreak).slice(0, limit);

            const last = new Date().toISOString().split('T')[0];
            const currentDate = new Date(last);
            let changed = false;
            for (const [id, data] of entries) {
                if (id === "guildStreak") continue;
                
                const lastDate = new Date(data.lastInteraction);
                const diffDays = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));

                if (diffDays > 1 && data.currentStreak > 0) {
                    streaksData[id].currentStreak = 0;
                    streaksData[id].lastInteraction = last;
                    changed = true;
                }
            }

            if (changed) {
                fs.writeFileSync(streaksPath, JSON.stringify(streaksData, null, 2));
            }

            return entries.map(([id, data]) => ({ id, currentStreak: data.currentStreak }));
        }
        return [];
    },


    async getGuildStreak(user, guild) {
        const streaksPath = path.join(__dirname, './streaks/' + guild.id + '/' + user.id +'.json');
        if (fs.existsSync(streaksPath)) {
            const data = fs.readFileSync(streaksPath, 'utf8');
            const streaksData = JSON.parse(data);

            if(streaksData["guildStreak"].lastInteraction) {
                const last = new Date().toISOString().split('T')[0];
                const lastDate = new Date(streaksData["guildStreak"].lastInteraction);
                const currentDate = new Date(last);
                const diffTime = Math.abs(currentDate - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if(diffDays > 1) {
                    streaksData["guildStreak"].currentStreak = 0;
                    streaksData["guildStreak"].lastInteraction = last;
                }
            }

            return streaksData["guildStreak"]?.currentStreak || 0;
        }
        return 0;
    },
};