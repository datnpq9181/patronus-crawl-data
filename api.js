const puppeteer = require('puppeteer');
require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;

let globalCookie; // Variable to store the cookie globally

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(loginToGetCookie);

app.listen(port, () => console.log(`Server running on port ${port}`));

async function loginToGetCookie(req, res, next) {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://patronusjewelry.mysapogo.com/admin/customers/', {
      waitUntil: 'networkidle0', // Wait for network to be idle
    });

    await page.type('input[name="username"]', process.env.USERNAME);
    await page.type('input[name="password"]', process.env.PASSWORD);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }), // Wait for navigation
      page.click('button[type="submit"]'),
    ]);

    await page.waitForTimeout(5000); // Wait 5 seconds for page loaded

    const currentUrl = page.url();
    if (currentUrl === 'https://patronusjewelry.mysapogo.com/admin/customers/') {
      const cookies = await page.cookies();
      const cookie = cookies.map((c) => `${c.name}=${c.value}`).join(';');
      globalCookie = cookie; // Set the cookie globally
      console.log('Login successful');
      console.log(globalCookie);

      await saveCookieToMongoDB(globalCookie); // Save the cookie to MongoDB

      await browser.close();
      next();
    } else {
      console.log('Login unsuccessful');
      await browser.close();
      next();
    }
  } catch (error) {
    console.error(error);
  }
}

async function saveCookieToMongoDB(cookie) {
  try {
    const uri = 'mongodb+srv://datngo2994:D%40t12345@cluster0.qjwl5f2.mongodb.net/';
    const client = new MongoClient(uri, { useUnifiedTopology: true });
    await client.connect();

    const database = client.db('sapo');
    const collection = database.collection('cookie');

    const existingCookie = await collection.findOne(); // Find the existing cookie document

    if (existingCookie) {
      await collection.updateOne({}, { $set: { cookie } }); // Update the existing cookie
      console.log('Cookie updated in MongoDB');
    } else {
      await collection.insertOne({ cookie }); // Add a new cookie
      console.log('Cookie saved to MongoDB');
    }

    await client.close();
  } catch (error) {
    console.error(error);
  }
}

// async function fetchCustomerData(req, res, next) {
//   console.log('Fetching customer data');
//   console.log(globalCookie);
//   if (globalCookie) {
//     try {
//       let page = 1;
//       const limit = 100;
//       let allCustomers = [];

//       while (true) {
//         const url = `https://patronusjewelry.mysapogo.com/admin/customers/doSearch.json?page=${page}&limit=${limit}&condition_type=must`;
//         const response = await fetch(url, {
//           headers: {
//             cookie: globalCookie,
//           },
//           method: 'GET',
//         });

//         const data = await response.json();
//         console.log(data.customers);

//         allCustomers = allCustomers.concat(data.customers);

//         if (data.customers.length < limit) {
//           break;
//         }

//         page++;
//       }

//       const customerIds = allCustomers.map((customer) => customer.id);

//       const fileName = 'customerData.json';
//       fs.writeFileSync(fileName, JSON.stringify(customerIds, null, 2));

//       res.json(allCustomers);
//     } catch (error) {
//       console.error(error);
//       res.sendStatus(500);
//     }
//   } else {
//     next();
//   }
// }

// app.get('/getData', fetchCustomerData);

// async function fetchDetailCustomerData(req, res) {
//   try {
//     const id = req.params.id;
//     const url = `https://patronusjewelry.mysapogo.com/admin/loyalty/v2/customers/${id}.json`;

//     const response = await fetch(url, {
//       headers: {
//         cookie: globalCookie,
//       },
//       method: 'GET',
//     });

//     const data = await response.json();
//     console.log(data);

//     const customerDataJSON = JSON.stringify(data, null, 2);
//     const fileName = `${id}.json`;
//     const folderPath = path.join(__dirname, 'customers');
//     const filePath = path.join(folderPath, fileName);

//     if (!fs.existsSync(folderPath)) {
//       fs.mkdirSync(folderPath);
//     }

//     fs.writeFileSync(filePath, customerDataJSON);

//     console.log(`Customer data saved to ${filePath}`);

//     res.sendStatus(200);
//   } catch (error) {
//     console.error(error);
//     res.sendStatus(500);
//   }
// }

// app.get('/detail/:id', fetchDetailCustomerData);