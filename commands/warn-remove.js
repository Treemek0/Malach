const fs = require('node:fs');
const path = require('node:path');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    name: 'warn-remove',
    description: 'Usuń ostrzeżenie użytkownika.',
    default_member_permissions: PermissionFlagsBits.ManageGuild,
    options: [
        {
            name: 'user',
            description: 'Użytkownik, któremu chcesz usunąć ostrzeżenie',
            type: 6, // 6 = USER
            required: true,
        },
        {
            name: 'number',
            description: 'Jaki numer ostrzeżenia chcesz usunąć',
            type: 4, // 4 = INTEGER
            required: true,
        }
    ],

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ content: 'Nie masz uprawnień do użycia tej komendy. Potrzebna \"Zarządzanie serwerem\"', flags: [MessageFlags.Ephemeral] });
        }

        const warningsPath = path.join(__dirname, '../moderation/' + interaction.guild.id + '/warnings.json');
        const folderPath = path.dirname(warningsPath);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
            return interaction.reply({ content: 'Użytkownik nie posiada żadnych ostrzeżeń.'});
        }

        let warnings = {};

        // 2. Read the file (or start with {} if it's missing)
        if (fs.existsSync(warningsPath)) {
            const data = fs.readFileSync(warningsPath, 'utf8');
            warnings = JSON.parse(data);
        }

        const userId = interaction.options.getUser('user').id;

        if (!warnings[userId]) {
            return interaction.reply({ content: 'Użytkownik nie posiada żadnych ostrzeżeń.'});
        }else{
            if(warnings[userId].length < interaction.options.getInteger('number') || interaction.options.getInteger('number') <= 0) return interaction.reply({ content: 'Użytkownik nie posiada takiego ostrzeżenia.', ephemeral: true });
           
            const deletedWarning = warnings[userId][interaction.options.getInteger('number') - 1];
            const warning = warnings[userId].splice(interaction.options.getInteger('number') - 1, 1);
            fs.writeFile(warningsPath, JSON.stringify(warnings, null, 2), (err) => {
                if (err) {
                    console.error(err);
                    interaction.reply({ content: 'Wystąpił błąd podczas zapisywania ostrzeżeń.', flags: [MessageFlags.Ephemeral] });
                    return;
                }
                interaction.reply({ content: `Ostrzeżenie \`${deletedWarning.reason}\` zostało usunięte.` });
            });
        }
    },
};
