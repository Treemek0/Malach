const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');
const exp_module = require('../utils/exp/exp_module');

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
    
            const user = interaction.options.getUser('user') || interaction.user;
            const userId = user.id;

            let xp = 0;

            if (users[userId]) {
                xp = users[userId].xp;
            }

            const level = exp_module.get_level(xp);
            const xpToNextLevel = exp_module.getTotalXPForLevel(level + 1) - xp;

            const warningEmbed = new EmbedBuilder()
                    .setColor('Yellow')
                    .setTitle(`${user.username}`)
                    .setDescription(`-# Ogólne XP: **${xp}**\n\n-# Poziom: **${level}**\n-# XP do następnego poziomu: **${xpToNextLevel}**`)
                    .setThumbnail(user.displayAvatarURL());

            interaction.reply({ embeds: [warningEmbed] });
    },
};