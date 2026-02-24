const { EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const translate = require('google-translate-api-x');

module.exports = {
    name: 'translate',
    description: 'Tlumacz/Translator',
    options: [
        {
            name: 'language',
            description: 'Language for translation',
            type: 3, // STRING
            required: true,
            choices: [
                { name: 'Polski', value: 'pl' },
                { name: 'English', value: 'en' },
                { name: 'Espanol', value: 'es' },
                { name: 'Deutsch', value: 'de' }
            ]
        },
        {
            name: 'text',
            description: 'Text for translation',
            type: 3, // 3 = STRING
            required: true,
        }
    ],

    async execute(interaction) {
        const language = interaction.options.getString('language');
        const text = interaction.options.getString('text');

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            const res = await translate(text, { to: language });
            await interaction.editReply({ content: res.text });

        } catch (error) {
            console.error(error);
            await interaction.editReply('Wystąpił błąd podczas tłumaczenia. Spróbuj ponownie.');
        }
    }
}
