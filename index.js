const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config.json');
const session = require('express-session');
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

passport.use(
    new DiscordStrategy(
        {
            clientID: config.APP_ID,
            clientSecret: config.Client_Secret,
            callbackURL: config.Callback_Url,
            scope: ['identify', 'guilds'],
        },
        (accessToken, refreshToken, profile, done) => {
          process.nextTick(() => {
            return done(null, profile);
          });
        }
));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

app.get('/', async (req, res) => {
    res.render('landing');
});

app.get('/products', async (req, res) => {
    const products = await Product.find();
    res.render('products', { products });
});

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
            const license = await generateProductId(session_id);
            res.render('purchase_success', { session, licenseKey: license });
        } else {
            res.status(403).send('Payment was not successful');
        }
    } catch (error) {
        console.error('Error retrieving checkout session:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/purchase/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).send('Product not found.');
        }

        res.render('product_purchase', { product });
    } catch (error) {
        console.error('Failed to load product page:', error);
        res.status(500).send('Internal Server Error.');
    }
});

app.get('/dashboard', isAuthenticatedAndAdmin, async (req, res) => {
    const products = await Product.find();
    res.render('admin_dashboard', { products });
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

function isAuthenticatedAndAdmin(req, res, next) {
    if (req.isAuthenticated() && config.ADMINS.includes(req.user.id)) {
        return next();
    }
    res.redirect('/');
}

const apiRouter = require('./routes/api');
const licences = require('./Database/licences.js');
app.use('/api/v1', apiRouter);

app.listen(config.PORT, () => {
    logs.info(`Listening on port ${config.PORT}`)
})

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/api/v1/auth/discord');
}

function checkAdmin(req, res, next) {
    const admin = config.ADMINS.includes(req.user.id) ? true : false;
    if (admin == true) {
        return next()
    };
    res.redirect('/')
}

async function generateProductId(sessionID) {
         let isUnique = false;
         let productId = null;

         const data = await licenses.findOne({ SessionId: sessionID});

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
            SessionId: sessionID
         })
    
         return productId;
}