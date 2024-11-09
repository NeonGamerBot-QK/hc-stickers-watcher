require("dotenv").config();
const db = require("better-sqlite3")("./data/stickers.db", {
  fileMustExist: false,
});
db.pragma("journal_mode = WAL");
// update random sticker to have a diff
const r = db
  .prepare("SELECT * FROM stickers WHERE sku = ?")
  .get("Sti/HS/Main/1st");
console.log(r);
if (r) {
  db.prepare(
    "UPDATE stickers SET name = ?, image_url = ?, stock = ?, start = ?, end = ? WHERE sku = ?",
  ).run(
    r.name + ` Touched`,
    r.image_url,
    r.stock - 1,
    r.start - 15,
    r.end,
    r.sku,
  );
}
