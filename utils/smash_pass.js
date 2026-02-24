module.exports = {

    async generateImage(channel) {
        const imageUrl = `https://thispersondoesnotexist.com/?t=${Date.now()}`; // Timestamp dla unikalności
    
        const imageEmbed = new EmbedBuilder()
            .setTitle("Smash or Pass?")
            .setImage(imageUrl)
            .setColor('Random');

        const msg = await channel.send({ embeds: [imageEmbed] });

        try {
            await msg.react('🔥'); // Smash
            await msg.react('❌'); // Pass
        } catch (error) {
            console.error('Nie udało się dodać reakcji:', error);
        }
    },

}