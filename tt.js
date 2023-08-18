const bcrypt = require('bcryptjs');

const plaintextPassword = 'emily123';
const saltRounds = 2;

bcrypt.hash(plaintextPassword, saltRounds, (err, hash) => {
  if (err) {
    console.log("error");
  } else {
    console.log(hash);
  }
});
