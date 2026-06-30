// backend/scripts/generarHash.js
const bcrypt = require('bcryptjs');

async function main() {
  const hash = await bcrypt.hash('dental123', 10);
  console.log('Hash generado:', hash);
}
main();

/*
    // backend/scripts/generarUsuarios.js
const bcrypt = require('bcryptjs');
const db     = require('../config/db');

async function crearUsuarios() {
  const pass = await bcrypt.hash('dental123', 10); // contraseña para todos

  await db.query(`
    INSERT INTO usuarios (nombre, email, password, rol, celular, activo) VALUES
    -- Doctoras
    ('Dra. María Escobar',   'maria@dental.com',    '${pass}', 'doctor',   '77712345', 1),
    ('Dra. Laura Mendoza',   'laura@dental.com',    '${pass}', 'doctor',   '77754321', 1),
    -- Pacientes
    ('Carlos Mamani',        'carlos@gmail.com',    '${pass}', 'paciente', '76611111', 1),
    ('Valeria Ortiz',        'valeria@gmail.com',   '${pass}', 'paciente', '76622222', 1);
  `);

  console.log('✅ Usuarios creados correctamente');
  console.log('Email: nicole@dental.com    | Pass: dental123 | Rol: doctor   | Sucursal 1');
  console.log('Email: laura@dental.com    | Pass: dental123 | Rol: doctor   | Sucursal 2');
  console.log('Email: carlos@gmail.com    | Pass: dental123 | Rol: paciente | Sucursal 1');
  console.log('Email: valeria@gmail.com   | Pass: dental123 | Rol: paciente | Sucursal 2');
  process.exit(0);
}

crearUsuarios().catch(console.error);




*/
 