const { PermissionFlagsBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder, ApplicationCommandOptionType, MessageFlags } = require('discord.js');
const { get } = require('node:http');

module.exports = {
    name: 'settings',
    description: 'Zmień ustawienia bota dla tego serwera',
    default_member_permissions: PermissionFlagsBits.ManageGuild,
    options: [
        {
            name: 'lvlup_channel',
            description: 'Ustaw kanał powiadomień o poziomie',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'channel',
                    description: 'Kanał powiadomień o poziomie',
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                }
            ]
        },
        {
            name: 'logs_channel',
            description: 'Ustaw kanał powiadomień',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'channel',
                    description: 'Kanał powiadomień',
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                }
            ]
        },
        {
            name: 'report_channel',
            description: 'Ustaw kanał raportów',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'channel',
                    description: 'Kanał raportów',
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                }
            ]
        },
        {
            name: 'mute_role',
            description: 'Ustaw rolę wyciszenia',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'role',
                    description: 'Rola wyciszenia',
                    type: ApplicationCommandOptionType.Role,
                    required: true,
                }
            ]
        },
        {
            name: 'streak_emoji',
            description: 'Ustaw emoji streaka',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'emoji',
                    description: 'Emoji streaka',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                }
            ]
        }
    ],

    async execute(interaction) {
        const usersPath = path.join(__dirname, '../settings/' + interaction.guild.id + '.json');
        const folderPath = path.dirname(usersPath);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }

        let settings = {};
            
        if (fs.existsSync(usersPath)) {
            const data = fs.readFileSync(usersPath, 'utf8');
            settings = JSON.parse(data);
        }

        if (interaction.options.getSubcommand() === 'lvlup_channel') {
            const channel = interaction.options.getChannel('channel');
            settings.lvlup_channel = channel.id;
            fs.writeFile(usersPath, JSON.stringify(settings, null, 2), (err) => {
                if (err) {
                    console.error(err);
                    interaction.reply({ content: 'Wystąpił błąd podczas zapisywania ustawień.', flags: [MessageFlags.Ephemeral] });
                    return;
                }
                interaction.reply({ content: `Kanał powiadomień o poziomie został ustawiony na ${channel}.`});
            });
        }else if (interaction.options.getSubcommand() === 'logs_channel') {
            const channel = interaction.options.getChannel('channel');
            settings.logs_channel = channel.id;
            fs.writeFile(usersPath, JSON.stringify(settings, null, 2), (err) => {
                if (err) {
                    console.error(err);
                    interaction.reply({ content: 'Wystąpił błąd podczas zapisywania ustawień.', flags: [MessageFlags.Ephemeral] });
                    return;
                }
                interaction.reply({ content: `Kanał powiadomień został ustawiony na ${channel}.`});
            });
        }else if (interaction.options.getSubcommand() === 'report_channel') {
            const channel = interaction.options.getChannel('channel');
            settings.report_channel = channel.id;
            fs.writeFile(usersPath, JSON.stringify(settings, null, 2), (err) => {
                if (err) {
                    console.error(err);
                    interaction.reply({ content: 'Wystąpił błąd podczas zapisywania ustawień.', flags: [MessageFlags.Ephemeral] });
                    return;
                }
                interaction.reply({ content: `Kanał zgłoszeń został ustawiony na ${channel}.`});
            });
        } else if (interaction.options.getSubcommand() === 'mute_role') {
            const role = interaction.options.getRole('role');
            settings.mute_role = role.id;
            fs.writeFile(usersPath, JSON.stringify(settings, null, 2), (err) => {
                if (err) {
                    console.error(err);
                    interaction.reply({ content: 'Wystąpił błąd podczas zapisywania ustawień.', flags: [MessageFlags.Ephemeral] });
                    return;
                }
                interaction.reply({ content: `Rola wyciszenia została ustawiona na ${role}.`});
            });
        } else if (interaction.options.getSubcommand() === 'streak_emoji') {
            const emoji = interaction.options.getString('emoji');
            settings.streak_emoji = emoji;
            fs.writeFile(usersPath, JSON.stringify(settings, null, 2), (err) => {
                if (err) {
                    console.error(err);
                    interaction.reply({ content: 'Wystąpił błąd podczas zapisywania ustawień.', flags: [MessageFlags.Ephemeral] });
                    return;
                }
                
                interaction.reply({ content: `Emoji streaka został ustawiony na ${emoji}.`});
            });
        }
    },
}