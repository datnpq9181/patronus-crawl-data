const puppeteer = require('puppeteer');
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;
const client = new MongoClient(process.env.MONGODB_URI);

let globalCookie; // Variable to store the cookie globally
let browserInstance; // Store the Puppeteer browser instance

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware to check if globalCookie is set, if not, fetch it
app.use(async (req, res, next) => {
    if (!globalCookie) {
        try {
            await loginToGetCookie();
            next();
        } catch (error) {
            console.error("Error fetching cookie:", error);
            res.status(500).send("Error fetching cookie");
        }
    } else {
        next();
    }
});

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const jsonData = { cookie: globalCookie };
    const prettyJson = JSON.stringify(jsonData, null, 4); // 4 spaces for indentation
    res.send(prettyJson);
});

app.listen(port, () => console.log(`Server running on port ${port}`));

async function loginToGetCookie() {
    try {
      browserInstance = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });
        const page = await browserInstance.newPage();

        await page.goto('https://patronusjewelry.mysapogo.com/admin/customers/', {
            waitUntil: 'networkidle0',
        });

        await page.type('input[name="username"]', process.env.SAPO_USERNAME);
        await page.type('input[name="password"]', process.env.SAPO_PASSWORD);

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('button[type="submit"]'),
        ]);

        const currentUrl = page.url();
        if (currentUrl === 'https://patronusjewelry.mysapogo.com/admin/customers/') {
            const cookies = await page.cookies();
            globalCookie = cookies.map((c) => `${c.name}=${c.value}`).join(';');
            await saveCookieToMongoDB(globalCookie);
        } else {
            console.log('Login unsuccessful');
        }
    } catch (error) {
        console.error(error);
    } finally {
        if (browserInstance) await browserInstance.close();
    }
}

async function saveCookieToMongoDB(cookie) {
    try {
        await client.connect();
        const database = client.db('sapo');
        const collection = database.collection('cookie');

        const existingCookie = await collection.findOne();
        if (existingCookie) {
            await collection.updateOne({}, { $set: { cookie } });
            console.log('Cookie updated in MongoDB');
        } else {
            await collection.insertOne({ cookie });
            console.log('Cookie saved to MongoDB');
        }
    } catch (error) {
        console.error(error);
    }
}

// Handle graceful shutdowns
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("exit", gracefulShutdown);

async function gracefulShutdown() {
    if (client.isConnected()) await client.close();
    process.exit();
}

// Connect to MongoDB on startup
client
    .connect()
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("Failed to connect to MongoDB:", err));
