const { MessageFlags } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Sprawdź obecność bota!',

    async execute(interaction) {
        await interaction.reply({ content: '🏓 Pong!', flags: [MessageFlags.Ephemeral] });
    },
};