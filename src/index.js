require("dotenv").config();
const db = require("better-sqlite3")("./data/stickers.db", {
  fileMustExist: false,
});
const cron = require("node-cron");
const slackwebapi = require("@slack/web-api");
const client = new slackwebapi.WebClient(process.env.SLACK_TOKEN);
db.pragma("journal_mode = WAL");
const {
  setupDB,
  getStickers,
  diffStartAndEnd,
  formatPercent,
  chunk,
  calculatePercent,
  getDiffOnProps,
  diff,
} = require("../src/utils");
setupDB(db)
// get git short hash via child_process
const gcsh = require("child_process")
  .execSync('git rev-parse --short HEAD || echo "dev" ')
  .toString()
  .trim();
async function log(msg) {
  console.log(msg);
  client.chat.postMessage({
channel: "C07LGLUTNH2",
text: `From hackclub stickers instance: \n\`\`\`${new String(msg).toString()}\`\`\``    
  })
}
async function run() {
  /**
   * @returns {Promise<any[]>}
   */
  const stickers = await getStickers();
  const total_blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Upaded Stickers",
      },
    },
  ];
  for (const s of stickers) {
    // try finding it in the db
    const r = db.prepare("SELECT * FROM stickers WHERE sku = ?").get(s.sku);
    if (r) {
      // update it
      db.prepare(
        "UPDATE stickers SET name = ?, image_url = ?, stock = ?, start = ?, end = ? WHERE sku = ?",
      ).run(s.name, s.picture, s.stock, s.start, s.end, s.sku);
      console.log(`Updated ${s.name}`);
      // return;
      // now check diffs
      const blocks = diff(r, s);
      if (blocks.length > 0) {
        total_blocks.push(...blocks);
        total_blocks.push({
          type: "divider",
        });
      }
    } else {
      // insert it
      db.prepare(
        "INSERT INTO stickers (name, sku, image_url, stock, start, end) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(s.name, s.sku, s.picture, s.stock, s.start, s.end);
      console.log(`Inserted ${s.name}`);
      s.diff = diffStartAndEnd(s.start, s.end);
      client.chat
        .postMessage({
          channel: process.env.SLACK_CHANNEL,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "New Sticker :D *{name}* with _{stock}_ in stock!\nSku: `{sku}`\nStart: `{start}`\nEnd: `{end}`\nDiff: {diff}".replace(
                  /\{(.+?)\}/g,
                  (m, p1) => s[p1],
                ),
              },
              accessory: {
                type: "image",
                image_url: s.picture,
                alt_text: s.name,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `Hc Stickers Watcher - Commit  ${gcsh}`,
                },
              ],
            },
          ],
        })
        .then(() => {
          if (process.env.PROD) {
            client.chat.postMessage({
              text: `<!subteam^S07UNB19RGB>`,
              channel: process.env.SLACK_CHANNEL,
            });
          }
        });
    }
  }
  if (total_blocks.length > 1) {
    total_blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Hc Stickers Watcher - Commit  ${gcsh}`,
        },
      ],
    });
    if (total_blocks.length >= 50) {
      // split into chunks
      const chunks = chunk(total_blocks, 50);
      for (const chunk of chunks) {
        client.chat.postMessage({
          channel: process.env.SLACK_CHANNEL,
          blocks: chunk,
        });
      }
    } else {
      client.chat.postMessage({
        channel: process.env.SLACK_CHANNEL,
        blocks: total_blocks,
      });
    }
  }
}
cron.schedule("0 */2 * * *", () => {
  run();
});
run();
log(`Started Hackclub Stickers Watcher - (not on main zeon instance)`)
process.on('uncaughtException', function (err) {
  log(err.stack || err.message)
})
process.on('unhandledRejection', function (err) {
  log(err.stack || err.message)
})