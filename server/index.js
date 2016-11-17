import 'babel-polyfill';
import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import config from './config';
import User from '../models/User';

import passport from 'passport';
import bcrypt from 'bcryptjs';
import { Strategy } from 'passport-local';
import expressSession from 'express-session';

const app = express();
const jsonParser = bodyParser.json();

app.use(express.static(process.env.CLIENT_PATH));
app.use(expressSession({secret: 'mySecretKey'})); //TODO: Generate from /dev/urandom
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user._id);
});
 
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new Strategy({ session: true },
  function (username, password, callback) {
    User.findOne({
        username: username
        }).select('username password').exec((err, user) => {
            if (err) {
                return callback(err);
            }

            if (!user) {
                return callback(null, false, {
                    message: 'Incorrect Username'
                });
                
            }

            user.validatePassword(password, (err, isValid) => {
                if (err) {
                    return callback(err);
                }

                if (!isValid) {
                    return callback(null, false, {
                        message: 'Incorrect Password'
                    });
                }

                return callback(null, user);
            });
        }); 
}));


// our model for storing timer

// optional account creation
app.post('/api/login', jsonParser, passport.authenticate('local', { session: true }), (req, res) => {

    res.status(200).json({user: req.user});
});

app.post('/api/user', jsonParser, (req, res) => {
    console.log(req.body);
    User.findOne({ username: req.body.username }).select('username').exec((err, user) => {
        if (user) {
            return res.status(400).json({message: 'User does exist'});
        } 

        user = new User({username: req.body.username});

        user.hashPassword(req.body.password, (err, hashPassword) => {
            if (err) {
                return res.status(500).json({
                    message: 'Internal Server Error'
                });
            }

            user.password = hashPassword;

            user.save((err) => {
                if (err) {
                    return res.status(500).json({
                        message: 'Internal Server Error'
                    });
                }

                return res.status(201).json({user})

            });
        });
    });

});


function runServer (callback) {
    console.log("BEGIN")
    mongoose.connect(config.DATABASE_URL, (err) => {
        if (err && callback) {
            return callback(err);
        }

        

        app.listen(config.PORT, process.env.IP, () => {
            console.log(`Listening on localhost: ${config.PORT}`);
            if (callback) {
                callback();
            }
        });

    });
}

if (require.main === module) {
    runServer((err) => {
        if (err) {
            console.error(err);
            res.status(500).json({message: 'Internal Service Error'});
        }
    });
}















