const { EmbedBuilder } = require('discord.js');
const exp_module = require('../utils/exp_module');

const streakModule = require('../utils/streak');
const settingsModule = require('../utils/settings');

module.exports = {
    name: 'streak',
    description: 'Wyświetla streak użytkownika',

    options: [
        {
            name: 'user',
            description: 'Użytkownik',
            type: 6, // 6 = USER
            required: false,
        },
        {
            name: 'target',
            description: 'Drugi użytkownik',
            type: 6, // 6 = USER
            required: false,
        }
    ],

    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const target = interaction.options.getUser('target') || null;

        const guildSettings = await settingsModule.get_settings(interaction.guild.id);
        const streakEmoji = guildSettings.streak_emoji || '';

        if(target == null) {
            const guildStreak = await streakModule.getGuildStreak(user, interaction.guild);
            const topStreak = await streakModule.getTopStreaks(user, interaction.guild, 5);
            const warningEmbed = new EmbedBuilder()
                    .setColor('Yellow')
                    .setTitle(`${user.username} **${guildStreak} ${streakEmoji}**`)
                    .setDescription(`\nNajdłuższe streaki:\n${topStreak.map(s => `-# <@${s.id}>: **${s.currentStreak} ${streakEmoji}**`).join('\n')}`)
                    .setThumbnail(user.displayAvatarURL());

            interaction.reply({ embeds: [warningEmbed] });
        } else {
            const streak = await streakModule.getStreak(user, target, interaction.guild);

            const warningEmbed = new EmbedBuilder()
                    .setColor('Yellow')
                    .setTitle(`${user.username} <-> ${target.username}`)
                    .setDescription(`-# Streak między <@${user.id}> a <@${target.id}>: **${streak} ${streakEmoji}**`)
                    .setThumbnail(user.displayAvatarURL());

            interaction.reply({ embeds: [warningEmbed] });
        }
    }
};