const fs = require("fs");
let raw = fs.readFileSync("scratch/survey_gia_cong_tree.json", "utf8");
let data = JSON.parse(raw);
while (typeof data === "string") {
  data = JSON.parse(data);
}
const p = data.tree;
console.log("Tree name:", p.name, "Bounds:", p.bounds, "Subcount:", p.sub_count);
p.children.forEach((c, i) => {
  console.log(`Child ${i}:`, c.name, "Bounds X:", c.bounds.min[0], "to", c.bounds.max[0], "Width:", c.bounds.width);
  console.log("  Subs:", c.children.map((x) => x.name));
});
