const bcrypt = require('bcryptjs');
bcrypt.hash('dental123', 10).then(hash => console.log(hash));