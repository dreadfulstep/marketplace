const mongoose = require('mongoose');

const LicensesSchema = new mongoose.Schema({
    License: String,
    SessionId: String,
});

module.exports = mongoose.model('Licenses', LicensesSchema);