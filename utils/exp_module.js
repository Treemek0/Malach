const { EmbedBuilder } = require('discord.js');
const settings = require('./settings.js');
const db = require('./db.js');

const xpPerMessage = 4; // exp per message
const xpForSecondLevel = 22;
const growthRate = 1.3636364;
const messageFromOnePersonLimit = 10;

module.exports = {
    async send_message(message) {
        console.log('Message received: ', message.content);

        const messages = await message.channel.messages.fetch({ limit: messageFromOnePersonLimit });
        const humanMessages = messages.filter(msg => !msg.author.bot);

        const shouldBlockXP = message.author.bot || humanMessages.every(msg => msg.author.id === message.author.id) ||
            (messages.last().author.id === message.author.id && (Date.now() - messages.last().createdTimestamp) < 800);
        if (shouldBlockXP) return;

        let additionalXP = 0;
        if (message.content.length < 10) additionalXP -= 0.5;
        if (message.content.length > 100) additionalXP += 0.5;
        if (message.content.length > 200) additionalXP += 0.5;
        if (message.attachments.size > 0) additionalXP += 0.5;

        await this.add_xp(message.author, message.guild, xpPerMessage + additionalXP);
    },

async add_xp(user, guild, xp) {
        if (user.bot) return;

        const col = await db.collection('xp');
        const filter = { guildId: guild.id };
        
        // Use $inc with Dot Notation: users.USER_ID
        const update = { $inc: { [`users.${user.id}`]: xp } };
        const opts = { upsert: true, returnDocument: 'after' };
        
        const result = await col.findOneAndUpdate(filter, update, opts);
        
        // Access the XP from the nested object
        const totalXP = result.users[user.id];

        console.log(`Added ${xp} XP to user ${user.tag}. Total XP: ${totalXP}`);

        const xpRequiredForNextLevel = this.getTotalXPForLevel(this.xpToLevel(totalXP) + 1);
        if (totalXP >= xpRequiredForNextLevel) {
            const level = this.xpToLevel(totalXP);
            console.log(`User ${user.tag} leveled up to level ${level}!`);
            
            const guildSettings = await settings.get_settings(guild.id);
            if (guildSettings.lvlup_channel) {
                const channel = guild.channels.cache.get(guildSettings.lvlup_channel);
                if (channel) {
                    const lvlupEmbed = new EmbedBuilder()
                        .setColor('Green')
                        .setTitle(`Użytkownik ${user.username} osiągnął nowy poziom!`)
                        .setThumbnail(user.displayAvatarURL())
                        .setDescription(`Zdobył **${level}** poziom!`);
                    channel.send({ embeds: [lvlupEmbed] });
                }
            }
        }
    },

    async set_xp(user, guild, xp) {
        if (user.bot) return;
        const col = await db.collection('xp');

        await col.updateOne(
            { guildId: guild.id }, 
            { $set: { [`users.${user.id}`]: xp } }, 
            { upsert: true }
        );
        console.log(`Set ${xp} XP to user ${user.tag}.`);
    },

    async get_xp(user, guild) {
        if (user.bot) return 0;
        const col = await db.collection('xp');
        const doc = await col.findOne({ guildId: guild.id });

        return doc?.users?.[user.id] || 0;
    },

    async get_level(user, guild) {
        const xp = await this.get_xp(user, guild);
        return this.xpToLevel(xp);
    },

    xpToLevel(xp) {
        if (xp <= 0) return 1;
        const level = Math.log((xp * (growthRate - 1)) / xpForSecondLevel + 1) / Math.log(growthRate);
        return Math.floor(level) + 1;
    },

    getTotalXPForLevel(level) {
        if (level <= 1) return xpForSecondLevel;
        const base = xpForSecondLevel;
        const r = growthRate;
        return Math.round(base * (Math.pow(r, level - 1) - 1) / (r - 1));
    }
};