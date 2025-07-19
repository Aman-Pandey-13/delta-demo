const mongoose = require("mongoose");
// const { schema } = require("./listing");
// const { string, date } = require("joi");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    comment : String,
    rating:{
        type : Number,
        min : 1,
        max : 5
    },
    craetedAt: {
        type : Date,
        default : Date.now(),
    },
    author:{
        type: Schema.Types.ObjectId,
        ref: "User",
    },
});

module.exports = mongoose.model("Review", reviewSchema)