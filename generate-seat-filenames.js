// generate-seat-filenames.js
// Run this to get the full list of filenames you need to create

const guests = require("./data/guests.json");

console.log("=".repeat(70));
console.log("SEAT IMAGE FILENAMES — All 103 guests");
console.log("=".repeat(70));
console.log("\nSave your seat assignment images with these exact filenames:");
console.log("Place them in: public/seat-images/\n");

guests.forEach((g, i) => {
  const filename = g.name.toLowerCase().replace(/\s+/g, "-") + ".jpg";
  console.log(`${String(i + 1).padStart(3)}. ${filename.padEnd(40)} (${g.name})`);
});

console.log("\n" + "=".repeat(70));
console.log(`Total: ${guests.length} images needed`);
console.log("=".repeat(70));
