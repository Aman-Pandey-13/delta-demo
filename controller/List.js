// const  Listing  = require("../models/listing.js");
// const listingSchema = require("../schema.js"); // adjust path as needed
// const {saveRedirectUrl, isOwner,validateListing,validateReview ,isReviewauthor} = require("../middleware.js");


// module.exports.index = ;


// module.exports.newRoute = ;

// module.exports.show =;

// module.exports.create =  async (req , res , next ) => {
//         let result = listingSchema.validate(req.body);
//         console.log(result);
//         const newListing = new listing(req.body.listing);
//         newListing.owner = req.user._id;
//         await newListing.save();
//         req.flash("succes", "New Listing Created!");
//         res.redirect("/listings");
// };

// module.exports.edit = async (req ,res ) => {
//     let {id} = req.params;
//     const listings = await listing.findById(id);
//     if(!listing) {
//         req.flash("error", "Listing you requested does not exist");
//         res.redirect("/listings");
//     }
//     res.render("listings/edit.ejs", {listings});
// };

// module.exports.update = async (req , res ) => {
//     await listing.findByIdAndUpdate(id, {...req.body.listing});
//     res.redirect(`/listings/${id}`);
// };

// module.exports.destroy = async(req ,res ) => {
//      let {id } = req.params;
//      let deleted = await Listing.findByIdAndDelete(id);
//      console.log(deleted);
//      req.flash("succes", "Listing Deleted!");
//      res.redirect("/listings");
// };