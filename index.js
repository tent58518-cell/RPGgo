require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  Routes,
  REST,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} = require('discord.js');

// データを保存する単一のファイルパスを定義
const DATA_FILE = './data.json';

// 全てのデータを保持する単一のオブジェクト
let data = {
  items: [],
  monsters: [],
  dropItems: [],
  gachaItems: [],
  players: {},
  roles: {},
  settings: { winImage: '', loseImage: '' },
  battles: {} // バトル状態をユーザーIDで管理
};

// データをファイルから読み込む関数
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      if (fileData) {
        data = JSON.parse(fileData);
        // 新しいデータ構造を反映するため、既存のデータに不足しているキーがあれば追加
        data.settings = data.settings || { winImage: '', loseImage: '' };
        data.roles = data.roles || {};
        data.items = data.items || [];
        data.monsters = data.monsters || [];
        data.dropItems = data.dropItems || [];
        data.gachaItems = data.gachaItems || [];
        data.players = data.players || {};
        data.battles = data.battles || {}; // 新しいバトル用データ
        console.log('✅ データを読み込みました。');
      } else {
        console.warn('データファイルが空です。初期データを使用します。');
      }
    } else {
      console.warn('データファイルが見つかりません。新規作成します。');
      saveData();
    }
  } catch (error) {
    console.error('❌ データの読み込みに失敗しました:', error);
  }
}

// データをファイルに保存する関数
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('✅ データファイルに保存しました。');
  } catch (error) {
    console.error('❌ データファイルの保存に失敗しました:', error);
  }
}

loadData();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel],
});

const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

const itemTypeChoices = [
  { name: '頭', value: '頭' },
  { name: '胴体', value: '胴体' },
  { name: '足', value: '足' },
  { name: '武器', value: '武器' },
  { name: 'ドロップ', value: 'ドロップゴミ' },
  { name: '回復', value: '回復' },
  { name: '耳', value: '耳' },
  { name: '人差し指', value: '人差し指' },
  { name: '中指', value: '中指' },
  { name: '薬指', value: '薬指' },
  { name: '小指', value: '小指' },
  { name: 'ピアス', value: 'ピアス' },
  { name: 'ピアス2', value: 'ピアス2' },
  { name: '特殊', value: '特殊' },
  { name: '精霊', value: '精霊' },
  { name: '加護', value: '加護' },
  { name: '呪い', value: '呪い' },
];

const equipmentTypeChoices = [
  { name: '頭', value: '頭' },
  { name: '胴体', value: '胴体' },
  { name: '足', value: '足' },
  { name: '武器', value: '武器' },
  { name: '耳', value: '耳' },
  { name: '人差し指', value: '人差し指' },
  { name: '中指', value: '中指' },
  { name: '薬指', value: '薬指' },
  { name: '小指', value: '小指' },
  { name: 'ピアス', value: 'ピアス' },
  { name: 'ピアス2', value: 'ピアス2' },
  { name: '特殊', value: '特殊' },
  { name: '精霊', value: '精霊' },
  { name: '加護', value: '加護' },
  { name: '呪い', value: '呪い' },
];

const commands = [
  new SlashCommandBuilder().setName('item_set').setDescription('アイテムを設定')
    .addStringOption(o => o.setName('name').setDescription('名前').setRequired(true))
    .addIntegerOption(o => o.setName('min_attack').setDescription('攻撃力の最低値').setRequired(true))
    .addIntegerOption(o => o.setName('max_attack').setDescription('攻撃力の最高値').setRequired(true))
    .addIntegerOption(o => o.setName('min_defense').setDescription('防御力の最低値').setRequired(true))
    .addIntegerOption(o => o.setName('max_defense').setDescription('防御力の最高値').setRequired(true))
    .addIntegerOption(o => o.setName('min_speed').setDescription('素早さの最低値').setRequired(true))
    .addIntegerOption(o => o.setName('max_speed').setDescription('素早さの最高値').setRequired(true))
    .addIntegerOption(o => o.setName('min_mp').setDescription('MPの最低値').setRequired(true))
    .addIntegerOption(o => o.setName('max_mp').setDescription('MPの最高値').setRequired(true))
    .addIntegerOption(o => o.setName('min_weight').setDescription('重量の最低値').setRequired(true))
    .addIntegerOption(o => o.setName('max_weight').setDescription('重量の最高値').setRequired(true))
    .addStringOption(o => o.setName('rarity').setDescription('レア度').setRequired(true).addChoices(
      { name: 'A', value: 'A' },
      { name: 'B', value: 'B' },
      { name: 'C', value: 'C' },
      { name: 'D', value: 'D' },
    ))
    .addStringOption(o => o.setName('type').setDescription('種類').setRequired(true).addChoices(...itemTypeChoices))
    .addAttachmentOption(o => o.setName('image').setDescription('画像ファイル').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('item_get').setDescription('アイテムの詳細情報を取得')
    .addStringOption(o => o.setName('name').setDescription('アイテム名').setRequired(true)),

  new SlashCommandBuilder().setName('list_items').setDescription('設定済みのアイテムを一覧表示'),

  new SlashCommandBuilder().setName('monster_set').setDescription('モンスターを設定')
    .addStringOption(o => o.setName('name').setDescription('名前').setRequired(true))
    .addIntegerOption(o => o.setName('min_hp').setDescription('HPの最低値').setRequired(true))
    .addIntegerOption(o => o.setName('max_hp').setDescription('HPの最高値').setRequired(true))
    .addIntegerOption(o => o.setName('min_attack').setDescription('攻撃力の最低値').setRequired(true))
    .addIntegerOption(o => o.setName('max_attack').setDescription('攻撃力の最高値').setRequired(true))
    .addIntegerOption(o => o.setName('min_defense').setDescription('防御力の最低値').setRequired(true))
    .addIntegerOption(o => o.setName('max_defense').setDescription('防御力の最高値').setRequired(true))
    .addIntegerOption(o => o.setName('min_speed').setDescription('素早さの最低値').setRequired(true))
    .addIntegerOption(o => o.setName('max_speed').setDescription('素早さの最高値').setRequired(true))
    .addIntegerOption(o => o.setName('min_mp').setDescription('MPの最低値').setRequired(true))
    .addIntegerOption(o => o.setName('max_mp').setDescription('MPの最高値').setRequired(true))
    .addStringOption(o => o.setName('danger').setDescription('危険度').setRequired(true).addChoices(
      { name: 'スライム級', value: 'スライム級' },
      { name: 'ゴブリン級', value: 'ゴブリン級' },
      { name: 'ホブゴブリン級', value: 'ホブゴブリン級' },
      { name: 'オーク級', value: 'オーク級' },
      { name: 'ドラゴン級', value: 'ドラゴン級' },
      { name: '神級', value: '神級' },
    ))
    .addIntegerOption(o => o.setName('chance').setDescription('出現確率 (1〜100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addAttachmentOption(o => o.setName('image').setDescription('画像ファイル').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('monster_get').setDescription('モンスターの詳細情報を取得')
    .addStringOption(o => o.setName('name').setDescription('モンスター名').setRequired(true)),

  new SlashCommandBuilder().setName('list_monsters').setDescription('設定済みのモンスターを一覧表示'),

  new SlashCommandBuilder().setName('list_gachaitems').setDescription('ガチャ排出アイテム一覧を表示'),

  new SlashCommandBuilder().setName('list_dropitems').setDescription('モンスターのドロップアイテム一覧を表示'),

  new SlashCommandBuilder().setName('role_stats').setDescription('ロールの初期ステータスを設定')
    .addRoleOption(o => o.setName('role').setDescription('ロール').setRequired(true))
    .addIntegerOption(o => o.setName('attack').setDescription('攻撃力').setRequired(true))
    .addIntegerOption(o => o.setName('defense').setDescription('防御力').setRequired(true))
    .addIntegerOption(o => o.setName('speed').setDescription('素早さ').setRequired(true))
    .addIntegerOption(o => o.setName('hp').setDescription('HP').setRequired(true))
    .addIntegerOption(o => o.setName('mp').setDescription('MP').setRequired(true))
    .addIntegerOption(o => o.setName('weight_limit').setDescription('重量上限').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('myinventory').setDescription('自分のインベントリを確認'),
  new SlashCommandBuilder().setName('sell_item').setDescription('アイテムを換金')
    .addStringOption(o => o.setName('name').setDescription('換金するアイテム名').setRequired(true)),
  new SlashCommandBuilder().setName('soubi').setDescription('アイテムを装備')
    .addStringOption(o => o.setName('type').setDescription('装備部位').setRequired(true).addChoices(...equipmentTypeChoices))
    .addStringOption(o => o.setName('name').setDescription('アイテム名').setRequired(true)),
  new SlashCommandBuilder().setName('checksoubi').setDescription('現在の装備アイテムを確認'),
  new SlashCommandBuilder().setName('dropitem_set').setDescription('モンスターのドロップアイテム設定')
    .addStringOption(o => o.setName('monster').setDescription('モンスター名').setRequired(true))
    .addStringOption(o => o.setName('item').setDescription('アイテム名').setRequired(true))
    .addIntegerOption(o => o.setName('chance').setDescription('ドロップ確率').setRequired(true))
    .addIntegerOption(o => o.setName('gold').setDescription('換金額').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('gachaitem_set').setDescription('ガチャ排出アイテム設定')
    .addStringOption(o => o.setName('item').setDescription('アイテム名').setRequired(true))
    .addIntegerOption(o => o.setName('chance').setDescription('排出確率').setRequired(true))
    .addIntegerOption(o => o.setName('gold').setDescription('換金額').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('role_pay').setDescription('ロールにアイテムやgold付与')
    .addRoleOption(o => o.setName('role').setDescription('ロール').setRequired(true))
    .addStringOption(o => o.setName('item').setDescription('アイテム名').setRequired(false))
    .addIntegerOption(o => o.setName('gold').setDescription('ゴールド').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // ゴールド付与コマンドを追加
  new SlashCommandBuilder().setName('gold_pay').setDescription('指定したユーザーにゴールドを付与（管理者専用）')
    .addUserOption(o => o.setName('user').setDescription('ゴールドを付与するユーザー').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('付与するゴールドの額').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('item_pay').setDescription('指定したユーザーにアイテムを付与')
    .addUserOption(o => o.setName('user').setDescription('アイテムを付与するユーザー').setRequired(true))
    .addStringOption(o => o.setName('item').setDescription('アイテム名').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('win_image').setDescription('勝利時画像設定')
    .addAttachmentOption(o => o.setName('image').setDescription('画像ファイル').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('lose_image').setDescription('敗北時画像設定')
    .addAttachmentOption(o => o.setName('image').setDescription('画像ファイル').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('refresh').setDescription('ロールの基礎ステータスを更新')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('finalbattle').setDescription('モンスターと戦う')
    .addAttachmentOption(o => o.setName('image').setDescription('埋め込みに表示する画像').setRequired(false)),
  new SlashCommandBuilder().setName('pvp').setDescription('他のプレイヤーと対戦'),
  new SlashCommandBuilder().setName('gacha').setDescription('ガチャを引く')
    .addAttachmentOption(o => o.setName('image').setDescription('ガチャ埋め込みに表示する画像').setRequired(false)),

  new SlashCommandBuilder().setName('list_role_stats').setDescription('ロールごとの基礎ステータスを一覧表示'),
  new SlashCommandBuilder().setName('showstats').setDescription('自分の基本ステータスと装備ボーナスを確認'),
  new SlashCommandBuilder().setName('watchstats').setDescription('自分の基礎ステータス＋装備ステータスとゴールドを確認'),
  // 新しいコマンドを追加
  new SlashCommandBuilder().setName('watch').setDescription('指定したユーザーのステータス、持ち物、装備品を確認')
    .addUserOption(option => option.setName('user').setDescription('ステータスを確認したいユーザー').setRequired(true)),
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands.map(cmd => cmd.toJSON()) },
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

function initPlayer(userId, roleName) {
  if (!data.players[userId]) {
    const roleStats = data.roles[roleName] || { attack: 5, defense: 5, speed: 5, hp: 50, mp: 20, weight_limit: 50 };
    data.players[userId] = {
      ...roleStats,
      gold: 50,
      items: [],
      equipped: {
        '頭': null,
        '胴体': null,
        '足': null,
        '武器': null,
        '耳': null,
        '人差し指': null,
        '中指': null,
        '薬指': null,
        '小指': null,
        'ピアス': null,
        'ピアス2': null,
        '特殊': null,
        '精霊': null,
        '加護': null,
        '呪い': null,
      }
    };
    saveData();
  } else {
    // 既存のプレイヤーデータに不足しているフィールドを追加
    const equippedSlots = {
      '頭': null, '胴体': null, '足': null, '武器': null, '耳': null,
      '人差し指': null, '中指': null, '薬指': null, '小指': null,
      'ピアス': null, 'ピアス2': null, '特殊': null, '精霊': null,
      '加護': null, '呪い': null,
    };
    data.players[userId].equipped = data.players[userId].equipped || {};
    data.players[userId].equipped = { ...equippedSlots, ...data.players[userId].equipped };
    data.players[userId].items = data.players[userId].items || [];
    data.players[userId].gold = data.players[userId].gold || 50;
    saveData();
  }
}

function getEquippedStats(player) {
    let totalStats = { attack: 0, defense: 0, speed: 0, mp: 0, hp: 0 };
    if (!player || !player.equipped) return totalStats;

    for (const slot in player.equipped) {
        const item = player.equipped[slot];
        if (item) {
            totalStats.attack += item.attack || 0;
            totalStats.defense += item.defense || 0;
            totalStats.speed += item.speed || 0;
            totalStats.mp += item.mp || 0;
            // 回復アイテムはHPボーナスとして扱わない
            if (item.type !== '回復') {
              totalStats.hp += item.hp || 0;
            }
        }
    }
    return totalStats;
}

function getPlayerFinalStats(member) {
  const userId = member.user.id;
  const player = data.players[userId];
  const roleName = member.roles.cache.find(role => data.roles[role.name])?.name;
  const roleStats = data.roles[roleName] || { attack: 5, defense: 5, speed: 5, hp: 50, mp: 20, weight_limit: 50 };
  const equippedStats = getEquippedStats(player);

  const finalAttack = Math.floor(roleStats.attack + equippedStats.attack);
  const finalDefense = Math.floor(roleStats.defense + equippedStats.defense);
  const finalSpeed = Math.floor(roleStats.speed + equippedStats.speed);
  // HP計算を修正：基礎HP + 基礎防御力 + 装備による防御力 + 装備によるHPボーナス
  const finalHP = Math.floor(roleStats.hp + roleStats.defense + equippedStats.defense + equippedStats.hp);
  const finalMP = Math.floor(roleStats.mp + equippedStats.mp);

  return { finalAttack, finalDefense, finalSpeed, finalHP, finalMP, weightLimit: roleStats.weight_limit, roleName };
}

function createPlayerEmbed(userId, member) {
  const p = data.players[userId];
  if (!p) {
    return new EmbedBuilder()
      .setTitle('エラー')
      .setDescription('プレイヤーデータが見つかりません。まずバトルを開始するか、/showstatsコマンドを実行してください。')
      .setColor(0xff0000);
  }

  const { finalAttack, finalDefense, finalSpeed, finalHP, finalMP, weightLimit, roleName } = getPlayerFinalStats(member);
  const equippedStats = getEquippedStats(p);
  const roleStats = data.roles[roleName] || { attack: 5, defense: 5, speed: 5, hp: 50, mp: 20, weight_limit: 50 };

  const equippedItems = Object.entries(p.equipped)
    .map(([slot, item]) => `${slot}: ${item ? `${item.name} (攻:${item.attack}, 防:${item.defense}, 素:${item.speed}, MP:${item.mp}, 重:${item.weight})` : 'なし'}`)
    .join('\n');

  // 装備していないアイテムの重量のみを計算
  const currentWeight = p.items.reduce((sum, item) => {
    return sum + (item ? (item.weight || 0) : 0);
  }, 0);

  return new EmbedBuilder()
    .setTitle('プレイヤーステータス')
    .setDescription(`
      **ロール**: ${roleName || 'なし'}
      **HP**: ${finalHP} (基本: ${roleStats.hp} + 基礎防御: ${roleStats.defense} + 装備防御: ${equippedStats.defense})
      **MP**: ${finalMP} (基本: ${roleStats.mp} + 装備: ${equippedStats.mp})

      **攻撃力:**
      基本: ${roleStats.attack} + 装備: ${equippedStats.attack} = **合計: ${finalAttack}**

      **防御力:**
      基本: ${roleStats.defense} + 装備: ${equippedStats.defense} = **合計: ${finalDefense}**
      ※ 攻撃力と防御力はHPに影響します。

      **素早さ:**
      基本: ${roleStats.speed} + 装備: ${equippedStats.speed} = **合計: ${finalSpeed}**

      **Gold**: ${p.gold}
      **重量**: ${currentWeight} / ${weightLimit}

      **装備:**
      ${equippedItems}
    `);
}

function createWatchStatsEmbed(userId, member) {
  const p = data.players[userId];
  if (!p) {
    return new EmbedBuilder()
      .setTitle('エラー')
      .setDescription('プレイヤーデータが見つかりません。まずバトルを開始するか、他のコマンドでデータを初期化してください。')
      .setColor(0xff0000);
  }

  const { finalAttack, finalDefense, finalSpeed, finalHP, finalMP } = getPlayerFinalStats(member);

  const equippedStats = getEquippedStats(p);

  return new EmbedBuilder()
    .setTitle(`${member.displayName}のステータス`)
    .setColor(0x0099ff)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '💰 ゴールド', value: `${p.gold}`, inline: true },
      { name: '\u200B', value: '\u200B', inline: true }, // スペーサー
      { name: 'HP', value: `${finalHP}`, inline: true },
      { name: 'MP', value: `${finalMP}`, inline: true },
      { name: '攻撃力', value: `${finalAttack} (+${equippedStats.attack})`, inline: true },
      { name: '防御力', value: `${finalDefense} (+${equippedStats.defense})`, inline: true },
      { name: '素早さ', value: `${finalSpeed} (+${equippedStats.speed})`, inline: true }
    );
}

async function saveImage(attachment) {
    if (!attachment) return null;
    const filePath = path.join(imagesDir, attachment.name);
    try {
        const response = await fetch(attachment.url);
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));
        console.log(`✅ 画像ファイル ${attachment.name} を保存しました。`);
        return attachment.name;
    } catch (error) {
        console.error(`❌ 画像ファイル ${attachment.name} の保存に失敗しました:`, error);
        return null;
    }
}

// === PvPとPvEの両方に対応したバトル埋め込みを生成する関数 ===
function createBattleEmbed(battleState) {
    const { isPvP, p1_name, p2_name, player1, player2, player, enemy, log, p_defense_active, e_defense_active, e_name } = battleState;

    if (isPvP) {
        const p1_defense_text = player1.defense_active ? '✅防御中' : '通常';
        const p2_defense_text = player2.defense_active ? '✅防御中' : '通常';

        const embed = new EmbedBuilder()
            .setTitle('⚔️ PvP バトル！')
            .setDescription('**行動ログ:**\n' + log)
            .setColor(0xffa500)
            .addFields(
                {
                    name: `⚔️ あなた (${p1_name})`,
                    value: `
                        **HP**: ${player1.currentHP} / ${player1.maxHP}
                        **MP**: ${player1.currentMP} / ${player1.maxMP}
                        **攻撃力**: ${player1.attack}
                        **防御力**: ${player1.defense}
                        **素早さ**: ${player1.speed}
                        **状態**: ${p1_defense_text}
                    `,
                    inline: true
                },
                {
                    name: `⚔️ 敵 (${p2_name})`,
                    value: `
                        **HP**: ${player2.currentHP} / ${player2.maxHP}
                        **MP**: ${player2.currentMP} / ${player2.maxMP}
                        **攻撃力**: ${player2.attack}
                        **防御力**: ${player2.defense}
                        **素早さ**: ${player2.speed}
                        **状態**: ${p2_defense_text}
                    `,
                    inline: true
                }
            );
        return embed;
    } else { // PvEの場合
        const p_defense_text = player.defense_active ? '✅防御中' : '通常';
        const e_defense_text = enemy.defense_active ? '✅防御中' : '通常';

        const playerStatus = `
            **HP**: ${player.currentHP} / ${player.maxHP}
            **MP**: ${player.currentMP} / ${player.maxMP}
            **攻撃力**: ${player.attack}
            **防御力**: ${player.defense}
            **素早さ**: ${player.speed}
            **状態**: ${p_defense_text}
        `;

        const enemyStatus = `
            **HP**: ${enemy.currentHP} / ${enemy.maxHP}
            **MP**: ${enemy.currentMP} / ${enemy.maxMP}
            **攻撃力**: ${enemy.attack}
            **防御力**: ${enemy.defense}
            **素早さ**: ${enemy.speed}
            **状態**: ${e_defense_text}
        `;

        const embed = new EmbedBuilder()
            .setTitle('⚔️ バトル！')
            .setDescription('**行動ログ:**\n' + log)
            .setColor(0x0099ff)
            .addFields(
                { name: `⚔️ あなた`, value: playerStatus, inline: true },
                { name: `👹 敵 (${e_name})`, value: enemyStatus, inline: true }
            );
        return embed;
    }
}

// バトルを強制終了させる関数（PvE・PvP両対応）
async function endBattleTimeout(userId, interaction) {
    const battleState = data.battles[userId];
    if (!battleState) return;

    battleState.isGameOver = true;
    battleState.isWin = false; // タイムアウトは敗北扱い

    try {
        let battleResultText = '';
        if (battleState.isPvP) {
            const loserId = (battleState.currentTurn === 'p1') ? battleState.p1_id : battleState.p2_id;
            const loserMember = await interaction.guild.members.fetch(loserId);
            battleResultText = `💀 **${loserMember.displayName}** が30秒間行動しなかったため、タイムアウトで敗北しました。\n`;
            battleState.isWin = (battleState.currentTurn !== 'p1'); // タイムアウトしなかった方が勝利
            await endPvPBattle(interaction, battleState);
        } else { // PvE
            battleResultText = `💀 **${battleState.p_name}** が30秒間行動しなかったため、バトルはタイムアウトで終了した。`;
            const battleEmbed = new EmbedBuilder()
                .setTitle('⚔️ バトル結果: 敗北...')
                .setColor(0xff0000)
                .setDescription(battleState.log + `\n> **${battleResultText}**`);

            const imageEmbed = new EmbedBuilder()
                .setTitle('💀 敗北の叫び...')
                .setColor(0xff0000);

            const loseImageFile = data.settings.loseImage;
            const files = [];
            if (loseImageFile) {
                const imagePath = path.join(imagesDir, loseImageFile);
                if (fs.existsSync(imagePath)) {
                    const attachmentName = `lose_${loseImageFile}`;
                    files.push(new AttachmentBuilder(imagePath, { name: attachmentName }));
                    imageEmbed.setImage(`attachment://${attachmentName}`);
                }
            }
            await interaction.editReply({ embeds: [battleEmbed, imageEmbed], components: [], files: files });
            delete data.battles[userId];
            saveData();
        }
    } catch (error) {
        console.error('Failed to edit battle message on timeout:', error);
    }
}

// タイムアウトを管理する関数
function startTimeout(userId, interaction) {
    // 既存のタイマーをクリア
    if (data.battles[userId] && data.battles[userId].timeout) {
      clearTimeout(data.battles[userId].timeout);
    }

    // 新しいタイマーを設定
    const timeout = setTimeout(() => {
        endBattleTimeout(userId, interaction);
    }, 30000); // 30秒

    // タイマーIDを保存
    if (data.battles[userId]) {
      data.battles[userId].timeout = timeout;
    }
}


async function updateBattleMessage(interaction, userId) {
    const battleState = data.battles[userId];
    if (!battleState) return;

    const embed = createBattleEmbed(battleState);
    const components = [];

    if (!battleState.isGameOver) {
        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(battleState.isPvP ? 'pvp_attack' : 'attack').setLabel('攻撃').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(battleState.isPvP ? 'pvp_defend' : 'defend').setLabel('防御').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(battleState.isPvP ? 'pvp_heal' : 'heal').setLabel('回復').setStyle(ButtonStyle.Success),
        );
        components.push(buttonRow);
    }

    // 埋め込みに画像を設定（PvEの場合のみ）
    if (!battleState.isPvP && battleState.e_image) {
        const imagePath = path.join(imagesDir, battleState.e_image);
        if (fs.existsSync(imagePath)) {
            const attachment = new AttachmentBuilder(imagePath, { name: battleState.e_image });
            embed.setThumbnail(`attachment://${battleState.e_image}`);
            await interaction.editReply({ embeds: [embed], components: components, files: [attachment] });
        } else {
            await interaction.editReply({ embeds: [embed], components: components });
        }
    } else {
        await interaction.editReply({ embeds: [embed], components: components });
    }

    // プレイヤーのターンならタイマーをスタート
    if (!battleState.isGameOver) {
      if ((!battleState.isPvP && battleState.currentTurn === 'player') || (battleState.isPvP && (battleState.currentTurn === 'p1' || battleState.currentTurn === 'p2'))) {
        startTimeout(userId, interaction);
      }
    }
}

async function endBattle(interaction, battleState) {
    const { player, enemy, p_id, p_name, isWin, e_name, e_image } = battleState;
    clearTimeout(battleState.timeout); // バトル終了時にタイマーをクリア

    let resultText = '';
    let imageFile = '';
    const battleEmbed = new EmbedBuilder()
      .setTitle(`⚔️ バトル結果: ${isWin ? '勝利' : '敗北'}`)
      .setColor(isWin ? 0x00ff00 : 0xff0000)
      .setDescription(battleState.log);
    const imageEmbed = new EmbedBuilder()
      .setTitle(isWin ? '🎉 勝利の雄叫び！' : '💀 敗北の叫び...')
      .setColor(isWin ? 0x00ff00 : 0xff0000);

    const battleFiles = [];
    const imageFiles = [];

    if (isWin) {
        resultText = `🎉 勝利！ **${e_name}** を倒した！\n`;
        imageFile = data.settings.winImage;
        const p = data.players[p_id];
        const member = interaction.member;
        const drop = data.dropItems.find(d => d.monster === e_name);

        let droppedItemWithStats = null;
        if (drop && Math.random() * 100 < drop.chance) {
            const droppedItemData = data.items.find(i => i.name === drop.item);

            if (droppedItemData) {
                // ドロップするアイテムのステータスをランダムで決定
                droppedItemWithStats = {
                    name: droppedItemData.name,
                    attack: Math.floor(Math.random() * (droppedItemData.max_attack - droppedItemData.min_attack + 1)) + droppedItemData.min_attack,
                    defense: Math.floor(Math.random() * (droppedItemData.max_defense - droppedItemData.min_defense + 1)) + droppedItemData.min_defense,
                    speed: Math.floor(Math.random() * (droppedItemData.max_speed - droppedItemData.min_speed + 1)) + droppedItemData.min_speed, // ここを修正
                    mp: Math.floor(Math.random() * (droppedItemData.max_mp - droppedItemData.min_mp + 1)) + droppedItemData.min_mp,
                    weight: Math.floor(Math.random() * (droppedItemData.max_weight - droppedItemData.min_weight + 1)) + droppedItemData.min_weight,
                    rarity: droppedItemData.rarity,
                    type: droppedItemData.type,
                    image: droppedItemData.image,
                    isEquipped: false,
                };
            }
        }

        if (droppedItemWithStats) {
            const currentWeight = p.items.reduce((sum, item) => {
                return sum + (item ? (item.weight || 0) : 0);
            }, 0);
            const { weightLimit } = getPlayerFinalStats(member);

            if (currentWeight + droppedItemWithStats.weight <= weightLimit) {
                p.items.push(droppedItemWithStats);
                resultText += `**${droppedItemWithStats.name}** を手に入れた！\n`;
            } else {
                resultText += `**${droppedItemWithStats.name}** をドロップしたが、重量制限のため破棄した。`;
            }
        } else {
             resultText += `アイテムはドロップしなかった...`;
        }

    } else {
        resultText = `💀 敗北... **${e_name}** に負けてしまった。`;
        imageFile = data.settings.loseImage;
    }

    saveData();

    battleEmbed.addFields(
      { name: '最終結果', value: resultText, inline: false }
    );

    if (e_image) {
        const monsterImagePath = path.join(imagesDir, e_image);
        if (fs.existsSync(monsterImagePath)) {
            const attachmentMonsterImageName = `monster_${e_image}`;
            battleFiles.push(new AttachmentBuilder(monsterImagePath, { name: attachmentMonsterImageName }));
            if (!battleEmbed.data.thumbnail) { // ドロップアイテム画像がなければモンスター画像をサムネイルに設定
              battleEmbed.setThumbnail(`attachment://${attachmentMonsterImageName}`);
            }
        }
    }

    if (imageFile) {
      const battleImagePath = path.join(imagesDir, imageFile);
      if (fs.existsSync(battleImagePath)) {
          const attachmentBattleImageName = `battle_${imageFile}`;
          imageFiles.push(new AttachmentBuilder(battleImagePath, { name: attachmentBattleImageName }));
          imageEmbed.setImage(`attachment://${attachmentBattleImageName}`);
      }
    }

    await interaction.editReply({
      content: '',
      embeds: [battleEmbed, imageEmbed],
      files: [...battleFiles, ...imageFiles],
      components: []
    });

    delete data.battles[interaction.user.id];
    saveData();
}

async function endPvPBattle(interaction, battleState) {
    const { p1_id, p1_name, p2_id, p2_name, isWin, log } = battleState;

    clearTimeout(battleState.timeout); // タイムアウトをクリア

    const winnerId = isWin ? p1_id : p2_id;
    const loserId = isWin ? p2_id : p1_id;
    const winnerMember = await interaction.guild.members.fetch(winnerId);
    const loserMember = await interaction.guild.members.fetch(loserId);
    const winnerData = data.players[winnerId];
    const loserData = data.players[loserId];

    winnerData.gold += 10;
    loserData.gold = Math.max(0, loserData.gold - 5);

    const allItems = data.items.filter(item => item.type !== 'ドロップゴミ' && item.type !== '回復');
    let droppedItemWithStats = null;
    if (allItems.length > 0) {
      const droppedItem = allItems[Math.floor(Math.random() * allItems.length)];
      droppedItemWithStats = {
          name: droppedItem.name,
          attack: Math.floor(Math.random() * (droppedItem.max_attack - droppedItem.min_attack + 1)) + droppedItem.min_attack,
          defense: Math.floor(Math.random() * (droppedItem.max_defense - droppedItem.min_defense + 1)) + droppedItem.min_defense,
          speed: Math.floor(Math.random() * (droppedItem.max_speed - droppedItem.min_speed + 1)) + droppedItem.min_speed, // ここを修正
          mp: Math.floor(Math.random() * (droppedItem.max_mp - droppedItem.min_mp + 1)) + droppedItem.min_mp,
          weight: Math.floor(Math.random() * (droppedItem.max_weight - droppedItem.min_weight + 1)) + droppedItem.min_weight,
          rarity: droppedItem.rarity,
          type: droppedItem.type,
          image: droppedItem.image,
          isEquipped: false,
      };

      const { weightLimit } = getPlayerFinalStats(winnerMember);
      const currentWeight = winnerData.items.reduce((sum, item) => sum + (item.weight || 0), 0);

      if (currentWeight + droppedItemWithStats.weight <= weightLimit) {
        winnerData.items.push(droppedItemWithStats);
      } else {
        const itemGold = data.gachaItems.find(i => i.item === droppedItemWithStats.name)?.gold || 1;
        winnerData.gold += itemGold;
        droppedItemWithStats = { ...droppedItemWithStats, name: `${droppedItemWithStats.name} (重量オーバーのため換金)` };
      }
    }

    saveData();

    // チャンネルに送信する勝利メッセージ
    const winnerBattleEmbed = new EmbedBuilder()
      .setTitle(`⚔️ バトル結果: ${winnerMember.displayName}の勝利！`)
      .setColor(0x00ff00)
      .setDescription(log)
      .addFields(
        { name: '最終結果', value: `🎉 勝利！\n\n獲得ゴールド: 10\n獲得アイテム: ${droppedItemWithStats?.name || 'なし'}`, inline: false }
      )
      .setThumbnail(winnerMember.user.displayAvatarURL());

    const winnerImageEmbed = new EmbedBuilder()
      .setTitle('🎉 勝利の雄叫び！')
      .setColor(0x00ff00);

    const winImageFile = data.settings.winImage;
    const winnerFiles = [];
    if (winImageFile) {
        const imagePath = path.join(imagesDir, winImageFile);
        if (fs.existsSync(imagePath)) {
            const attachmentName = `win_${winImageFile}`;
            winnerImageEmbed.setImage(`attachment://${attachmentName}`);
            winnerFiles.push(new AttachmentBuilder(imagePath, { name: attachmentName }));
        }
    }

    // チャンネルに送信する敗北メッセージ
    const loserBattleEmbed = new EmbedBuilder()
      .setTitle(`⚔️ バトル結果: ${loserMember.displayName}の敗北...`)
      .setColor(0xff0000)
      .setDescription(log)
      .addFields(
        { name: '最終結果', value: `💀 敗北...\n\n喪失ゴールド: 5`, inline: false }
      )
      .setThumbnail(loserMember.user.displayAvatarURL());

    const loserImageEmbed = new EmbedBuilder()
      .setTitle('💀 敗北の叫び...')
      .setColor(0xff0000);

    const loseImageFile = data.settings.loseImage;
    const loserFiles = [];
    if (loseImageFile) {
        const imagePath = path.join(imagesDir, loseImageFile);
        if (fs.existsSync(imagePath)) {
            const attachmentName = `lose_${loseImageFile}`;
            loserImageEmbed.setImage(`attachment://${attachmentName}`);
            loserFiles.push(new AttachmentBuilder(imagePath, { name: attachmentName }));
        }
    }

    // チャンネルに結果をまとめて送信
    const sentMessage = await interaction.channel.send({
      content: `${winnerMember}, ${loserMember} バトルが終了しました！`,
      embeds: [winnerBattleEmbed, winnerImageEmbed, loserBattleEmbed, loserImageEmbed],
      files: [...winnerFiles, ...loserFiles]
    });

    // 1分後にメッセージを削除
    setTimeout(() => {
      sentMessage.delete().catch(console.error);
    }, 60000); // 1分 = 60000ミリ秒

    // 元のメッセージを編集
    await interaction.editReply({ content: `バトルが終了しました。結果はチャンネルに投稿されました。`, components: [] });
    delete data.battles[interaction.user.id];
    saveData();
}


// PvPとPvEに対応したターン処理
async function takeTurn(interaction, action) {
    // deferUpdate を使用して、既存の返信を更新する
    await interaction.deferUpdate();

    const userId = interaction.user.id;
    const battleState = data.battles[userId];

    if (!battleState || battleState.isGameOver) {
        return interaction.editReply({ content: 'バトルは終了しています。' });
    }

    // どのプレイヤーが行動するかを決定
    let actingPlayer;
    let opponent;
    let actingPlayerName;
    let opponentName;
    let opponentEvasionChance = 0; // 相手の回避率

    if (battleState.isPvP) {
        if (battleState.currentTurn === 'p1' && battleState.p1_id !== userId) {
            return interaction.followUp({ content: '今はあなたのターンではありません。', ephemeral: true });
        }
        if (battleState.currentTurn === 'p2' && battleState.p2_id !== userId) {
            return interaction.followUp({ content: '今はあなたのターンではありません。', ephemeral: true });
        }
        actingPlayer = (battleState.currentTurn === 'p1') ? battleState.player1 : battleState.player2;
        opponent = (battleState.currentTurn === 'p1') ? battleState.player2 : battleState.player1;
        actingPlayerName = (battleState.currentTurn === 'p1') ? battleState.p1_name : battleState.p2_name;
        opponentName = (battleState.currentTurn === 'p1') ? battleState.p2_name : battleState.p1_name;
        opponentEvasionChance = Math.floor(opponent.speed / 10);
    } else { // PvEの場合
        if (battleState.currentTurn !== 'player' || battleState.p_id !== userId) {
            return interaction.followUp({ content: '今はあなたのターンではありません。', ephemeral: true });
        }
        actingPlayer = battleState.player;
        opponent = battleState.enemy;
        actingPlayerName = battleState.p_name;
        opponentName = battleState.e_name;
        opponentEvasionChance = Math.floor(opponent.speed / 10);
    }

    // 行動に応じて処理
    if (action.includes('attack')) {
        let isEvaded = Math.random() * 100 < opponentEvasionChance;
        if (isEvaded) {
            battleState.log += `> **${actingPlayerName}** の攻撃！ しかし **${opponentName}** は素早く回避した！\n`;
        } else {
            let damage = actingPlayer.attack;
            let isCritical = false;
            if (Math.random() < 0.15) { // 15%の確率でクリティカル
                damage = Math.floor(damage * 1.5);
                isCritical = true;
            }

            if (opponent.defense_active) {
                damage = Math.floor(damage * 0.95);
                battleState.log += `> **${opponentName}** は防御している！\n`;
            }
            opponent.currentHP -= damage;
            battleState.log += `> **${actingPlayerName}** の攻撃！ **${opponentName}** に **${damage}** のダメージ！${isCritical ? ' (クリティカル！)' : ''}\n`;
        }
        opponent.defense_active = false;
    } else if (action.includes('defend')) {
        actingPlayer.defense_active = true;
        battleState.log += `> **${actingPlayerName}** は防御の構えを取った！\n`;
    } else if (action.includes('heal')) {
        if (actingPlayer.currentMP >= 10) {
            actingPlayer.currentMP -= 10;
            actingPlayer.currentHP = Math.min(actingPlayer.maxHP, actingPlayer.currentHP + 5);
            battleState.log += `> **${actingPlayerName}** は回復した！ HPが5回復し、MPが10減少した。\n`;
        } else {
            battleState.log += `> **${actingPlayerName}** のMPが足りない！ 回復できなかった... MP: ${actingPlayer.currentMP}\n`;
        }
    }


    // 勝敗判定
    if (actingPlayer.currentHP <= 0 || opponent.currentHP <= 0) {
      battleState.isGameOver = true;
      if (battleState.isPvP) {
        battleState.isWin = actingPlayer.currentHP > 0;
        return endPvPBattle(interaction, battleState);
      } else {
        battleState.isWin = actingPlayer.currentHP > 0;
        return endBattle(interaction, battleState);
      }
    }

    // ターン交代
    if (battleState.isPvP) {
      battleState.currentTurn = (battleState.currentTurn === 'p1') ? 'p2' : 'p1';
      battleState.log += `\n> **${battleState.currentTurn === 'p1' ? battleState.p1_name : battleState.p2_name}** のターンです。行動を選択してください。\n`;
    } else {
      // 敵の行動（PvE）
      let enemyAction = 'attack';
      // モンスターのHPが低く、MPが十分にある場合に、一定確率（例：40%）で回復
      if (opponent.currentHP < (opponent.maxHP * 0.3) && opponent.currentMP >= 15 && Math.random() < 0.4) {
          enemyAction = 'heal';
      } else if (Math.random() < 0.2) { // 20%の確率で防御
          enemyAction = 'defend';
      }

      if (enemyAction === 'defend') {
          opponent.defense_active = true;
          battleState.log += `> **${opponentName}** は防御の構えを取った！\n`;
      } else if (enemyAction === 'heal') {
          opponent.currentMP -= 15;
          const healAmount = Math.floor(Math.random() * 10) + 15; // 15〜24回復
          opponent.currentHP = Math.min(opponent.maxHP, opponent.currentHP + healAmount);
          battleState.log += `> **${opponentName}** は回復魔法を使った！ HPが **${healAmount}** 回復し、MPが15減少した。\n`;
      } else {
          // 敵の攻撃ターンにプレイヤーの回避を判定
          let playerEvasionChance = Math.floor(actingPlayer.speed / 10);
          let isEvaded = Math.random() * 100 < playerEvasionChance;

          if (isEvaded) {
              battleState.log += `> **${opponentName}** の攻撃！ しかしあなたは素早く回避した！\n`;
          } else {
              let damage = opponent.attack;
              let isCritical = false;
              if (Math.random() < 0.1) { // 10%の確率でクリティカル
                  damage = Math.floor(damage * 1.5);
                  isCritical = true;
              }

              if (actingPlayer.defense_active) {
                  damage = Math.floor(damage * 0.95);
                  battleState.log += `> あなたは防御している！\n`;
              }
              actingPlayer.currentHP -= damage;
              battleState.log += `> **${opponentName}** の攻撃！ あなたに **${damage}** のダメージ！${isCritical ? ' (クリティカル！)' : ''}\n`;
          }
          actingPlayer.defense_active = false;
      }

      if (actingPlayer.currentHP <= 0) {
        battleState.isGameOver = true;
        battleState.isWin = false;
        saveData();
        return endBattle(interaction, battleState);
      }
      battleState.currentTurn = 'player';
      battleState.log += `\n> あなたのターンです。行動を選択してください。\n`;
      saveData();
    }

    // 既存のEphemeralメッセージを更新
    await updateBattleMessage(interaction, userId);
}


client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    const { commandName, options, user } = interaction;

    if (commandName === 'item_set') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'このコマンドは管理者のみ実行できます。', ephemeral: true });
      }
      await interaction.deferReply();
      const imageName = await saveImage(options.getAttachment('image'));

      const min_attack = options.getInteger('min_attack');
      const max_attack = options.getInteger('max_attack');
      const min_defense = options.getInteger('min_defense');
      const max_defense = options.getInteger('max_defense');
      const min_speed = options.getInteger('min_speed');
      const max_speed = options.getInteger('max_speed');
      const min_mp = options.getInteger('min_mp');
      const max_mp = options.getInteger('max_mp');
      const min_weight = options.getInteger('min_weight');
      const max_weight = options.getInteger('max_weight');

      if (min_attack > max_attack || min_defense > max_defense || min_speed > max_speed || min_mp > max_mp || min_weight > max_weight) {
          return interaction.editReply({ content: 'ステータスの最低値は最高値以下でなければなりません。' });
      }

      const item = {
        name: options.getString('name'),
        min_attack,
        max_attack,
        min_defense,
        max_defense,
        min_speed,
        max_speed,
        min_mp,
        max_mp,
        min_weight,
        max_weight,
        rarity: options.getString('rarity'),
        type: options.getString('type'),
        image: imageName,
      };
      data.items.push(item);
      saveData();

      const embed = new EmbedBuilder()
          .setTitle(`✅ アイテム「${item.name}」を設定しました`)
          .setDescription('以下のステータスで設定されました。')
          .setColor(0x00ff00)
          .addFields(
              { name: '種類', value: item.type, inline: true },
              { name: 'レア度', value: item.rarity, inline: true },
              { name: '攻撃力', value: `${item.min_attack} ~ ${item.max_attack}`, inline: false },
              { name: '防御力', value: `${item.min_defense} ~ ${item.max_defense}`, inline: true },
              { name: '素早さ', value: `${item.min_speed} ~ ${item.max_speed}`, inline: true },
              { name: 'MP', value: `${item.min_mp} ~ ${item.max_mp}`, inline: false },
              { name: '重量', value: `${item.min_weight} ~ ${item.max_weight}`, inline: true }
          );

      const files = [];
      if (item.image) {
          const imagePath = path.join(imagesDir, item.image);
          if (fs.existsSync(imagePath)) {
              files.push(new AttachmentBuilder(imagePath, { name: item.image }));
              embed.setImage(`attachment://${item.image}`);
          }
      }

      await interaction.editReply({ embeds: [embed], files: files });
    }

    else if (commandName === 'item_get') {
      await interaction.deferReply({ ephemeral: true });
      loadData();
      const itemName = options.getString('name');
      const item = data.items.find(i => i.name === itemName);

      if (item) {
        const embed = new EmbedBuilder()
          .setTitle(`アイテム: ${item.name}`)
          .setDescription(`
            **種類**: ${item.type}
            **攻撃力**: ${item.min_attack} ~ ${item.max_attack}
            **防御力**: ${item.min_defense} ~ ${item.max_defense}
            **素早さ**: ${item.min_speed} ~ ${item.max_speed}
            **MP**: ${item.min_mp} ~ ${item.max_mp}
            **重量**: ${item.min_weight} ~ ${item.max_weight}
            **レア度**: ${item.rarity}
          `);

        const files = [];
        if (item.image) {
          const imagePath = path.join(imagesDir, item.image);
          if (fs.existsSync(imagePath)) {
            files.push(new AttachmentBuilder(imagePath));
            embed.setImage(`attachment://${item.image}`);
          }
        }
        await interaction.editReply({ embeds: [embed], files: files });
      } else {
        await interaction.editReply({ content: `アイテム「${itemName}」は見つかりませんでした。`, ephemeral: true });
      }
    }

    else if (commandName === 'list_items') {
      await interaction.deferReply();
      loadData();
      const allItemTypes = Array.from(new Set(data.items.map(item => item.type)));

      if (allItemTypes.length === 0) {
        return interaction.editReply({ content: '設定されているアイテムはありません。' });
      }

      let embeds = [];
      let currentEmbed = new EmbedBuilder()
        .setTitle('設定済みアイテム一覧');

      allItemTypes.forEach(type => {
        const itemsOfType = data.items.filter(item => item.type === type);
        const itemNames = itemsOfType.map(item => `・**${item.name}** (攻撃:${item.min_attack}~${item.max_attack}, 防御:${item.min_defense}~${item.max_defense}, 素早:${item.min_speed}~${item.max_speed}, MP:${item.min_mp}~${item.max_mp}, 重量:${item.min_weight}~${item.max_weight}, レア度:${item.rarity})`);

        if (itemNames.length > 0) {
          currentEmbed.addFields({
            name: `カテゴリー: ${type}`,
            value: itemNames.join('\n') || 'なし',
            inline: false
          });
        }
      });
      embeds.push(currentEmbed);

      await interaction.editReply({ embeds: embeds });
    }

    else if (commandName === 'monster_set') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'このコマンドは管理者のみ実行できます。', ephemeral: true });
      }
      await interaction.deferReply();
      const imageName = await saveImage(options.getAttachment('image'));

      const min_hp = options.getInteger('min_hp');
      const max_hp = options.getInteger('max_hp');
      const min_attack = options.getInteger('min_attack');
      const max_attack = options.getInteger('max_attack');
      const min_defense = options.getInteger('min_defense');
      const max_defense = options.getInteger('max_defense');
      const min_speed = options.getInteger('min_speed');
      const max_speed = options.getInteger('max_speed');
      const min_mp = options.getInteger('min_mp');
      const max_mp = options.getInteger('max_mp');

      if (min_hp > max_hp || min_attack > max_attack || min_defense > max_defense || min_speed > max_speed || min_mp > max_mp) {
          return interaction.editReply({ content: 'ステータスの最低値は最高値以下でなければなりません。' });
      }

      const mon = {
        name: options.getString('name'),
        min_hp,
        max_hp,
        min_attack,
        max_attack,
        min_defense,
        max_defense,
        min_speed,
        max_speed,
        min_mp,
        max_mp,
        danger: options.getString('danger'),
        chance: options.getInteger('chance'),
        image: imageName,
      };
      data.monsters.push(mon);
      saveData();

      const embed = new EmbedBuilder()
          .setTitle(`✅ モンスター「${mon.name}」を設定しました`)
          .setDescription('以下のステータスで設定されました。')
          .setColor(0xffa500)
          .addFields(
              { name: '危険度', value: mon.danger, inline: true },
              { name: '出現確率', value: `${mon.chance}%`, inline: true },
              { name: 'HP', value: `${mon.min_hp} ~ ${mon.max_hp}`, inline: false },
              { name: 'MP', value: `${mon.min_mp} ~ ${mon.max_mp}`, inline: true },
              { name: '攻撃力', value: `${mon.min_attack} ~ ${mon.max_attack}`, inline: true },
              { name: '防御力', value: `${mon.min_defense} ~ ${mon.max_defense}`, inline: true },
              { name: '素早さ', value: `${mon.min_speed} ~ ${mon.max_speed}`, inline: true }
          );

      const files = [];
      if (mon.image) {
          const imagePath = path.join(imagesDir, mon.image);
          if (fs.existsSync(imagePath)) {
              files.push(new AttachmentBuilder(imagePath, { name: mon.image }));
              embed.setImage(`attachment://${mon.image}`);
          }
      }

      await interaction.editReply({ embeds: [embed], files: files });
    }

    else if (commandName === 'monster_get') {
      await interaction.deferReply({ ephemeral: true });
      loadData();
      const monsterName = options.getString('name');
      const monster = data.monsters.find(m => m.name === monsterName);

      if (monster) {
        const embed = new EmbedBuilder()
          .setTitle(`モンスター: ${monster.name}`)
          .setDescription(`
            **HP**: ${monster.min_hp} ~ ${monster.max_hp}
            **MP**: ${monster.min_mp} ~ ${monster.max_mp}
            **攻撃力**: ${monster.min_attack} ~ ${monster.max_attack}
            **防御力**: ${monster.min_defense} ~ ${monster.max_defense}
            **素早さ**: ${monster.min_speed} ~ ${monster.max_speed}
            **危険度**: ${monster.danger}
            **出現確率**: ${monster.chance}%
          `);

        const files = [];
        if (monster.image) {
          const imagePath = path.join(imagesDir, monster.image);
          if (fs.existsSync(imagePath)) {
            files.push(new AttachmentBuilder(imagePath));
            embed.setImage(`attachment://${monster.image}`);
          }
        }
        await interaction.editReply({ embeds: [embed], files: files });
      } else {
        await interaction.editReply({ content: `モンスター「${monsterName}」は見つかりませんでした。`, ephemeral: true });
      }
    }

    else if (commandName === 'list_monsters') {
      await interaction.deferReply();
      loadData();

      const embeds = [];
      const monsters = data.monsters;

      if (monsters.length === 0) {
        return interaction.editReply({ content: '設定されているモンスターはいません。' });
      }

      let currentEmbed = new EmbedBuilder()
        .setTitle('設定済みモンスター一覧')
        .setColor(0x0099ff);
      let fieldCount = 0;

      for (const monster of monsters) {
        if (fieldCount >= 25) {
          embeds.push(currentEmbed);
          currentEmbed = new EmbedBuilder()
            .setTitle('設定済みモンスター一覧 (続き)')
            .setColor(0x0099ff);
          fieldCount = 0;
        }

        currentEmbed.addFields({
          name: `**${monster.name}**`,
          value: `
            HP: ${monster.min_hp}~${monster.max_hp}
            MP: ${monster.min_mp}~${monster.max_mp}
            攻撃力: ${monster.min_attack} ~ ${monster.max_attack}
            防御力: ${monster.min_defense}~${monster.max_defense}
            素早さ: ${monster.min_speed}~${monster.max_speed}
            危険度: ${monster.danger}
            出現確率: ${monster.chance}%
          `,
          inline: true
        });
        fieldCount++;
      }

      embeds.push(currentEmbed);

      await interaction.editReply({ embeds: embeds });
    }

    else if (commandName === 'list_gachaitems') {
      await interaction.deferReply();
      loadData();
      if (data.gachaItems.length === 0) {
        return interaction.editReply({ content: '設定されているガチャアイテムはありません。' });
      }
      const embed = new EmbedBuilder()
        .setTitle('ガチャ排出アイテム一覧')
        .setColor(0x3498db);

      data.gachaItems.forEach(item => {
        const itemData = data.items.find(i => i.name === item.item);
        const itemDetails = itemData ? ` (攻撃力:${itemData.min_attack}~${itemData.max_attack}, 防御力:${itemData.min_defense}~${itemData.max_defense}, 素早さ:${itemData.min_speed}~${itemData.max_speed}, MP:${itemData.min_mp}~${itemData.max_mp}, 重量:${itemData.min_weight}~${itemData.max_weight}, レア度:${itemData.rarity})` : '';
        embed.addFields({
          name: `**${item.item}**`,
          value: `排出確率: **${item.chance}%**\n換金額: **${item.gold}ゴールド**\n${itemDetails}`,
          inline: true
        });
      });
      await interaction.editReply({ embeds: [embed] });
    }

    else if (commandName === 'list_dropitems') {
      await interaction.deferReply();
      loadData();
      if (data.dropItems.length === 0) {
        return interaction.editReply({ content: '設定されているドロップアイテムはありません。' });
      }
      const embed = new EmbedBuilder()
        .setTitle('モンスタードロップアイテム一覧')
        .setColor(0x3498db);

      const groupedDrops = {};
      data.dropItems.forEach(drop => {
        if (!groupedDrops[drop.monster]) {
          groupedDrops[drop.monster] = [];
        }
        groupedDrops[drop.monster].push(drop);
      });

      for (const monster in groupedDrops) {
        const dropList = groupedDrops[monster].map(d => {
          return `・**${d.item}** (確率: ${d.chance}%, 換金: ${d.gold}G)`;
        }).join('\n');
        embed.addFields({
          name: `**${monster}**`,
          value: dropList,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });
    }

    else if (commandName === 'role_stats') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'このコマンドは管理者のみ実行できます。', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const role = options.getRole('role');
      const roleName = role.name;
      data.roles[roleName] = {
        attack: options.getInteger('attack'),
        defense: options.getInteger('defense'),
        speed: options.getInteger('speed'),
        hp: options.getInteger('hp'),
        mp: options.getInteger('mp'),
        weight_limit: options.getInteger('weight_limit'),
      };
      saveData();
      await interaction.editReply(`ロール「${role.name}」の初期ステータスを設定しました`);
    }

    else if (commandName === 'list_role_stats') {
      await interaction.deferReply();
      loadData();
      const embed = new EmbedBuilder()
        .setTitle('ロール別 基礎ステータス一覧')
        .setColor(0x3498db);

      for (const roleName in data.roles) {
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (role) {
          const stats = data.roles[roleName];
          embed.addFields({
            name: `**${role.name}**`,
            value: `
              HP: ${stats.hp}
              攻撃力: ${stats.attack}
              防御力: ${stats.defense}
              素早さ: ${stats.speed}
              MP: ${stats.mp}
              重量上限: ${stats.weight_limit}
            `,
            inline: false,
          });
        }
      }

      if (Object.keys(data.roles).length === 0) {
        embed.setDescription('設定されているロールの基礎ステータスはありません。');
      }

      await interaction.editReply({ embeds: [embed] });
    }

    else if (commandName === 'myinventory') {
      await interaction.deferReply({ ephemeral: true });
      loadData();
      const player = data.players[user.id];
      if (!player) {
        return interaction.editReply({ content: 'あなたのデータが見つかりません。まずバトルを開始するか、/showstatsコマンドを実行してください。' });
      }

      const inventory = player.items;
      const totalWeight = inventory.reduce((sum, item) => sum + (item?.weight || 0), 0);

      const embed = new EmbedBuilder()
        .setTitle('インベントリ')
        .setDescription(`**所持ゴールド: ${player.gold}**\n**所持アイテム (${inventory.length}個):**`)
        .addFields(
          { name: '合計重量', value: `${totalWeight} / ${getPlayerFinalStats(interaction.member).weightLimit}` }
        );

      if (inventory.length > 0) {
          const inventoryList = inventory.map(item => {
            if (typeof item === 'object' && item !== null) {
              return `・**${item.name}** (攻:${item.attack}, 防:${item.defense}, 素:${item.speed}, MP:${item.mp}, 重:${item.weight}, レア度:${item.rarity}) ${item.isEquipped ? '(装備中)' : ''}`;
            }
            return `・不明なアイテム`;
          }).join('\n');
          embed.addFields({ name: 'アイテムリスト', value: inventoryList });
      } else {
          embed.addFields({ name: 'アイテムリスト', value: 'なし' });
      }


      await interaction.editReply({ embeds: [embed] });
    }

    else if (commandName === 'sell_item') {
      await interaction.deferReply({ ephemeral: true });
      loadData();
      const player = data.players[user.id];
      if (!player) {
        return interaction.editReply({ content: 'あなたのデータが見つかりません。まずバトルを開始するか、/showstatsコマンドを実行してください。' });
      }

      const itemName = options.getString('name');
      const itemsToSell = player.items.filter(item => item && item.name === itemName && !item.isEquipped);

      if (itemsToSell.length === 0) {
          return interaction.editReply({ content: `「${itemName}」はインベントリにありません。` });
      }

      const selectOptions = itemsToSell.map((item, index) => {
        const itemDetails = `攻:${item.attack}, 防:${item.defense}, 素:${item.speed}, MP:${item.mp}, 重:${item.weight}`;
        return {
          label: `${item.name} #${index + 1}`,
          description: itemDetails,
          value: JSON.stringify({ index: player.items.findIndex(i => i === item) }) // 元の配列のインデックスを使用
        };
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('sell_item_select')
        .setPlaceholder('売却するアイテムを選択してください...')
        .addOptions(selectOptions);

      const row = new ActionRowBuilder().addComponents(selectMenu);
      await interaction.editReply({ content: '売却するアイテムをステータスで選択してください。', components: [row] });
    }

    else if (commandName === 'soubi') {
      await interaction.deferReply({ ephemeral: true });
      try {
        loadData();
        const roleName = interaction.member.roles.cache.find(role => data.roles[role.name])?.name;
        initPlayer(user.id, roleName || '');
        const player = data.players[user.id];

        const itemType = options.getString('type');
        const itemName = options.getString('name');

        const itemsToEquip = player.items.filter(item => item && item.name === itemName && item.type === itemType && !item.isEquipped);

        if (itemsToEquip.length === 0) {
            return interaction.editReply({ content: `「${itemName}」はインベントリにありません、または指定された部位に装備できません。` });
        }

        const currentWeight = player.items.reduce((sum, item) => sum + (item.weight || 0), 0);
        const { weightLimit } = getPlayerFinalStats(interaction.member);
        const selectedItemWeight = itemsToEquip[0].weight;
        const currentEquippedItemWeight = player.equipped[itemType] ? player.equipped[itemType].weight : 0;

        if(currentWeight - currentEquippedItemWeight + selectedItemWeight > weightLimit) {
            return interaction.editReply({ content: `重量制限を超えているため、このアイテムを装備できません。\n現在の重量: ${currentWeight - currentEquippedItemWeight} / ${weightLimit}\n装備アイテムの重さ: ${selectedItemWeight}` });
        }


        const selectOptions = itemsToEquip.map((item, index) => {
            const itemDetails = `攻:${item.attack}, 防:${item.defense}, 素:${item.speed}, MP:${item.mp}, 重:${item.weight}`;
            return {
                label: `${item.name} #${index + 1}`,
                description: itemDetails,
                value: JSON.stringify({ index: player.items.findIndex(i => i === item), type: itemType })
            };
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('equip_item_select')
            .setPlaceholder('装備するアイテムを選択してください...')
            .addOptions(selectOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.editReply({ content: '装備するアイテムをステータスで選択してください。', components: [row] });

      } catch (error) {
        console.error('An error occurred during /soubi command:', error);
        await interaction.editReply({ content: '装備中にエラーが発生しました。もう一度お試しください。' });
      }
    }

    else if (commandName === 'checksoubi') {
      await interaction.deferReply({ ephemeral: true });
      loadData();
      const roleName = interaction.member.roles.cache.find(role => data.roles[role.name])?.name;
      initPlayer(user.id, roleName || '');
      const player = data.players[user.id];

      // 新しい装備スロットを含む全スロットを定義
      const allSlots = [
        '頭', '胴体', '足', '武器', '耳',
        '人差し指', '中指', '薬指', '小指',
        'ピアス', 'ピアス2', '特殊', '精霊',
        '加護', '呪い'
      ];

      // スロットごとに装備アイテム名を取得
      const equippedItems = allSlots
        .map(slot => `${slot}: ${player.equipped[slot] ? `${player.equipped[slot].name} (攻:${player.equipped[slot].attack}, 防:${player.equipped[slot].defense}, 素:${player.equipped[slot].speed}, MP:${player.equipped[slot].mp}, 重:${player.equipped[slot].weight})` : 'なし'}`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle('現在の装備アイテム')
        .setDescription(equippedItems);

      await interaction.editReply({ embeds: [embed] });
    }

    else if (commandName === 'dropitem_set') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'このコマンドは管理者のみ実行できます。', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const monsterName = options.getString('monster');
      const itemName = options.getString('item');
      const chance = options.getInteger('chance');
      const gold = options.getInteger('gold');

      const existingDrop = data.dropItems.find(d => d.monster === monsterName && d.item === itemName);
      if (existingDrop) {
        existingDrop.chance = chance;
        existingDrop.gold = gold;
      } else {
        data.dropItems.push({ monster: monsterName, item: itemName, chance, gold });
      }

      saveData();
      await interaction.editReply(`モンスター「${monsterName}」のドロップアイテムを設定しました`);
    }

    else if (commandName === 'gachaitem_set') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'このコマンドは管理者のみ実行できます。', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const itemName = options.getString('item');
      const chance = options.getInteger('chance');
      const gold = options.getInteger('gold');

      const existingGacha = data.gachaItems.find(g => g.item === itemName);
      if (existingGacha) {
        existingGacha.chance = chance;
        existingGacha.gold = gold;
      } else {
        data.gachaItems.push({ item: itemName, chance, gold });
      }

      saveData();
      await interaction.editReply(`ガチャ排出アイテム「${itemName}」を設定しました`);
    }

    else if (commandName === 'role_pay') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'このコマンドは管理者のみ実行できます。', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const role = options.getRole('role');
      const roleId = role.id;
      const itemName = options.getString('item');
      const gold = options.getInteger('gold');

      const guild = interaction.guild;
      if (!guild) {
        return await interaction.editReply({ content: 'このコマンドはサーバー内でのみ使用できます。', ephemeral: true });
      }

      if (!role) {
        return await interaction.editReply({ content: '指定されたロールが見つかりません。', ephemeral: true });
      }

      await guild.members.fetch();
      guild.members.cache.forEach(member => {
        if (member.roles.cache.has(roleId)) {
          const roleName = member.roles.cache.find(
r => data.roles[r.name])?.name;
          initPlayer(member.user.id, roleName || '');
          const player = data.players[member.user.id];

          if (itemName) {
            const itemData = data.items.find(i => i.name === itemName);
            if (itemData) {
              const itemWithStats = {
                name: itemData.name,
                attack: Math.floor(Math.random() * (itemData.max_attack - itemData.min_attack + 1)) + itemData.min_attack,
                defense: Math.floor(Math.random() * (itemData.max_defense - itemData.min_defense + 1)) + itemData.min_defense,
                speed: Math.floor(Math.random() * (itemData.max_speed - itemData.min_speed + 1)) + itemData.min_speed, // ここを修正
                mp: Math.floor(Math.random() * (itemData.max_mp - itemData.min_mp + 1)) + itemData.min_mp,
                weight: Math.floor(Math.random() * (itemData.max_weight - itemData.min_weight + 1)) + itemData.min_weight,
                rarity: itemData.rarity,
                type: itemData.type,
                image: itemData.image,
                isEquipped: false,
              };
              player.items.push(itemWithStats);
            }
          }
          if (gold) player.gold += gold;
        }
      });
      saveData();
      await interaction.editReply(`ロール「${role.name}」のメンバーに報酬を付与しました。`);
    }

    // ゴールド付与コマンドを追加
    else if (commandName === 'gold_pay') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'このコマンドは管理者のみ実行できます。', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const targetUser = options.getUser('user');
      const amount = options.getInteger('amount');

      if (amount <= 0) {
        return interaction.editReply('付与するゴールドは正の値である必要があります。');
      }

      loadData();
      const roleName = await interaction.guild.members.fetch(targetUser.id).then(member => member.roles.cache.find(role => data.roles[role.name])?.name).catch(() => null);
      initPlayer(targetUser.id, roleName || '');
      const player = data.players[targetUser.id];
      player.gold += amount;
      saveData();

      await interaction.editReply(`${targetUser.username}に${amount}ゴールドを付与しました。現在のゴールド: ${player.gold}`);
    }

    else if (commandName === 'item_pay') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'このコマンドは管理者のみ実行できます。', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const targetUser = options.getUser('user');
      const itemName = options.getString('item');

      loadData();
      const itemData = data.items.find(i => i.name === itemName);

      if (!itemData) {
        return interaction.editReply({ content: `アイテム「${itemName}」のデータが見つかりません。` });
      }

      const itemWithStats = {
          name: itemData.name,
          attack: Math.floor(Math.random() * (itemData.max_attack - itemData.min_attack + 1)) + itemData.min_attack,
          defense: Math.floor(Math.random() * (itemData.max_defense - itemData.min_defense + 1)) + itemData.min_defense,
          speed: Math.floor(Math.random() * (itemData.max_speed - itemData.min_speed + 1)) + itemData.min_speed, // ここを修正
          mp: Math.floor(Math.random() * (itemData.max_mp - itemData.min_mp + 1)) + itemData.min_mp,
          weight: Math.floor(Math.random() * (itemData.max_weight - itemData.min_weight + 1)) + itemData.min_weight,
          rarity: itemData.rarity,
          type: itemData.type,
          image: itemData.image,
          isEquipped: false,
      };

      const embed = new EmbedBuilder()
          .setTitle('🎁 アイテム付与！')
          .setDescription(`${targetUser}さんへ、${interaction.user.username}からアイテムが届きました！`)
          .addFields(
              { name: 'アイテム名', value: itemWithStats.name, inline: false },
              { name: '攻撃力', value: `${itemWithStats.attack}`, inline: true },
              { name: '防御力', value: `${itemWithStats.defense}`, inline: true },
              { name: '素早さ', value: `${itemWithStats.speed}`, inline: true }, // ここを修正
              { name: 'MP', value: `${itemWithStats.mp}`, inline: true },
              { name: '重量', value: `${itemWithStats.weight}`, inline: true },
          )
          .setColor(0x00ff00);

      const files = [];
      if (itemWithStats.image) {
          const imagePath = path.join(imagesDir, itemWithStats.image);
          if (fs.existsSync(imagePath)) {
              const attachmentName = `item_pay_${itemWithStats.image}`;
              files.push(new AttachmentBuilder(imagePath, { name: attachmentName }));
              embed.setThumbnail(`attachment://${attachmentName}`);
          }
      }

      const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`item_pay_get_${targetUser.id}`).setLabel('入手').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`item_pay_sell_${targetUser.id}`).setLabel('換金').setStyle(ButtonStyle.Danger)
      );

      data.players[targetUser.id] = data.players[targetUser.id] || {};
      data.players[targetUser.id].item_pay_cache = itemWithStats;
      saveData();

      await interaction.editReply({ content: `${targetUser}さんにアイテムを付与しました。`, ephemeral: true });
      await interaction.channel.send({
        content: `**${targetUser}**さんにアイテムが届きました！`,
        embeds: [embed],
        components: [row],
        files: files
      });
    }

    else if (commandName === 'role_pay') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'このコマンドは管理者のみ実行できます。', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const role = options.getRole('role');
      const roleId = role.id;
      const itemName = options.getString('item');
      const gold = options.getInteger('gold');

      const guild = interaction.guild;
      if (!guild) {
        return await interaction.editReply({ content: 'このコマンドはサーバー内でのみ使用できます。', ephemeral: true });
      }

      if (!role) {
        return await interaction.editReply({ content: '指定されたロールが見つかりません。', ephemeral: true });
      }

      await guild.members.fetch();
      guild.members.cache.forEach(member => {
        if (member.roles.cache.has(roleId)) {
          const roleName = member.roles.cache.find(r => data.roles[r.name])?.name;
          initPlayer(member.user.id, roleName || '');
          const player = data.players[member.user.id];
          if (itemName) player.items.push(itemName);
          if (gold) player.gold += gold;
        }
      });
      saveData();
      await interaction.editReply(`ロール「${role.name}」のメンバーに報酬を付与しました。`);
    }

    // gold_pay コマンドの処理
    else if (commandName === 'gold_pay') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'このコマンドは管理者のみ実行できます。', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const targetUser = options.getUser('user');
      const amount = options.getInteger('amount');

      if (amount <= 0) {
        return interaction.editReply('付与するゴールドは正の値である必要があります。');
      }

      loadData();
      const roleName = await interaction.guild.members.fetch(targetUser.id).then(member => member.roles.cache.find(role => data.roles[role.name])?.name).catch(() => null);
      initPlayer(targetUser.id, roleName || '');
      const player = data.players[targetUser.id];
      player.gold += amount;
      saveData();

      await interaction.editReply(`${targetUser.username}に${amount}ゴールドを付与しました。現在のゴールド: ${player.gold}`);
    }

    else if (commandName === 'win_image') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'このコマンドは管理者のみ実行できます。', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const imageName = await saveImage(options.getAttachment('image'));
      if (imageName) {
        data.settings.winImage = imageName;
        saveData();
        await interaction.editReply({ content: '勝利時画像を設定しました。', files: [new AttachmentBuilder(path.join(imagesDir, imageName), { name: imageName })] });
      } else {
        await interaction.editReply({ content: '画像の保存に失敗しました。', ephemeral: true });
      }
    }

    else if (commandName === 'lose_image') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'このコマンドは管理者のみ実行できます。', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const imageName = await saveImage(options.getAttachment('image'));
      if (imageName) {
        data.settings.loseImage = imageName;
        saveData();
        await interaction.editReply({ content: '敗北時画像を設定しました。', files: [new AttachmentBuilder(path.join(imagesDir, imageName), { name: imageName })] });
      } else {
        await interaction.editReply({ content: '画像の保存に失敗しました。', ephemeral: true });
      }
    }

    else if (commandName === 'refresh') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'このコマンドは管理者のみ実行できます。', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      loadData();
      const userId = user.id;
      const memberRoles = interaction.member.roles.cache;
      const roleName = memberRoles.find(role => data.roles[role.name])?.name;

      if (!roleName) {
        return interaction.editReply({ content: 'あなたに設定済みのロールが見つかりません。' });
      }

      const roleStats = data.roles[roleName];
      const player = data.players[userId];

      const currentGold = player.gold;
      const currentItems = player.items;
      const currentEquipped = player.equipped;
      const currentGachaResult = player.gachaResult;

      data.players[userId] = {
        ...roleStats,
        gold: currentGold,
        items: currentItems,
        equipped: currentEquipped,
        gachaResult: currentGachaResult,
      };
      saveData();
      await interaction.editReply('あなたのロールの基礎ステータスが更新されました。');
    }

    else if (commandName === 'showstats') {
      await interaction.deferReply({ ephemeral: true });
      loadData();
      const roleName = interaction.member.roles.cache.find(role => data.roles[role.name])?.name;
      initPlayer(user.id, roleName || '');
      const embed = createPlayerEmbed(user.id, interaction.member);
      await interaction.editReply({ embeds: [embed] });
    }

    else if (commandName === 'watchstats') {
      await interaction.deferReply({ ephemeral: true });
      loadData();
      const roleName = interaction.member.roles.cache.find(role => data.roles[role.name])?.name;
      initPlayer(user.id, roleName || '');
      const embed = createWatchStatsEmbed(user.id, interaction.member);
      await interaction.editReply({ embeds: [embed] });
    }

    else if (commandName === 'finalbattle') {
      // ユーザーのコマンドに即座に応答（全員に見えるように）
      await interaction.deferReply();

      const imageAttachment = options.getAttachment('image');
      const files = [];

      const embed = new EmbedBuilder()
        .setTitle('**力を求めるなら戦え！！**')
        .setDescription('モンスターと戦い、アイテムを手に入れよう！\n\n**「バトル開始」** ボタンを押して、戦いの火蓋を切ろう！')
        .setColor(0x0099ff);

      if (imageAttachment) {
        const imageName = imageAttachment.name;
        files.push(new AttachmentBuilder(imageAttachment.url, { name: imageName }));
        embed.setImage(`attachment://${imageName}`);
      } else {
        embed.setThumbnail(interaction.guild.iconURL() || client.user.displayAvatarURL());
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('battle_start')
          .setLabel('バトル開始')
          .setStyle(ButtonStyle.Primary)
      );

      // 新しいメッセージを送信
      await interaction.editReply({
        embeds: [embed],
        components: [row],
        files: files,
      });
    }

    else if (commandName === 'pvp') {
      await interaction.reply({
        content: `⚔️ PvPバトルを開始しますか？\n「対戦相手を選ぶ」ボタンを押して、他のプレイヤーと戦おう！`,
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('pvp_select').setLabel('対戦相手を選ぶ').setStyle(ButtonStyle.Danger)
        )],
        ephemeral: false
      });
    }

    else if (commandName === 'gacha') {
        await interaction.deferReply();
        const imageAttachment = options.getAttachment('image');
        const files = [];
        const embed = new EmbedBuilder()
          .setTitle('💰 ガチャ')
          .setDescription('「ガチャを引く」ボタンを押して、アイテムをゲットしよう！\n（1回 5ゴールド）')
          .setColor(0x3498db);

        if (imageAttachment) {
          const imageName = imageAttachment.name;
          files.push(new AttachmentBuilder(imageAttachment.url, { name: imageName }));
          embed.setImage(`attachment://${imageName}`);
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('gacha_draw').setLabel('ガチャを引く').setStyle(ButtonStyle.Success)
        );

        await interaction.editReply({
          embeds: [embed],
          components: [row],
          files: files,
        });
    }

    // watch コマンドの処理を追加
    else if (commandName === 'watch') {
      await interaction.deferReply({ ephemeral: true });
      loadData();
      const targetUser = options.getUser('user');
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return interaction.editReply({ content: '指定されたユーザーはサーバーにいません。' });
      }

      const targetPlayer = data.players[targetUser.id];
      if (!targetPlayer) {
        return interaction.editReply({ content: '指定されたユーザーのデータが見つかりません。' });
      }

      const { finalAttack, finalDefense, finalSpeed, finalHP, finalMP, weightLimit, roleName } = getPlayerFinalStats(targetMember);
      const equippedStats = getEquippedStats(targetPlayer);
      const roleStats = data.roles[roleName] || { attack: 5, defense: 5, speed: 5, hp: 50, mp: 20, weight_limit: 50 };

      const equippedItems = Object.entries(targetPlayer.equipped)
        .map(([slot, item]) => {
          if (item) {
            return `${slot}: ${item.name} (攻:${item.attack}, 防:${item.defense}, 素:${item.speed}, MP:${item.mp}, 重:${item.weight})`;
          }
          return `${slot}: なし`;
        })
        .join('\n');

      const inventoryItems = targetPlayer.items.map(item => {
          if (typeof item === 'object' && item !== null) {
              return `・${item.name} (重さ: ${item.weight}) ${item.isEquipped ? '(装備中)' : ''}`;
          }
          return `・不明なアイテム`;
      }).join('\n') || 'なし';

      const currentWeight = targetPlayer.items.reduce((sum, item) => sum + (typeof item === 'object' ? (item.weight || 0) : 0), 0);

      const embed = new EmbedBuilder()
        .setTitle(`⚔️ ${targetMember.displayName}のステータス`)
        .setColor(0x0099ff)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '基本情報', value: `**ロール**: ${roleName || 'なし'}\n**ゴールド**: ${targetPlayer.gold}`, inline: false },
          { name: '総合ステータス', value: `
            **HP**: ${finalHP}
            **MP**: ${finalMP}
            **攻撃力**: ${finalAttack}
            **防御力**: ${finalDefense}
            **素早さ**: ${finalSpeed}
          `, inline: false },
          { name: '装備ボーナス', value: `
            **攻撃力**: +${equippedStats.attack}
            **防御力**: +${equippedStats.defense}
            **素早さ**: +${equippedStats.speed}
            **MP**: +${equippedStats.mp}
          `, inline: false },
          { name: '装備品', value: equippedItems, inline: false },
          { name: 'インベントリ', value: `${inventoryItems}\n**合計重量**: ${currentWeight} / ${weightLimit}`, inline: false }
        );

      await interaction.editReply({ embeds: [embed] });
    }

  } else if (interaction.isButton()) {
    const userId = interaction.user.id;
    const roleName = interaction.member.roles.cache.find(role => data.roles[role.name])?.name;
    initPlayer(userId, roleName || '');

    if (interaction.customId === 'gacha_draw') {
        await interaction.deferReply({ ephemeral: true });
        loadData();
        const player = data.players[userId];
        if (player.gold < 5) {
          return interaction.editReply({ content: 'ゴールドが足りません' });
        }
        player.gold -= 5;

        const totalChance = data.gachaItems.reduce((sum, item) => sum + item.chance, 0);
        let rand = Math.random() * totalChance;
        let gachaItem = null;
        for (const item of data.gachaItems) {
            rand -= item.chance;
            if (rand <= 0) {
                gachaItem = item;
                break;
            }
        }

        const itemData = gachaItem ? data.items.find(i => i.name === gachaItem.item) : null;
        const files = [];
        const embeds = [];

        if (itemData) {
            const gachaItemWithStats = {
                name: itemData.name,
                attack: Math.floor(Math.random() * (itemData.max_attack - itemData.min_attack + 1)) + itemData.min_attack,
                defense: Math.floor(Math.random() * (itemData.max_defense - itemData.min_defense + 1)) + itemData.min_defense,
                speed: Math.floor(Math.random() * (itemData.max_speed - itemData.min_speed + 1)) + itemData.min_speed, // ここを修正
                mp: Math.floor(Math.random() * (itemData.max_mp - itemData.min_mp + 1)) + itemData.min_mp,
                weight: Math.floor(Math.random() * (itemData.max_weight - itemData.min_weight + 1)) + itemData.min_weight,
                rarity: itemData.rarity,
                type: itemData.type,
                image: itemData.image,
                isEquipped: false,
            };
            player.gachaResult = { ...gachaItemWithStats, gold: gachaItem.gold };
            saveData();

            const itemEmbed = new EmbedBuilder()
              .setTitle('ガチャ結果')
              .setDescription(`「${gachaItemWithStats.name}」が出ました！`)
              .setColor(0x3498db)
              .addFields(
                { name: 'レア度', value: gachaItemWithStats.rarity, inline: true },
                { name: '種類', value: gachaItemWithStats.type, inline: true },
                { name: '攻撃力', value: `${gachaItemWithStats.attack}`, inline: true },
                { name: '防御力', value: `${gachaItemWithStats.defense}`, inline: true },
                { name: '素早さ', value: `${gachaItemWithStats.speed}`, inline: true }, // ここを修正
                { name: 'MP', value: `${gachaItemWithStats.mp}`, inline: true },
                { name: '重量', value: `${gachaItemWithStats.weight}`, inline: true },
                { name: '換金額', value: `${gachaItem.gold}ゴールド`, inline: true },
              )
              .setFooter({ text: `現在のゴールド: ${player.gold}G` });

            if (gachaItemWithStats.image) {
              const imagePath = path.join(imagesDir, gachaItemWithStats.image);
              if (fs.existsSync(imagePath)) {
                const attachmentName = `gacha_item_${gachaItemWithStats.image}`;
                files.push(new AttachmentBuilder(imagePath, { name: attachmentName }));
                itemEmbed.setThumbnail(`attachment://${attachmentName}`);
              }
            }

            embeds.push(itemEmbed);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('get_item').setLabel('入手').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('sell_item').setLabel('換金').setStyle(ButtonStyle.Danger)
            );

            await interaction.editReply({ embeds: embeds, components: [row], files: files });
        } else {
            saveData();
            await interaction.editReply({ content: `ガチャ結果: なし ゴールド残:${player.gold}` });
        }
    }

    else if (interaction.customId === 'get_item') {
      await interaction.deferUpdate();
      loadData();
      const player = data.players[userId];
      const gachaResult = player.gachaResult;

      if (!gachaResult) {
        return interaction.editReply({ content: 'アイテムが見つかりませんでした。再度ガチャを引いてください。', components: [] });
      }

      const currentWeight = player.items.reduce((sum, item) => sum + (item?.weight || 0), 0);
      const { weightLimit } = getPlayerFinalStats(interaction.member);

      if (currentWeight + gachaResult.weight > weightLimit) {
        delete player.gachaResult;
        saveData();
        return interaction.editReply({ content: `重量制限を超えています。\n現在の重量: ${currentWeight} / ${weightLimit}\nこのアイテムの重さ: ${gachaResult.weight}`, components: [] });
      }

      player.items.push(gachaResult);
      delete player.gachaResult;
      saveData();
      await interaction.editReply({ content: `「${gachaResult.name}」を入手しました。`, components: [] });
    }

    else if (interaction.customId === 'sell_item') {
      await interaction.deferUpdate();
      loadData();
      const player = data.players[userId];
      const gachaResult = player.gachaResult;

      if (!gachaResult) {
        return interaction.editReply({ content: 'アイテムが見つかりませんでした。再度ガチャを引いてください。', components: [] });
      }
      const gachaItemData = data.gachaItems.find(i => i.item === gachaResult.name);

      player.gold += gachaItemData.gold;
      delete player.gachaResult;
      saveData();
      await interaction.editReply({ content: `「${gachaResult.name}」を換金し、${gachaItemData ? gachaItemData.gold : 0}ゴールドを獲得しました。`, components: [] });
    }

    else if (interaction.customId.startsWith('item_pay_get_')) {
      await interaction.deferUpdate();
      const targetUserId = interaction.customId.split('_')[3];
      if (interaction.user.id !== targetUserId) {
        return interaction.editReply({ content: 'このアイテムはあなたのアイテムではありません。', components: [] });
      }
      loadData();
      const player = data.players[targetUserId];
      const receivedItem = player.item_pay_cache;
      if (!receivedItem) {
        return interaction.editReply({ content: 'アイテムデータが見つかりません。', components: [] });
      }
      const currentWeight = player.items.reduce((sum, item) => sum + (item?.weight || 0), 0);
      const { weightLimit } = getPlayerFinalStats(interaction.member);

      if (currentWeight + receivedItem.weight > weightLimit) {
        delete player.item_pay_cache;
        saveData();
        return interaction.editReply({ content: `重量制限を超えています。\n現在の重量: ${currentWeight} / ${weightLimit}\nこのアイテムの重さ: ${receivedItem.weight}`, components: [] });
      }
      player.items.push(receivedItem);
      delete player.item_pay_cache;
      saveData();
      await interaction.editReply({ content: `「${receivedItem.name}」を入手しました。`, components: [] });
    }

    else if (interaction.customId.startsWith('item_pay_sell_')) {
      await interaction.deferUpdate();
      const targetUserId = interaction.customId.split('_')[3];
      if (interaction.user.id !== targetUserId) {
        return interaction.editReply({ content: 'このアイテムはあなたのアイテムではありません。', components: [] });
      }
      loadData();
      const player = data.players[targetUserId];
      const receivedItem = player.item_pay_cache;
      if (!receivedItem) {
        return interaction.editReply({ content: 'アイテムデータが見つかりません。', components: [] });
      }
      const gachaItemData = data.gachaItems.find(i => i.item === receivedItem.name);
      if (gachaItemData) {
        player.gold += gachaItemData.gold;
      }
      delete player.item_pay_cache;
      saveData();
      await interaction.editReply({ content: `「${receivedItem.name}」を換金し、${gachaItemData ? gachaItemData.gold : 0}ゴールドを獲得しました。`, components: [] });
    }

    else if (interaction.customId === 'battle_start') {
        // バトル開始メッセージをEphemeralで送信
        await interaction.reply({ ephemeral: true, content: '⚔️ バトルを開始します...' });

        loadData();
        const member = interaction.member;
        const player = data.players[userId];
        if (!player) {
          return interaction.editReply({ content: 'あなたのデータが見つかりません。まずバトルを開始するか、/showstatsコマンドを実行してください。' });
        }

        const availableMonsters = data.monsters;
        if (availableMonsters.length === 0) {
          return interaction.editReply({ content: 'モンスターが設定されていません' });
        }

        const totalChance = availableMonsters.reduce((sum, mon) => sum + mon.chance, 0);
        let rand = Math.random() * totalChance;
        let selectedMonster = null;
        for (const mon of availableMonsters) {
            rand -= mon.chance;
            if (rand <= 0) {
                selectedMonster = mon;
                break;
            }
        }

        if (!selectedMonster) {
          selectedMonster = availableMonsters[0];
        }

        const monster = selectedMonster;

        // プレイヤーの最終ステータスを計算
        const { finalAttack, finalDefense, finalSpeed, finalHP, finalMP } = getPlayerFinalStats(member);

        // モンスターの最終ステータスをランダムに決定
        const finalMonster = {
            name: monster.name,
            hp: Math.floor(Math.random() * (monster.max_hp - monster.min_hp + 1)) + monster.min_hp,
            mp: Math.floor(Math.random() * (monster.max_mp - monster.min_mp + 1)) + monster.min_mp,
            attack: Math.floor(Math.random() * (monster.max_attack - monster.min_attack + 1)) + monster.min_attack, // ここを修正
            defense: Math.floor(Math.random() * (monster.max_defense - monster.min_defense + 1)) + monster.min_defense,
            speed: Math.floor(Math.random() * (monster.max_speed - monster.min_speed + 1)) + monster.min_speed,
            image: monster.image,
            danger: monster.danger,
        };

        const battleState = {
            isPvP: false,
            p_id: userId,
            p_name: member.displayName,
            player: {
                currentHP: finalHP,
                maxHP: finalHP,
                currentMP: finalMP,
                maxMP: finalMP,
                attack: finalAttack,
                defense: finalDefense,
                speed: finalSpeed,
                defense_active: false
            },
            enemy: {
                currentHP: finalMonster.hp,
                maxHP: finalMonster.hp,
                currentMP: finalMonster.mp,
                maxMP: finalMonster.mp,
                attack: finalMonster.attack, // ここを修正
                defense: finalMonster.defense,
                speed: finalMonster.speed,
                defense_active: false
            },
            e_name: finalMonster.name,
            e_image: finalMonster.image,
            log: '',
            currentTurn: (finalSpeed >= finalMonster.speed) ? 'player' : 'enemy',
            isGameOver: false,
            channelId: interaction.channelId,
        };

        const embed = createBattleEmbed(battleState);
        const files = [];
        if (battleState.e_image) {
            const imagePath = path.join(imagesDir, battleState.e_image);
            if (fs.existsSync(imagePath)) {
                files.push(new AttachmentBuilder(imagePath, { name: battleState.e_image }));
                embed.setThumbnail(`attachment://${battleState.e_image}`);
            }
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('attack').setLabel('攻撃').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('defend').setLabel('防御').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('heal').setLabel('回復').setStyle(ButtonStyle.Success)
        );

        // Ephemeralメッセージを更新
        await interaction.editReply({
          embeds: [embed],
          components: [row],
          files: files,
        });

        // ユーザーIDをキーとしてバトル状態を保存
        data.battles[userId] = battleState;
        saveData();

        if (battleState.currentTurn === 'player') {
            battleState.log = `> バトル開始！\n> あなたのターンです。行動を選択してください。\n`;
            await updateBattleMessage(interaction, userId);
        } else {
            battleState.log = `> バトル開始！\n> **${finalMonster.name}** の先制攻撃！\n`;

            // 敵の攻撃ターンにプレイヤーの回避を判定
            let playerEvasionChance = Math.floor(battleState.player.speed / 10);
            let isEvaded = Math.random() * 100 < playerEvasionChance;

            if (isEvaded) {
                battleState.log += `> **${finalMonster.name}** の攻撃！ しかしあなたは素早く回避した！\n`;
            } else {
                let damage = Math.floor(Math.random() * (finalMonster.attack - finalMonster.attack + 1)) + finalMonster.attack; // ここを修正
                let isCritical = false;
                if (Math.random() < 0.1) {
                  damage = Math.floor(damage * 1.5);
                  isCritical = true;
                }
                battleState.player.currentHP -= damage;
                battleState.log += `> **${finalMonster.name}** の攻撃！ あなたに **${damage}** のダメージ！${isCritical ? ' (クリティカル！)' : ''}\n`;
            }

            if (battleState.player.currentHP <= 0) {
              battleState.isGameOver = true;
              battleState.isWin = false;
              saveData();
              return endBattle(interaction, battleState);
            }
            battleState.currentTurn = 'player';
            battleState.log += `\n> あなたのターンです。行動を選択してください。\n`;
            saveData();
            await updateBattleMessage(interaction, userId);
        }
    }

    else if (interaction.customId === 'pvp_select') {
      await interaction.deferReply({ ephemeral: true });
      const members = await interaction.guild.members.fetch();
      const options = members.map(m => ({
        label: m.displayName,
        value: m.id,
      })).filter(o => o.value !== interaction.user.id && data.players[o.value] && Object.keys(data.players[o.value]).length > 0);

      if (options.length === 0) {
        return interaction.editReply({ content: '対戦相手にできるプレイヤーが見つかりません。' });
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('pvp_start')
        .setPlaceholder('対戦相手を選択...')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);
      await interaction.editReply({ content: '対戦相手を選択してください。', components: [row] });
    } else if (['attack', 'defend', 'heal', 'pvp_attack', 'pvp_defend', 'pvp_heal'].includes(interaction.customId)) {
        const userId = interaction.user.id;
        const battleState = data.battles[userId];
        if (!battleState) {
          return interaction.reply({ content: 'バトルが見つかりませんでした。', ephemeral: true });
        }

        let isPlayerTurn = false;
        if (battleState.isPvP) {
            isPlayerTurn = (battleState.currentTurn === 'p1' && battleState.p1_id === interaction.user.id) || 
                           (battleState.currentTurn === 'p2' && battleState.p2_id === interaction.user.id);
        } else {
            isPlayerTurn = (battleState.currentTurn === 'player' && battleState.p_id === interaction.user.id);
        }

        if (!isPlayerTurn) {
            return interaction.reply({ content: '今はあなたのターンではありません。', ephemeral: true });
        }

        await takeTurn(interaction, interaction.customId);
    }

  } else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'pvp_start') {
      await interaction.deferReply();
      const initialReply = await interaction.editReply({ content: 'PvPバトルを開始します...' });

      const opponentId = interaction.values[0];
      const player1Id = interaction.user.id;
      const player2Id = opponentId;

      // メンバーデータを再度フェッチ
      const member1 = await interaction.guild.members.fetch(player1Id);
      const member2 = await interaction.guild.members.fetch(player2Id);

      const stats1 = getPlayerFinalStats(member1);
      const stats2 = getPlayerFinalStats(member2);

      const battleState = {
          isPvP: true,
          p1_id: player1Id,
          p1_name: member1.displayName,
          p2_id: player2Id,
          p2_name: member2.displayName,
          player1: {
              currentHP: stats1.finalHP,
              maxHP: stats1.finalHP,
              currentMP: stats1.finalMP,
              maxMP: stats1.finalMP,
              attack: stats1.finalAttack,
              defense: stats1.finalDefense,
              speed: stats1.finalSpeed,
              defense_active: false
          },
          player2: {
              currentHP: stats2.finalHP,
              maxHP: stats2.finalHP,
              currentMP: stats2.finalMP,
              maxMP: stats2.finalMP,
              attack: stats2.finalAttack,
              defense: stats2.finalDefense,
              speed: stats2.finalSpeed,
              defense_active: false
          },
          log: '',
          currentTurn: (stats1.finalSpeed >= stats2.finalSpeed) ? 'p1' : 'p2',
          isGameOver: false,
          channelId: interaction.channelId,
      };
      data.battles[player1Id] = battleState; // プレイヤー1のIDをキーとして保存
      data.battles[player2Id] = battleState; // プレイヤー2のIDをキーとして保存
      saveData();

      const embed = createBattleEmbed(battleState);

      const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('pvp_attack').setLabel('攻撃').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('pvp_defend').setLabel('防御').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('pvp_heal').setLabel('回復').setStyle(ButtonStyle.Success),
      );

      await interaction.editReply({
          embeds: [embed],
          components: [row]
      });

      const startMessage = `バトル開始！\n> **${battleState.currentTurn === 'p1' ? member1.displayName : member2.displayName}** のターンです。行動を選択してください。\n`;
      const updateEmbed = createBattleEmbed({ ...battleState, log: startMessage });
      await interaction.editReply({ embeds: [updateEmbed], components: [row] });

      startTimeout(player1Id, interaction);
    } else if (interaction.customId === 'sell_item_select') {
        await interaction.deferUpdate();
        loadData();
        const player = data.players[interaction.user.id];
        const selectedIndex = JSON.parse(interaction.values[0]).index;

        if (selectedIndex < 0 || selectedIndex >= player.items.length) {
            return interaction.editReply({ content: '無効なアイテム選択です。', components: [] });
        }

        const itemToSell = player.items[selectedIndex];
        if (itemToSell.isEquipped) {
            return interaction.editReply({ content: '装備中のアイテムは売却できません。', components: [] });
        }

        const gachaItem = data.gachaItems.find(i => i.item === itemToSell.name);
        const dropItem = data.dropItems.find(i => i.item === itemToSell.name);

        let sellGold = 0;
        if (gachaItem) {
            sellGold = gachaItem.gold;
        } else if (dropItem) {
            sellGold = dropItem.gold;
        } else if (itemToSell.type === 'ドロップゴミ') {
            sellGold = 1; // ドロップゴミのデフォルト換金額
        }

        if (sellGold === 0) {
          return interaction.editReply({ content: `「${itemToSell.name}」は換金できないアイテムです。`, components: [] });
        }

        player.items.splice(selectedIndex, 1);
        player.gold += sellGold;
        saveData();

        await interaction.editReply({ content: `「${itemToSell.name}」を換金し、${sellGold}ゴールドを獲得しました。\n現在のゴールド: ${player.gold}`, components: [] });
    } else if (interaction.customId === 'equip_item_select') {
        await interaction.deferUpdate();
        loadData();
        const player = data.players[interaction.user.id];
        const { index, type } = JSON.parse(interaction.values[0]);

        if (index < 0 || index >= player.items.length) {
            return interaction.editReply({ content: '無効なアイテム選択です。', components: [] });
        }

        const itemToEquip = player.items[index];
        if (itemToEquip.type !== type) {
            return interaction.editReply({ content: `このアイテムは${type}スロットに装備できません。`, components: [] });
        }

        const { weightLimit } = getPlayerFinalStats(interaction.member);
        const currentTotalWeight = player.items.reduce((sum, item) => sum + (item.weight || 0), 0);
        const itemWeight = itemToEquip.weight;
        const currentEquippedItemWeight = player.equipped[type] ? player.equipped[type].weight : 0;

        if (currentTotalWeight - currentEquippedItemWeight + itemWeight > weightLimit) {
            return interaction.editReply({ content: `重量制限を超えているため、このアイテムを装備できません。\n現在の重量: ${currentTotalWeight} / ${weightLimit}\n装備アイテムの重さ: ${itemWeight}`, components: [] });
        }

        // 古い装備をインベントリに戻し、isEquippedフラグをfalseにする
        const currentEquippedItem = player.equipped[type];
        if (currentEquippedItem) {
          currentEquippedItem.isEquipped = false;
        }

        // 新しいアイテムを装備し、isEquippedフラグをtrueにする
        itemToEquip.isEquipped = true;
        player.equipped[type] = itemToEquip;

        // 装備の変更を保存してから最終ステータスを再計算して更新
        saveData();

        const { finalAttack, finalDefense, finalSpeed, finalHP, finalMP } = getPlayerFinalStats(interaction.member);

        await interaction.editReply({ content: `「${itemToEquip.name}」を${type}に装備しました。\n\n**現在の最終ステータス:**\n攻撃力: ${finalAttack}\n防御力: ${finalDefense}\n素早さ: ${finalSpeed}\nHP: ${finalHP}\nMP: ${finalMP}`, components: [] });
    }
  }
});

client.login(process.env.TOKEN);
