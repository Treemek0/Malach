const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const settings = require('../settings.js');

const xpPerMessage = 1; // Ilość expa za każdą wiadomość

const xpForSecondLevel = 22;
const growthRate = 1.3636364;

const messageFromOnePersonLimit = 10;

module.exports = {
    async send_message(message) {
        console.log("Message received: ", message.content);

        const messages = await message.channel.messages.fetch({ limit: messageFromOnePersonLimit });
        const humanMessages = messages.filter(msg => !msg.author.bot);

        const shouldBlockXP = message.author.bot || humanMessages.every(msg => msg.author.id === message.author.id) || (messages.last().author.id === message.author.id && (Date.now() - messages.last().createdTimestamp) < 800);
        if (shouldBlockXP) return;
        let additionalXP = 0;

        if(message.content.length < 10) additionalXP -= 0.5;
        if(message.content.length > 100) additionalXP += 0.5;
        if(message.content.length > 200) additionalXP += 0.5;
        if(message.attachments.size > 0) additionalXP += 0.5;

        this.add_xp(message.author, message.guild, xpPerMessage + additionalXP);
    },

    async add_xp(user, guild, xp) {
        const usersPath = path.join(__dirname, './users/' + guild.id + '.json');
        const folderPath = path.dirname(usersPath);

        if(user.bot) return;

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

        const userId = user.id;

        if (!users[userId]) {
            users[userId] = {
                xp: 0
            };
        }

        const xpRequiredForNextLevel = this.getTotalXPForLevel(this.get_level(users[userId].xp) + 1);

        users[userId].xp += xp;

        console.log(`Added ${xp} XP to user ${user.tag}. Total XP: ${users[userId].xp}`);

        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), async (err) => {
            if (err) {
                console.error(err);
                return;
            }
        });

        if(users[userId].xp >= xpRequiredForNextLevel){
            const level = this.get_level(users[userId].xp);
            console.log(`User ${user.tag} leveled up to level ${level}!`);

            const guildSettings = await settings.get_settings(guild.id);

            if(guildSettings.lvlup_channel){
                const channel = guild.channels.cache.get(guildSettings.lvlup_channel);
                if(channel){
                    const lvlupEmbed = new EmbedBuilder()
                        .setColor('Green')
                        .setTitle(`Użytkownik ${user.username} osiągnął nowy poziom!`)
                        .setThumbnail(user.displayAvatarURL())
                        .setDescription("Zdobył **" + level + "** poziom!")

                    channel.send({ embeds: [lvlupEmbed] });
                }
            }
        }
    },

    async set_xp(user, guild, xp) {
        const usersPath = path.join(__dirname, './users/' + guild.id + '.json');
        const folderPath = path.dirname(usersPath);

        if(user.bot) return;

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

        const userId = user.id;

        if (!users[userId]) {
            users[userId] = {
                xp: 0
            };
        }

        users[userId].xp = xp;

        console.log(`Set ${xp} XP to user ${user.tag}.`);

        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), async (err) => {
            if (err) {
                console.error(err);
                return;
            }
        });
    },

    async get_xp(user, guild) {
        const usersPath = path.join(__dirname, './users/' + guild.id + '.json');
        const folderPath = path.dirname(usersPath);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
            return 0;
        }

        let users = {};
        if (fs.existsSync(usersPath)) {
            const data = fs.readFileSync(usersPath, 'utf8');
            users = JSON.parse(data);
        }

        const userId = user.id;
        if (!users[userId]) {
            users[userId] = {
                xp: 0
            };
        }
        return users[userId].xp;
    },

    async get_level(user, guild) {
        const xp = await this.get_xp(user, guild);
        
        return this.get_level(xp);
    },

    get_level(xp) {
        if (xp <= 0) return 1;
        const level = Math.log((xp * (growthRate - 1)) / xpForSecondLevel + 1) / Math.log(growthRate);
        console.log(`Calculated level ${level} for XP ${xp}`);
        return Math.floor(level) + 1;
    },

    getTotalXPForLevel(level) {
        if (level <= 1) return xpForSecondLevel;
        const base = xpForSecondLevel;
        const r = growthRate;
        return Math.round(base * (Math.pow(r, level - 1) - 1) / (r - 1));
    }
}