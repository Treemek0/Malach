const { EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');

const settings = require('../utils/settings.js');

module.exports = {
    name: 'ship',
    description: 'Zobacz jak bardzo użytkownicy się kochają <333',
    options: [
        {
            name: 'user',
            description: 'Użytkownik, którego chcesz shipować',
            type: 6, // 6 = USER
            required: true,
        },
        {
            name: 'user2',
            description: 'Użytkownik shipowany',
            type: 6, // 6 = USER
            required: true,
        }
    ],


    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const user2 = interaction.options.getUser('user2');

        const ids = [user.id, user2.id].sort();
        const idSeed = ids.join("");

        const now = new Date();
        const dateSeed = `${now.getFullYear()}${now.getMonth()}${now.getDate()}`;

        function hashCode(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash);
        }

        const baseShip = hashCode(idSeed) % 101; 

        // od -5 do +5)
        const dailyMod = (hashCode(dateSeed + idSeed) % 11) - 5;

        let randomShip = baseShip + dailyMod;
        randomShip = Math.max(1, Math.min(100, randomShip));

        const riggedIDs = ['534819684248322048', '802495872340328469'];
        if (riggedIDs.includes(user.id) && riggedIDs.includes(user2.id)) {
            randomShip = 22 + dailyMod; 
        }

        const searchingEmbed = new EmbedBuilder()
            .setColor('Blue')
            .setDescription(`## Obliczanie jak bardzo <@${user.id}> i <@${user2.id}> do siebie pasują...`)

        interaction.reply({ embeds: [searchingEmbed] });

        let emoji = "💔"
        let color = "#d4d4d4"
        let footer = "Ajajaj, chyba nic z tego nie będzie"

        if(randomShip > 25){
            emoji = "🤜🤛"
            color = "#ddd172"
            footer = "Nadajecie się na znajomych"    
        }

        if(randomShip > 60){
            emoji = "🤝"
            color = "#e7cd09"
            footer = "Powinniście być przyjaciółmi"
        }

        if(randomShip > 85) {
            emoji = "💞"
            color = "#e32098"
            footer = "Jeżeli nie jesteście razem to dużo tracicie"
        }

        const full = '█';
        const empty = '░';
        const progress = Math.round((randomShip / 100) * 15);
        const progressBar = "|" + full.repeat(progress) + empty.repeat(15 - progress) + "|";

        const shipEmbed = new EmbedBuilder()
            .setColor(color)
            .setDescription(`## <@${user.id}> ${emoji} <@${user2.id}>` + `\n\n${progressBar}\n${randomShip}%`)
            .setFooter({ text: `${footer}` });

        setTimeout(async () => {
            try {
                await interaction.editReply({ 
                    content: "", 
                    embeds: [shipEmbed] 
                });
            } catch (error) {
                console.error("Nie udało się edytować wiadomości:", error);
            }
        }, 500);
    }
}