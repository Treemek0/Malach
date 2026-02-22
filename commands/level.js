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

            const full = '█';
            const empty = '░';
            const progress = Math.round((xp / xpToNextLevel) * 20);
            const progressBar = "|" + full.repeat(progress) + empty.repeat(20 - progress) + "|";

            const warningEmbed = new EmbedBuilder()
                    .setColor('Yellow')
                    .setTitle(`${user.username}`)
                    .setDescription(`-# Poziom: **${level}**\n-# Ogólne XP: **${Math.round(xp)}**\n\n${progressBar}`)
                    .setFooter({ text: `XP do następnego poziomu: ${Math.round(xpToNextLevel)}`, iconURL: "https://raw.githubusercontent.com/Treemek0/Malach/main/imgs/XP_orb.gif"})
                    .setThumbnail(user.displayAvatarURL());

            interaction.reply({ embeds: [warningEmbed] });
    },
};