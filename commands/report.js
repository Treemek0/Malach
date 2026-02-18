const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const settings = require('../utils/settings.js');

module.exports = {
    name: 'report',
    description: 'Zgłoś użytkownika do administratorów serwera.',
    options: [
        {
            name: 'user',
            description: 'Użytkownik, którego chcesz zgłosić',
            type: 6, //
            required: true,
        },
        {
            name: 'reason',
            description: 'Powód zgłoszenia',
            type: 3, //
            required: true,
        }
    ],

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        let reason = interaction.options.getString('reason');
        reason = reason.substring(0, 2500);

        const guildSettings = await settings.get_settings(interaction.guild.id);

        if (!guildSettings || !guildSettings.report_channel) {
            return interaction.reply({ content: 'Nie ustawiono kanału zgłoszeń.', flags: [MessageFlags.Ephemeral] });
        }

        const reportChannel = interaction.guild.channels.cache.get(guildSettings.report_channel);
        if (!reportChannel) {
            return interaction.reply({ content: 'Kanał zgłoszeń nie istnieje.', flags: [MessageFlags.Ephemeral] });
        }

        const reportEmbed = {
            title: 'Nowe zgłoszenie',
            description: `### <@${user.id}> został zgłoszony przez <@${interaction.user.id}>`,
            fields: [
                { name: 'Kanał: ', value: `<#${interaction.channel.id}>`, inline: false },
                { name: 'Powód: ', value: reason, inline: false },
                { name: 'Data: ', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            ],
            color: 0xff0000
        };

        await reportChannel.send({ embeds: [reportEmbed] });

        interaction.reply({ content: `Zgłoszenie użytkownika ${user.tag} zostało przesłane do administratorów. \nPowód: ${reason}`, flags: [MessageFlags.Ephemeral] });
    },
};