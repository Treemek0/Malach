require('dotenv').config();
const { Client, GatewayIntentBits, Events, Collection, EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const colors = require('./colors');
const expModule = require('./utils/exp_module.js');
const settings = require('./utils/settings.js');
const friendshipUtils = require('./utils/friendship.js');
const db = require('./utils/db');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates] 
});

db.connect().then(() => console.log(colors.green + "Connected to " + colors.cyan + "MongoDB!" + colors.reset)).catch(err => console.error('MongoDB connection error', err));

console.log(colors.yellow + "Trying to login as: " + colors.reset, process.env.APP_ID);

const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Malach is online!'));
app.listen(3000, () => console.log(colors.green + "Web server started on port 3000!" + colors.reset));

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commandsData = []

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('name' in command && 'execute' in command) {
        client.commands.set(command.name, command);
        
        commandsData.push({
            name: command.name,
            description: command.description,
            default_member_permissions: command.default_member_permissions || null,
            options: command.options || []
        });
    }
}

client.on('clientReady', async () => {
    console.log(colors.green + `Success! Logged in as ` + colors.yellow + `${client.user.tag}` + colors.reset);

    await client.application.commands.set(commandsData);
    console.log(colors.green + "Commands synchronized!" + colors.reset);

    client.guilds.cache.forEach(guild => {
        guild.voiceStates.cache.forEach(state => {
            if (state.channelId && !state.member.user.bot) {
                activeInVoice.add(state.id);
                console.log(`Added ${state.member.user.tag} to activeInVoice on startup.`);
            }
        });
    });
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('modal_level_')) { // roles for leveling
            const roleId = interaction.customId.split('_')[2];
            
            const levelString = interaction.fields.getTextInputValue('level_input');
            const level = parseInt(levelString);

            if (isNaN(level) || level < 1) {
                return interaction.reply({ 
                    content: '❌ Podaj poprawną liczbę dodatnią dla poziomu!', 
                    ephemeral: true 
                });
            }

            try {
                const guildSettings = await settings.get_settings(interaction.guild.id);

                if (!guildSettings.level_reward_roles) {
                    guildSettings.level_reward_roles = [];
                }

                guildSettings.level_reward_roles.push({
                    role_id: roleId,
                    level: level
                });

                await settings.update_settings(interaction.guild.id, guildSettings);

                const role = interaction.guild.roles.cache.get(roleId);
                await interaction.reply({ 
                    content: `✅ Pomyślnie ustawiono nagrodę: Rola **${role ? role.name : roleId}** będzie przyznawana na **${level}** poziomie!`, 
                    ephemeral: true 
                });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Wystąpił błąd podczas zapisywania ustawień.', ephemeral: true });
            }
        }
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error executing this command! ' + error, ephemeral: true });
    }
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;
    await expModule.send_message(message);
    await friendshipUtils.handleMessage(message);
});

client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
    const wasBoosting = oldMember.premiumSince;
    const isBoosting = newMember.premiumSince;

    if (wasBoosting && !isBoosting) {
        console.log(`${newMember.user.tag} stopped boosting ${newMember.guild.name}.`);
        
        const logChannel = newMember.guild.channels.cache.find(ch => ch.name === 'logs');
        if (logChannel) {
            logChannel.send(`📉 **${newMember.user.tag}** nie wspiera już serwera boostem.`);
            newMember.roles.remove('1470894733911134362').catch(console.error); // removes booster color roles - black
            newMember.roles.remove('1471510063041609900').catch(console.error); // removes booster color roles - white
        }
    }
});

const activeInVoice = new Set();

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    if (!oldState.channelId && newState.channelId) {
        if (!newState.member.user.bot) activeInVoice.add(newState.id);
        return;
    } 

    if (oldState.channelId && !newState.channelId) {
        activeInVoice.delete(oldState.id);
        return;
    }
});

setInterval(async () => {
    activeInVoice.forEach(async userId => {
        const guild = client.guilds.cache.first();
        const state = guild.voiceStates.cache.get(userId);

        if (state && state.channel) {
            friendshipUtils.handleTalking(state.member.user, state.channel);

            if (state.channel.members.filter(m => !m.user.bot).size > 1) { 
                if (state.mute || state.selfMute || state.deaf || state.serverDeaf) return;
                const guildSettings = await settings.get_settings(guild.id);
                const xpPerHalfMinute = guildSettings.xp_per_voice_minute/2 || 0.5;
                expModule.add_xp(state.member.user, state.guild, xpPerHalfMinute, guildSettings);
            }
        } else {
            activeInVoice.delete(userId);
        }
    });

    for (const [guildId, guild] of client.guilds.cache) {
        console.log(colors.blue + `Checking mutes for guild ${guild.name} (${guildId})...` + colors.reset);
        // find expired mutes in database
        const col = await db.collection('mutes');
        const now = new Date();
        const expired = await col.find({ guildId, end_date: { $ne: null, $lte: now.toISOString() } }).toArray();

        for (const doc of expired) {
            const userId = doc.userId;
            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) {
                // remove entry anyway
                await col.deleteOne({ guildId, userId });
                continue;
            }

            try {
                await member.roles.set(doc.roles);
                console.log(`Przywrócono role dla ${member.user.tag}: ${doc.roles.join(', ')}`);

                const guildSettings = await settings.get_settings(guild.id);
                if (guildSettings && guildSettings.moderation_logs_channel) {
                    const logChannel = guild.channels.cache.get(guildSettings.moderation_logs_channel);
                    if (logChannel) {
                        const unmuteEmbed = new EmbedBuilder()
                            .setColor('#634700')
                            .setTitle(`Użytkownik ${member.user.tag} został automatycznie odciszony!`)
                            .setThumbnail(member.user.displayAvatarURL())
                            .setDescription("Powód: Czas trwania wyciszenia dobiegł końca.");

                        logChannel.send({ embeds: [unmuteEmbed] });
                    }
                }

                member.send({ embeds: [new EmbedBuilder().setColor('#634700').setTitle('Zostałeś odciszony!').setDescription('Twoje wyciszenie dobiegło końca. Możesz ponownie rozmawiać na serwerze.')] }).catch(() => null);
            } catch (error) {
                console.error('Błąd podczas przywracania ról:', error);
            }

            await col.deleteOne({ guildId, userId });
        }
    }
}, 30000);

client.login(process.env.DISCORD_TOKEN);