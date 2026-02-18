const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits, MessageFlags} = require('discord.js');

const settings = require('../utils/settings.js');

module.exports = {
    name: 'unmute',
    description: 'Odcisza użytkownika.',
    default_member_permissions: PermissionFlagsBits.ModerateMembers,
    options: [
        {
            name: 'user',
            description: 'Użytkownik, którego chcesz odciszyć',
            type: 6, // 6 = USER
            required: true,
        },
        {
            name: 'reason',
            description: 'Powód odciszenia',
            type: 3, // 3 = STRING
            required: false,
        }
    ],

    async execute(interaction) {
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.reply({ content: 'Nie masz uprawnień do użycia tej komendy.', flags: [MessageFlags.Ephemeral] });
        }

        const guildSettings = await settings.get_settings(interaction.guild.id);

        if (!guildSettings || !guildSettings.mute_role) {
            return interaction.reply({ content: 'Nie ustawiono roli wyciszenia.', flags: [MessageFlags.Ephemeral] });
        }

        const muteRole = interaction.guild.roles.cache.get(guildSettings.mute_role);
        if (!muteRole) {
            return interaction.reply({ content: 'Rola wyciszenia ustawiona w ustawieniach nie istnieje.', flags: [MessageFlags.Ephemeral] });
        }

        const mutesPath = path.join(__dirname, '../moderation/' + interaction.guild.id + '/mutes.json');
        const folderPath = path.dirname(mutesPath);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }

        let mutes = {};

        if (fs.existsSync(mutesPath)) {
            const data = fs.readFileSync(mutesPath, 'utf8');
            mutes = JSON.parse(data);
        }

        const userId = interaction.options.getUser('user').id;
        let reason = interaction.options.getString('reason') || '';
        reason = reason.substring(0, 600);

        if (!mutes[userId]) {
            mutes[userId] = [];
            return interaction.reply({ content: 'Użytkownik nie jest wyciszony.', flags: [MessageFlags.Ephemeral] });
        }

        this.unmute(userId, interaction.guild);

        const muteEmbed = new EmbedBuilder()
            .setColor('#634700')
            .setTitle(`Użytkownik ${interaction.options.getUser('user').username} został odciszony!`)
            .setThumbnail(interaction.options.getUser('user').displayAvatarURL())
            .setDescription("Powód: " + reason);

        interaction.reply({ embeds: [muteEmbed] });
    },


    async unmute(userId, guild) {
        const mutesPath = path.join(__dirname, '../moderation/' + guild.id + '/mutes.json');
        if (!fs.existsSync(mutesPath)) return;

        const data = fs.readFileSync(mutesPath, 'utf8');
        if (!data) return;

        const mutes = JSON.parse(data);

        const userMute = mutes[userId][0];

        const member = guild.members.cache.get(userId);
        if (!member) return;

        if(!userMute.roles) return;

        try {
            await member.roles.set(userMute.roles);
            console.log(`Przywrócono role dla ${member.user.tag}: ${userMute.roles.join(', ')}`);
        } catch (error) {
            console.error('Błąd podczas przywracania ról:', error);
        }
        
        delete mutes[userId];
        fs.writeFileSync(mutesPath, JSON.stringify(mutes, null, 2));
    }
};
