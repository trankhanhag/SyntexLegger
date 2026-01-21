const bcrypt = require('bcryptjs');
const password = 'admin';
const hash = bcrypt.hashSync(password, 10);
console.log('Hash:', hash);
console.log('Test Compare:', bcrypt.compareSync(password, hash));
