const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'warn-remove',
    description: 'Usuń ostrzeżenie użytkownika.',
    default_member_permissions: PermissionFlagsBits.ManageGuild,
    options: [
        { name: 'user', description: 'Użytkownik, któremu chcesz usunąć ostrzeżenie', type: 6, required: true },
        { name: 'number', description: 'Jaki numer ostrzeżenia chcesz usunąć', type: 4, required: true }
    ],

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ content: 'Nie masz uprawnień do użycia tej komendy. Potrzebna "Zarządzanie serwerem"', flags: [MessageFlags.Ephemeral] });
        }

        const userId = interaction.options.getUser('user').id;
        const number = interaction.options.getInteger('number');

        const col = await db.collection('warnings');
        const doc = await col.findOne({ guildId: interaction.guild.id, userId });
        if (!doc || !doc.warnings || doc.warnings.length === 0) {
            return interaction.reply({ content: 'Użytkownik nie posiada żadnych ostrzeżeń.'});
        }

        if (number <= 0 || number > doc.warnings.length) {
            return interaction.reply({ content: 'Użytkownik nie posiada takiego ostrzeżenia.', flags: [MessageFlags.Ephemeral] });
        }

        const deleted = doc.warnings.splice(number - 1, 1)[0];
        if (doc.warnings.length === 0) {
            await col.deleteOne({ guildId: interaction.guild.id, userId });
        } else {
            await col.updateOne({ guildId: interaction.guild.id, userId }, { $set: { warnings: doc.warnings } });
        }

        interaction.reply({ content: `Ostrzeżenie \`${deleted.reason}\` zostało usunięte.` });
    },
};
