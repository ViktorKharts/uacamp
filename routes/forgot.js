var express     = require("express");
var router      = express.Router();
var User        = require("../models/user");
var async       = require("async");
var nodemailer  = require("nodemailer");
var crypto      = require("crypto");

////// FORGOT PASSWORD //////
router.get("/forgot", function(req, res) {
    res.render("forgot");
});

router.post("/forgot", function(req, res) {
    async.waterfall([
        function(done) {
            crypto.randomBytes(20, function(err, buf) {
                var token = buf.toString("hex");
                done(err, token);
            });
        },
        function(token, done) {
            User.findOne({ email: req.body.email }, function(err, user) {
                if (!user) {
                    console.log(err);
                    req.flash("error", "No account with that email address exists.");
                    return res.redirect("/forgot");
                }
                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                user.save(function(err) {
                    if(err) {
                        console.log(err);
                    };
                    done(err, token, user);
                });
            });
        },
        function(token, user, done) {
            var smtpTransport = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                    user: "vkwillbecoded@gmail.com",
                    pass: process.env.GMAILPW
                }
            });
            var mailOptions = {
                to: user.email,
                from: "vkwillbecoded@gmail.com",
                subject: "YelpCamp Password Reset",
                text: "You are receiving this email because you (or someone else) have requested the reset of the password." +
                    "Please click on the following link, or paste this into your browser to complete the resetting process. " +
                    "http://" + req.headers.host + "/reset/" + token + "\n\n" +
                    "If you did not request this, please ignore this email and your password will remain unchanged"
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                console.log("recover password instructions sent");
                req.flash("success", "An e-mail has been sent to " + user.email + " with further instructions.");
                done(err, "done");
            });
        }
    ], function(err) {
        if (err) {
            console.log(err);
            return next(err);
        };
        res.redirect("/forgot");
    });
});

router.get("/reset/:token", function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
            console.log(err);
            req.flash("error", "Password reset token is invalid or has expired.");
            return res.redirect("/forgot");
        }
        res.render("reset", {token: req.params.token});
    });
});

router.post("/reset/:token", function(req, res) {
    async.waterfall([
        function(done) {
            User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
                if (!user) {
                    console.log(err);
                    req.flash("error", "Password token is invalid or has expired.");
                    return res.redirect("back");
                }
                if(req.body.password === req.body.confirm) {
                    user.setPassword(req.body.password, function(err) {
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

                        user.save(function(err) {
                            req.login(user, function(err) {
                                done(err, user);
                            });
                        });
                    })
                } else {
                    console.log(err);
                    req.flash("error", "Passwords do not match.");
                    return res.redirect("back");
                }
            });
        },
        function(user, done) {
            var smtpTransport = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                    user: "vkwillbecoded@gmail.com",
                    pass: process.env.GMAILPW
                }
            });
            var mailOptions = {
                to: user.mail,
                from: "vkwillbecoded@gmail.com",
                subject: "YelpCamp password has been changed",
                text: "Hello, \n\n" + 
                    "This is a confirmation that the password for your account " + user.email + " has just been changed."
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                req.flash("success", "Success! Your password has been changed.");
                done(err);
            });
        }
    ], function(err) {
        console.log(err);
        res.redirect("/campgrounds");
    });
});

module.exports = router;
