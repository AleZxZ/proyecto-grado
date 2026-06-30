const ReporteModel = require('../models/reporte.model');

const ReporteController = {

  getEstadisticas: async (req, res) => {
        const sucursalId  = req.query.sucursal_id
            ? parseInt(req.query.sucursal_id) : null;
        const fechaDesde  = req.query.fecha_desde
            ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString().split('T')[0];
        const fechaHasta  = req.query.fecha_hasta
            ?? new Date().toISOString().split('T')[0];

        console.log('PARAMS:', { sucursalId, fechaDesde, fechaHasta }); // ← agregar

        try {
            const data = await ReporteModel.getEstadisticas(
            sucursalId, fechaDesde, fechaHasta + ' 23:59:59'
            );
            res.json(data);
        } catch (e) {
            console.error('ERROR reportes:', e.message); // ← agregar
            console.error('ERROR stack:', e.stack);       // ← agregar
            res.status(500).json({ error: e.message });
        }
    }
};

module.exports = ReporteController;