const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');
const exp_module = require('../utils/exp/exp_module');

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
            const usersPath = path.join(__dirname, '../utils/exp/users/' + interaction.guild.id + '.json');
            const folderPath = path.dirname(usersPath);
    
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath);
            }
    
            let users = {};
    
            if (fs.existsSync(usersPath)) {
                const data = fs.readFileSync(usersPath, 'utf8');
                users = JSON.parse(data);
            }
    
            const page = interaction.options.getInteger('page') || 1;
            const usersPerPage = 10;
            const sortedUsers = Object.entries(users).sort((a, b) => b[1].xp - a[1].xp);
            const start = (page - 1) * usersPerPage;
            const end = start + usersPerPage;

            const rankingList = sortedUsers.slice(start, end).map(([userId, userData], index) => {
                const level = exp_module.get_level(userData.xp);
                return `**${start + index + 1}.** <@${userId}> - Poziom: **${level}** (XP: **${userData.xp}**)`;
            }).join('\n');

            const rankingEmbed = new EmbedBuilder()
                    .setColor('Gold')
                    .setTitle(`Ranking użytkowników`)
                    .setDescription(rankingList || 'Brak użytkowników w rankingu.')
                    .setFooter({ text: `Strona: ${page}/${Math.ceil(sortedUsers.length / usersPerPage)}` });

            interaction.reply({ embeds: [rankingEmbed] });
    },
};