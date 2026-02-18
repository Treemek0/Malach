const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    async get_settings(guildId) {
        const settingsPath = path.join(__dirname, '../settings/' + guildId + '.json');
        const folderPath = path.dirname(settingsPath);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            return {}; // Zwracamy pusty obiekt
        }

        if (fs.existsSync(settingsPath)) {
            try {
                const data = fs.readFileSync(settingsPath, 'utf8');
                return JSON.parse(data);
            } catch (err) {
                console.error("Błąd parsowania pliku JSON:", err);
                return {};
            }
        }

        return {}; // Jeśli plik nie istnieje, również pusty obiekt
    }, 
}