const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder, MessageFlags } = require('discord.js');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'warn',
    description: 'Daje ostrzeżenie użytkownikowi.',
    default_member_permissions: PermissionFlagsBits.ModerateMembers,
    options: [
        {
            name: 'user',
            description: 'Użytkownik, którego chcesz ostrzec',
            type: 6, // 6 = USER
            required: true,
        },
        {
            name: 'reason',
            description: 'Powód ostrzeżenia',
            type: 3, // 3 = STRING
            required: false,
        }
    ],

    async execute(interaction) {
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.reply({ content: 'Nie masz uprawnień do użycia tej komendy.', flags: [MessageFlags.Ephemeral] });
        }

        const warningsPath = path.join(__dirname, '../moderation/' + interaction.guild.id + '/warnings.json');
        const folderPath = path.dirname(warningsPath);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }

        let warnings = {};

        // 2. Read the file (or start with {} if it's missing)
        if (fs.existsSync(warningsPath)) {
            const data = fs.readFileSync(warningsPath, 'utf8');
            warnings = JSON.parse(data);
        }

        const userId = interaction.options.getUser('user').id;
        let reason = interaction.options.getString('reason') || '';
        reason = reason.substring(0, 600);

        if (!warnings[userId]) {
            warnings[userId] = [];
        }

        warnings[userId].push({
            reason: reason,
            from: interaction.user.tag,
            date: Date.now()
        });

        fs.writeFile(warningsPath, JSON.stringify(warnings, null, 2), (err) => {
            if (err) {
                console.error(err);
                interaction.reply({ content: 'Wystąpił błąd podczas zapisywania ostrzeżeń.', flags: [MessageFlags.Ephemeral] });
                return;
            }

            const warningEmbed = new EmbedBuilder()
                .setColor('Yellow')
                .setTitle(`Użytkownik ${interaction.options.getUser('user').username} został ostrzeżony!`)
                .setThumbnail(interaction.options.getUser('user').displayAvatarURL())
                .setDescription("Powód: " + reason);

            interaction.reply({ embeds: [warningEmbed] });
        });
},
};
