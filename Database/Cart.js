const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
    UserId: String,
    Cart: {
        type: Array,
        default: []
    }
});

module.exports = mongoose.model('Cart', CartSchema);