const { getDb, initDatabase } = require('./db');

function seed() {
  initDatabase();
  const db = getDb();

  // Insertar equipos
  const insertEquipo = db.prepare('INSERT OR IGNORE INTO equipos (nombre, descripcion) VALUES (?, ?)');
  const equipos = [
    ['ONU Huawei HG8145V5', 'Router ONU WiFi Dual Band'],
    ['ONU Huawei HG8546M', 'Router ONU WiFi con 4 puertos LAN'],
    ['ONU ZTE F670L', 'Router ONU WiFi 6'],
    ['ONU TP-Link XC220-G3v', 'Router ONU GPON'],
    ['ONU Nokia G-2425G-A', 'Router ONU WiFi AC']
  ];
  for (const e of equipos) insertEquipo.run(...e);

  // Insertar planes
  const insertPlan = db.prepare('INSERT OR IGNORE INTO planes (nombre, velocidad, precio, descripcion) VALUES (?, ?, ?, ?)');
  const planes = [
    ['Plan Básico', '10 Mbps', 15.00, 'Internet básico 10 Mbps simétrico'],
    ['Plan Hogar', '20 Mbps', 20.00, 'Internet hogar 20 Mbps simétrico'],
    ['Plan Avanzado', '50 Mbps', 30.00, 'Internet avanzado 50 Mbps simétrico'],
    ['Plan Premium', '100 Mbps', 45.00, 'Internet premium 100 Mbps simétrico'],
    ['Plan Empresarial', '200 Mbps', 80.00, 'Internet empresarial 200 Mbps simétrico']
  ];
  for (const p of planes) insertPlan.run(...p);

  // Insertar parroquias y sectores
  const insertParroquia = db.prepare('INSERT OR IGNORE INTO parroquias (nombre) VALUES (?)');
  const insertSector = db.prepare('INSERT OR IGNORE INTO sectores (parroquia_id, nombre) VALUES (?, ?)');

  const parroquias = [
    { nombre: 'Parroquia Centro', sectores: ['Sector Centro', 'Sector Norte', 'Sector Sur', 'Casco Central'] },
    { nombre: 'Parroquia Este', sectores: ['Urbanización Los Pinos', 'Barrio Nuevo', 'Sector Industrial', 'Las Acacias'] },
    { nombre: 'Parroquia Oeste', sectores: ['El Valle', 'La Colina', 'San José', 'Los Olivos'] },
    { nombre: 'Parroquia Norte', sectores: ['Altos del Norte', 'Vista Hermosa', 'El Mirador', 'Las Cumbres'] },
    { nombre: 'Parroquia Sur', sectores: ['El Progreso', 'La Esperanza', 'San Antonio', 'Los Jardines'] }
  ];

  for (const p of parroquias) {
    const result = insertParroquia.run(p.nombre);
    const parroquiaId = result.lastInsertRowid || db.prepare('SELECT id FROM parroquias WHERE nombre = ?').get(p.nombre).id;
    for (const s of p.sectores) {
      insertSector.run(parroquiaId, s);
    }
  }

  // Insertar cajas NAP
  const insertCajaNap = db.prepare('INSERT OR IGNORE INTO cajas_nap (nombre, codigo, total_puertos, parroquia_id, sector_id) VALUES (?, ?, ?, ?, ?)');
  const insertPuerto = db.prepare('INSERT OR IGNORE INTO puertos_nap (caja_nap_id, numero_puerto, estado) VALUES (?, ?, ?)');

  const cajasData = [
    { nombre: 'NAP-001 Centro', codigo: 'NAP-001', puertos: 8, parroquia: 1, sector: 1 },
    { nombre: 'NAP-002 Centro Norte', codigo: 'NAP-002', puertos: 16, parroquia: 1, sector: 2 },
    { nombre: 'NAP-003 Los Pinos', codigo: 'NAP-003', puertos: 8, parroquia: 2, sector: 5 },
    { nombre: 'NAP-004 Barrio Nuevo', codigo: 'NAP-004', puertos: 16, parroquia: 2, sector: 6 },
    { nombre: 'NAP-005 El Valle', codigo: 'NAP-005', puertos: 8, parroquia: 3, sector: 9 },
    { nombre: 'NAP-006 La Colina', codigo: 'NAP-006', puertos: 8, parroquia: 3, sector: 10 },
    { nombre: 'NAP-007 Altos Norte', codigo: 'NAP-007', puertos: 16, parroquia: 4, sector: 13 },
    { nombre: 'NAP-008 El Progreso', codigo: 'NAP-008', puertos: 8, parroquia: 5, sector: 17 },
  ];

  for (const c of cajasData) {
    const result = insertCajaNap.run(c.nombre, c.codigo, c.puertos, c.parroquia, c.sector);
    const cajaId = result.lastInsertRowid || db.prepare('SELECT id FROM cajas_nap WHERE codigo = ?').get(c.codigo).id;
    for (let i = 1; i <= c.puertos; i++) {
      // Marcar algunos puertos como ocupados para demostración
      const estado = (i <= 2 && cajaId <= 3) ? 'ocupado' : 'disponible';
      insertPuerto.run(cajaId, i, estado);
    }
  }

  console.log('Datos semilla insertados correctamente');
  console.log(`- ${equipos.length} equipos`);
  console.log(`- ${planes.length} planes`);
  console.log(`- ${parroquias.length} parroquias con sectores`);
  console.log(`- ${cajasData.length} cajas NAP con puertos`);
}

seed();
