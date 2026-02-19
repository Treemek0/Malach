const { EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/db');
const settings = require('../utils/settings');

module.exports = {
    name: 'warn',
    description: 'Daje ostrzeżenie użytkownikowi.',
    default_member_permissions: PermissionFlagsBits.ModerateMembers,
    options: [
        { name: 'user', description: 'Użytkownik, którego chcesz ostrzec', type: 6, required: true },
        { name: 'reason', description: 'Powód ostrzeżenia', type: 3, required: false }
    ],

    async execute(interaction) {
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.reply({ content: 'Nie masz uprawnień do użycia tej komendy.', flags: [MessageFlags.Ephemeral] });
        }

        const userId = interaction.options.getUser('user').id;
        let reason = interaction.options.getString('reason') || '';
        reason = reason.substring(0, 600);

        const col = await db.collection('warnings');
        const filter = { guildId: interaction.guild.id, userId };
        const update = { $push: { warnings: { reason, from: interaction.user.tag, date: Date.now() } } };
        await col.updateOne(filter, update, { upsert: true });

        const warningEmbed = new EmbedBuilder()
            .setColor('Yellow')
            .setTitle(`Użytkownik ${interaction.options.getUser('user').username} został ostrzeżony!`)
            .setThumbnail(interaction.options.getUser('user').displayAvatarURL())
            .setDescription('Powód: ' + reason);

        interaction.reply({ embeds: [warningEmbed] });

        const guildSettings = await settings.get_settings(interaction.guild.id);
        if (guildSettings.moderation_logs_channel) {
            const logChannel = interaction.guild.channels.cache.get(guildSettings.moderation_logs_channel);
            if (logChannel) logChannel.send({ embeds: [warningEmbed] });
        }
    },
};
