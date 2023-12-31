const { User, Product, Category, Order } = require('../models');
const { signToken, AuthenticationError } = require('../utils/auth');
require('dotenv').config()

const stripe = require('stripe')(process.env.SECRETKEY);

const resolvers = {
    Query: {
        categories: async () => {
            return await Category.find();
        },
        products: async (parent, { category, name }) => {
            const params = {};

            if (category) {
                params.category = category;
            }

            if (name) {
                params.name = {
                    $regex: name
                };
            }
            // console.log(await Product.find(params).populate('category'))
            return await Product.find(params).populate('category');
        },
        product: async (parent, { _id }) => {
            return await Product.findById(_id).populate('category');
        },
        user: async (parent, args, context) => {
            if (context.user) {
                const user = await User.findById(context.user._id).populate({
                    path: 'orders.products',
                    populate: 'category'
                });

                user.orders.sort((a, b) => b.purchaseDate - a.purchaseDate);

                return user;
            }

            throw AuthenticationError;
        },
        order: async (parent, { _id }, context) => {
            if (context.user) {
                const user = await User.findById(context.user._id).populate({
                    path: 'orders.products',
                    populate: 'category'
                });

                return user.orders.id(_id);
            }

            throw AuthenticationError;
        },
        checkout: async (parent, args, context) => {
            console.log('Checkout Resolver - Starting checkout process');

            const url = new URL(context.headers.referer).origin;
            await Order.create({ products: args.products.map(({ _id }) => _id) });
            // eslint-disable-next-line camelcase
            const line_items = [];

            // eslint-disable-next-line no-restricted-syntax
            for (const product of args.products) {
                line_items.push({
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: product.name,
                            description: product.description,
                            images: [`${url}/images/${product.image}`]
                        },
                        unit_amount: product.price * 100,
                    },
                    quantity: product.purchaseQuantity,
                });
            }

            console.log('Checkout Resolver - Line items:', line_items);

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items,
                mode: 'payment',
                success_url: `${url}/form?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${url}/`,
            });

            console.log('Checkout Resolver - Checkout session created:', session);

            return { session: session.id };
        },
    },
    Mutation: {
        addUser: async (parent, args) => {
            const user = await User.create(args);
            const token = signToken(user);

            return { token, user };
        },
        addOrder: async (parent, { products }, context) => {

            console.log('Add Order Mutation - Adding order to user');

            if (context.user) {
                const order = new Order({ products });

                await User.findByIdAndUpdate(context.user._id, { $push: { orders: order } });

            console.log('Add Order Mutation - Order added to user:', order);

                return order;
            }

            throw AuthenticationError;
        },
        updateUser: async (parent, args, context) => {
            if (context.user) {
                return await User.findByIdAndUpdate(context.user._id, args, { new: true });
            }

            throw AuthenticationError;
        },
        updateProduct: async (parent, { _id, quantity }) => {
            console.log('Update Product Mutation - Updating product quantity');


            const decrement = Math.abs(quantity) * -1;

            return await Product.findByIdAndUpdate(_id, { $inc: { quantity: decrement } }, { new: true });

            console.log('Update Product Mutation - Product updated:', updatedProduct);

        },
        login: async (parent, { email, password }) => {
            const user = await User.findOne({ email });

            if (!user) {
                throw AuthenticationError;
            }

            const correctPw = await user.isCorrectPassword(password);

            if (!correctPw) {
                throw AuthenticationError;
            }

            const token = signToken(user);

            return { token, user };
        }
    }
};

module.exports = resolvers;