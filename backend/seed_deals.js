const mongoose = require('mongoose');
const Deal = require('./models/Deal');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI


const deals = [
  // Small Deals with downPayment
  { name: "The Sip Story", cost: 800000, downPayment: 296000, passiveIncome: 128000, dealType: 'small' },
  { name: "Pawsh Pets", cost: 700000, downPayment: 287000, passiveIncome: 126000, dealType: 'small' },
  { name: "Jordan Turf", cost: 750000, downPayment: 315000, passiveIncome: 127500, dealType: 'small' },
  { name: "Zayka Junction", cost: 1400000, downPayment: 602000, passiveIncome: 238000, dealType: 'small' },
  { name: "Ink Hub", cost: 650000, downPayment: 286000, passiveIncome: 117000, dealType: 'small' },
  { name: "FixIt Mobile", cost: 700000, downPayment: 315000, passiveIncome: 126000, dealType: 'small' },
  { name: "Playtopia", cost: 1200000, downPayment: 576000, passiveIncome: 204000, dealType: 'small' },
  { name: "Hive FireWorks", cost: 1300000, downPayment: 650000, passiveIncome: 234000, dealType: 'small' },
  { name: "Iron Empire Gym", cost: 1000000, downPayment: 440000, passiveIncome: 170000, dealType: 'small' },
  { name: "Boba Hub", cost: 850000, downPayment: 365500, passiveIncome: 161500, dealType: 'small' },
  { name: "B.tech Coffee Wala", cost: 650000, downPayment: 260000, passiveIncome: 110500, dealType: 'small' },
  { name: "Vroom n Groom", cost: 700000, downPayment: 301000, passiveIncome: 126000, dealType: 'small' },
  { name: "Blossom Basket", cost: 800000, downPayment: 352000, passiveIncome: 144000, dealType: 'small' },
  { name: "Dhobi Express", cost: 1100000, downPayment: 528000, passiveIncome: 176000, dealType: 'small' },
  { name: "Old Money Tailors", cost: 750000, downPayment: 307500, passiveIncome: 127500, dealType: 'small' },
  { name: "Chawla Bakers", cost: 1000000, downPayment: 420000, passiveIncome: 190000, dealType: 'small' },
  { name: "Canvas Lane", cost: 800000, downPayment: 344000, passiveIncome: 136000, dealType: 'small' },
  { name: "Lassi Zone", cost: 700000, downPayment: 308000, passiveIncome: 119000, dealType: 'small' },
  { name: "Chheda Electronics", cost: 750000, downPayment: 330000, passiveIncome: 135000, dealType: 'small' },
  { name: "Locked Inn", cost: 1300000, downPayment: 624000, passiveIncome: 234000, dealType: 'small' },
  { name: "RetroGroove", cost: 750000, downPayment: 307500, passiveIncome: 120000, dealType: 'small' },
  { name: "Shanti Space", cost: 900000, downPayment: 405000, passiveIncome: 171000, dealType: 'small' },
  { name: "Buzz Dance Studio", cost: 850000, downPayment: 348500, passiveIncome: 144500, dealType: 'small' },
  { name: "Fine Shyt Drycleaners", cost: 700000, downPayment: 280000, passiveIncome: 119000, dealType: 'small' },
  { name: "Tohfa", cost: 750000, downPayment: 300000, passiveIncome: 135000, dealType: 'small' },
  { name: "BuyBazaar", cost: 900000, downPayment: 423000, passiveIncome: 153000, dealType: 'small' },
  { name: "Bhide Tuition Center", cost: 800000, downPayment: 352000, passiveIncome: 152000, dealType: 'small' },
  { name: "One Latency", cost: 1500000, downPayment: 615000, passiveIncome: 255000, dealType: 'small' },
  { name: "Goodie Foodie", cost: 800000, downPayment: 344000, passiveIncome: 144000, dealType: 'small' },
  { name: "Arora Caterers", cost: 700000, downPayment: 280000, passiveIncome: 126000, dealType: 'small' },
  { name: "Eventopia Planners", cost: 950000, downPayment: 456000, passiveIncome: 161500, dealType: 'small' },
  { name: "Greenie's", cost: 850000, downPayment: 365500, passiveIncome: 144500, dealType: 'small' },
  { name: "ShytPost Agency", cost: 1700000, downPayment: 714000, passiveIncome: 306000, dealType: 'small' },
  { name: "Unsouled Store", cost: 750000, downPayment: 337500, passiveIncome: 127500, dealType: 'small' },
  { name: "Sparkle Shine Solutions", cost: 650000, downPayment: 279500, passiveIncome: 117000, dealType: 'small' },
  { name: "Cover Story", cost: 650000, downPayment: 279500, passiveIncome: 117000, dealType: 'small' },
  { name: "Bunty Clicks", cost: 800000, downPayment: 336000, passiveIncome: 128000, dealType: 'small' },
  { name: "Orange Softwares", cost: 800000, downPayment: 360000, passiveIncome: 144000, dealType: 'small' },
  { name: "Go Green LandScapes", cost: 650000, downPayment: 325000, passiveIncome: 117000, dealType: 'small' },
  { name: "NeoChem Works", cost: 3522000, downPayment: 1584900, passiveIncome: 717784, dealType: 'big' },
  { name: "GearGrid Engineering", cost: 3064500, downPayment: 1379025, passiveIncome: 647222, dealType: 'big' },
  { name: "Nirvana Springs", cost: 2789500, downPayment: 1255275, passiveIncome: 556784, dealType: 'big' },
  { name: "SkyHaven Jetworks", cost: 3642000, downPayment: 1638900, passiveIncome: 747338, dealType: 'big' },
  { name: "Opal Orchid Inn", cost: 3368500, downPayment: 1583195, passiveIncome: 731975, dealType: 'big' },
  { name: "PetroCore Terminal", cost: 2231500, downPayment: 1115750, passiveIncome: 433804, dealType: 'big' },
  { name: "Celestia Spa Resort", cost: 4000000, downPayment: 1800000, passiveIncome: 811600, dealType: 'big' },
  { name: "AeroOgrien", cost: 3412500, downPayment: 1535625, passiveIncome: 727204, dealType: 'big' },
  { name: "MarinaSolace", cost: 3755000, downPayment: 1727300, passiveIncome: 754380, dealType: 'big' },


// big deals
  { name: "FitSet Gym", cost: 2312500, downPayment: 994375, passiveIncome: 446775, dealType: 'big' },
  { name: "Bandhan Events", cost: 2388000, downPayment: 955200, passiveIncome: 512942, dealType: 'big' },
  { name: "Beesly's Food", cost: 2445500, downPayment: 1100475, passiveIncome: 507930, dealType: 'big' },
  { name: "Thread Smiths", cost: 2492500, downPayment: 1121625, passiveIncome: 494761, dealType: 'big' },
  { name: "Chem Core Industries", cost: 2365500, downPayment: 1064475, passiveIncome: 497465, dealType: 'big' },
  { name: "Roastery Republic", cost: 2613000, downPayment: 1149720, passiveIncome: 537233, dealType: 'big' },
  { name: "Bing's E-Commerce", cost: 2556500, downPayment: 1099295, passiveIncome: 509766, dealType: 'big' },
  { name: "Torque Brothers", cost: 2674000, downPayment: 1096340, passiveIncome: 585339, dealType: 'big' },
  { name: "PrintXpress", cost: 2408000, downPayment: 1204000, passiveIncome: 484490, dealType: 'big' },
  { name: "WanderInn", cost: 2354000, downPayment: 1059300, passiveIncome: 502579, dealType: 'big' },
  { name: "BlackShield Security", cost: 2512500, downPayment: 1005000, passiveIncome: 494209, dealType: 'big' },
  { name: "NorthCrest Bottling", cost: 2624500, downPayment: 1128535, passiveIncome: 536185, dealType: 'big' },
  { name: "Gadget Galaxy", cost: 2467500, downPayment: 1110375, passiveIncome: 535941, dealType: 'big' },
  { name: "BoomCar Rental Service", cost: 2598500, downPayment: 1169325, passiveIncome: 500991, dealType: 'big' },
  { name: "Guruji Ayurvedic Center", cost: 2645500, downPayment: 1164020, passiveIncome: 553968, dealType: 'big' },
  { name: "NitroPoint Fuels", cost: 2475500, downPayment: 1237750, passiveIncome: 533718, dealType: 'big' },
  { name: "MetroVista Residency", cost: 2321500, downPayment: 1137535, passiveIncome: 459889, dealType: 'big' },
  { name: "LuxeMotive", cost: 2573500, downPayment: 1183810, passiveIncome: 521134, dealType: 'big' },
  { name: "Casa Charmé", cost: 2612000, downPayment: 1123160, passiveIncome: 550610, dealType: 'big' },
  { name: "BrewBite Tavern", cost: 2428500, downPayment: 995685, passiveIncome: 501242, dealType: 'big' },
  { name: "PearlLine Dental", cost: 2689000, downPayment: 1156270, passiveIncome: 525162, dealType: 'big' },
  { name: "FrostVault Logistics", cost: 2378500, downPayment: 1022755, passiveIncome: 521843, dealType: 'big' },
  { name: "Twiggy Cloud Kitchens", cost: 2500000, downPayment: 1125000, passiveIncome: 517750, dealType: 'big' },
  { name: "Icy Health Care Clinic", cost: 2532500, downPayment: 1063650, passiveIncome: 491052, dealType: 'big' },
  { name: "CargoMaster Fleet", cost: 2674500, downPayment: 1230270, passiveIncome: 567261, dealType: 'big' },
  { name: "StitchForge", cost: 2284000, downPayment: 982120, passiveIncome: 460683, dealType: 'big' },
  { name: "Bean Haven", cost: 3876500, downPayment: 1705660, passiveIncome: 839262, dealType: 'big' },
  { name: "MLM Ecommerce", cost: 2973000, downPayment: 1367580, passiveIncome: 587465, dealType: 'big' },
  { name: "QuickCrate Hub", cost: 3215500, downPayment: 1286200, passiveIncome: 670110, dealType: 'big' },
  { name: "VibeCast FM", cost: 3943000, downPayment: 1577200, passiveIncome: 846562, dealType: 'big' },
  { name: "Resonance Studios", cost: 2863000, downPayment: 1259720, passiveIncome: 569164, dealType: 'big' },
  { name: "NeoChem Works", cost: 3522000, downPayment: 1584900, passiveIncome: 717784, dealType: 'big' },
  { name: "GearGrid Engineering", cost: 3064500, downPayment: 1379025, passiveIncome: 647222, dealType: 'big' },
  { name: "Nirvana Springs", cost: 2789500, downPayment: 1255275, passiveIncome: 556784, dealType: 'big' },
  { name: "SkyHaven Jetworks", cost: 3642000, downPayment: 1638900, passiveIncome: 747338, dealType: 'big' },
  { name: "Opal Orchid Inn", cost: 3368500, downPayment: 1583195, passiveIncome: 731975, dealType: 'big' },
  { name: "PetroCore Terminal", cost: 2231500, downPayment: 1115750, passiveIncome: 433804, dealType: 'big' },
  { name: "Celestia Spa Resort", cost: 4000000, downPayment: 1800000, passiveIncome: 811600, dealType: 'big' },
  { name: "AeroOgrien", cost: 3412500, downPayment: 1535625, passiveIncome: 727204, dealType: 'big' },
  { name: "MarinaSolace", cost: 3755000, downPayment: 1727300, passiveIncome: 754380, dealType: 'big' }
];







async function run() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    await Deal.deleteMany({ dealType: 'big' });
    const result = await Deal.insertMany(deals);
    console.log(`Seeded ${result.length} big deal entries.`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
}

run();