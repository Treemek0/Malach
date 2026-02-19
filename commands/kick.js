const { EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');

const settings = require('../utils/settings.js');

module.exports = {
    name: 'kick',
    description: 'Wyrzuca użytkownika z serwera.',
    default_member_permissions: PermissionFlagsBits.KickMembers,
    options: [
        {
            name: 'user',
            description: 'Użytkownik, którego chcesz wyrzucić',
            type: 6, // 6 = USER
            required: true,
        },
        {
            name: 'reason',
            description: 'Powód wyrzucenia',
            type: 3, // 3 = STRING
            required: false,
        }
    ],

    async execute(interaction) {
        if (!interaction.member.permissions.has('KickMembers')) {
            return interaction.reply({ content: 'Nie masz uprawnień do użycia tej komendy.', flags: [MessageFlags.Ephemeral] });
        }

        if (!interaction.appPermissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ content: 'Błąd: Nie mam uprawnień `Wyrzucanie Użytkowników` (Kick Members), aby wyrzucić użytkownika.' });
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
        .filter(role => role.permissions.has(PermissionFlagsBits.KickMembers))
        .sort((a, b) => b.position - a.position)
        .first();

        const targetMember = interaction.options.getMember('user');
        const targetModeratorRole = targetMember.roles.cache
            .filter(role => role.permissions.has(PermissionFlagsBits.KickMembers))
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

        const kickEmbed = new EmbedBuilder()
            .setColor('#634700')
            .setTitle(`Użytkownik ${interaction.options.getUser('user').username} został wyrzucony!`)
            .setThumbnail(interaction.options.getUser('user').displayAvatarURL())
            .setDescription("Powód: " + reason);

        interaction.reply({ embeds: [kickEmbed] });

        await interaction.guild.members.kick(userId, reason);

        if (!guildSettings.moderation_logs_channel) return;
        const logChannel = interaction.guild.channels.cache.get(guildSettings.moderation_logs_channel);
        if (logChannel) logChannel.send({ embeds: [kickEmbed] });
    },
};
