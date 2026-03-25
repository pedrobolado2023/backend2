console.log("Loading bcrypt");
const bcrypt = require('bcrypt');
console.log("Loading supabase");
const { createClient } = require('@supabase/supabase-js');
console.log("Loading dotenv");
const dotenv = require('dotenv');
const path = require('path');

console.log("Configuring dotenv");
dotenv.config({ path: path.join(__dirname, '.env') });

console.log("Reading env vars");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log("Creating client", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);
console.log("Client created!");

async function resetPassword() {
  const email = 'agente@test.com';
  const newPassword = 'Enjoy123!';
  const saltRounds = 10;
  const hash = await bcrypt.hash(newPassword, saltRounds);

  const { data, error } = await supabase
    .from('portal_users')
    .update({ password_hash: hash })
    .eq('email', email);

  if (error) {
    console.error('Error updating password:', error);
  } else {
    console.log(`Password for ${email} updated to ${newPassword}`);
  }
}

resetPassword();
