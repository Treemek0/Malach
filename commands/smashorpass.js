const { EmbedBuilder, MessageFlags } = require('discord.js');

const smash_pass = require('../utils/smash_pass.js');
const settings = require('../utils/settings.js');

module.exports = {
    name: 'smashorpass',
    description: 'Smash or pass',

    async execute(interaction) {
        const guildSettings = await settings.get_settings(interaction.guild.id);
        if (!guildSettings.smashOrPass_channel) {
            smash_pass.generateImage(interaction);
        } else {
            const smash_or_pass_channel = interaction.guild.channels.cache.get(guildSettings.smashOrPass_channel);

            if(interaction.channel == smash_or_pass_channel){
                smash_pass.generateImage(interaction);
            } else {
                interaction.reply({ content: "Smash or pass można jedynie aktywować w " + "<#" + smash_or_pass_channel.id + ">", flags: [MessageFlags.Ephemeral] });
            }
        }
    }
};