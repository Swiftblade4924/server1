// Assuming you have the `db` object available from your previous code
const express = require('express');
const app = express();
const connectToMongoDB = require('../src/db');
const port =5000;
const cors = require('cors');
const bcrypt = require('bcryptjs');
const saltRounds=2;
const jwt = require('jsonwebtoken');
const corsOptions = {
  origin: 'http://localhost:3000', 
  credentials: true, 
};
const ObjectId = require('mongodb').ObjectId;


app.use(cors(corsOptions));

app.use(express.json());
app.post('/loginvendor', async (req, res) => {
  try {
    const { client, db } = await connectToMongoDB();
    const { name, password } = req.body;

    const collection = db.collection('vendor');

    // Search for the user based on name
    const user = await collection.findOne({ name });

    if (user) {
      console.log("name matched");
      // Compare the entered password with the stored hash
      bcrypt.compare(password, user.password, (err, result) => {
        if (err) {
          console.error('Error comparing passwords:', err);
          res.status(500).json({ success: false, message: 'Server error' });
          return;
        }

        if (result) {
          console.log("password matched");
          // Credentials match, generate a JWT
          const payload = { userId: user._id, username: user.name }; // Customize the payload
          const secretKey = 'your-secret-key'; // Replace with your secret key
          const token = jwt.sign(payload, secretKey);

          // Set JWT as an HttpOnly cookie
          const expirationDate = new Date(Date.now() + 3600000); // One hour from now

          res.cookie('jwt', token, {
            httpOnly: true,
            expires: expirationDate,
          });

          // Return a success response
          res.json({ success: true });
        } else {
          // Invalid credentials, return an error response
          res.json({ success: false, message: 'Invalid username or password' });
        }
      });
    } else {
      // User not found, return an error response
      res.json({ success: false, message: 'User not found' });
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

//for customer

app.post('/logincustomer', async (req, res) => {
  try {
    const { client, db } = await connectToMongoDB();
    const { name, password } = req.body;

    const collection = db.collection('customer');

    // Search for the user based on name
    const user = await collection.findOne({ name });

    if (user) {
      console.log("name matched");
      // Compare the entered password with the stored hash
      bcrypt.compare(password, user.password, (err, result) => {
        if (err) {
          console.error('Error comparing passwords:', err);
          res.status(500).json({ success: false, message: 'Server error' });
          return;
        }

        if (result) {
          console.log("password matched");
          
          console.log("jwt name ",user._id,user.name);
          const payload = { userId: user._id, username: user.name }; 
          const secretKey1 = 'your-secret-key'; 
          const token = jwt.sign(payload, secretKey1);

          
          const expirationDate = new Date(Date.now() + 3600000); 

          res.cookie('jwt', token, {
            httpOnly: true,
            expires: expirationDate,
          });

          
          res.json({ success: true });
        } else {
          
          console.log('error');
          res.json({ success: false, message: 'Invalid username or password' });
        }
      });
    } else {
      
      res.json({ success: false, message: 'User not found' });
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

//signup function
app.post('/signup', async (req, res) => {
  const { email, name, password, userType,company } = req.body;

  try {
    console.log("inserting user");
    const {client,db}=await connectToMongoDB();
    const collection = userType === 'customer' ? 'customer' : 'vendor';
    const existingUser = await db.collection(collection).findOne({ email });

    if (existingUser) {
      console.log("user already exists");
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    // Hash the password with a salt round value of 2
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user information into the appropriate collection
    if(userType == "customer"){
    await db.collection(collection).insertOne({
      email,
      name,
      password: hashedPassword, // Store the hashed password
    });
  }else if(userType =="vendor"){
    await db.collection(collection).insertOne({
      email,
      name,
      password: hashedPassword,
      company,
    });
  }

    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.log("error inseritng the user to the db");
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to register user' });
  }
});
app.post('/getrestaurants', async (req, res) => {
  try {
    const { client, db } = await connectToMongoDB();

    const vendorsCollection = db.collection('vendor');
    //projection: { company: 1, _id: 0
    const restaurantsCursor = await vendorsCollection.find();
    
    const restaurants = ((await restaurantsCursor.toArray()).map(vendor=>vendor.company));
    //const restaurants = await vendorsCollection.distinct('company');
    console.log("restaurants fetched");
    console.log(restaurants);
    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  } 


});
app.get('/getcRecords', async (req, res) => {
  try {
    const { client, db } = await connectToMongoDB();
    const reservationsCollection = db.collection('reservation');

    const jwtCookie = req.headers.cookie.split('; ').find(cookie => cookie.startsWith('jwt='));

    const jwtToken = jwtCookie.split('=')[1]; // Extract JWT token value
    const secretKey = 'your-secret-key'; // Replace with your secret key

    // Verify and decode the JWT token to get the user ID
    const decodedToken = jwt.verify(jwtToken, secretKey);
    const userId = decodedToken.userId;
    console.log("userid", userId);

    // Fetch reservations with matching userId
    const matchingReservations = await reservationsCollection.find({ userId: userId }).toArray();
    console.log("mfetched reservations :", matchingReservations);
    res.status(200).json(matchingReservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});
app.get('/getvRecords', async (req, res) => {
  console.log("getting vendor records ");
  try {
    const { client, db } = await connectToMongoDB();
    const reservationsCollection = db.collection('reservation');
    const vendorsCollection = db.collection('vendor');

    const jwtCookie = req.headers.cookie.split('; ').find(cookie => cookie.startsWith('jwt='));
    const jwtToken = jwtCookie.split('=')[1]; // Extract JWT token value
    const secretKey = 'your-secret-key'; // Replace with your secret key

    // Verify and decode the JWT token to get the user ID
    const decodedToken = jwt.verify(jwtToken, secretKey);
    const userId = decodedToken.userId;
    console.log("userid",userId);
    console.log(typeof userId);

    // Fetch the user's company attribute from the vendors collection
    const vendor = await vendorsCollection.findOne({ _id: new ObjectId(userId) });
    if (!vendor) {
      console.log("vendor not found");
      return res.status(404).json({ error: 'Vendor not found' });
    }else{
      console.log("vendir found");
    }

    const company = vendor.company;
    console.log("restaurant name :",company);

    // Fetch reservations with matching company
    const matchingReservations = await reservationsCollection.find({ selectedrestaurant : company }).toArray();

    res.status(200).json(matchingReservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

app.post('/deletereservation', async (req, res) => {
  const { name, phone, date, selectedrestaurant, time, numberOfPeople, notes } = req.body;
  console.log("deletingreservation");
  try {
    const { client, db } = await connectToMongoDB();
    const reservationsCollection = db.collection('reservation');

    // Create a filter object based on the attributes provided
    const filter = {
      name,
      phone,
      selectedrestaurant,
      reservationDate: date,
      reservationTime: time,
      numOfPeople: numberOfPeople,
      notes
    };
    console.log("filter",filter);
    // Delete the record matching the filter from the collection
    const result = await reservationsCollection.deleteOne(filter);
    console.log(result);

    if (result.deletedCount === 1) {
      res.status(200).json({ success: true, message: 'Reservation deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Reservation not found' });
    }
  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(500).json({ success: false, error: 'Failed to delete reservation' });
  }
});


app.post('/enterreservation', async (req, res) => {
  const { name,phone,selectedrestaurant,reservationDate,reservationTime,numOfPeople,notes } = req.body;

  try {
    console.log("Inserting reservation");
    //console.log('Request Headers:', req.headers);
    const { client, db } = await connectToMongoDB();
    const reservationsCollection = db.collection('reservation');

    const jwtCookie = req.headers.cookie.split('; ').find(cookie => cookie.startsWith('jwt='));

      const jwtToken = jwtCookie.split('=')[1]; // Extract JWT token value
      const secretKey = 'your-secret-key'; // Replace with your secret key
    
      // Verify and decode the JWT token to get the user ID
     
        const decodedToken = jwt.verify(jwtToken, secretKey);
        const userId = decodedToken.userId;
        console.log("userid", userId);

    const reservationData = {
      userId,
      name,
      phone,
      selectedrestaurant,
      reservationDate,
      reservationTime,
      numOfPeople,
      notes,
      status: 'waiting for response',
    };

    const insertResult = await reservationsCollection.insertOne(reservationData);
    //console.log("result:",insertResult.insertedCount);
    if (insertResult.acknowledged === true) {
      console.log("Reservation inserted successfully");
      res.status(201).json({ success: true, message: 'Reservation inserted successfully' });

    } else {
      console.log("Failed to insert reservation");
      console.log("Insertion result:", insertResult);
      res.status(500).json({ error: 'Failed to insert reservation' });
    }
  } catch (error) {
    console.error('Error inserting reservation:', error);
    res.status(500).json({ error: 'Failed to insert reservation' });
  } 
});
app.post('/logout', async (req, res) => {
  try {
    console.log("Logging out...");
    
    // Extract JWT token from the cookie
    const jwtCookie = req.headers.cookie.split('; ').find(cookie => cookie.startsWith('jwt='));
    if (!jwtCookie) {
      return res.status(401).json({ error: 'No JWT token found in cookies' });
    }

    const jwtToken = jwtCookie.split('=')[1]; // Extract JWT token value
    const secretKey = 'your-secret-key'; // Replace with your secret key

    try {
      // Verify and decode the JWT token to get the user ID
      const decodedToken = jwt.verify(jwtToken, secretKey);
      const userId = decodedToken.userId;
      console.log("User ID:", userId);

      // Clear the JWT token by setting it to an empty string and an expired date
      res.cookie('jwt', '', { expires: new Date(0) });
      res.status(200).json({success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Error verifying JWT:', error);
      res.status(500).json({ error: 'Failed to verify JWT' });
    }
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Failed to log out' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});



  
 
  
  