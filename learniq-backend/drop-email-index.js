require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]); // use Google/Cloudflare DNS

const mongoose = require("mongoose");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.collection("users");

  const indexes = await users.indexes();
  console.log("Indexes before:", indexes.map((i) => i.name));

  if (indexes.some((i) => i.name === "email_1")) {
    await users.dropIndex("email_1");
    console.log("Dropped old email_1 index.");
  } else {
    console.log("email_1 index not found, nothing to drop.");
  }

  const after = await users.indexes();
  console.log("Indexes after:", after.map((i) => i.name));
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});