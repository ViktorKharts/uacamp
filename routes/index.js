var express     = require("express");
var router      = express.Router();
var passport    = require("passport");
var User        = require("../models/user");
var Campground  = require("../models/campground");

// root route
router.get("/", function(req, res) {
    res.render("landing");
});

// show the register form
router.get("/register", function(req, res) {
    res.render("register", {page: "register"});
});

// handle sign up logic
router.post("/register", function(req, res) {
    var newUser = new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        avatar: req.body.avatar,
        email: req.body.email
    });

    if(req.body.adminPassword === "123#secretcode#123") {
        newUser.isAdmin = true;
    }

    User.register(newUser, req.body.password, function(err, user) {
        if(err){
            console.log(err);
            return res.render("register", {error: err.message});
        }
        passport.authenticate("local")(req, res, function() {
            req.flash("success", "Welcome to the YelpCamp, " + user.username);
            res.redirect("/campgrounds");
        });
    });
});

////// LOGIN //////
// show login form
router.get("/login", function(req, res) {
    res.render("login", {page: "login"});
});

// handling login logic
router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/campgrounds",
        failureRedirect: "/login"
    }), function(req, res) {
});

// handling forgot logic
// router.get("/forgot", function(req, res) {
//     res.render("forgot");
// });

////// LOGOUT //////
// logout logic
router.get("/logout", function(req, res) {
    req.logout();
    req.flash("success", "Logged You Out");
    res.redirect("/campgrounds");
});

////// USER PROFILE //////
router.get("/users/:id", function(req, res) {
    User.findById(req.params.id, function(err, foundUser) {
        if(err) {
            console.log(err);
            req.flash(error, "Something went wrong.");
            res.redirect("/");
        }
        Campground.find().where("author.id").equals(foundUser._id).exec(function(err, campgrounds) {
            if(err) {
                console.log(err);
                req.flash(error, "Something went wrong.");
                res.redirect("/");
            }
            res.render("users/show", {user:foundUser, campgrounds: campgrounds});
        });
    });
});

module.exports = router;
