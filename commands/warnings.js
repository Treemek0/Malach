const { EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'warnings',
    description: 'Sprawdź ostrzeżenia użytkownika.',

    options: [
        { name: 'user', description: 'Użytkownik, któremu chcesz sprawdzić', type: 6, required: false },
        { name: 'page', description: 'Numer strony ostrzeżeń do wyświetlenia', type: 4, required: false }
    ],

    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const userId = user.id;

        const col = await db.collection('warnings');
        const doc = await col.findOne({ guildId: interaction.guild.id, userId });
        if (!doc || !doc.warnings || doc.warnings.length === 0) {
            return interaction.reply({ content: 'Użytkownik nie posiada żadnych ostrzeżeń.', flags: [MessageFlags.Ephemeral] });
        }

        const userWarnings = doc.warnings;
        const warningsPerPage = 5;
        let page = interaction.options.getInteger('page') || 1;
        page = Math.max(1, Math.min(page, Math.ceil(userWarnings.length / warningsPerPage)));
        const start = (page - 1) * warningsPerPage;
        const end = start + warningsPerPage;

        const warningList = userWarnings.slice(start, end)
            .map((warning, index) => `${start + index + 1}.** ${warning.reason} **\n-# ↪ <t:${Math.floor(warning.date / 1000)}:f>  •  Od: **${warning.from}**`)
            .join('\n\n');

        const warningEmbed = new EmbedBuilder()
            .setColor('Yellow')
            .setTitle(`Ostrzeżenia: ${user.username}`)
            .setThumbnail(user.displayAvatarURL())
            .setDescription(warningList || 'Brak ostrzeżeń.')
            .setFields(
                { name: '', inline: false, value: '\u200B' },
                { name: '\n\nStrona', value: `${page}/${Math.ceil(userWarnings.length / warningsPerPage)}`, inline: true },
                { name: 'Łączna liczba ostrzeżeń', value: `${userWarnings.length}`, inline: true }
            )
            .setFooter({ text: `\nBy usunąć ostrzeżenia, użyj komendy \n\`/warn-remove\` lub \`/warn-clear\`` });

        interaction.reply({ embeds: [warningEmbed] });
    },
};
