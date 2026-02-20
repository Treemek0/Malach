const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, Client } = require('discord.js');
const fs = require('fs');
const path = require('path');
const friendship = require('../utils/friendship');

module.exports = {
    name: 'help',
    description: 'Wyświetla pomoc dla użytkownika.',

    async execute(interaction) {
        const allCommands = interaction.client.commands;

        // Initialize categories
        const categories = {
            basic: [],
            moderation: [],
            admin: []
        };

        allCommands.forEach(cmd => {
            const perms = cmd.default_member_permissions;
            const cmdString = `**/${cmd.name}**\n-# ↳ ${cmd.description}`;

            // 1. Check if user even has permission to see it
            if (perms && !interaction.member.permissions.has(perms)) return;
            if (!perms) return categories.basic.push(cmdString);

            if (perms === PermissionFlagsBits.Administrator || perms === PermissionFlagsBits.ManageGuild || perms === PermissionFlagsBits.ManageRoles || perms === PermissionFlagsBits.ManageChannels || perms === PermissionFlagsBits.ManageWebhooks) {
                categories.admin.push(cmdString);  
            } else if (perms === PermissionFlagsBits.ManageMessages || perms === PermissionFlagsBits.ModerateMembers || perms === PermissionFlagsBits.KickMembers || perms === PermissionFlagsBits.BanMembers || perms == PermissionFlagsBits.MuteMembers || perms == PermissionFlagsBits.DeafenMembers || perms == PermissionFlagsBits.MoveMembers || perms == PermissionFlagsBits.MoveMembers || perms == PermissionFlagsBits.ManageEmojisAndStickers) {
                categories.moderation.push(cmdString);
            } else {
                categories.basic.push(cmdString);
            }
        });

        let finalHelp = "";

        if (categories.basic.length) {
            finalHelp += `${categories.basic.join('\n\n')}\n\n`;
        }

        if (categories.moderation.length > 0) {
            finalHelp += `## > Moderacja:\n${categories.moderation.join('\n\n')}\n\n`;
        }

        if (categories.admin.length > 0) {
            finalHelp += `## > Administracja:\n${categories.admin.join('\n\n')}`;
        }

        const helpEmbed = new EmbedBuilder()
            .setColor('Blue')
            .setDescription("# > Pomoc - Lista Komend:\n" + finalHelp)

        interaction.reply({ embeds: [helpEmbed], flags: [MessageFlags.Ephemeral] });
    }
}