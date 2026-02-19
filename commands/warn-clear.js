const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'warn-clear',
    description: 'Wyczyść ostrzeżenia użytkownika.',
    default_member_permissions: PermissionFlagsBits.ManageGuild,
    options: [
        { name: 'user', description: 'Użytkownik, któremu chcesz usunąć ostrzeżenia', type: 6, required: true },
        { name: 'limit', description: 'Limit ostrzeżeń, które chcesz usunąć', type: 4, required: false }
    ],

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ content: 'Nie masz uprawnień do użycia tej komendy. Potrzebna "Zarządzanie serwerem"', flags: [MessageFlags.Ephemeral] });
        }

        const userId = interaction.options.getUser('user').id;
        const limit = interaction.options.getInteger('limit');

        const col = await db.collection('warnings');
        const doc = await col.findOne({ guildId: interaction.guild.id, userId });
        if (!doc || !doc.warnings || doc.warnings.length === 0) {
            return interaction.reply({ content: 'Użytkownik nie posiada żadnych ostrzeżeń.'});
        }

        const take = (limit && limit > 0) ? Math.min(limit, doc.warnings.length) : doc.warnings.length;
        const deleted = doc.warnings.splice(0, take);

        if (doc.warnings.length === 0) {
            await col.deleteOne({ guildId: interaction.guild.id, userId });
        } else {
            await col.updateOne({ guildId: interaction.guild.id, userId }, { $set: { warnings: doc.warnings } });
        }

        let warningMessage = "Usunięto następujące ostrzeżenia:\n";
        for (const w of deleted) {
            if (warningMessage.length > 3800) {
                warningMessage += "\n\n`...`";
                break;
            }
            warningMessage += `\`${w.reason}\`\n`;
        }

        interaction.reply({ content: warningMessage, flags: [MessageFlags.Ephemeral] });
    },
};
