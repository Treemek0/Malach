const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    async generateImage(channel) {
        try {
            const imageUrl = await this.getRedditImage(channel.allowNSFW);
            if (!imageUrl) return channel.send("Nie udało się znaleźć obrazka na Reddit");

            const imageEmbed = new EmbedBuilder()
                .setImage(imageUrl)
                .setColor('Random');

            const msg = await channel.send({ 
                embeds: [imageEmbed] 
            });

            await msg.react('🔥');
            await msg.react('❌');

        } catch (error) {
            console.error('Błąd w generateImage:', error);
            await channel.send("Nie udało się wygenerować nowej osoby. Spróbuj ponownie!");
        }
    },

    async getRedditImage(allowNSFW) {
        try {
            const limit = 15;

            const links = [`https://www.reddit.com/r/selfie/new.json?limit=${limit}`, `https://www.reddit.com/r/selfies/new.json?limit=${limit}`, `https://www.reddit.com/r/PrettyGirls/new.json?limit=${limit}`, `https://www.reddit.com/r/Animewallpaper/new.json?limit=${limit}`];

            const randomLink = links[Math.floor(Math.random() * links.length)];

            const response = await fetch(randomLink, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64' }
            });

            const data = await response.json();

            const allowed = data.data.children.filter(post => 
                !post.data.is_video && 
                post.data.post_hint === 'image' &&
                allowNSFW ? true : !post.data.over_18 &&
                (post.data.url.endsWith('.jpg') || post.data.url.endsWith('.png'))
            );

            if (allowed.length === 0) return null;

            const random = Math.floor(Math.random() * allowed.length);

            return allowed[random].data.url;
        } catch (error) {
            console.error('Błąd podczas pobierania z Reddita:', error);
            return null;
        }
    }
}