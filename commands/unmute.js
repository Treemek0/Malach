const { EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../utils/db');
const settings = require('../utils/settings.js');

module.exports = {
    name: 'unmute',
    description: 'Odcisza użytkownika.',
    default_member_permissions: PermissionFlagsBits.ModerateMembers,
    options: [
        { name: 'user', description: 'Użytkownik, którego chcesz odciszyć', type: 6, required: true },
        { name: 'reason', description: 'Powód odciszenia', type: 3, required: false }
    ],

    async execute(interaction) {
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.reply({ content: 'Nie masz uprawnień do użycia tej komendy.', flags: [MessageFlags.Ephemeral] });
        }

        const guildSettings = await settings.get_settings(interaction.guild.id);
        if (!guildSettings || !guildSettings.mute_role) {
            return interaction.reply({ content: 'Nie ustawiono roli wyciszenia.', flags: [MessageFlags.Ephemeral] });
        }

        const userId = interaction.options.getUser('user').id;
        let reason = interaction.options.getString('reason') || '';
        reason = reason.substring(0, 600);

        const col = await db.collection('mutes');
        const doc = await col.findOne({ guildId: interaction.guild.id, userId });
        if (!doc) {
            return interaction.reply({ content: 'Użytkownik nie jest wyciszony.', flags: [MessageFlags.Ephemeral] });
        }

        await this.unmute(userId, interaction.guild);

        const muteEmbed = new EmbedBuilder()
            .setColor('#634700')
            .setTitle(`Użytkownik ${interaction.options.getUser('user').username} został odciszony!`)
            .setThumbnail(interaction.options.getUser('user').displayAvatarURL())
            .setDescription('Powód: ' + reason);

        interaction.reply({ embeds: [muteEmbed] });

        if (guildSettings.moderation_logs_channel) {
            const logChannel = interaction.guild.channels.cache.get(guildSettings.moderation_logs_channel);
            if (logChannel) logChannel.send({ embeds: [muteEmbed] });
        }
    },

    async unmute(userId, guild) {
        const col = await db.collection('mutes');
        const doc = await col.findOne({ guildId: guild.id, userId });
        if (!doc) return;
        const member = guild.members.cache.get(userId);
        if (!member) return;
        if (doc.roles) {
            try {
                await member.roles.set(doc.roles);
                console.log(`Przywrócono role dla ${member.user.tag}: ${doc.roles.join(', ')}`);
            } catch (error) {
                console.error('Błąd podczas przywracania ról:', error);
            }
        }
        await col.deleteOne({ guildId: guild.id, userId });
    }
};
