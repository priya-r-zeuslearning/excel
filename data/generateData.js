/**
 * Generates 50,000 records in the required format and saves to myData.json
 */
const fs = require('fs');

const records = [];
for (let i = 1; i <= 50000; i++) {
    records.push({
        id: i,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        Age: 20 + (i % 50),
        Salary: 30000 + (i * 13) % 100000
    });
}

fs.writeFileSync('data/myData.json', JSON.stringify(records, null, 2));
console.log('Generated myData.json with 50,000 records.'); 