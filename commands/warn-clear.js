const fs = require('node:fs');
const path = require('node:path');
const { PermissionFlagsBits, MessageFlags} = require('discord.js');

module.exports = {
    name: 'warn-clear',
    description: 'Wyczyść ostrzeżenia użytkownika.',
    default_member_permissions: PermissionFlagsBits.ManageGuild,
    options: [
        {
            name: 'user',
            description: 'Użytkownik, któremu chcesz usunąć ostrzeżenia',
            type: 6, // 6 = USER
            required: true,
        },
        {
            name: 'limit',
            description: 'Limit ostrzeżeń, które chcesz usunąć',
            type: 4, // 4 = INTEGER
            required: false,
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
            return interaction.reply({ content: 'Użytkownik nie posiada żadnych ostrzeżeń.' });
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
            const limit = interaction.options.getInteger('limit') || warnings[userId].length;

            if(limit <= 0) return interaction.reply({ content: 'Podałeś zły limit ostrzeżeń.', flags: [MessageFlags.Ephemeral] });
           
            const deletedWarnings = warnings[userId].splice(0, limit);
            fs.writeFile(warningsPath, JSON.stringify(warnings, null, 2), (err) => {
                if (err) {
                    console.error(err);
                    interaction.reply({ content: 'Wystąpił błąd podczas zapisywania ostrzeżeń.', flags: [MessageFlags.Ephemeral] });
                    return;
                }

                let warningMessage = "Usunięto następujące ostrzeżenia:\n";
                for(let i = 0; i < deletedWarnings.length; i++){
                    if(warningMessage.length > 3800) {
                        warningMessage += "\n\n\`...\`";
                        break;
                    }
                    const deletedWarning = deletedWarnings[i];
                    warningMessage += `\`${deletedWarning.reason}\`\n`;
                }

                interaction.reply({ content: warningMessage, flags: [MessageFlags.Ephemeral] });
            });
        }
    },
};
