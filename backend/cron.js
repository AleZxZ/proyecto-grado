const cron = require('node-cron');
const { generarPrediccionesTodosLosPacientes } = require('./batch-prediccion');

function iniciarCron() {
  
  cron.schedule('19 12 * * *', async () => {
    await generarPrediccionesTodosLosPacientes();
  });

  console.log('Cron programado: predicciones diarias a las 12:19 PM');
}

module.exports = { iniciarCron };
