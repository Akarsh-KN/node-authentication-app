//jshint esversion:6

require("dotenv").config();
const express=require("express")
const app=express()
const ejs=require("ejs")
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require('mongoose-encryption');
const bcrypt=require("bcrypt")
const session=require("express-session")
const passport=require("passport")
const saltRounds = 10;
const LocalStrategy=require("passport-local").Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
app.use(express.urlencoded({extended:false}))  //Not using bodyParser, using Express in-built body parser instead
app.set("view engine","ejs")
app.use(express.static("public"))


app.use(session({
    secret:"Justarandomstring.",
    resave:false,
    saveUninitialized:false
}))

app.use(passport.initialize());
app.use(passport.session());

const urlMongodb = "mongodb+srv://" + process.env.DATABASE_USERNAME + ":" + process.env.DATABASE_PASSWORD + "@cluster0.rejngoy.mongodb.net/usersDB2?retryWrites=true&w=majority"

mongoose.connect(urlMongodb, 
        {useNewUrlParser: true}).then(() => {
            console.log("Connected to MongoDB");
        }).catch((err) => {
            console.log("Mongo DB connection failed");
        });

const userSchema= new mongoose.Schema({
    username : String,
    password : String,
    googleId: String,
    secret: String
});


userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema)




// Creating Local Strategy. passport-local-mongoose 3 lines of code for Strategy, 
// Serialiazation, Deserialization not working due to recent changes in Mongoose 7

passport.use(new LocalStrategy((username,password,done)=>{  //done is a callback function
    try{
        User.findOne({username:username}).then(user=>{
            if (!user){
                return done(null,false, {message:"Incorrect Username"})
            }
 //using bcrypt to encrypt passoword in register post route and compare function in login post round. 
 //login post route will check here during authentication so need to use compare here  
            bcrypt.compare(password,user.password,function(err,result){ 
                if (err){
                    return done(err)
                }

                if (result) {
                    return done(null,user)
                }
                else {
                    return done (null,false, {message:"Incorrect Password"})
                }
            })

        })
    }
    catch (err){
            return done(err)
    }

}))

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  async function(accessToken, refreshToken, profile, cb) {
    try {console.log(profile);
    const foundUser = await User.findOne({ googleId: profile.id });
    if(!foundUser){

        const newUser = new User({
            googleId: profile.id
        })
        user = await newUser.save();
    }
    return cb(null, foundUser);
    }catch(err){
        return cb(err)
    }
}
));






// serialize user
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
// deserialize user  
passport.deserializeUser(function(id, done) {
    console.log("Deserializing User")
    try {
        User.findById(id).then(user=>{
            done(null,user);
        })
    }
    catch (err){
        done(err);
    }
  });






app.get("/auth/google",
    passport.authenticate('google', { scope: ['profile'] }));


app.get('/auth/google/secrets', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
    });

//get routes
app.get("/",function(req,res){
    res.render("home")
})


app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login")
    };
});


app.post("/submit", async function(req, res){
    const submittedSecret = req.body.secret;

    await User.findById(req.user.id).then((user)=>{
        user.secret = submittedSecret;
        user.save().then(()=>{
            res.redirect("/secrets");
        }).catch((err)=> {
            console.log(err);
        })
    })
})

app.get("/login",function(req,res){
    res.render("login")
})

app.get("/register",function(req,res){
    res.render("register")
})

app.get("/secrets",async function(req, res){

    if (req.isAuthenticated()){
        await User.find({secret: {$ne: null}}).then((users)=>{
            if(users){
                res.render("secrets", {userWithSecrets: users});
            };
        }).catch((err)=> {
            console.log(err);
        });
    }
    else {
        res.redirect("/login")
    }
})

app.get("/logout",function(req,res){
    req.logout(function(err){
        if(err){
            console.log(err)
        }
        res.redirect("/");
    });
    
})

//post routes
app.post("/register",function(req,res){
    bcrypt.hash(req.body.password,10,function(err,hash){  //10 is SaltRounds
        if (err){
            console.log(err)
        }
        const user= new User ({
            username:req.body.username,
            password:hash
        })
        user.save()

        passport.authenticate('local')(req,res,()=>{res.redirect("/secrets")}) 
    })
})   
    


app.post('/login', passport.authenticate('local', { successRedirect:"/secrets", failureRedirect: '/login' }));

//listen
app.listen(3000, ()=> {
    console.log("Server Running on Port 3000")
})