var Campground = require("../models/campground");
var Comment = require("../models/comment");

var middlewareObj = {};

// MIDDLEWARE THAT CHECKs THE CAMPGROUNDs OWNERSHIP
middlewareObj.checkCampgroundOwnership = function(req, res, next) {
    // check if the user is logged in at all
    if(req.isAuthenticated()) {
        Campground.findOne({slug: req.params.slug}, function(err, foundCampground) {
            if(err) {
                req.flash("error", "Campground not found");
                res.redirect("back");
            } else {
                if(!foundCampground) {
                    req.flash("error", "Item not found");
                    return res.redirect("back");
                }
                // does user own the campground?
                if(foundCampground.author.id.equals(req.user._id) || req.user.isAdmin) {
                    next();
                } else {
                    req.flash("error", "You do not have permission to do that");
                    res.redirect("back"); 
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
};

// MIDDLEWARE THAT CHECKs THE COMMENTs OWNERSHIP //
middlewareObj.checkCommentOwnership = function(req, res, next) {
    // check if the user is logged in at all
    if(req.isAuthenticated()) {
        Comment.findById(req.params.comment_id, function(err, foundComment) {
            if(err) {
                res.redirect("back");
            } else {
                if(!foundComment) {
                    req.flash("error", "Item not found");
                    return res.redirect("back");
                }
                // does user own the comment?
                if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
                    next();
                } else {
                    req.flash("error", "You do not have permission to do that");
                    res.redirect("back"); 
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
};

// MIDDLEWARE THAT CHECKs IF THE USER IS LOGGED IN //
middlewareObj.isLoggedIn = function(req, res, next) {
    if(req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "You need to be logged in to do that");
    res.redirect("/login");
};

module.exports = middlewareObj;