require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

// Load commands
client.commands = new Collection();
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for(const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

// Slash & Message Commands Handler
client.on('interactionCreate', async interaction => {
    if(!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if(!command) return;
    try {
        await command.execute(interaction, client, config);
    } catch(error) {
        console.error(error);
        await interaction.reply({ content: 'حدث خطأ أثناء التنفيذ!', ephemeral: true });
    }
});

// DM handler
client.on('messageCreate', async message => {
    if(message.author.bot) return;
    if(message.channel.type == 1) { // Direct Message
        const aiHandler = require(`./providers/${config.provider}.js`);
        const reply = await aiHandler.ask(message.content, config.apiKeys[config.provider]);
        await message.reply(reply);
    } else {
        if(message.content.startsWith(config.prefix)) {
            const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
            const cmdName = args.shift().toLowerCase();
            const command = client.commands.get(cmdName);
            if(command && command.executeMsg) {
                try {
                    await command.executeMsg(message, args, client, config);
                } catch (error) {
                    console.error(error);
                    await message.reply('حدث خطأ أثناء التنفيذ!');
                }
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);