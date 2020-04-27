require("dotenv").config();

var express        = require("express"),
    app            = express(),
    bodyParser     = require("body-parser"),
    mongoose       = require("mongoose"),
    passport       = require("passport"),
    localStrategy  = require("passport-local"),
    flash          = require("connect-flash"),
    methodOverride = require("method-override"),
    Campground     = require("./models/campground"),
    Comment        = require("./models/comment"),
    User           = require("./models/user"),
    seedDB         = require("./seeds");

// REQUIRING ROUTES //
var commentRoutes    = require("./routes/comments"),
    campgroundRoutes = require("./routes/campgrounds"),
    forgotRoutes     = require("./routes/forgot"),
    indexRoutes      = require("./routes/index");

mongoose.connect(process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/yelp_camp",
{
    useNewUrlParser: true, 
    useUnifiedTopology: true, 
    useFindAndModify: false 
});
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());

app.locals.moment = require('moment');

// ========================
//  PASSPORT CONFIGURATION
// ========================

app.use(require("express-session")({
    secret: "Rusty is colt's dog",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Middleware which is passed through all the routes
// and makes the application to understand whether
// the user is logged in or not.
app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

app.use(indexRoutes);
app.use("/campgrounds/:slug/comments", commentRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use(forgotRoutes);

app.listen(3000, function(req, res) {
    console.log("Yelp Camp Server has started!");
});