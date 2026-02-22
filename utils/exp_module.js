const { EmbedBuilder } = require('discord.js');
const settings = require('./settings.js');
const db = require('./db.js');

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

        const guildSettings = await settings.get_settings(message.guild.id);

        const xpPerMessage = guildSettings.xp_per_message || 4;
        await this.add_xp(message.author, message.guild, xpPerMessage + additionalXP, guildSettings);
    },

    async add_xp(user, guild, xp, guildSettings) {
        if (user.bot) return;

        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        if (guildSettings && guildSettings.xp_blacklist) {
            if (member.roles.cache.some(role => guildSettings.xp_blacklist.includes(role.id))) {
                return; // Do not add XP if user is in the blacklist
            }

            if(guildSettings.xp_whitelist.length > 0 && !member.roles.cache.some(role => guildSettings.xp_whitelist.includes(role.id))) {
                return; // Do not add XP if user is not in the whitelist
            }
        }

        const col = await db.collection('xp');
        const filter = { guildId: guild.id };
        
        // Use $inc with Dot Notation: users.USER_ID
        const update = { $inc: { [`users.${user.id}`]: xp } };
        const opts = { upsert: true, returnDocument: 'after' };
        
        const result = await col.findOneAndUpdate(filter, update, opts);
        
        const doc = result.value || result;

        // Access the XP from the nested object
        const totalXP = doc.users[user.id];

        console.log(`Added ${xp} XP to user ${user.tag}. Total XP: ${totalXP}`);

        const levelBeforeAdding = this.xpToLevel(totalXP - xp);
        const level = this.xpToLevel(totalXP);
        if (level > levelBeforeAdding) {
            console.log(`User ${user.tag} leveled up to level ${level}!`);
            
            const assignedRoles = this.set_roles_for_level(guild, guildSettings, member, level);

            if (guildSettings.lvlup_channel) {
                const channel = guild.channels.cache.get(guildSettings.lvlup_channel);
                if (channel) {
                    if(assignedRoles.length > 0) {
                        const assignedRoleNames = assignedRoles.map(role => role.name).join(', ');
                        var description = `Zdobył **${level}** poziom!\n-# Przydzielone role: ${assignedRoleNames}`;
                    } else {
                        var description = `Zdobył **${level}** poziom!`;
                    }

                    const lvlupEmbed = new EmbedBuilder()
                        .setColor('Green')
                        .setTitle(`Użytkownik ${user.username} osiągnął nowy poziom!`)
                        .setThumbnail(user.displayAvatarURL())
                        .setDescription(description);
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
        const guildSettings = await settings.get_settings(guild.id);

        const level = this.xpToLevel(xp);

        this.set_roles_for_level(guild, guildSettings, user, level);
    },

    async set_roles_for_level(guild, guildSettings, member, level){
        const assignedRoles = [];
        
        if(guildSettings){
            if(guildSettings.level_reward_roles) {
                const rewardRoles = guildSettings.level_reward_roles.filter(r => r.level <= level).sort((a, b) => b.level - a.level);

                if (rewardRoles.length > 0){
                    const lastRoleLevel = rewardRoles[0].level;
                    for (let i = 0; i < rewardRoles.length; i++) {
                        const reward = rewardRoles[i];
                        const role = guild.roles.cache.get(reward.role_id);

                        if (reward.level < lastRoleLevel) { // jest mniejszym levelem nie najwyzszym mozliwym
                            if (role) {
                                await member.roles.remove(role);
                            }
                        }else{
                            if (role) {
                                if(!member.roles.cache.has(role.id)){ // nie ma roli
                                    await member.roles.add(role);
                                    assignedRoles.push(role);
                                    console.log(`Assigned role ${role.name} to user ${user.tag} for reaching level ${level}.`);
                                }
                            }
                        }
                    }
                }
            }
        }

        return assignedRoles;
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
    },

    async get_top_users(guildId) {
        const col = await db.collection('xp');
        const doc = await col.findOne({ guildId: guildId });

        if (!doc || !doc.users) return [];
        const userArray = Object.entries(doc.users).map(([userId, xp]) => ({
            userId,
            xp
        }));

        return userArray.sort((a, b) => b.xp - a.xp);
    }
};