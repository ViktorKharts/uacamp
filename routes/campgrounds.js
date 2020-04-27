var express         = require("express");
var router          = express.Router();
var Campground      = require("../models/campground");
var middleware      = require("../middleware");
var NodeGeocoder    = require("node-geocoder");
var multer          = require("multer");

// MULTER CONFIG //
var storage = multer.diskStorage({
    filename: function(req, file, callback) {
      callback(null, Date.now() + file.originalname);
    }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})
  
// CLOUDINARY CONFIG //
var cloudinary = require("cloudinary");
cloudinary.config({
    cloud_name: "yelpcampvkwillbe",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// GEOCODER CONFIG //
var options = {
    provider: "google",
    httpAdapter: "https",
    apiKey: process.env.GEOCODER_API_KEY,
    formatter: null
};

var geocoder = NodeGeocoder(options);

// INDEX ROUTE - show all campgrounds
router.get("/", function(req, res) {
    var noMatch = null;
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), "gi");
        // GET ALL CAMPGROUNDS FROM THE DB
        Campground.find({name: regex}, function(err, allCampgrounds){
            if(err) {
                console.log(err);
            } else {
                if(allCampgrounds.length < 1) {
                    noMatch = "No campgrounds match that query, please try again."
                }
                res.render("campgrounds/index", {campground: allCampgrounds, noMatch: noMatch, page: "campgorunds"});
            }
        }); 
    } else {
        // GET ALL CAMPGROUNDS FROM THE DB
        Campground.find({}, function(err, allCampgrounds){
            if(err) {
                console.log(err);
            } else {
                res.render("campgrounds/index", {campground: allCampgrounds, noMatch: noMatch, page: "campgorunds"});
            }
        });
    }
});

// CREATE ROUTE - add new campground to db
router.post("/", middleware.isLoggedIn, upload.single("image"), function(req, res) {
    cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
		if(err) {
            console.log(err);
			req.flash("error", err.message);
            return res.redirect("back");
		}
        // add cloudinary url for the image to the campground object under image property
        req.body.image = result.secure_url;
        // add image's public_id to campground object
        req.body.imageId = result.public_id;
        // add author to campground
        req.body.author = {
            id: req.user._id,
            username: req.user.username
        }
        geocoder.geocode(req.body.location, function(err, data) {
            if (err || !data.length) {
                console.log(err);
                req.flash("error", "Invalid Address");
                return res.redirect("back");
            }
            // get campground from the form and add to the campgrounds object
            var name = req.body.name;
            var price = req.body.price;
            var image = req.body.image;
            var imageId = req.body.imageId;
            var description = req.body.description;
            var author = {
                id: req.user._id,
                username: req.user.username
            };
            var lat = data[0].latitude;
            var lng = data[0].longitude;
            var location = data[0].formattedAddress;
            var newCampground = {
                name: name,
                image: image,
                imageId: imageId,
                price: price,
                description: description,
                author: author,
                location: location,
                lat: lat,
                lng: lng
            };
            // create a new campground and save to db
            Campground.create(newCampground, function(err, newlyCreated) {
                if(err) {
                    console.log(err);
                    req.flash("error", err.message);
                    return res.redirect("back");
                } else {
                    // redirect to the campgrounds page
                    req.flash("success", "You have added a new campground!")
                    console.log(newlyCreated);
                    res.redirect("/campgrounds/" + newlyCreated.slug);
                }
            });
        });
    });
});

// NEW ROUTE - show form to create a new campground
router.get("/new", middleware.isLoggedIn, function(req, res) {
    res.render("campgrounds/new");
});

// SHOW ROUTE - show more information on a cmapground
router.get("/:slug", function(req, res) {
    // find the campground with provided id
    Campground.findOne({slug: req.params.slug}).populate("comments").exec(function(err, foundCampground){
        if(err) {
            console.log(err);
        } else {
            console.log(foundCampground);
            // render show template with that campground
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});

// EDIT CAMPGROUND ROUTE //
router.get("/:slug/edit", middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findOne({slug: req.params.slug}, function(err, foundCampground) {
        res.render("campgrounds/edit", {campground: foundCampground});
    });
});

// DESTROY CAMPGROUND ROUTE //
router.delete("/:slug", middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findOneAndRemove({slug: req.params.slug}, async function(err, campground) {
        if(err) {
            req.flash("error", err.message);
            return res.redirect("/campgrounds"); 
        }
        try {
            await cloudinary.v2.uploader.destroy(campground.imageId);
            campground.remove();
            req.flash("success", "Campground has been removed.");
            res.redirect("/campgrounds");
        } catch (err) {
            if(err) {
                req.flash("error", err.message);
                return res.redirect("/campgrounds"); 
            }
        }
    });
});

// UPDATE CAMPGROUND ROUTE //
router.put("/:slug", middleware.checkCampgroundOwnership, upload.single("image"), function(req, res) {
    geocoder.geocode(req.body.location, function(err, data) {
        if (err || !data.length) {
            console.log(err);
            req.flash("error", "Invalid Address");
            return res.redirect("back");
        }
        req.body.campground.lat = data[0].latitude;
        req.body.campground.lng = data[0].longitude;
        req.body.campground.location = data[0].formattedAddress;
        // find and update the correct campground
        Campground.findOne({slug: req.params.slug}, req.body.campground, async function(err, updatedCampground) {
            if(err) {
                req.flash("error", err.message);
                res.redirect("/campgrounds");
            // redirect to the updated page
            } else {
                if (req.file) {
                    try {
                        await cloudinary.v2.uploader.destroy(Campground.imageId);
                        var result = await cloudinary.v2.uploader.upload(req.file.path);
                        updatedCampground.imageId = result.public_id;
                        updatedCampground.image = result.secure_url;    
                    } catch (err) {
                        req.flash("error", err.message);
                        return res.redirect("/campgrounds");
                    }
                }
                updatedCampground.name = req.body.campground.name;
                updatedCampground.price = req.body.campground.price;
                updatedCampground.description = req.body.campground.description;
                updatedCampground.save (function (err) {
                    if(err) {
                        console.log(err);
                        res.redirect("/campgrounds");
                    } else {
                        req.flash("success", "Successfully Updated!")
                        res.redirect("/campgrounds/" + updatedCampground.slug);
                    }
                });
            }
        });
    });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

//////// MIDDLEWARE //////
module.exports = router;
