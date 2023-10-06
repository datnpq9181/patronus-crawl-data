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
        // Rest of your loginToGetCookie function remains unchanged
        // You can use the provided 'page' object for Puppeteer operations
        // ...
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching cookie");
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
