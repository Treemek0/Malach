const { 
    EmbedBuilder, 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    RoleSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits 
} = require('discord.js');

const settings = require('../utils/settings.js');
const exp_module = require('../utils/exp_module.js');

module.exports = {
    name: 'levelingroles',
    description: 'Zarządzaj rolami za poziomy',
    default_member_permissions: PermissionFlagsBits.Administrator,

    data: new SlashCommandBuilder()
    .setName('settings_xp')
    .setDescription('Otwórz panel zarządzania XP'),

    async execute(interaction) {
        let guildSettings = await settings.get_settings(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setTitle("⚙️ Panel Zarządzania XP")
            .setDescription("Wybierz akcję, którą chcesz wykonać z menu poniżej.")
            .setFields(
                { name: 'Biała lista ról:', value: "-# " + guildSettings.xp_whitelist && guildSettings.xp_whitelist.length > 0 ? guildSettings.xp_whitelist.map(id => `<@&${id}>`).join(', ') : 'Brak ról na białej liście. Wszystkie role zdobywają XP.' },
                { name: 'Czarna lista ról', value: "-# " + guildSettings.xp_blacklist && guildSettings.xp_blacklist.length > 0 ? guildSettings.xp_blacklist.map(id => `<@&${id}>`).join(', ') : 'Brak ról na czarnej liście.' },
                { name: 'Role za poziom', value: guildSettings.level_reward_roles && guildSettings.level_reward_roles.length > 0 ? guildSettings.level_reward_roles.map(role => `-# Poziom ${role.level}: <@&${role.role_id}>`).join('\n') : 'Brak ustawionych nagród za poziomy.' }
            )
            .setColor("Blue");

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('xp_settings_action')
            .setPlaceholder('Wybierz co chcesz zrobić...')
            .addOptions([
                { label: 'Biała lista ról', value: 'whitelist', description: 'Wybierz role do zbierania XP (pusta oznacza @everyone)' },
                { label: 'Czarna lista ról', value: 'blacklist', description: 'Zablokuj XP dla danej roli' },
                { label: 'Dodaj rolę za poziom', value: 'add_role', description: 'Ustaw nagrodę za level' },
                { label: 'Usuń rolę za poziom', value: 'remove_role', description: 'Usuń nagrodę za level' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const response = await interaction.reply({ 
            embeds: [embed], 
            components: [row], 
            ephemeral: true 
        });

        // --- COLLECTOR LOGIC ---
        const collector = response.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'xp_settings_action') {
                const action = i.values[0];

                if (action === 'whitelist') {
                    // MULTI-ROLE SELECT MENU
                    const roleSelect = new RoleSelectMenuBuilder()
                        .setCustomId('roles_to_whitelist')
                        .setPlaceholder('Wybierz role do białej listy...')
                        .setMinValues(1)
                        .setMaxValues(10)
                        .setDefaultRoles(guildSettings.xp_whitelist || []);

                    const roleRow = new ActionRowBuilder().addComponents(roleSelect);
                    await i.update({ content: 'Zaznacz role na liście:', components: [roleRow], embeds: [] });
                }

                if (action === 'blacklist') {
                    // MULTI-ROLE SELECT MENU
                    const roleSelect = new RoleSelectMenuBuilder()
                        .setCustomId('roles_to_blacklist')
                        .setPlaceholder('Wybierz role do czarnej listy...')
                        .setMinValues(1)
                        .setMaxValues(10)
                        .setDefaultRoles(guildSettings.xp_blacklist || []);

                    const roleRow = new ActionRowBuilder().addComponents(roleSelect);
                    await i.update({ content: 'Zaznacz role na liście:', components: [roleRow], embeds: [] });
                }

                if (action === 'remove_role') {
                    const rolesForRemoval = guildSettings.level_reward_roles || [];
                    
                    if (rolesForRemoval.length === 0) {
                        return i.update({ content: 'Brak ról do usunięcia.', components: [], embeds: [] });
                    }

                    // Map and filter simultaneously to avoid "undefined" values
                    const options = rolesForRemoval
                        .filter(entry => entry.role_id) // Match the underscore!
                        .map(entry => {
                            const role = i.guild.roles.cache.get(entry.role_id); // Match the underscore!
                            const roleName = role ? role.name : `Nieznana rola`;
                            
                            return {
                                label: `Poziom ${entry.level}: ${roleName}`,
                                description: `Usuń nagrodę za poziom ${entry.level}`,
                                value: String(entry.role_id)
                            };
                        });

                    if (options.length === 0) {
                        return i.update({ content: 'Wystąpił błąd: Nie znaleziono poprawnych ról w bazie.', components: [], embeds: [] });
                    }

                    const roleSelect = new StringSelectMenuBuilder()
                        .setCustomId('reward_role_delete_select')
                        .setPlaceholder('Wybierz nagrody do usunięcia...')
                        .setMinValues(1)
                        .setMaxValues(Math.min(options.length, 10))
                        .addOptions(options);

                    const roleRow = new ActionRowBuilder().addComponents(roleSelect);
                    
                    await i.update({ 
                        content: 'Wybierz nagrody z Twojej listy, które chcesz usunąć:', 
                        components: [roleRow], 
                        embeds: [] 
                    });
                }

                if (action === 'add_role') {
                    // ROLE SELECT FOR REWARD
                    const roleSelect = new RoleSelectMenuBuilder()
                        .setCustomId('reward_role_select')
                        .setPlaceholder('Wybierz rolę za level...')
                        .setMinValues(1)
                        .setMaxValues(1);

                    const roleRow = new ActionRowBuilder().addComponents(roleSelect);
                    await i.update({ content: 'Krok 1: Wybierz rolę, którą chcesz przyznać:', components: [roleRow], embeds: [] });
                }
            }
            
            // Handle the Role Selection for Whitelist
            if (i.customId === 'roles_to_whitelist') {
                const selectedRoleIds = i.values;

                guildSettings.xp_whitelist = selectedRoleIds;
                await settings.update_settings(interaction.guild.id, guildSettings);
                await i.update({ content: `✅ Dodano ` + selectedRoleIds.map(id => `<@&${id}>`).join(', ') + ` ról do białej listy!`, components: [] });
            }

            if (i.customId === 'roles_to_blacklist') {
                const selectedRoleIds = i.values;

                guildSettings.xp_blacklist = selectedRoleIds;
                await settings.update_settings(interaction.guild.id, guildSettings);
                await i.update({ content: `✅ Dodano ` + selectedRoleIds.map(id => `<@&${id}>`).join(', ') + ` ról do czarnej listy!`, components: [] });
            }

            if (i.customId === 'reward_role_delete_select') {
                const selectedRoleIds = i.values;

                // Fix: Change roleId to role_id
                const updatedRoles = guildSettings.level_reward_roles.filter(entry => 
                    !selectedRoleIds.includes(entry.role_id)
                );

                guildSettings.level_reward_roles = updatedRoles;
                await settings.update_settings(interaction.guild.id, guildSettings);

                await i.update({ 
                    content: `✅ Usunięto ` + selectedRoleIds.map(id => `<@&${id}>`).join(', ') + ` z listy nagród!`,
                    components: [] 
                });
            }

            if (i.customId === 'reward_role_select') {
                const roleId = i.values[0];
                
                const modal = new ModalBuilder()
                    .setCustomId(`modal_level_${roleId}`)
                    .setTitle('Ustaw Poziom');

                const levelInput = new TextInputBuilder()
                    .setCustomId('level_input')
                    .setLabel("Przy jakim poziomie przyznać rolę?")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Np. 5, 10, 50')
                    .setRequired(true);

                const modalRow = new ActionRowBuilder().addComponents(levelInput);
                modal.addComponents(modalRow);

                await i.showModal(modal);

                // collecting the modal response is in app.js createinteraction
            }
        });
    }
}