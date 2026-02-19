const { EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');

const settings = require('../utils/settings.js');

module.exports = {
    name: 'ban',
    description: 'Banuje użytkownika z serwera.',
    default_member_permissions: PermissionFlagsBits.BanMembers,
    options: [
        {
            name: 'user',
            description: 'Użytkownik, którego chcesz zbanować',
            type: 6, // 6 = USER
            required: true,
        },
        {
            name: 'reason',
            description: 'Powód bana',
            type: 3, // 3 = STRING
            required: false,
        }
    ],

    async execute(interaction) {
        if (!interaction.member.permissions.has('BanMembers')) {
            return interaction.reply({ content: 'Nie masz uprawnień do użycia tej komendy.', flags: [MessageFlags.Ephemeral] });
        }

        if (!interaction.appPermissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ content: 'Błąd: Nie mam uprawnień `Banowanie Użytkowników` (Ban Members), aby zbanować użytkownika.' });
        }

        
        const user = interaction.options.getUser('user');
        const userId = user.id;
        let reason = interaction.options.getString('reason') || '';
        reason = reason.substring(0, 600);

        const guildSettings = await settings.get_settings(interaction.guild.id);
        
        const botMember = interaction.guild.members.me;
        if (user.roles.highest.position >= botMember.roles.highest.position) {
            return interaction.reply({ 
                content: 'Błąd: Użytkownik ma rolę wyższą niż moja najwyższa rola. Przesuń moją rolę wyżej w ustawieniach serwera.', 
                flags: [MessageFlags.Ephemeral]
            });
        }

        const authorModeratorRole = interaction.member.roles.cache
        .filter(role => role.permissions.has(PermissionFlagsBits.BanMembers))
        .sort((a, b) => b.position - a.position)
        .first();

        const targetMember = interaction.options.getMember('user');
        const targetModeratorRole = targetMember.roles.cache
            .filter(role => role.permissions.has(PermissionFlagsBits.BanMembers))
            .sort((a, b) => b.position - a.position)
            .first();

        if (targetModeratorRole) {
            if (targetModeratorRole.position >= authorModeratorRole?.position) {
                return interaction.reply({ 
                    content: 'Nie możesz użyć tej komendy na osobie, która ma taką samą lub wyższą rolę moderatorską!', 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
        }

        const banEmbed = new EmbedBuilder()
            .setColor('#634700')
            .setTitle(`Użytkownik ${interaction.options.getUser('user').username} został zbanowany!`)
            .setThumbnail(interaction.options.getUser('user').displayAvatarURL())
            .setDescription("Powód: " + reason);

        interaction.reply({ embeds: [banEmbed] });

        await interaction.guild.members.ban(userId, { reason: reason });

        if (!guildSettings.moderation_logs_channel) return;
        const logChannel = interaction.guild.channels.cache.get(guildSettings.moderation_logs_channel);
        if (logChannel) logChannel.send({ embeds: [banEmbed] });
    },
};
