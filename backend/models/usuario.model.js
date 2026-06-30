const db     = require('../config/db');
const bcrypt = require('bcryptjs');

const UsuarioModel = {

  getByEmail: async (email) => {
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE email = ? AND activo = 1', [email]
    );
    return rows[0];
  },

  getById: async (id) => {
    const [rows] = await db.query(
      'SELECT id, nombre, email, rol FROM usuarios WHERE id = ?', [id]
    );
    return rows[0];
  },

 
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT id, nombre, apellido, email, rol, celular, activo, creado_en
      FROM usuarios
      WHERE rol IN ('admin', 'empleado', 'doctor')
      ORDER BY nombre
    `);
    return rows;
  },

  crear: async (datos) => {
    const { nombre,apellido, email, password, rol, celular, activo } = datos;
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(`
      INSERT INTO usuarios (nombre, apellido, email, password, rol, celular, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [nombre, apellido, email, hash, rol, celular || null, activo ?? 1]);
    return result;
  },

  verificarEmailExiste: async (email) => {
    const [rows] = await db.query(
      'SELECT id FROM usuarios WHERE email = ?', [email]
    );
    return rows.length > 0;
  },

  actualizar: async (id, datos) => {
    const { nombre, apellido, email, celular, rol, activo, nuevaPassword } = datos;

    if (nuevaPassword) {
      const hash = await bcrypt.hash(nuevaPassword, 10);

      // si vienen rol y activo los incluye, sino los mantiene
      if (rol !== undefined && activo !== undefined) {
        await db.query(`
          UPDATE usuarios SET
            nombre   = ?,
            email    = ?,
            celular  = ?,
            rol      = ?,
            activo   = ?,
            password = ?
          WHERE id = ?
        `, [nombre, email, celular || null, rol, activo, hash, id]);
      } else {
        await db.query(`
          UPDATE usuarios SET
            nombre   = ?,
            email    = ?,
            celular  = ?,
            password = ?
          WHERE id = ?
        `, [nombre, email, celular || null, hash, id]);
      }

    } else {

      if (rol !== undefined && activo !== undefined) {
        await db.query(`
          UPDATE usuarios SET
            nombre  = ?,
            apellido = ?,
            email   = ?,
            celular = ?,
            rol     = ?,
            activo  = ?
          WHERE id = ?
        `, [nombre, apellido, email, celular || null, rol, activo, id]);
      } else {
        await db.query(`
          UPDATE usuarios SET
            nombre  = ?,
            apellido = ?,
            email   = ?,
            celular = ?
          WHERE id = ?
        `, [nombre, apellido, email, celular || null, id]);
      }
    }
  },

  actualizarPassword: async (id, password) => {
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'UPDATE usuarios SET password = ? WHERE id = ?', [hash, id]
    );
  },
  getById: async (id) => {
    const [rows] = await db.query(`
      SELECT id, nombre, apellido, email, rol, celular, activo, creado_en, sucursal_id
      FROM usuarios WHERE id = ?
    `, [id]);
    return rows[0] ?? null;
  },

  getByEmail: async (email) => {
    const [rows] = await db.query(`
      SELECT id, nombre, apellido, email, password, rol,
            sucursal_id, activo, debe_cambiar_password
      FROM usuarios WHERE email = ?
    `, [email]);
    return rows[0] ?? null;
  },

  guardarPasswordTemporal: async (id, passwordTemporal) => {
    const hash = await bcrypt.hash(passwordTemporal, 10);
    await db.query(`
      UPDATE usuarios SET
        password              = ?,
        debe_cambiar_password = 1
      WHERE id = ?
    `, [hash, id]);
  },
};

module.exports = UsuarioModel;