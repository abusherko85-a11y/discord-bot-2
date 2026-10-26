const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const express = require('express');

// إنشاء سيرفر وهمي بسيط للبقاء نشطاً 24/7
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot 2 is active and running 24/7!');
});

app.listen(PORT, () => {
    console.log(`Web server is running on port ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// قراءة البيانات بأمان تام من إعدادات الاستضافة للبوت الثاني
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.TOKEN;

client.once('ready', async () => {
    console.log(`Logged in successfully as: ${client.user.tag}`);
    await connectToVoiceChannel();
});

async function connectToVoiceChannel() {
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        if (!guild) return console.log('ERROR: Guild (Server) not found!');

        const channel = await guild.channels.fetch(VOICE_CHANNEL_ID);
        if (!channel) return console.log('ERROR: Voice Channel not found!');

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log(`SUCCESS: Bot has joined the voice channel: ${channel.name}`);
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch (error) {
                connection.destroy();
                setTimeout(connectToVoiceChannel, 5_000);
            }
        });

    } catch (error) {
        console.error('ERROR connecting to voice channel:', error);
    }
}

client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState.member && oldState.member.id === client.user.id && oldState.channelId && !newState.channelId) {
        setTimeout(connectToVoiceChannel, 5000);
    }
});

client.login(TOKEN);