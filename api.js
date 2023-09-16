const puppeteer = require("puppeteer");
require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const port = 3000;

let globalCookie; // Variable to store the cookie globally
const client = new MongoClient(process.env.MONGODB_URI);
let browserInstance; // To keep track of the browser instance

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(loginToGetCookie);

app.get("/", (req, res) => {
  res.json({ cookie: globalCookie });
});

app.listen(port, () => console.log(`Server running on port ${port}`));

async function loginToGetCookie(req, res, next) {
  try {
    const cookie = await getCookieFromBrowser();
    if (cookie) {
      globalCookie = cookie;
      console.log("Login successful");
      console.log(globalCookie);
      await saveCookieToMongoDB(globalCookie);
    } else {
      console.log("Login unsuccessful");
    }
  } catch (error) {
    console.error("Error in loginToGetCookie:", error);
  } finally {
    next();
  }
}

async function getCookieFromBrowser() {
  try {
    browserInstance = await puppeteer.launch({
      headless: false,
      executablePath:
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    });
    const page = await browserInstance.newPage();

    await page.goto("https://patronusjewelry.mysapogo.com/admin/customers/", {
      waitUntil: "networkidle0",
    });

    await page.type('input[name="username"]', process.env.SAPO_USERNAME);
    await page.type('input[name="password"]', process.env.SAPO_PASSWORD);

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('button[type="submit"]'),
    ]);

    await page.waitForTimeout(5000);

    const cookies = await page.cookies();

    if (
      page.url() === "https://patronusjewelry.mysapogo.com/admin/customers/"
    ) {
      return cookies.map((c) => `${c.name}=${c.value}`).join(";");
    }
  } catch (error) {
    console.error("Error in getCookieFromBrowser:", error);
  } finally {
    if (browserInstance) await browserInstance.close();
  }
  return null;
}

client
  .connect()
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

async function saveCookieToMongoDB(cookie) {
  try {
    const database = client.db("sapo");
    const collection = database.collection("cookie");

    const existingCookie = await collection.findOne();

    if (existingCookie) {
      await collection.updateOne({}, { $set: { cookie } });
      console.log("Cookie updated in MongoDB");
    } else {
      await collection.insertOne({ cookie });
      console.log("Cookie saved to MongoDB");
    }
  } catch (error) {
    console.error("Error in saveCookieToMongoDB:", error);
  }
}

// Handle graceful shutdowns
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("exit", gracefulShutdown);

async function gracefulShutdown() {
  if (browserInstance) await browserInstance.close();
  if (client.isConnected()) await client.close();
  process.exit();
}
