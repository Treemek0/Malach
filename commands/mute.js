const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');

const settings = require('../utils/settings.js');

module.exports = {
    name: 'mute',
    description: 'Wycisza użytkownika.',
    default_member_permissions: PermissionFlagsBits.ModerateMembers,
    options: [
        {
            name: 'user',
            description: 'Użytkownik, którego chcesz wyciszyć',
            type: 6, // 6 = USER
            required: true,
        },
        {
            name: 'reason',
            description: 'Powód wyciszenia',
            type: 3, // 3 = STRING
            required: false,
        },
        {
            name: 'duration',
            description: 'Czas trwania wyciszenia w minutach',
            type: 4, // 4 = INTEGER
            required: false,
        }
    ],

    async execute(interaction) {
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.reply({ content: 'Nie masz uprawnień do użycia tej komendy.', flags: [MessageFlags.Ephemeral] });
        }

        if (!interaction.appPermissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ content: 'Błąd: Nie mam uprawnień `Zarządzanie Rolami` (Manage Roles), aby wyciszyć użytkownika.' });
        }

        const guildSettings = await settings.get_settings(interaction.guild.id);

        if (!guildSettings || !guildSettings.mute_role) {
            return interaction.reply({ content: 'Nie ustawiono roli wyciszenia.', flags: [MessageFlags.Ephemeral] });
        }

        const muteRole = interaction.guild.roles.cache.get(guildSettings.mute_role);
        if (!muteRole) {
            return interaction.reply({ content: 'Rola wyciszenia ustawiona w ustawieniach nie istnieje.', flags: [MessageFlags.Ephemeral] });
        }

        
        const botMember = interaction.guild.members.me;
        if (muteRole.position >= botMember.roles.highest.position) {
            return interaction.reply({ 
                content: 'Błąd: Rola wyciszenia jest wyżej w hierarchii niż moja najwyższa rola. Przesuń moją rolę wyżej w ustawieniach serwera.', 
                flags: [MessageFlags.Ephemeral]
            });
        }

        const authorModeratorRole = interaction.member.roles.cache
        .filter(role => role.permissions.has(PermissionFlagsBits.ModerateMembers))
        .sort((a, b) => b.position - a.position)
        .first();

        const targetMember = interaction.options.getMember('user');
        const targetModeratorRole = targetMember.roles.cache
            .filter(role => role.permissions.has(PermissionFlagsBits.ModerateMembers))
            .sort((a, b) => b.position - a.position)
            .first();

        if (targetModeratorRole) {
            if (targetModeratorRole.position >= authorModeratorRole?.position) {
                return interaction.reply({ 
                    content: 'Nie możesz użyć tej komendy na osobie, która ma taką samą lub wyższą rolę moderatorską!', 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
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
        const duration = interaction.options.getInteger('duration') || -1;


        if (!mutes[userId]) {
            mutes[userId] = [];
        }

        mutes[userId] = [{
            reason: reason,
            from: interaction.user.tag,
            date: new Date().toISOString(),
            end_date: duration === -1 ? null : new Date(Date.now() + duration * 60000).toISOString(),
            roles: await interaction.guild.members.fetch(userId).then(member => member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.id))
        }];

        fs.writeFile(mutesPath, JSON.stringify(mutes, null, 2), async (err) => {
            if (err) {
                console.error(err);
                interaction.reply({ content: 'Wystąpił błąd podczas zapisywania ostrzeżeń.', flags: [MessageFlags.Ephemeral] });
                return;
            }

            const muteEmbed = new EmbedBuilder()
                .setColor('#634700')
                .setTitle(`Użytkownik ${interaction.options.getUser('user').username} został wyciszony!`)
                .setThumbnail(interaction.options.getUser('user').displayAvatarURL())
                .setDescription("Powód: " + reason + (duration !== -1 ? `\nCzas trwania: ${duration} minut` : "\nCzas trwania: do odwołania"));

            interaction.reply({ embeds: [muteEmbed] });

            const member = interaction.guild.members.cache.get(userId);
            await member.roles.set([muteRole.id]);
        });
    },
};
