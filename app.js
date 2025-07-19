if (process.env.NODE_ENV  != "production"){
 require('dotenv').config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrap.js");
const Review = require("./models/review.js");
const Listing = require("./models/listing.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const multer  = require('multer');
const {storage} = require("./cloud.js");
const upload = multer({ storage });
const {listingSchema} = require("./schema.js");
const {isLoggedIn} = require("./middleware.js");
const {saveRedirectUrl, isOwner,validateListing,validateReview ,isReviewauthor} = require("./middleware.js");

// const listingController = require("./controller/List.js");



const dbUrl = process.env.ATLASDB_URL;

main().then(() =>{
    console.log("Connected to db");
}).catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(dbUrl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const Store = MongoStore.create({
    mongoUrl : dbUrl,
    crypto :{
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

Store.on("error",() => {
    console.log("Error in Mongo Session", err);
});

const sessionOption = {
    Store,
    secret:  process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    }, 
};

// app.get("/", (req , res ) =>{
//     res.send("Hi I am root");
// });



app.use(session(sessionOption));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//local-passport
app.use((req,res,next) => {
    res.locals.succes = req.flash("succes");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

//User SignUP
app.get("/signup", (req,res) => {
    res.render("user/signup.ejs");
});

//User Post req
app.post("/signup",wrapAsync( async(req,res) => {
    try{
        let{username, email, password} = req.body;
        const newUser = new User({email, username});
        const registerUser = await User.register(newUser, password);
        console.log(registerUser);
        req.login(registerUser, (err) => {
            if (err){
                return next(err);
            }
            req.flash("succes", "Welcome to Wanderlust");
            res.redirect("/listings");
        });
    } catch(e){
        req.flash("error", e.message);
        res.redirect("/signup");
    }
 
}));

//login Route
app.get("/login", (req,res) =>{
    res.render("user/login.ejs");
});

//Logout
app.get("/logout", (req,res, next) => {
    req.logOut((err) => {
        if(err){
           return next(err);
        }
        req.flash("succes", "you are loged out");
        res.redirect("/listings");
    });
});

app.post("/login",saveRedirectUrl, 
    passport.authenticate("local", { failureRedirect: "/login",failureFlash: true}), 
    async (req,res) =>{
    req.flash("succes","Welcome back to Wanderlust!");
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
});

//index route
app.get("/listings",async (req, res) => {
    const allListing = await Listing.find({});
    res.render("listings/index", { allListing });
});

//New ROute
app.get("/listings/new",isLoggedIn,(req , res) => {

    res.render("listings/new.ejs");
} );

//Show Route
app.get("/listings/:id", wrapAsync( async (req , res ) => {
    let {id} = req.params;
    const Listing = await listing.findById(id).populate({path:"reviews", populate:{path: "author",}}).populate("owner");
    if(!Listing) {
        req.flash("error", "Listing you requested does not exist");
        res.redirect("/listings");
    }
    res.render("listings/show.ejs", {Listing});
}));

//Create Route
app.post("/listings",isLoggedIn,upload.single('listing[image]'), validateListing, wrapAsync(async (req , res , next ) => {
        let url = req.file.path;
        let filename = req.file.filename;
        // let result = listingSchema.validate(req.body);
        // console.log(result);
        const newListing = new listing(req.body.listing);
        newListing.owner = req.user._id;
        newListing.image = {url, filename};
        await newListing.save();
        req.flash("succes", "New Listing Created!");
        res.redirect("/listings");
}));



//Edit Route
app.get("/listings/:id/edit",isLoggedIn,isOwner, wrapAsync(async (req ,res ) => {
    let {id} = req.params;
    const listings = await listing.findById(id);
    if(!listing) {
        req.flash("error", "Listing you requested does not exist");
        res.redirect("/listings");
    }
    res.render("listings/edit.ejs", {listings});
}));

//Update Route
app.put("/listings/:id",isLoggedIn,isOwner,upload.single('listing[image]'),wrapAsync( async (req , res ) => {
    let {id} = req.params;
    let listing = await Listing.findByIdAndUpdate(id, {...req.body.listing});
    if(typeof req.file !== "undefined"){
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = {url, filename};
    await listing.save()
    }
    res.redirect(`/listings/${id}`);
}));
//Delete Route
app.delete("/listings/:id",isLoggedIn,isOwner, wrapAsync(async(req ,res ) => {
     let {id} = req.params;
     let deleted = await Listing.findByIdAndDelete(id);
     console.log(deleted);
     req.flash("succes", "Listing Deleted!");
     res.redirect("/listings");
}));

//Reviews
//Post ROute
app.post("/listings/:id/reviews",isLoggedIn, validateReview, wrapAsync( async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();
    req.flash("succes", "New Review Added!");
    res.redirect(`/listings/${listing._id}`);
}));

//Delete Review Route
app.delete("/listings/:id/reviews/:reviewID", isLoggedIn,isReviewauthor,wrapAsync( async (req, res) =>{
    let { id , reviewID} = req.params;

    await Listing.findByIdAndUpdate(id, {$pull: {reviews: reviewID}} );
    await Review.findByIdAndDelete(reviewID);
    req.flash("succes", "Review Deleted!");
    res.redirect(`/listings/${id}`);
}));


app.all("", (req, res, next) => {
    next(new ExpressError("Page not Found!", 404));
});


app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong" } = err;
    res.status(statusCode).render("error.ejs", {message});
    // res.status(statusCode).send(message);
});


//port
app.listen(8080, () => {
    console.log("Server Is Working");
});