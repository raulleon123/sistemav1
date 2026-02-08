const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/db');

// Configurar multer para subida de fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Solo se permiten imágenes (JPG, PNG, WEBP)'));
  }
});

// Formulario de nueva instalación
router.get('/nueva', (req, res) => {
  res.render('nueva-instalacion');
});

// Crear instalación completa
router.post('/', upload.array('fotos', 20), (req, res) => {
  const db = getDb();

  try {
    const data = JSON.parse(req.body.datos);
    const codigo = `INS-${Date.now().toString(36).toUpperCase()}`;

    const result = db.prepare(`
      INSERT INTO instalaciones (
        codigo, nombre_completo, ci, telefono, correo,
        equipo_id, plan_id,
        parroquia_id, sector_id, latitud, longitud,
        caja_nap_id, puerto_nap_id,
        cable_verde, cable_azul, grapas, tirraps, herrajes, tensores,
        potencia_optica, onu_serial,
        tipo_pago, monto_total, monto_pagado, estado
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, 'completada'
      )
    `).run(
      codigo, data.nombre_completo, data.ci, data.telefono, data.correo,
      data.equipo_id, data.plan_id,
      data.parroquia_id, data.sector_id, data.latitud, data.longitud,
      data.caja_nap_id, data.puerto_nap_id,
      data.cable_verde || 0, data.cable_azul || 0, data.grapas || 0,
      data.tirraps || 0, data.herrajes || 0, data.tensores || 0,
      data.potencia_optica, data.onu_serial,
      data.tipo_pago, data.monto_total, data.monto_pagado
    );

    const instalacionId = result.lastInsertRowid;

    // Marcar puerto como ocupado
    if (data.puerto_nap_id) {
      db.prepare("UPDATE puertos_nap SET estado = 'ocupado', instalacion_id = ? WHERE id = ?")
        .run(instalacionId, data.puerto_nap_id);
    }

    // Guardar fotos
    if (req.files && req.files.length > 0) {
      const insertFoto = db.prepare('INSERT INTO fotos (instalacion_id, tipo, nombre_archivo, ruta) VALUES (?, ?, ?, ?)');
      const fotosTipos = JSON.parse(req.body.fotos_tipos || '[]');

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const tipo = fotosTipos[i] || 'tecnica';
        insertFoto.run(instalacionId, tipo, file.originalname, `/uploads/${file.filename}`);
      }
    }

    // Guardar pagos
    if (data.pagos && data.pagos.length > 0) {
      const insertPago = db.prepare('INSERT INTO pagos (instalacion_id, metodo, moneda, monto, referencia) VALUES (?, ?, ?, ?, ?)');
      for (const pago of data.pagos) {
        insertPago.run(instalacionId, pago.metodo, pago.moneda, pago.monto, pago.referencia || null);
      }
    }

    res.json({ success: true, codigo, id: instalacionId });
  } catch (error) {
    console.error('Error al crear instalación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ver detalle de instalación
router.get('/:id', (req, res) => {
  const db = getDb();
  const instalacion = db.prepare(`
    SELECT i.*, e.nombre as equipo_nombre, p.nombre as plan_nombre, p.precio as plan_precio,
           pa.nombre as parroquia_nombre, s.nombre as sector_nombre,
           cn.nombre as caja_nap_nombre, cn.codigo as caja_nap_codigo,
           pn.numero_puerto
    FROM instalaciones i
    LEFT JOIN equipos e ON i.equipo_id = e.id
    LEFT JOIN planes p ON i.plan_id = p.id
    LEFT JOIN parroquias pa ON i.parroquia_id = pa.id
    LEFT JOIN sectores s ON i.sector_id = s.id
    LEFT JOIN cajas_nap cn ON i.caja_nap_id = cn.id
    LEFT JOIN puertos_nap pn ON i.puerto_nap_id = pn.id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!instalacion) {
    return res.status(404).json({ error: 'Instalación no encontrada' });
  }

  const fotos = db.prepare('SELECT * FROM fotos WHERE instalacion_id = ?').all(req.params.id);
  const pagos = db.prepare('SELECT * FROM pagos WHERE instalacion_id = ?').all(req.params.id);

  res.json({ ...instalacion, fotos, pagos });
});

// Ver detalle de instalación (HTML)
router.get('/:id/detalle', (req, res) => {
  res.render('detalle-instalacion', { id: req.params.id });
});

module.exports = router;
