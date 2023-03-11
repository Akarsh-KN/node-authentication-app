//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require('mongoose-encryption');



const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

const urlMongodb = "mongodb+srv://" + process.env.DATABASE_USERNAME + ":" + process.env.DATABASE_PASSWORD + "@cluster0.rejngoy.mongodb.net/userDB?retryWrites=true&w=majority"

mongoose.connect(urlMongodb, 
    {useNewUrlParser: true}).then(() => {
        console.log("Connected to MongoDB");
    }).catch((err) => {
        console.log("Mongo DB connection failed");
    });

const userSchema = new mongoose.Schema ({
    email: String,
    password: String
});


const User = new mongoose.model("User", userSchema);


app.get("/home", function(req, res){
    res.render("home");
});





/////login section both get and poist

app.get("/login", function(req, res){
    res.render("login");
});

app.post("/login", async function(req,res){

    try{
        const foundUser = await User.find({"email": req.body.username}).exec();

        if (foundUser[0].email){
            if (foundUser[0].password == req.body.password){
                res.render("secrets");
            }
            else{
                console.log("the password entred is wrong");
                res.render("login")
            };
        }
        else{
            console.log("the user does not exist");
            res.render("login");
        }

    }
    catch (err){
        console.log(err);
    };

});



/// registering section 

app.get("/register", function(req, res){
    res.render("register");
});


app.post("/register", async function(req, res){
    try{
        const newUser = new User({
            email : req.body.username,
            password: req.body.password
        });

        const doc = await User.find({"email": req.body.username}).exec();

        if(doc[0].email) {
            console.log(doc);
            console.log("the user already exist");
            res.render("home");
        }
        else{
            newUser.save().then(() => {
                console.log("User created successfully")
                res.render("secrets");
            }).catch((err) => {
                console.log(err);
            });
        }
    }
    catch (err){
        console.log(err);
    }
});



app.listen(3000, function() {
    console.log("Server started on port 3000");
  });


