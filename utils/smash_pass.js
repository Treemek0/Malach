const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

module.exports = {
    async generateImage(interaction) {
        try {
            const imageUrl = await this.getRedditImage(interaction.channel.allowNSFW);
            if (!imageUrl) return interaction.reply("Nie udało się znaleźć obrazka");

            const imageEmbed = new EmbedBuilder()
                .setImage(imageUrl)
                .setColor('Random');

            const msg = await interaction.reply({ 
                embeds: [imageEmbed], 
                fetchReply: true 
            });

            await msg.react('🔥');
            await msg.react('❌');

        } catch (error) {
            console.error('Błąd w generateImage:', error);
            await channel.send("Wystąpił błąd podczas pobierania obrazu.");
        }
    },

    async getRedditImage(allowNSFW) {
    try {
        const limit = 50;
        const hot_or_new = Math.random() < 0.5 ? 'hot' : 'new';

        const links = [
            `https://www.reddit.com/r/selfie/${hot_or_new}.json?limit=${limit}`,
            `https://www.reddit.com/r/selfies/${hot_or_new}.json?limit=${limit}`,
            `https://www.reddit.com/r/PrettyGirls/${hot_or_new}.json?limit=${limit}`,
            `https://www.reddit.com/r/BeautifulFemales/${hot_or_new}.json?limit=${limit}`,
            `https://www.reddit.com/r/SFWNextDoorGirls/${hot_or_new}.json?limit=${limit}`,
            `https://www.reddit.com/r/LadyBoners/${hot_or_new}.json?limit=${limit}`,
        ];

        const randomLink = links[Math.floor(Math.random() * links.length)];

        const response = await fetch(randomLink, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        const data = await response.json();

        if (!data.data || !data.data.children) return null;

        const allowed = data.data.children.filter(post => {
            const p = post.data;
            
            const isImage = p.url.match(/\.(jpg|jpeg|png|gif)$/i) || p.post_hint === 'image';
            const isNotVideo = !p.is_video;

            const nsfwCheck = allowNSFW ? true : !p.over_18;

            return isImage && isNotVideo && nsfwCheck;
        });

        if (allowed.length === 0) {
            console.log(`Brak pasujących postów na: ${randomLink}`);
            return null;
        }

        const random = Math.floor(Math.random() * allowed.length);
        return allowed[random].data.url;
    } catch (error) {
        console.error('Błąd podczas pobierania z Reddita:', error);
        return null;
    }
}
}