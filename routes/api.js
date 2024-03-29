const express = require('express');
const passport = require('passport');
const router = express.Router();
const bodyParser = require('body-parser');
const schema = require('../Database/Product');
const generate = require('../generate-id');
const multer = require('multer');
const path = require('path');
router.use(bodyParser.json());

router.get('/auth/discord',
    passport.authenticate('discord', { scope: ['identify', 'guilds'] })
);

router.get(`/auth/discord/callback`,
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => {
    res.redirect('/');
    }
);

router.get('/auth/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

module.exports = router