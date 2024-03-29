const express = require('express');
const passport = require('passport');
const router = express.Router();
const bodyParser = require('body-parser');
const Product = require('../Database/Product');
const Cart = require('../Database/Cart');
const generate = require('../generate-id');
const multer = require('multer');
const path = require('path');
router.use(bodyParser.json());

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

router.post('/add-cart', async (req, res) => {
    const productId = req.body.productId;
    const currentUserId = req.user.id;

    if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
    }

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let cart = await Cart.findOne({ UserId: currentUserId });
        if (!cart) {
            cart = new Cart({ UserId: currentUserId });
        } else {
            const productExists = cart.Cart.some(item => item.productId.toString() === productId);
            if (productExists) {
                return res.status(400).json({ error: 'Product already in cart' });
            }
        }

        cart.Cart.push({
            productId: product._id,
            name: product.Name,
            price: product.Price,
            mainImage: product.MainImage,
            quantity: 1
        });

        await cart.save();
        res.json({ message: 'Product added to cart' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

module.exports = router