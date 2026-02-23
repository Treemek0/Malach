const { EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');

const settings = require('../utils/settings.js');

module.exports = {
    name: 'clear',
    description: 'Czyści wiadomości z kanału. (nie starsze niż 14 dni)',
    default_member_permissions: PermissionFlagsBits.ManageMessages,
    options: [
        {
            name: 'limit',
            description: 'Liczba wiadomości do wyczyszczenia (max 100)',
            type: 4, // 4 = INTEGER
            required: true,
        },
        {
            name: 'user',
            description: 'Użytkownik, któremu chcesz wyczyścić wiadomości',
            type: 6, // 6 = USER
            required: false,
        }
    ],

    async execute(interaction) {
        if (!interaction.member.permissions.has('ManageMessages')) {
            return interaction.reply({ content: 'Nie masz uprawnień do użycia tej komendy.', flags: [MessageFlags.Ephemeral] });
        }

        if (!interaction.appPermissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: 'Błąd: Nie mam uprawnień `Zarządzanie Wiadomościami` (Manage Messages), aby wyczyścić wiadomości.' });
        }

        const limit = interaction.options.getInteger('limit');
        const user = interaction.options.getUser('user') || null;
        const channel = interaction.channel;

        if (limit < 1 || limit > 100) {
            return interaction.reply({ content: 'Liczba wiadomości do wyczyszczenia musi być między 1 a 100.', flags: [MessageFlags.Ephemeral] });
        }

        try {
            const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

            const messages = await channel.messages.fetch({ limit: limit });
            const messagesToDelete = messages.filter(m => {
                const isRecent = m.createdTimestamp > fourteenDaysAgo;
                const isUserMatch = user ? m.author.id === user.id : true;
                return isRecent && isUserMatch;
            }).first(limit);

            await channel.bulkDelete(messagesToDelete, true);

            const response = user
                ? `Wyczyszczono ${messagesToDelete.length} wiadomości od <@${user.id}>.`
                : `Wyczyszczono ${messagesToDelete.length} wiadomości.`;

            interaction.reply({ content: response, flags: [MessageFlags.Ephemeral] });
        } catch (error) {
            console.error('Błąd podczas czyszczenia wiadomości:', error);
            interaction.reply({ content: 'Wystąpił błąd podczas czyszczenia wiadomości.\n' + error.message, flags: [MessageFlags.Ephemeral] });
        }
    }
};