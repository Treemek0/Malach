const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');
const { MessageFlags } = require('discord.js');


module.exports = {
    name: 'warnings',
    description: 'Sprawdź ostrzeżenia użytkownika.',

    options: [
        {
            name: 'user',
            description: 'Użytkownik, któremu chcesz sprawdzić',
            type: 6, // 6 = USER
            required: false,
        },
        {
            name: 'page',
            description: 'Numer strony ostrzeżeń do wyświetlenia',
            type: 4, // 4 = INTEGER
            required: false,
        }
    ],

    async execute(interaction) {
        const warningsPath = path.join(__dirname, '../moderation/' + interaction.guild.id + '/warnings.json');
        const folderPath = path.dirname(warningsPath);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
            return interaction.reply({ content: 'Użytkownik nie posiada żadnych ostrzeżeń.', flags: [MessageFlags.Ephemeral] });
        }

        let warnings = {};

        // 2. Read the file (or start with {} if it's missing)
        if (fs.existsSync(warningsPath)) {
            const data = fs.readFileSync(warningsPath, 'utf8');
            warnings = JSON.parse(data);
        }

        const user = interaction.options.getUser('user') || interaction.user;
        const userId = user.id;

        if (!warnings[userId]) {
            return interaction.reply({ content: 'Użytkownik nie posiada żadnych ostrzeżeń.', flags: [MessageFlags.Ephemeral] });
        }else{
            const userWarnings = warnings[userId];
            const warningsPerPage = 5;

            const page = interaction.options.getInteger('page') || 1;
            if (page < 1) page = 1;
            if (page > Math.ceil(userWarnings.length / warningsPerPage)) page = Math.ceil(userWarnings.length / warningsPerPage);
            const start = (page - 1) * warningsPerPage;
            const end = start + warningsPerPage;

            const warningList = userWarnings.slice(start, end).map((warning, index) => `${start + index + 1}.** ${warning.reason} **\n-# ↪ <t:${Math.floor(warning.date / 1000)}:f>  •  Od: **${warning.from}**`).join('\n\n');

            const warningEmbed = new EmbedBuilder()
                .setColor('Yellow')
                .setTitle(`Ostrzeżenia: ${user.username}`)
                .setThumbnail(user.displayAvatarURL())
                .setDescription(warningList || "Brak ostrzeżeń.")
                .setFields(
                    { name: '', inline: false, value: '\u200B' },
                    { name: '\n\nStrona', value: `${page}/${Math.ceil(userWarnings.length / warningsPerPage)}`, inline: true },
                    { name: 'Łączna liczba ostrzeżeń', value: `${userWarnings.length}`, inline: true }
                )
                .setFooter({ text: `\nBy usunąć ostrzeżenia, użyj komendy \n\`/warn-remove\` lub \`/warn-clear\`` });

            interaction.reply({ embeds: [warningEmbed] });
        }
    },
};
