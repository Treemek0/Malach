const { PermissionFlagsBits } = require('discord.js');
const { EmbedBuilder, ApplicationCommandOptionType, MessageFlags } = require('discord.js');
const settingsUtils = require('../utils/settings');

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
                { name: 'channel', description: 'Kanał powiadomień o poziomie', type: ApplicationCommandOptionType.Channel, required: false }
            ],
        },
        {
            name: 'logs_channel',
            description: 'Ustaw kanał powiadomień',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: 'channel', description: 'Kanał powiadomień', type: ApplicationCommandOptionType.Channel, required: false }
            ],
        },
        {
            name: 'moderation_logs_channel',
            description: 'Ustaw kanał powiadomień moderacji',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: 'channel', description: 'Kanał powiadomień moderacji', type: ApplicationCommandOptionType.Channel, required: false }
            ],
        },
        {
            name: 'voice_logs_channel',
            description: 'Ustaw kanał powiadomień o aktywności głosowej',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: 'channel', description: 'Kanał powiadomień o aktywności głosowej', type: ApplicationCommandOptionType.Channel, required: false }
            ],
        },
        {
            name: 'report_channel',
            description: 'Ustaw kanał raportów',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: 'channel', description: 'Kanał raportów', type: ApplicationCommandOptionType.Channel, required: false }
            ],
        },
        {
            name: 'smash_or_pass_channel',
            description: 'Ustaw kanał raportów',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: 'channel', description: 'Kanał do smash or pass', type: ApplicationCommandOptionType.Channel, required: false }
            ],
        },
        {
            name: 'mute_role',
            description: 'Ustaw rolę wyciszenia',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: 'role', description: 'Rola wyciszenia', type: ApplicationCommandOptionType.Role, required: false }
            ],
        },
        {
            name: 'streak_emoji',
            description: 'Ustaw emoji streaka',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: 'emoji', description: 'Emoji streaka', type: ApplicationCommandOptionType.String, required: true }
            ],
        },
        {
            name: 'xp_per_message',
            description: 'Ustaw ilość XP za wiadomość',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: 'xp', description: 'Ilość XP za wiadomość', type: ApplicationCommandOptionType.Integer, required: true }
            ],
        },
        {   
            name: 'xp_per_voice_minute',
            description: 'Ustaw ilość XP za minutę w głosowym',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: 'xp', description: 'Ilość XP za minutę w głosowym', type: ApplicationCommandOptionType.Integer, required: true }
            ]
        },
        {
            name: 'view',
            description: 'Wyświetl aktualne ustawienia serwera',
            type: ApplicationCommandOptionType.Subcommand,
            options: []
        }
    ],

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildSettings = await settingsUtils.get_settings(guildId);

        const sub = interaction.options.getSubcommand();
        let response = '';

        switch (sub) {
            case 'lvlup_channel': {
                const channel = interaction.options.getChannel('channel') || null;
                guildSettings.lvlup_channel = channel ? channel.id : null;
                response = `Kanał powiadomień o poziomie został ustawiony na ${channel ? channel : 'brak'}.`;
                break;
            }
            case 'moderation_logs_channel': {
                const channel = interaction.options.getChannel('channel') || null;
                guildSettings.moderation_logs_channel = channel ? channel.id : null;
                response = `Kanał powiadomień moderacji został ustawiony na ${channel ? channel : 'brak'}.`;
                break;
            }
            case 'voice_logs_channel': {
                const channel = interaction.options.getChannel('channel') || null;
                guildSettings.voice_logs_channel = channel ? channel.id : null;
                response = `Kanał powiadomień o aktywności głosowej został ustawiony na ${channel ? channel : 'brak'}.`;
                break;
            }
            case 'report_channel': {
                const channel = interaction.options.getChannel('channel') || null;
                guildSettings.report_channel = channel ? channel.id : null;
                response = `Kanał zgłoszeń został ustawiony na ${channel ? channel : 'brak'}.`;
                break;
            }
            case 'smash_or_pass_channel': {
                const channel = interaction.options.getChannel('channel') || null;
                guildSettings.smashOrPass_channel = channel ? channel.id : null;
                response = `${channel ? "Whitelista smash or pass została ustawiona tylko na " + channel  : 'Usunięto whiteliste smash or pass, komenda możliwa do aktywacji gdziekolwiek.'}.`;
                break;
            }
            case 'mute_role': {
                const role = interaction.options.getRole('role') || null;
                guildSettings.mute_role = role ? role.id : null;
                response = `Rola wyciszenia została ustawiona na ${role ? role : 'brak'}.`;
                break;
            }
            case 'streak_emoji': {
                const emoji = interaction.options.getString('emoji');
                guildSettings.streak_emoji = emoji;
                response = `Emoji streaka został ustawiony na ${emoji}.`;
                break;
            }
            case 'xp_per_message': {
                const xp = interaction.options.getInteger('xp');
                if (xp < 0) {
                    return interaction.reply({ 
                        content: '❌ Podaj poprawną liczbę dodatnią dla XP za wiadomość!', 
                        ephemeral: true 
                    });
                }
                guildSettings.xp_per_message = xp;
                response = `XP za wiadomość został ustawiony na ${xp}.`;
                break;
            }
            case 'xp_per_voice_minute': {
                const xp = interaction.options.getInteger('xp');
                if (xp < 0) {
                    return interaction.reply({ 
                        content: '❌ Podaj poprawną liczbę dodatnią dla XP za minutę w głosowym!', 
                        ephemeral: true 
                    });
                }
                guildSettings.xp_per_voice_minute = xp;
                response = `XP za minutę w głosowym został ustawiony na ${xp}.`;
                break;
            }
            case 'view': {
                const embed = new EmbedBuilder()
                    .setColor('Blue')
                    .setTitle('Aktualne Ustawienia Serwera')
                    .setDescription(`-# **Kanał powiadomień o poziomie:** ${guildSettings.lvlup_channel ? `<#${guildSettings.lvlup_channel}>` : '⊘ Nie ustawiono'}\n` +
                        `-# **Kanał powiadomień moderacji:** ${guildSettings.moderation_logs_channel ? `<#${guildSettings.moderation_logs_channel}>` : '⊘ Nie ustawiono'}\n` +
                        `-# **Kanał powiadomień o aktywności głosowej:** ${guildSettings.voice_logs_channel ? `<#${guildSettings.voice_logs_channel}>` : '⊘ Nie ustawiono'}\n` +
                        `-# **Kanał zgłoszeń (/report):** ${guildSettings.report_channel ? `<#${guildSettings.report_channel}>` : '⊘ Nie ustawiono'}\n` +
                        `-# **Rola wyciszenia:** ${guildSettings.mute_role ? `<@&${guildSettings.mute_role}>` : '⊘ Nie ustawiono'}\n` +
                        `-# **Emoji streaka:** ${guildSettings.streak_emoji || '⊘ Nie ustawiono'}\n` +
                        `-# **XP za wiadomość:** ${guildSettings.xp_per_message || '4'}\n` +
                        `-# **XP za minutę w głosowym:** ${guildSettings.xp_per_voice_minute || '0.5'}\n`)
                    .setThumbnail(interaction.guild.iconURL());
                interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                return;
            }
            default:
                response = 'Nieznana podkomenda.';
        }

        await settingsUtils.update_settings(guildId, guildSettings);
        interaction.reply({ content: response });
    },
};