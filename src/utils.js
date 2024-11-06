function setupDB(db) {
    // create table if not exists stickers (id INTEGER PRIMARY KEY, name TEXT, sku TEXT, image_url TEXT);
db.prepare(
    "CREATE TABLE IF NOT EXISTS stickers (id INTEGER PRIMARY KEY, name TEXT, sku TEXT, image_url TEXT, stock INTEGER, start INTEGER, end INTEGER)",
  ).run();
  // lists are js , separetd #'s
  db.prepare(
    "CREATE TABLE IF NOT EXISTS graphs (id INTEGER PRIMARY KEY, sticker_id INTEGER, update_list TEXT, stock_list TEXT)",
  )
}
function getStickers() {
    return fetch("https://arcade-stickers.hackclub.dev/api/skus/all")
      .then((r) => r.json())
      .then((r) => r.items);
  }
  function diffStartAndEnd(start, end) {
    return `Diff (S/E) is (${end - start}) \`${formatPercent(
      calculatePercent(start, end),
    )}\``;
  }
  function formatPercent(p) {
    return Math.round(p) + "%";
  }
  function chunk(arr, size) {
    let result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }
  function calculatePercent(start, end) {
    // calcuate start% of end
    return (end - start) / end * 100;
  }
  function getDiffOnProps(n1, n2) {
    if (n1 - n2 > 0) {
      return `diff +${n1 - n2}`;
    } else if (n1 - n2 < 0) {
      return `diff ${n2 - n1}`;
    }
  }
  function diff(oldObj, newObj) {
    if (oldObj === newObj) return;
    const changedProps = [];
    if (oldObj.name !== newObj.name) changedProps.push("name");
    if (oldObj.sku !== newObj.sku) changedProps.push("sku");
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
              text: `Name changed from *${oldObj[prop]}* to *${newObj[prop]}*`,
            },
          });
          break;
        case "sku":
          blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Sku changed from *${oldObj[prop]}* to *${newObj[prop]}*`,
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
              text: `Stock changed from *${oldObj.stock}* to *${newObj.stock}* ${getDiffOnProps(oldObj.stock, newObj.stock)}`,
            },
          });
          break;
        case "start":
          blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Start changed from *${oldObj.start}* to *${newObj.start}* ${getDiffOnProps(oldObj.start, newObj.start)}`,
            },
          });
          break;
        case "end":
          blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `End changed from *${oldObj.end}* to *${newObj.end}* ${getDiffOnProps(oldObj.end, newObj.end)}`,
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
          text: `Diff (S/E) is (${newObj.end - newObj.start}) \`${formatPercent(
            calculatePercent(newObj.start, newObj.end),
          )}\``,
        },
      });
    }
    return blocks;
  }
  module.exports = {
    setupDB,
    getStickers,
    diffStartAndEnd,
    formatPercent,
    chunk,
    calculatePercent,
    getDiffOnProps,
    diff,
  };