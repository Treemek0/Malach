const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const friendship = require('../utils/friendship');

module.exports = {
    name: 'friendship',
    description: 'Sprawdza poziom przyjaźni między dwoma użytkownikami.',
    options: [
        {
            name: 'target',
            description: 'Drugi użytkownik',
            type: 6, // 6 = USER
            required: false,
        },
        {
            name: 'author',
            description: 'Użytkownik, który sprawdza przyjaźń',
            type: 6, // 6 = USER
            required: false,
        },
    ],

    async execute(interaction) {
        const target = interaction.options.getUser('target') || null;
        const author = interaction.options.getUser('author') || interaction.user;

        if(target == null || (target.id == interaction.user.id && author.id == interaction.user.id)) {
            const topFriendships = await friendship.getTopFriendships(author, interaction.guild);

            if (topFriendships.length === 0) {
                return interaction.reply({ content: 'Nie masz jeszcze żadnych przyjaciół.', flags: [MessageFlags.Ephemeral] });
            }

            const list = topFriendships.map((f, index) => {
                const totalMinutes = Math.round(f.friendData[1] * 2);
                
                let timeFormatted = `${totalMinutes}min`;
                if (totalMinutes >= 60) {
                    const hours = Math.floor(totalMinutes / 60);
                    const mins = totalMinutes % 60;
                    timeFormatted = `${hours}h ${mins}min`;
                    
                    if (hours >= 24) {
                        const days = Math.floor(hours / 24);
                        const remainingHours = hours % 24;
                        timeFormatted = `${days}d ${remainingHours}h ${mins}min`;
                    }
                }

                return `${index + 1}. <@${f.id}> - **${f.percentage}% bliskości**\n` +
                    `-# Wiadomości: **${f.friendData[0]}**\n` +
                    `-# Rozmowy głosowe: **${timeFormatted}**`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('Yellow')
                .setDescription(`### Najlepsze więzi <@${author.id}>: \n${list}\n`)
                .setFooter({ text: '\nTo Twoja perspektywa relacji. Odczucia drugiej osoby mogą być inne.' });

            interaction.reply({ embeds: [embed] });
        }else{
            const friendshipData = await friendship.getScore(author, target, interaction.guild);
            
            const friendshipScore = await friendship.getFriendshipScore(author, friendshipData, target, interaction.guild);

            const full = '█';
            const empty = '░';
            const progress = Math.round((friendshipScore / 100) * 20);
            const progressBar = "|" + full.repeat(progress) + empty.repeat(20 - progress) + "|";

            const totalMinutes = Math.round(friendshipData[1] * 2);
            let timeFormatted = `${totalMinutes}min`;
            if (totalMinutes >= 60) {
                const hours = Math.floor(totalMinutes / 60);
                const mins = totalMinutes % 60;
                timeFormatted = `${hours}h ${mins}min`;
                
                if (hours >= 24) {
                    const days = Math.floor(hours / 24);
                    const remainingHours = hours % 24;
                    timeFormatted = `${days}d ${remainingHours}h ${mins}min`;
                }
            }

            const warningEmbed = new EmbedBuilder()
                .setColor('Yellow')
                .setDescription(`Analiza więzi **<@${author.id}>** w stosunku do **<@${target.id}>**\n\n-# Poziom znajomości: **${friendshipScore}%**\n${progressBar}\n\n-# Wiadomości: **${friendshipData[0]}**\n-# Rozmowy głosowe: **${timeFormatted}**`);

            interaction.reply({ embeds: [warningEmbed] });
        }
    },
};