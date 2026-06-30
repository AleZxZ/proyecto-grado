const express = require('express');
const cors    = require('cors');
const { verificarJWT } = require('./middlewares/auth.middleware');
require('dotenv').config();

//variables que almacenan las rutas de los módulos
const pacienteRoutes = require('./routes/paciente.routes');
const citaRoutes     = require('./routes/cita.routes');
const odontogramaRoutes = require('./routes/odontograma.routes');
const ortodonciaRoutes = require('./routes/ortodoncia.routes');
const pagoRoutes = require('./routes/pago.routes');
const ingresoRoutes = require('./routes/ingreso.routes');
const UsuarioRoutes = require('./routes/usuario.routes');
const ReporteRoutes = require('./routes/reporte.routes');
const NotificacionRoutes = require('./routes/notificacion.routes');
const AjustesRoutes = require('./routes/ajustes.routes');

const app = express();
app.use(cors({
  origin: [
    'http://localhost:4200',
    'https://perceptive-nature-production.up.railway.app'
  ]
}));
//app.use(cors());
app.use(express.json());


// rutas públicas
app.use('/api/auth',      require('./routes/auth.routes'));

// rutas protegidas
app.use('/api/pacientes', verificarJWT,pacienteRoutes);
app.use('/api/citas',     verificarJWT, citaRoutes);
app.use('/api/odontograma', verificarJWT, odontogramaRoutes);
app.use('/api/ortodoncia', verificarJWT, ortodonciaRoutes);
app.use('/api/pagos', verificarJWT, pagoRoutes);
app.use('/api/ingresos', verificarJWT, ingresoRoutes);
app.use('/api/usuarios', verificarJWT, UsuarioRoutes);
app.use('/api/reportes', verificarJWT, ReporteRoutes);
app.use('/api/notificaciones', verificarJWT, NotificacionRoutes);
app.use('/api/ajustes', verificarJWT, AjustesRoutes);

app.get('/api/health', (_, res) => res.json({ 
  ok: true, 
  ts: new Date(),
  env: process.env.NODE_ENV || 'development'
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(` http://localhost:${PORT}`);
});