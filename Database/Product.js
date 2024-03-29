const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    Name: String,
    Description: String,
    Price: Number,
    Images: String
});

module.exports = mongoose.model('Product', productSchema);