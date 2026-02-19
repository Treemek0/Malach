const { EmbedBuilder } = require('discord.js');
const exp_module = require('../utils/exp_module');

module.exports = {
    name: 'level',
    description: 'Wyświetla poziom użytkownika',

    options: [
        {
            name: 'user',
            description: 'Użytkownik',
            type: 6, // 6 = USER
            required: false,
        },
    ],

    async execute(interaction) {
            const user = interaction.options.getUser('user') || interaction.user;
            const xp = await exp_module.get_xp(user, interaction.guild);
            const level = exp_module.xpToLevel ? exp_module.xpToLevel(xp) : exp_module.get_level(user, interaction.guild); // backwards compatibility
            const xpToNextLevel = exp_module.getTotalXPForLevel(level + 1) - xp;

            const warningEmbed = new EmbedBuilder()
                    .setColor('Yellow')
                    .setTitle(`${user.username}`)
                    .setDescription(`-# Ogólne XP: **${Math.round(xp)}**\n\n-# Poziom: **${level}**\n-# XP do następnego poziomu: **${Math.round(xpToNextLevel)}**`)
                    .setThumbnail(user.displayAvatarURL());

            interaction.reply({ embeds: [warningEmbed] });
    },
};