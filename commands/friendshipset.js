const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');

const settings = require('../utils/settings.js');
const friendshipModule = require('../utils/friendship.js');


module.exports = {
    name: 'friendshipset',
    description: 'Zmienia ilość punktów przyjaźni użytkownika.',
    default_member_permissions: PermissionFlagsBits.Administrator,
    options: [
        {
            name: 'set',
            description: 'Ustaw ilość punktów przyjaźni',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'Użytkownik, któremu chcesz ustawić punkty przyjaźni',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
                {
                    name: 'friend',
                    description: 'Przyjaciel użytkownika, któremu chcesz ustawić punkty przyjaźni',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
                {
                    name: 'message',
                    description: 'Ilość punktów przyjaźni wiadomości, którą chcesz ustawić',
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                },
                {
                    name: 'voice',
                    description: 'Ilość punktów przyjaźni rozmowy głosowej, którą chcesz ustawić',
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                }
            ]
        },
        {
            name: 'reset',
            description: 'Resetuj punkty przyjaźni użytkownika',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'Użytkownik, któremu chcesz zresetować punkty przyjaźni',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
                {
                    name: 'friend',
                    description: 'Przyjaciel użytkownika, któremu chcesz ustawić punkty przyjaźni',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
            ]
        },
    ],

    async execute(interaction) {
        if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: "Tylko właściciel serwera może użyć tej komendy.", flags: [MessageFlags.Ephemeral] });
        
        if (interaction.options.getSubcommand() === 'set') {
            const user = interaction.options.getUser('user');
            const friend = interaction.options.getUser('friend');
            const messageAmount = interaction.options.getInteger('message');
            const voiceAmount = interaction.options.getInteger('voice');

            friendshipModule.setScore(messageAmount, voiceAmount, user, friend, interaction.guild);
            return interaction.reply({ content: `Ustawiono ${messageAmount} punktów przyjaźni wiadomości i ${voiceAmount} punktów przyjaźni rozmowy głosowej dla użytkownika ${user.tag}`, flags: [MessageFlags.Ephemeral] });
        }
        
        if (interaction.options.getSubcommand() === 'reset') {
            const user = interaction.options.getUser('user');
            const friend = interaction.options.getUser('friend');
            friendshipModule.setScore(0, 0, user, friend, interaction.guild);
            return interaction.reply({ content: `Zresetowano punkty przyjaźni dla użytkownika ${user.tag}`, flags: [MessageFlags.Ephemeral] });
        }
    },
}