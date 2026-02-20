const { EmbedBuilder } = require('discord.js');
const exp_module = require('../utils/exp_module');
const db = require('../utils/db');

module.exports = {
    name: 'ranking',
    description: 'Wyświetla ranking użytkowników',
    options: [
        {
            name: 'page',
            description: 'Strona rankingu',
            type: 4, // 4 = INTEGER
            required: false,
        },
    ],

    async execute(interaction) {
        const sortedUsers = await exp_module.get_top_users(interaction.guild.id);
        const page = interaction.options.getInteger('page') || 1;
        const usersPerPage = 10;
        const totalPages = Math.ceil(sortedUsers.length / usersPerPage) || 1;
        if (page > totalPages || page < 1) {
            return interaction.reply({ content: `Strona nie istnieje. Maksymalna strona to ${totalPages}.`, ephemeral: true });
        }

        const start = (page - 1) * usersPerPage;
        const end = start + usersPerPage;

        const rankingList = sortedUsers.slice(start, end).map((userData, index) => {
        const level = exp_module.xpToLevel(userData.xp);
            return `**${start + index + 1}.** <@${userData.userId}> - Poziom: **${level}** (XP: **${Math.round(userData.xp)}**)`;
        }).join('\n');

        const rankingEmbed = new EmbedBuilder()
                .setColor('Gold')
                .setTitle(`Ranking użytkowników`)
                .setDescription(rankingList || 'Brak użytkowników w rankingu.')
                .setFooter({ text: `Strona: ${page}/${Math.ceil(sortedUsers.length / usersPerPage)}` });

        interaction.reply({ embeds: [rankingEmbed] });
    },
};