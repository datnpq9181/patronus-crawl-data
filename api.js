const puppeteer = require('puppeteer');
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;
const client = new MongoClient(process.env.MONGODB_URI);

let browserInstance = await puppeteer.launch({
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
    ]
});; // Store the Puppeteer browser instance

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware to always fetch the cookie
app.use(async (req, res, next) => {
    try {
        await loginToGetCookie(req, res);
        next();
    } catch (error) {
        console.error("Error fetching cookie:", error);
        res.status(500).send("Error fetching cookie");
    }
});

app.get('/', (req, res) => {
    // The middleware will handle the response
});

app.listen(port, () => console.log(`Server running on port ${port}`));

async function loginToGetCookie(req, res) {
    let page = null;
    
    try {
        // Open new Page to getCookie
        page = await browserInstance.newPage();

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
            const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join(';');
            await saveCookieToMongoDB(cookieString);

            res.setHeader('Content-Type', 'application/json');
            const jsonData = { cookie: cookieString };
            const prettyJson = JSON.stringify(jsonData, null, 4); // 4 spaces for indentation
            res.send(prettyJson);
        } else {
            console.log('Login unsuccessful');
            res.status(500).send("Login unsuccessful");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching cookie");
    } finally {
        if (browserInstance && page) await page.close();
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
