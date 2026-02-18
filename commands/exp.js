const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');

const settings = require('../utils/settings.js');
const exp_module = require('../utils/exp/exp_module');


module.exports = {
    name: 'exp',
    description: 'Zmienia ilość doświadczenia użytkownika.',
    default_member_permissions: PermissionFlagsBits.Administrator,
    options: [
        {
            name: 'set',
            description: 'Ustaw ilość doświadczenia',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'Użytkownik, któremu chcesz ustawić doświadczenie',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
                {
                    name: 'amount',
                    description: 'Ilość doświadczenia, którą chcesz ustawić',
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                }
            ]
        },
        {
            name: 'reset',
            description: 'Resetuj doświadczenie użytkownika',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'Użytkownik, któremu chcesz zresetować doświadczenie',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                }
            ]
        },
    ],

    async execute(interaction) {
        if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: "Tylko właściciel serwera może użyć tej komendy.", flags: [MessageFlags.Ephemeral] });
        
        if (interaction.options.getSubcommand() === 'set') {
            const user = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            exp_module.set_xp(user, interaction.guild, amount);
            return interaction.reply({ content: `Ustawiono ${amount} doświadczenia dla użytkownika ${user.tag}`, flags: [MessageFlags.Ephemeral] });
        }
        
        if (interaction.options.getSubcommand() === 'reset') {
            const user = interaction.options.getUser('user');
            exp_module.set_xp(user, interaction.guild, 0);
            return interaction.reply({ content: `Zresetowano doświadczenie dla użytkownika ${user.tag}`, flags: [MessageFlags.Ephemeral] });
        }
    },
}