
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