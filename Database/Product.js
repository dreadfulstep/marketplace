const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    Name: String,
    Description: String,
    Price: Number,
    Images: String,
    MainImage: String,
    Tag: String,
});

module.exports = mongoose.model('Product', productSchema);