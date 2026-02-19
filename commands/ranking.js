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
            const col = await db.collection('xp');
            const docs = await col.find({ guildId: interaction.guild.id }).toArray();
            const page = interaction.options.getInteger('page') || 1;
            const usersPerPage = 10;
            const sortedUsers = docs.sort((a, b) => (b.xp || 0) - (a.xp || 0));
            const start = (page - 1) * usersPerPage;
            const end = start + usersPerPage;

            const rankingList = sortedUsers.slice(start, end).map((doc, index) => {
                const level = exp_module.xpToLevel ? exp_module.xpToLevel(doc.xp || 0) : exp_module.get_level({id: doc.userId}, interaction.guild);
                return `**${start + index + 1}.** <@${doc.userId}> - Poziom: **${level}** (XP: **${Math.round(doc.xp || 0)}**)`;
            }).join('\n');

            const rankingEmbed = new EmbedBuilder()
                    .setColor('Gold')
                    .setTitle(`Ranking użytkowników`)
                    .setDescription(rankingList || 'Brak użytkowników w rankingu.')
                    .setFooter({ text: `Strona: ${page}/${Math.ceil(sortedUsers.length / usersPerPage)}` });

            interaction.reply({ embeds: [rankingEmbed] });
    },
};