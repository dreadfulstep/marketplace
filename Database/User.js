const mongoose = require('mongoose');

const UsersSchema = new mongoose.Schema({
    UserId: String,
    CreatedAt: {
        type: Date,
        default: new Date()
    },
    Purchases: {
        type: Object,
        default: null
    },
    AccountType: {
        type: String,
        default: null
    },
});

module.exports = mongoose.model('Users', UsersSchema);