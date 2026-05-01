import { Telegraf, Markup } from 'telegraf';
import { sql } from '@vercel/postgres';

// ========== CONFIG ==========
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = parseInt(process.env.OWNER_ID);
const REQUIRED_CHANNEL = process.env.REQUIRED_CHANNEL;
const CHANNEL_URL = process.env.CHANNEL_URL || "https://t.me/YoriFederation";
const IMAGE_URL = process.env.IMAGE_URL || "https://files.catbox.moe/4f8407.jpg";
const FIRE_EFFECT_ID = "5104841245755180586";
const BOT_USERNAME = "YoriRobot"; // Change to your actual @bot username

const PROFANITY_LIST = [
  "madarchot", "teri maa ki chut", "tmkc", "sex", "sexy", "fuck", "kill",
  "randi", "rand", "miya khalifa", "chod dunga", "sod dunga", "lawri", "lawra"
];

const bot = new Telegraf(BOT_TOKEN);

// ========== DATABASE ==========
async function initDB() {
  await sql`CREATE TABLE IF NOT EXISTS users (user_id BIGINT PRIMARY KEY, username TEXT, first_name TEXT, last_name TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS conversations (user_id BIGINT PRIMARY KEY, state TEXT, temp_data JSONB, menu_level TEXT DEFAULT 'main', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(user_id), message_type TEXT, content TEXT, file_id TEXT, caption TEXT, timestamp TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS forwarded_msgs (user_id BIGINT PRIMARY KEY, owner_msg_id BIGINT, timestamp TIMESTAMPTZ DEFAULT NOW())`;
}

async function upsertUser(u, un, fn, ln) {
  await sql`INSERT INTO users (user_id, username, first_name, last_name, updated_at) VALUES (${u}, ${un}, ${fn}, ${ln}, NOW()) ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, updated_at = NOW()`;
}
async function setConv(u, s, t, m) {
  if (!s && !t && !m) await sql`DELETE FROM conversations WHERE user_id = ${u}`;
  else await sql`INSERT INTO conversations (user_id, state, temp_data, menu_level, updated_at) VALUES (${u}, ${s}, ${t ? JSON.stringify(t) : null}, ${m || 'main'}, NOW()) ON CONFLICT (user_id) DO UPDATE SET state = COALESCE(EXCLUDED.state, conversations.state), temp_data = COALESCE(EXCLUDED.temp_data, conversations.temp_data), menu_level = COALESCE(EXCLUDED.menu_level, conversations.menu_level), updated_at = NOW()`;
}
async function getConv(u) {
  const r = await sql`SELECT state, temp_data, menu_level FROM conversations WHERE user_id = ${u}`;
  return r.rows.length ? { state: r.rows[0].state, tempData: r.rows[0].temp_data, menuLevel: r.rows[0].menu_level } : { state: null, tempData: null, menuLevel: null };
}
async function setFwd(u, oid) { await sql`INSERT INTO forwarded_msgs (user_id, owner_msg_id, timestamp) VALUES (${u}, ${oid}, NOW()) ON CONFLICT (user_id) DO UPDATE SET owner_msg_id = EXCLUDED.owner_msg_id, timestamp = NOW()`; }
async function getFwd(u) { const r = await sql`SELECT owner_msg_id FROM forwarded_msgs WHERE user_id = ${u}`; return r.rows.length ? r.rows[0].owner_msg_id : null; }
async function delFwd(u) { await sql`DELETE FROM forwarded_msgs WHERE user_id = ${u}`; }
async function storeMsg(u, t, c, f, cap) { await sql`INSERT INTO messages (user_id, message_type, content, file_id, caption, timestamp) VALUES (${u}, ${t}, ${c}, ${f}, ${cap}, NOW())`; }

async function isMember(ctx, uid) {
  try { const m = await ctx.telegram.getChatMember(REQUIRED_CHANNEL, uid); return ['member','administrator','creator'].includes(m.status); } catch { return false; }
}

// ========== KEYBOARDS ==========
const mainKB = Markup.inlineKeyboard([
  Markup.button.url('📨 sᴇɴᴅ ᴍᴇꜱꜱᴀɢᴇ', `https://t.me/${BOT_USERNAME}?start=say`),  Markup.button.callback('❓ ʜᴇʟᴘ', 'help_menu'),
  [Markup.button.url('🆘 ꜱᴜᴘᴘᴏʀᴛ', CHANNEL_URL), Markup.button.url('👑 ᴍʏ ʟᴏʀᴅ', 'https://t.me/yorichiiprime')],
  Markup.button.url('💬 ᴄʜᴀᴛᴛɪɴɢ', 'https://t.me/youryori7')
]);
const helpKB = Markup.inlineKeyboard([Markup.button.callback('🔙 ʙᴀᴄᴋ', 'main_menu')]);
const cancelKB = Markup.inlineKeyboard([Markup.button.callback('❌ ᴄᴀɴᴄᴇʟ', 'cancel_collection')]);
const sendEditKB = Markup.inlineKeyboard([Markup.button.callback('✅ sᴇɴᴅ', 'confirm_send'), Markup.button.callback('✏️ ᴇᴅɪᴛ', 'confirm_edit')]);

// ========== FLOW ==========
bot.start(async ctx => {
  const uid = ctx.from.id;
  if (ctx.startPayload === 'say') return await handleSay(ctx);
  if (!await isMember(ctx, uid)) return ctx.reply(`⚠️ ᴘʟᴇᴀꜱᴇ ᴊᴏɪɴ ${REQUIRED_CHANNEL} ᴛᴏ ᴜꜱᴇ ᴛʜɪꜱ ʙᴏᴛ.`, Markup.inlineKeyboard([Markup.button.url('🔗 ᴊᴏɪɴ ᴄʜᴀɴɴᴇʟ', CHANNEL_URL)]));
  
  await upsertUser(uid, ctx.from.username, ctx.from.first_name, ctx.from.last_name);
  const eff = await ctx.telegram.sendMessage(uid, 'Hello!', { message_effect_id: FIRE_EFFECT_ID });
  await new Promise(r => setTimeout(r, 1500)); await eff.delete().catch(()=>{});

  await ctx.replyWithPhoto(IMAGE_URL, {
    caption: `🔥 **ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ʏᴏʀɪ'ꜱ ᴘᴇʀꜱᴏɴᴀʟ ᴍᴇꜱꜱᴇɴɢᴇʀ ʙᴏᴛ!** 🔥\n\n▫️ **ʜᴏᴡ ᴛᴏ ᴜꜱᴇ**\n• ᴜꜱᴇ \`/say\` ᴛᴏ ꜱᴇɴᴅ ᴀ ᴘʀɪᴠᴀᴛᴇ ᴍᴇꜱꜱᴀɢᴇ ᴛᴏ ᴛʜᴇ ᴀᴅᴍɪɴ.\n• ʏᴏᴜ ᴄᴀɴ ꜱᴇɴᴅ ᴛᴇxᴛ, ᴘʜᴏᴛᴏ, ᴠɪᴅᴇᴏ, ꜰɪʟᴇ, ᴀᴜᴅɪᴏ ᴏʀ ᴠᴏɪᴄᴇ.\n• ʏᴏᴜ ᴡɪʟʟ ʀᴇᴄᴇɪᴠᴇ ᴀ ʀᴇᴘʟʏ ɪꜰ ᴛʜᴇ ᴀᴅᴍɪɴ ᴄʜᴏᴏꜱᴇꜱ ᴛᴏ ʀᴇꜱᴘᴏɴᴅ.\n\n▫️ **ɴᴏᴛᴇ**\n<tg-spoiler>ꜱᴏʀʀʏ ꜰᴏʀ ᴛʜᴇ ᴇᴀʀʟʏ ꜰᴏʀᴄᴇ ᴊᴏɪɴ 🙂</tg-spoiler>`,
    parse_mode: 'HTML', ...mainKB
  });
});

bot.command('say', handleSay);
async function handleSay(ctx) {
  const uid = ctx.from.id;
  if (!await isMember(ctx, uid)) return ctx.reply(`⚠️ ᴘʟᴇᴀꜱᴇ ᴊᴏɪɴ ${REQUIRED_CHANNEL} ꜰɪʀꜱᴛ.`, Markup.inlineKeyboard([Markup.button.url('🔗 ᴊᴏɪɴ ᴄʜᴀɴɴᴇʟ', CHANNEL_URL)]));
  const { state } = await getConv(uid);
  if (state === 'awaiting') return ctx.reply('⚠️ ʏᴏᴜ ᴀʟʀᴇᴀᴅʏ ʜᴀᴠᴇ ᴀɴ ᴀᴄᴛɪᴠᴇ ᴍᴇꜱꜱᴀɢᴇ. ᴘʟᴇᴀꜱᴇ ꜰɪɴɪꜱʜ ᴏʀ ᴄᴀɴᴄᴇʟ ɪᴛ.', cancelKB);
  await setConv(uid, 'awaiting', {}, 'collection');
  await ctx.reply('✨ ᴘʟᴇᴀꜱᴇ ꜱᴇɴᴅ ᴛʜᴇ ᴍᴇꜱꜱᴀɢᴇ ʏᴏᴜ ᴡᴀɴᴛ ᴛᴏ ꜱᴇɴᴅ ᴛᴏ ᴛʜᴇ ᴀᴅᴍɪɴ:\n(ʏᴏᴜ ᴄᴀɴ ꜱᴇɴᴅ ᴛᴇxᴛ, ᴘʜᴏᴛᴏ, ᴠɪᴅᴇᴏ, ᴅᴏᴄᴜᴍᴇɴᴛ, ᴀᴜᴅɪᴏ ᴏʀ ᴠᴏɪᴄᴇ)', cancelKB);
}

bot.on(['text','photo','video','document','audio','voice'], async ctx => {
  const uid = ctx.from.id;
  const { state } = await getConv(uid);
  if (state !== 'awaiting') return;
  if (!await isMember(ctx, uid)) return ctx.reply(`⚠️ ᴘʟᴇᴀꜱᴇ ᴊᴏɪɴ ${REQUIRED_CHANNEL} ᴛᴏ ᴄᴏɴᴛɪɴᴜᴇ.`, Markup.inlineKeyboard([Markup.button.url('🔗 ᴊᴏɪɴ ᴄʜᴀɴɴᴇʟ', CHANNEL_URL)]));

  const txt = ctx.message.text || ctx.message.caption || '';
  for (const bad of PROFANITY_LIST) if (new RegExp(`\\b${bad}\\b`, 'i').test(txt)) return ctx.reply('⚠️ ʏᴏᴜʀ ᴍᴇꜱꜱᴀɢᴇ ᴄᴏɴᴛᴀɪɴꜱ ᴡᴏʀᴅꜱ ᴛʜᴀᴛ ᴠɪᴏʟᴀᴛᴇ @ʏᴏʀɪꜰᴇᴅᴇʀᴀᴛɪᴏɴ ᴘᴏʟɪᴄʏ.\nᴘʟᴇᴀꜱᴇ ᴜꜱᴇ /ꜱᴀʏ ᴀɢᴀɪɴ ᴡɪᴛʜ ᴀ ᴘʀᴏᴘᴇʀ ᴍᴇꜱꜱᴀɢᴇ.');

  const m = ctx.message;
  let type, content, file_id, caption;
  if (m.text) { type='text'; content=m.text; }
  else if (m.photo) { type='photo'; file_id=m.photo[m.photo.length-1].file_id; caption=m.caption; }
  else if (m.video) { type='video'; file_id=m.video.file_id; caption=m.caption; }
  else if (m.document) { type='document'; file_id=m.document.file_id; caption=m.caption; }
  else if (m.audio) { type='audio'; file_id=m.audio.file_id; caption=m.caption; }  else if (m.voice) { type='voice'; file_id=m.voice.file_id; }
  else return ctx.reply('❌ ᴜɴꜱᴜᴘᴘᴏʀᴛᴇᴅ ᴍᴇꜱꜱᴀɢᴇ ᴛʏᴘᴇ.');

  const temp = { type, content, file_id, caption };
  await setConv(uid, 'awaiting', temp, 'collection');
  const prev = type==='text' && content?.length>100 ? content.slice(0,100)+'...' : type.toUpperCase();
  const capPrev = (caption && type!=='text') ? ` (ᴄᴀᴘᴛɪᴏɴ: ${caption.slice(0,50)})` : '';
  await ctx.reply(`📬 ʏᴏᴜʀ ᴍᴇꜱꜱᴀɢᴇ ɪꜱ ʀᴇᴀᴅʏ!\n📝 ᴘʀᴇᴠɪᴇᴡ: ${prev}${capPrev}\n✅ sᴇɴᴅ – ꜰᴏʀᴡᴀʀᴅ ᴛᴏ ᴀᴅᴍɪɴ\n✏️ ᴇᴅɪᴛ – ꜱᴛᴀʀᴛ ᴏᴠᴇʀ`, sendEditKB);
});

bot.action('confirm_send', async ctx => {
  await ctx.answerCbQuery();
  const uid = ctx.from.id;
  const { tempData } = await getConv(uid);
  if (!tempData) return ctx.editMessageText('❌ ɴᴏ ᴍᴇꜱꜱᴀɢᴇ ꜰᴏᴜɴᴅ. ᴜꜱᴇ /ꜱᴀʏ ᴀɢᴀɪɴ.', { reply_markup: { inline_keyboard: [] } }).then(() => setConv(uid));

  await storeMsg(uid, tempData.type, tempData.content, tempData.file_id, tempData.caption);
  const uname = ctx.from.username || ctx.from.first_name;
  const hdr = `😁 ɴᴇᴡ ᴍᴇꜱꜱᴀɢᴇ ꜰʀᴏᴍ ᴜꜱᴇʀ!\n👤 ᴜꜱᴇʀ: @${uname}\n🆔 ɪᴅ: \`${uid}\`\n⏰ ᴛɪᴍᴇ: ${new Date().toISOString()}\n`;
  let oid = null;
  try {
    const t = tempData.type;
    const send = (fn, ...args) => ctx.telegram[fn](OWNER_ID, ...args);
    if (t==='text') { const s=await send('sendMessage', hdr+`📝 ᴍᴇꜱꜱᴀɢᴇ:\n${tempData.content}`); oid=s.message_id; }
    else if (t==='photo') { if(tempData.caption) await send('sendMessage', hdr+`📝 ᴄᴀᴘᴛɪᴏɴ: ${tempData.caption}`); const s=await send('sendPhoto', tempData.file_id); oid=s.message_id; }
    else if (t==='video') { if(tempData.caption) await send('sendMessage', hdr+`📝 ᴄᴀᴘᴛɪᴏɴ: ${tempData.caption}`); const s=await send('sendVideo', tempData.file_id); oid=s.message_id; }
    else if (t==='document') { if(tempData.caption) await send('sendMessage', hdr+`📝 ᴄᴀᴘᴛɪᴏɴ: ${tempData.caption}`); const s=await send('sendDocument', tempData.file_id); oid=s.message_id; }
    else if (t==='audio') { if(tempData.caption) await send('sendMessage', hdr+`📝 ᴄᴀᴘᴛɪᴏɴ: ${tempData.caption}`); const s=await send('sendAudio', tempData.file_id); oid=s.message_id; }
    else { const s=await send('sendVoice', tempData.file_id); oid=s.message_id; }
  } catch(e) {
    return ctx.editMessageText('❌ ꜰᴀɪʟᴇᴅ ᴛᴏ ꜰᴏʀᴡᴀʀᴅ. ᴘʟᴇᴀꜱᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.', { reply_markup: { inline_keyboard: [] } }).then(() => setConv(uid));
  }
  if (oid) { await setFwd(uid, oid); await setConv(uid); await ctx.editMessageText('✅ ᴍᴇꜱꜱᴀɢᴇ ꜱᴇɴᴛ ᴛᴏ ᴛʜᴇ ᴀᴅᴍɪɴ!\nʏᴏᴜ ᴄᴀɴ ꜱᴇɴᴅ ᴀɴᴏᴛʜᴇʀ ᴜꜱɪɴɢ /ꜱᴀʏ.', { reply_markup: { inline_keyboard: [] } }); }
});

bot.action('confirm_edit', async ctx => { await ctx.answerCbQuery(); await setConv(ctx.from.id); await ctx.editMessageText('✏️ ᴏᴋᴀʏ, ꜱᴇɴᴅ ʏᴏᴜʀ ɴᴇᴡ ᴍᴇꜱꜱᴀɢᴇ ᴡɪᴛʜ /ꜱᴀʏ.', { reply_markup: { inline_keyboard: [] } }); await handleSay(ctx); });
bot.action('cancel_collection', async ctx => { await ctx.answerCbQuery(); await setConv(ctx.from.id); await ctx.editMessageText('❌ ᴄᴏʟʟᴇᴄᴛɪᴏɴ ᴄᴀɴᴄᴇʟʟᴇᴅ. ʏᴏᴜ ᴄᴀɴ ꜱᴛᴀʀᴛ ᴀɢᴀɪɴ ᴡɪᴛʜ /ꜱᴀʏ.', { reply_markup: { inline_keyboard: [] } }); });
bot.action('main_menu', async ctx => {
  await ctx.answerCbQuery();
  if (!await isMember(ctx, ctx.from.id)) return ctx.editMessageText(`⚠️ ᴘʟᴇᴀꜱᴇ ᴊᴏɪɴ ${REQUIRED_CHANNEL} ꜰɪʀꜱᴛ.`, { reply_markup: { inline_keyboard: [] } });
  await ctx.editMessageCaption('🔥 **ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ʏᴏʀɪ'ꜱ ᴘᴇʀꜱᴏɴᴀʟ ᴍᴇꜱꜱᴇɴɢᴇʀ ʙᴏᴛ!** 🔥\n\n▫️ **ʜᴏᴡ ᴛᴏ ᴜꜱᴇ**\n• ᴜꜱᴇ \`/ꜱᴀʏ\` ᴛᴏ ꜱᴇɴᴅ ᴀ ᴘʀɪᴠᴀᴛᴇ ᴍᴇꜱꜱᴀɢᴇ ᴛᴏ ᴛʜᴇ ᴀᴅᴍɪɴ.\n• ʏᴏᴜ ᴄᴀɴ ꜱᴇɴᴅ ᴛᴇxᴛ, ᴘʜᴏᴛᴏ, ᴠɪᴅᴇᴏ, ꜰɪʟᴇ, ᴀᴜᴅɪᴏ ᴏʀ ᴠᴏɪᴄᴇ.\n• ʏᴏᴜ ᴡɪʟʟ ʀᴇᴄᴇɪᴠᴇ ᴀ ʀᴇᴘʟʏ ɪꜰ ᴛʜᴇ ᴀᴅᴍɪɴ ᴄʜᴏᴏꜱᴇꜱ ᴛᴏ ʀᴇꜱᴘᴏɴᴅ.\n\n▫️ **ɴᴏᴛᴇ**\n<tg-spoiler>ꜱᴏʀʀʏ ꜰᴏʀ ᴛʜᴇ ᴇᴀʀʟʏ ꜰᴏʀᴄᴇ ᴊᴏɪɴ 🙂</tg-spoiler>', { parse_mode: 'HTML', ...mainKB });
});
bot.action('help_menu', async ctx => { await ctx.answerCbQuery(); await ctx.editMessageCaption('❓ **ʜᴇʟᴘ ᴍᴇɴᴜ**\n\n📌 **ʜᴏᴡ ᴛᴏ ꜱᴇɴᴅ ᴀ ᴍᴇꜱꜱᴀɢᴇ**\n1️⃣ ᴛʏᴘᴇ \`/ꜱᴀʏ\`\n2️⃣ ꜱᴇɴᴅ ʏᴏᴜʀ ᴍᴇꜱꜱᴀɢᴇ\n3️⃣ ʀᴇᴠɪᴇᴡ & ᴄʟɪᴄᴋ ✅ sᴇɴᴅ\n\n🔙 ᴜꜱᴇ ʙᴀᴄᴋ ᴛᴏ ʀᴇᴛᴜʀɴ.', { parse_mode: 'Markdown', ...helpKB }); });

bot.command('reply', async ctx => {
  if (ctx.from.id !== OWNER_ID) return ctx.reply('❌ ᴘᴇʀᴍɪꜱꜱɪᴏɴ ᴅᴇɴɪᴇᴅ.');
  const args = ctx.message.text.split(' ').slice(1);
  if (!args[0]) return ctx.reply('ᴜꜱᴀɢᴇ: `/ʀᴇᴘʟʏ @ᴜꜱᴇʀɴᴀᴍᴇ ᴍᴇꜱꜱᴀɢᴇ`', { parse_mode: 'Markdown' });
  const un = args[0].replace('@',''); const txt = args.slice(1).join(' ');
  if (!txt) return ctx.reply('ᴘʟᴇᴀꜱᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴍᴇꜱꜱᴀɢᴇ ᴛᴏ ꜱᴇɴᴅ.');  const r = await sql`SELECT user_id FROM users WHERE LOWER(username) = LOWER(${un})`;
  if (!r.rows.length) return ctx.reply(`❌ ᴜꜱᴇʀ @${un} ɴᴏᴛ ꜰᴏᴜɴᴅ.`);
  try {
    await ctx.telegram.sendMessage(r.rows[0].user_id, `📨 ᴀᴅᴍɪɴ ʀᴇᴘʟɪᴇᴅ:\n${txt}`);
    await ctx.reply(`✅ ʀᴇᴘʟʏ ꜱᴇɴᴛ ᴛᴏ @${un}.`);
    const fid = await getFwd(r.rows[0].user_id);
    if (fid) { await ctx.telegram.deleteMessage(OWNER_ID, fid).catch(()=>{}); await delFwd(r.rows[0].user_id); }
  } catch(e) { ctx.reply(`❌ ꜰᴀɪʟᴇᴅ: ${e.message}`); }
});

bot.command('stats', async ctx => {
  if (ctx.from.id !== OWNER_ID) return;
  const u = await sql`SELECT COUNT(*) FROM users`; const m = await sql`SELECT COUNT(*) FROM messages`;
  ctx.reply(`📊 *ʙᴏᴛ ꜱᴛᴀᴛɪꜱᴛɪᴄꜱ*\n👥 ᴛᴏᴛᴀʟ ᴜꜱᴇʀꜱ: ${u.rows[0].count}\n💬 ᴛᴏᴛᴀʟ ᴍᴇꜱꜱᴀɢᴇꜱ: ${m.rows[0].count}`, { parse_mode: 'Markdown' });
});

// ========== VERCEL EXPORT ==========
export default async function handler(req, res) {
  if (req.method === 'POST') await bot.handleUpdate(req.body, res);
  else res.status(200).json({ status: 'ok' });
}

initDB().catch(console.error);
