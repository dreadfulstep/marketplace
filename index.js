const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config.json');
const session = require('express-session');
const fetch = require('node-fetch');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const mongoose = require('mongoose');
const MongoDBStore = require('connect-mongodb-session')(session);
const logs = require('./utils/Logs');
const licenses = require('./Database/licences');
const Product = require('./Database/Product');
const stripe = require('stripe')(config.STRIPE_SECRET_KEY);
const fs = require('fs');
const generateID = require('./generate-id');
const Cart = require('./Database/Cart.js');
const User = require('./Database/User.js');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'website'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(config.MONGO_URL);

const store = new MongoDBStore({
    uri: config.MONGO_URL,
    collection: 'sessions',
});

store.on('error', (error) => {
    console.error('Error in MongoDBStore:', error);
});

app.use(
    session({
        secret: 'SGANGASNGAWJKLKARTLKSORJIOPWKOPAERKO"$I"($*"($I("I$("<RSAFL{AST"£P%KLASKFl<ASFM<ASLPGJKW£U()_R%IASFKL(_"u$%*JASIFJ£KFAOL<SDFOI"£',
        resave: false,
        saveUninitialized: false,
        store: store,
        cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
    })
);

passport.use(new DiscordStrategy({
    clientID: config.APP_ID,
    clientSecret: config.Client_Secret,
    callbackURL: config.Callback_Url,
    scope: ['identify', 'guilds.join'],
  },
  async (accessToken, refreshToken, profile, done) => {
    const guildId = config.GUILD_ID;
    const botToken = config.TOKEN;

    try {
        let user = await User.findOne({ UserId: profile.id });

        if (!user) {
          user = await User.create({
            UserId: profile.id,
            CreatedAt: new Date(),
            AccountType: "User",
            Purchases: null
          });
        }

      const url = `https://discord.com/api/guilds/${guildId}/members/${profile.id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
        }),
      });
      if (response.status === 204 || response.ok) {
        done(null, profile);
      } else {
        console.error(`Failed to add user to guild: ${response.statusText}`);
        throw new Error(`Failed to add user to guild: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to add user to guild:', error);
      done(error);
    }
  }
));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

app.get('*', async (req, res, next) => {
    if (req.user) {
        req.user.cart = await Cart.findOne({ UserId: req.user.id });
        let userData = await User.findOne({ UserId: req.user.id });
        if (!userData) {
            userData = await User.create({
                UserId: req.user.id,
                CreatedAt: new Date(),
                AccountType: "User"
              });
      
              await user.save();
        }

        req.userData = userData;
    }
    next();
});

app.get('/login', 
    passport.authenticate('discord')
)

app.get('/', async (req, res) => {
    res.render('landing', { user: req.user });
});

app.get('/store', ensureAuthenticated, async (req, res) => {
    const products = await Product.find();
    res.render('products', { products, user: req.user });
});

app.get('/store/:productId', ensureAuthenticated, async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product) return res.render('404');
    else {
        res.render('product', { product, user: req.user, images: ["https://plexdevelopment.net/images/user-881277706862481479.png"] });
    }
})

app.get('/account', ensureAuthenticated, async (req, res) => {
    res.render('account', { user: req.user, actualUser: req.userData })
})

// STUFF TO DO WITH PAYMENTS

app.get('/purchase/success', async (req, res) => {
    const session_id = req.query.session_id;

    if (!session_id) {
        return res.status(400).send('Session ID is required');
    }
    let session;
    try {
        session = await stripe.checkout.sessions.retrieve(session_id);
    }catch(e) {
        return res.status(500).send('Invalid Session Id.')
    }
    try {
        if (session.payment_status === 'paid') {
            const license = await generateProductId(req.user);
            res.render('purchase_success', { session, licenseKey: license });
        } else {
            res.status(403).send('Payment was not successful');
        }
    } catch (error) {
        console.error('Error retrieving checkout session:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/dashboard', isAuthenticatedAndAdmin, async (req, res) => {
    const products = await Product.find();
    res.render('admin_dashboard', { products, user: req.user });
});

app.post('/add-product', isAuthenticatedAndAdmin, async (req, res) => {
    const { name, description, price } = req.body;

    const newProduct = new Product({ Name: name, Description: description, Price: price });
    await newProduct.save();
    res.redirect('/dashboard');
});

app.post('/create-checkout-session', async (req, res) => {
    const { productId } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
        return res.status(404).send('Product not found.');
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: product.Name,
                },
                unit_amount: Math.round(product.Price * 100),
            },
            quantity: 1,
        }],
        mode: 'payment',
        success_url: `${config.BASE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.BASE_URL}/purchase/cancelled`,
    });

    res.json({ url: session.url });
});

const apiRouter = require('./routes/api');
app.use('/api/v1', apiRouter);

app.get('*', async (req, res) => {
    res.render('404', { user: req.user });
})

app.listen(config.PORT, () => {
    logs.info(`Listening on port ${config.PORT}`)
})

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

const licences = require('./Database/licences.js');
async function generateProductId(user) {
         let isUnique = false;
         let productId = null;

         const data = await licenses.findOne({ UserId: user.id});

         if (data) return data.License;
    
         while (!isUnique) {
             let newItem = generateID("AAAA-AAAA-AAAA-AAAA");

             const existingProduct = await licenses.findOne({ License: newItem});

             if (!existingProduct) {
                 isUnique = true;
                 productId = newItem;
             }
         }

         await licenses.create({
            License: productId,
            UserId: user.id
         })
    
         return productId;
}

function isAuthenticatedAndAdmin(req, res, next) {
    if (req.isAuthenticated() && config.ADMINS.includes(req.user.id)) {
        return next();
    }
    res.render('404', { user: req.user });
}