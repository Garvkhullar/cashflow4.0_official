// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// const Deal = require('./models/Deal');

// dotenv.config();

// const seedDeals = async () => {
//     try {
//         await mongoose.connect(process.env.MONGO_URI);

//         console.log('Connected to MongoDB for seeding...');

//         // Clear all existing deals to prevent duplicates
//         await Deal.deleteMany({});
//         console.log("Old deals removed successfully.");

//         const smallDeals = [
//         { name: "Matcha manuscripts", cost: 800000, passiveIncome: 11988, dealType: 'small' },
//         { name: "Pawsh Pets", cost: 700000, passiveIncome: 14350, dealType: 'small' },
//         { name: "Jordan Turf", cost: 750000, passiveIncome: 20475, dealType: 'small' },
//         { name: "Zayka Junction", cost: 1400000, passiveIncome: 30100, dealType: 'small' },
//         { name: "Ink Hub", cost: 650000, passiveIncome: 14300, dealType: 'small' },
//         { name: "FixIt Mobile", cost: 700000, passiveIncome: 15750, dealType: 'small' },
//         { name: "Bounce a Bout", cost: 1200000, passiveIncome: 25920, dealType: 'small' },
//         { name: "Hive FireWorks", cost: 1300000, passiveIncome: 22750, dealType: 'small' },
//         { name: "Iron Empire Gym", cost: 1000000, passiveIncome: 22000, dealType: 'small' },
//         { name: "Boba Hub", cost: 850000, passiveIncome: 18275, dealType: 'small' },
//         { name: "B.tech Coffee Wala", cost: 650000, passiveIncome: 13000, dealType: 'small' },
//         { name: "Vroom n Groom", cost: 700000, passiveIncome: 15050, dealType: 'small' },
//         { name: "Blossom Basket", cost: 800000, passiveIncome: 21120, dealType: 'small' },
//         { name: "Dhobi Express", cost: 1100000, passiveIncome: 34320, dealType: 'small' },
//         { name: "Old Money Tailors", cost: 750000, passiveIncome: 15375, dealType: 'small' },
//         { name: "Chawla Bakers", cost: 1000000, passiveIncome: 21000, dealType: 'small' },
//         { name: "Canvas Lane", cost: 800000, passiveIncome: 17200, dealType: 'small' },
//         { name: "Lassi Zone", cost: 700000, passiveIncome: 15400, dealType: 'small' },
//         { name: "Chheda Electronics", cost: 750000, passiveIncome: 16500, dealType: 'small' },
//         { name: "Locked Inn", cost: 1300000, passiveIncome: 31200, dealType: 'small' },
//         { name: "RetroGroove", cost: 750000, passiveIncome: 15375, dealType: 'small' },
//         { name: "Stretchy", cost: 900000, passiveIncome: 20250, dealType: 'small' },
//         { name: "McStretchFace", cost: 900000, passiveIncome: 20250, dealType: 'small' },
//         { name: "Huzz Dance Studio", cost: 850000, passiveIncome: 17425, dealType: 'small' },
//         { name: "Fine Shyt Drycleaners", cost: 700000, passiveIncome: 14000, dealType: 'small' },
//         { name: "Tohfa", cost: 750000, passiveIncome: 15000, dealType: 'small' },
//         { name: "BuyBazaar", cost: 900000, passiveIncome: 21150, dealType: 'small' },
//         { name: "Bhide Tuition Center", cost: 800000, passiveIncome: 17600, dealType: 'small' },
//         { name: "One Latency", cost: 1500000, passiveIncome: 30750, dealType: 'small' },
//         { name: "Goodie Foodie", cost: 800000, passiveIncome: 15480, dealType: 'small' },
//         { name: "Arora Caterers", cost: 700000, passiveIncome: 14000, dealType: 'small' },
//         { name: "Palak Planners", cost: 950000, passiveIncome: 22800, dealType: 'small' },
//         { name: "Greenie's", cost: 850000, passiveIncome: 18275, dealType: 'small' },
//         { name: "ShytPost Agency", cost: 1700000, passiveIncome: 35700, dealType: 'small' },
//         { name: "Unsouled Store", cost: 750000, passiveIncome: 16875, dealType: 'small' },
//         { name: "Maid In Heaven", cost: 650000, passiveIncome: 16770, dealType: 'small' },
//         { name: "Cover Story", cost: 650000, passiveIncome: 13975, dealType: 'small' },
//         { name: "bunty Clicks", cost: 800000, passiveIncome: 16800, dealType: 'small' },
//         { name: "Orange Softwares", cost: 800000, passiveIncome: 18000, dealType: 'small' },
//         { name: "Go Green LandScapes", cost: 650000, passiveIncome: 16250, dealType: 'small' },
//         { name: "Detailing Mafia", cost: 750000, passiveIncome: 7875, dealType: 'small' }
// ];

//         const bigDeals = [
//         { name: "Arabian Oil Corporation", cost: 3500000, passiveIncome: 189975, dealType: 'big' },
//         { name: "Manhattan Downtown Complex", cost: 3450000, passiveIncome: 196995, dealType: 'big' },
//         { name: "Bulls Car Dealership", cost: 3900000, passiveIncome: 199680, dealType: 'big' },
//         { name: "Hamilton's Hotel", cost: 3700000, passiveIncome: 217560, dealType: 'big' },
//         { name: "McMahon's Microbrewery", cost: 3650000, passiveIncome: 190165, dealType: 'big' },
//         { name: "Archie's Dental Care", cost: 3200000, passiveIncome: 175040, dealType: 'big' },
//         { name: "Vance Refrigeration", cost: 3850000, passiveIncome: 205405, dealType: 'big' },
//         { name: "Twiggy Cloud Kitchen Network", cost: 3100000, passiveIncome: 163680, dealType: 'big' },
//         { name: "Icy Health Care Clinic", cost: 3050000, passiveIncome: 180865, dealType: 'big' },
//         { name: "Malone Logistics and Company", cost: 3300000, passiveIncome: 165330, dealType: 'big' },
//         { name: "FitSet", cost: 3400000, passiveIncome: 181900, dealType: 'big' },
//         { name: "Band Baja Baarat Event Management", cost: 3550000, passiveIncome: 200930, dealType: 'big' },
//         { name: "Beesly's Food", cost: 3600000, passiveIncome: 188640, dealType: 'big' },
//         { name: "Rachel's Fashion", cost: 3250000, passiveIncome: 176150, dealType: 'big' },
//         { name: "Amdani Chemical Plant", cost: 3350000, passiveIncome: 193495, dealType: 'big' },
//         { name: "Laarson's Coffee Brewery", cost: 3150000, passiveIncome: 163485, dealType: 'big' },
//         { name: "Vaalya Aviation Center", cost: 4600000, passiveIncome: 267720, dealType: 'big' },
//         { name: "Halpert's Luxury Spa Resort", cost: 4800000, passiveIncome: 255840, dealType: 'big' },
//         { name: "Bing's E-Commerce", cost: 4550000, passiveIncome: 268905, dealType: 'big' },
//         { name: "Hamilton's Hotel Premier", cost: 4400000, passiveIncome: 226160, dealType: 'big' },
//         { name: "Indian Petrochemical Depot", cost: 4200000, passiveIncome: 246540, dealType: 'big' },
//         { name: "Knocking Brothers Auto Repair", cost: 4350000, passiveIncome: 238380, dealType: 'big' },
//         { name: "Oliver Printing & Packaging Unit", cost: 4450000, passiveIncome: 250835, dealType: 'big' },
//         { name: "Mana Kids Activity Center", cost: 4750000, passiveIncome: 241775, dealType: 'big' },
//         { name: "William's Industrial Tooling Workshop", cost: 4150000, passiveIncome: 221195, dealType: 'big' },
//         { name: "Apparel Manufacturing Unit", cost: 4850000, passiveIncome: 256565, dealType: 'big' },
//         { name: "Springfield Chemical Processing Plant", cost: 4250000, passiveIncome: 251175, dealType: 'big' },
//         { name: "Tourist Guest House Chain", cost: 4650000, passiveIncome: 254820, dealType: 'big' },
//         { name: "Dana Might Security Services Agency", cost: 4050000, passiveIncome: 232470, dealType: 'big' },
//         { name: "North Red London Bottling Plant", cost: 4900000, passiveIncome: 254800, dealType: 'big' },
//         { name: "Smith's Electronics Store", cost: 4100000, passiveIncome: 243130, dealType: 'big' },
//         { name: "BoomCar Rental Service", cost: 4600000, passiveIncome: 236210, dealType: 'big' },
//         { name: "Gurujo Ayurvedic Wellness Center", cost: 5500000, passiveIncome: 283250, dealType: 'big' },
//         { name: "Rahul Jayakar Recording Studio", cost: 6100000, passiveIncome: 330620, dealType: 'big' },
//         { name: "Ekea Furniture Workshop", cost: 6500000, passiveIncome: 386750, dealType: 'big' },
//         { name: "Michael's E-Commerce Fulfillment Center", cost: 6800000, passiveIncome: 346120, dealType: 'big' },
//         { name: "Radio Station", cost: 5900000, passiveIncome: 320960, dealType: 'big' },
//         { name: "Lana's Specialty Coffee Brewery", cost: 7500000, passiveIncome: 432000, dealType: 'big' },
//         { name: "mcGrien's Private Aviation Hangar", cost: 7800000, passiveIncome: 413400, dealType: 'big' },
//         { name: "Beau's Luxury Spa Resort", cost: 7200000, passiveIncome: 421200, dealType: 'big' }
// ];
        
//         await Deal.insertMany([...smallDeals, ...bigDeals]);
        
//         console.log("New deals inserted successfully!");

//     } catch (error) {
//         console.error("Error seeding database:", error);
//     } finally {
//         await mongoose.connection.close();
//         console.log("MongoDB connection closed.");
//     }
// };

// seedDeals();