const puppeteer = require('puppeteer');
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;
const client = new MongoClient(process.env.MONGODB_URI);

let browserInstance = null; // Declare the Puppeteer browser instance outside the API route handler

// Function to create a new Puppeteer browser instance
async function initializeBrowser() {
    console.log('Opening ...')
    browserInstance = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });
    console.log('Browser opened!')
}

// Initialize the browser when the application starts
initializeBrowser();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware to always fetch the cookie
app.use(async (req, res, next) => {
    console.log('Tab opening ...')
    try {
        // Check if the browser is initialized, and initialize it if not
        if (!browserInstance) {
            await initializeBrowser();
        }

        // Open a new tab (page) for each API request
        const page = await browserInstance.newPage();
        console.log('Tab opened!')
        // Call the loginToGetCookie function
        await loginToGetCookie(page, req, res);

        // Close the page when done
        await page.close();
        console.log('Tab closed!')
    } catch (error) {
        console.error("Error fetching cookie:", error);
        res.status(500).send("Error fetching cookie");
    }
});

app.get('/', (req, res) => {
    // The middleware will handle the response
});

app.listen(port, () => console.log(`Server running on port ${port}`));

async function loginToGetCookie(page, req, res) {
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
      page = await browserInstance.newPage();
  
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
    if (browserInstance) {
        await browserInstance.close();
    }
    if (client.isConnected()) {
        await client.close();
    }
    process.exit();
}

// Connect to MongoDB on startup
client
    .connect()
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("Failed to connect to MongoDB:", err));
