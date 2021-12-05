const express = require("express");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const ejs = require("ejs");
const mongoose=require("mongoose");
const auth = require('passport-local-authenticate');
const _ = require('lodash');

const app = express();

app.set('view engine', 'ejs');
app.use(session({
  secret: "Our little secret.",
  resave: true,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next){
  res.locals.currentUser = req.user;
  
  next();
});
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));


mongoose.connect("mongodb://localhost:27017/airlineDB",{useNewUrlParser: true})


const bookingSchema= new mongoose.Schema({
    email:String,
    namee:String,
    source: String,
    destination: String,
    noofseats: Number,
    remainingSeats:Number,
    date:String,
    price:String,
    flightID:Number,
    time: String,
})

const userSchema=new mongoose.Schema({
  namee:String,
  username:String,
  password: String,
  booked: Boolean,
  // bookings:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking'}]
  bookings:Array
})

const flightSchema= new mongoose.Schema({
    flightID: String,
    source: String,
    destination: String,
    seats: Number,
    price: Number,
    time: String,
    duration: String,
    date:String,
    travel:String,
    remainingSeats:Number
})
userSchema.plugin(passportLocalMongoose);

const User=mongoose.model("User",userSchema);
const Booking=mongoose.model("Booking",bookingSchema);
const Flight=mongoose.model("Flight",flightSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

const add= 1;
app.get("/",function(req,res){
  res.render("login", {message:"",
  email:"",
  password:""
});
})
// app.get("/",function(req,res){
//   res.render("book")
// })

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

app.get("/home",function(req,res){

if(req.isAuthenticated()){

  console.log(req.user);
  
  var noMatches=null;
  if(req.query.search1&&req.query.search2){
      
    // $or:[{"travel": regex}]
    var regex = new RegExp(escapeRegex(req.query.search1,req.query.search2), 'gi');
    console.log(req.body.search1)
    console.log(req.body.search2)
    Flight.find({travel:req.query.search1+req.query.search2},function(err,flight){
      
     
        if(err)
        console.log(err);
        else{
          
          
          if(flight.length < 1 )
          {
            noMatches="NO MATCH FOUND😢";
          }
          
          res.render("home",{
           
            
            flight:flight,
            noMatches:noMatches,
            add:add
          })
        }
        
      
    })
    
  }
  else{

    Flight.find({},function(err,flight){
      res.render("home",{add: add, flight: flight,noMatches:noMatches})
    })
  }
}
else{
  res.redirect("/")
}
})
// $or:[{"travel": regex}]

app.get('/search', (req, res) => {
  try {
      Flight.find({ travel:req.query.search1+req.query.search2 }, (err, psts) => {
          if (err) {
              console.log(err);
          } else {
            res.render("search",{
              
              flight:psts
            })
          }
      })
  } catch (error) {
      console.log(error);
  }
})

app.get("/showbooking/:flightID",function(req,res){
  const flightt=req.params.flightID
  Booking.find({flightID:flightt},function(err,flight){
    console.log(flight)
    res.render("bookedFlight",{Flight:flight})
  })
  
})

app.get("/admin",function(req,res){
    Flight.find({},function(err,result){
      // console.log("hi"+result)
      res.render("admin",{flights:result})
    })
    
  })
  app.get("/register", function(req, res){
    res.render("register", {
      message:"",
      name:"",
      email:"",
      password:""
    });
  });
  app.post("/register", function(req, res){
    User.register({namee:req.body.regname,username: req.body.username,booked:false}, req.body.password, function(err, user){
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function(){
          res.redirect("/");
        });
      }
    });
    
  
 });
  app.post("/admin",function(req,res){
    
    const flight=new Flight({
        flightID:req.body.flightID,
        source:req.body.source,
        destination: req.body.destination,
        date:req.body.date,
        time: req.body.time,
        duration: req.body.duration,
        price: req.body.price,
        seats: req.body.seats,
        remainingSeats:req.body.seats,
        travel:req.body.source+req.body.destination
      })
      flight.save(function(err){
        if(!err){
          res.redirect("/home")
        }
      });
  
})

app.get("/booking/:flightID",function(req,res){
  const flightt=req.params.flightID
  Flight.findOne({_id:flightt},function(err,flight){
    // console.log(flight)
    res.render("book",{Flight:flight})
  })
  // res.render("afterbook",{flight: flightID})
  
  })

  app.get("/cancel/:flightID",function(req,res){
    const flightt=req.params.flightID
    Booking.findOne({_id:flightt},function(err,fli){

      
      Flight.findOneAndUpdate({flightID:fli.flightID},{$inc:{'remainingSeats': fli.noofseats}},function(err){
      if(err){
        console.log(err)
      }
    })
  })

    Booking.deleteOne({_id:flightt},function(err,flight){
      
      res.redirect("/userFlight")
    })

    
    })

  app.post("/booking/:flightID",function(req,res){
    if(req.isAuthenticated())
    {
      const flightt=req.params.flightID
      Flight.findOne({_id:flightt},function(err,flight){
        if(err){
          console.log(err)
        }
        console.log(req.user)
        const bookedFlight = new Booking({
          namee:req.user.namee,
          email:req.user.username,
          source: flight.source,
          destination: flight.destination,
          date:flight.date,
          price:flight.price,
          noofseats:req.body.seats,
          time: flight.time,
          // remainingSeats:noofseats-req.body.seats,
          flightID:flight.flightID,
        });

        bookedFlight.save();
        Flight.findByIdAndUpdate(flightt,{$inc:{'remainingSeats': -req.body.seats}},function(err){
          if(err){
            console.log(err)
          }
        })
        // Flight.find({_id:flightt},function(err,fli){
        //   fli.remainingSeats=fli.remainingSeats-req.body.seats
        //   fli.save()
        // })
        res.redirect("/userFlight")
        
      })
      
    }
    else 
    {
      res.redirect("/");
    }
    
})
app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});
app.get("/userFlight", function(req,res){
  if(req.isAuthenticated()){
  Booking.find({email:req.user.username},function(err,booked){
    console.log(booked)
    res.render('userFlight',{flights : booked})
  })
  
    
}
  else{
    res.redirect('/');
  }
})

app.post("/", function(req, res){
   
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
   

  
        passport.authenticate('local', function (err, user, info) { 
       if(err){
         res.json({success: false, message: err})
       } else{
        if (! user) {
          console.log("User not matched")
          console.log(req.body.username)
          console.log(user.password)

          res.render('login' ,{
              message: 'username or password incorrect',
              email: req.body.username,
              password:req.body.password
          })
        } else{
          req.login(user, function(err){
            if(err){
             
            }else{
              if(req.user.username=="admin@gmail.com"){
                res.redirect("/admin")
              }
               res.redirect("/home")
            }
          })
        }
       }
    })(req, res);
  })
  app.listen(3000,function(){
    console.log("server runnning on port 3000");

})