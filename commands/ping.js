const { MessageFlags } = require('discord.js');

const smash_pass = require('../utils/smash_pass.js');

module.exports = {
    name: 'ping',
    description: 'Sprawdź obecność bota!',

    async execute(interaction) {
        await interaction.reply({ content: '🏓 Pong!', flags: [MessageFlags.Ephemeral] });

       // smash_pass.generateImage(interaction.channel);
    },
};