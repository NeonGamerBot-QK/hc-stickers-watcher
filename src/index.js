require("dotenv").config();
const db = require("better-sqlite3")("./data/stickers.db", {
    fileMustExist: false,
});
const slackwebapi = require("@slack/web-api");
const client = new slackwebapi.WebClient(process.env.SLACK_TOKEN);
db.pragma("journal_mode = WAL");
// create table if not exists stickers (id INTEGER PRIMARY KEY, name TEXT, sku TEXT, image_url TEXT);
db.prepare(
    "CREATE TABLE IF NOT EXISTS stickers (id INTEGER PRIMARY KEY, name TEXT, sku TEXT, image_url TEXT, stock INTEGER, start INTEGER, end INTEGER)",
).run();
// get git short hash via child_process
const gcsh = require("child_process").execSync(
    'git rev-parse --short HEAD || echo "dev" ',
).toString().trim();
function getStickers() {
    return fetch("https://arcade-stickers.hackclub.dev/api/skus/all").then(
        (r) => r.json(),
    ).then((r) => r.items);
}
function diffStartAndEnd(start, end) {
    return `Diff (S/E) is (${end - start}) \`${
        formatPercent(calculatePercent(start, end))
    }\``;
}
function formatPercent(p) {
    return p.toFixed(2) + "%";
}
function chunk(arr, size) {
  let result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
function calculatePercent(start, end) {
    return (end - start) / start * 100;
}
function getDiffOnProps(n1, n2) {
if(n1 - n2 > 0) {
    return `diff +${n1 - n2} \`${formatPercent(calculatePercent(n1, n2))}\``;
} else if(n1 - n2 < 0) {
    return `diff ${n1 - n2} \`${formatPercent(calculatePercent(n1, n2))}\``;
}
}
function diff(oldObj, newObj) {
    if (oldObj === newObj) return;
    const changedProps = [];
    if (oldObj.name !== newObj.name) changedProps.push("name");
    if (oldObj.sku !== newObj.sku) changedProps.push("sku");
    // for now dont check for image diff
    // the urls seem to expire so i will have to implement buffer diff
    // if (oldObj.image_url !== newObj.picture) changedProps.push("picture");
    if (oldObj.stock !== newObj.stock) changedProps.push("stock");
    if (oldObj.start !== newObj.start) changedProps.push("start");
    if (oldObj.end !== newObj.end) changedProps.push("end");
    let blocks = [];
    if (changedProps.length > 0) {
        blocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                // use new name, 
                text: `*Sticker: ${newObj.name} updated!*`,
            },
        });
    }
    for (const prop of changedProps) {
        switch (prop) {
            case "name":
                blocks.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `Name changed from *${oldObj[prop]}* to *${
                            newObj[prop]
                        }*`,
                    },
                });
                break;
            case "sku":
                blocks.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `Sku changed from *${oldObj[prop]}* to *${
                            newObj[prop]
                        }*`,
                    },
                });
                break;
            case "picture":
                blocks.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `Picture changed from *${oldObj.image_url}* to *${
                            newObj.picture
                        }*`,
                    },
                });
                break;
            case "stock":
                blocks.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text:
                            `Stock changed from *${oldObj.stock}* to *${newObj.stock}* ${getDiffOnProps(oldObj.stock, newObj.stock)}`,
                    },
                });
                break;
            case "start":
                blocks.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text:
                            `Start changed from *${oldObj.start}* to *${newObj.start}* ${getDiffOnProps(oldObj.start, newObj.start)}`,
                    },
                });
                break;
            case "end":
                blocks.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text:
                            `End changed from *${oldObj.end}* to *${newObj.end}* ${getDiffOnProps(oldObj.end, newObj.end)}`,
                    },
                });
                break;
        }
    }
    if (changedProps.includes("start") && changedProps.includes("end")) {
        blocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `Diff (S/E) is (${newObj.end - newObj.start}) \`${
                    formatPercent(calculatePercent(newObj.start, newObj.end))
                }\``,
            },
        });
    }
    // if(blocks.length > 0) {
    //     blocks.push({
    //         type: "context",
    //         elements: [
    //             {
    //                 type: "mrkdwn",
    //                 text: `Hc Stickers Watcher - Commit  ${gcsh}`,
    //             },
    //         ],
    //     });
    // }
    return blocks;
}

async function run() {
    /**
     * @returns {Promise<any[]>}
     */
    const stickers = await getStickers();
    const total_blocks = [{
        type: "header",
        text: {
            type: "plain_text",
            text: "Upaded Stickers",
        },
    }]
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
            console.log(blocks)
            if (blocks.length > 0) {
                // client.chat.postMessage({
                //     channel: process.env.SLACK_CHANNEL,
                //     "blocks": blocks,
                // })
                total_blocks.push(...blocks)
                total_blocks.push({ 
                    type: "divider"
                })
                // .then(() => {
                //     if (process.env.PROD) {
                //         client.chat.postMessage({
                //             text: `<!subteam^S07UNB19RGB>`,
                //             channel: process.env.SLACK_CHANNEL,
                //         });
                //     }
                // });
            }
        } else {
            // insert it
            db.prepare(
                "INSERT INTO stickers (name, sku, image_url, stock, start, end) VALUES (?, ?, ?, ?, ?, ?)",
            ).run(s.name, s.sku, s.picture, s.stock, s.start, s.end);
            console.log(`Inserted ${s.name}`);
            s.diff = diffStartAndEnd(s.start, s.end);
            client.chat.postMessage({
                channel: process.env.SLACK_CHANNEL,
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text":
                                "New Sticker :D *{name}* with _{stock}_ in stock!\nSku: `{sku}`\nStart: `{start}`\nEnd: `{end}`\nDiff: {diff}"
                                    .replace(/\{(.+?)\}/g, (m, p1) => s[p1]),
                        },
                        "accessory": {
                            "type": "image",
                            "image_url": s.picture,
                            "alt_text": s.name,
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
            }).then(() => {
                if (process.env.PROD) {
                    client.chat.postMessage({
                        text: `<!subteam^S07UNB19RGB>`,
                        channel: process.env.SLACK_CHANNEL,
                    });
                }
            });
        }
    }
if(total_blocks.length > 1) {
    total_blocks.push({
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `Hc Stickers Watcher - Commit  ${gcsh}`,
                    },
                ],
            });
  if(total_blocks.length >= 50) {
    // split into chunks
    const chunks = chunk(total_blocks, 50)
    for(const chunk of chunks) {
      client.chat.postMessage({
        channel: process.env.SLACK_CHANNEL,
        "blocks": chunk,
      })
    }
  } else {
    client.chat.postMessage({
        channel: process.env.SLACK_CHANNEL,
        "blocks": total_blocks,
    })
  }
            
        }


}

setInterval(run, 1000 * 60 * 30);
run();
