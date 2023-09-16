const axios = require('axios');

const apiUrl = 'https://patronuscrawldata.netlify.app/';

async function fetchData() {
  try {
    const response = await axios.get(apiUrl);
    const data = response.data;
    console.log('Data:', data);
    // You can perform any further processing or display logic here
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

fetchData();