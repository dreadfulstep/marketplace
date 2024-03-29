const mongoose = require('mongoose');

const LicensesSchema = new mongoose.Schema({
    License: String,
    UserId: String,
});

module.exports = mongoose.model('Licenses', LicensesSchema);