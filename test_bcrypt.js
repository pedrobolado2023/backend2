console.log("start");
try {
  const bcrypt = require("bcrypt");
  console.log("bcrypt loaded");
} catch(e) {
  console.error(e);
}
console.log("end");
