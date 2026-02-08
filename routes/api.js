const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');

// GET equipos
router.get('/equipos', (req, res) => {
  const db = getDb();
  const equipos = db.prepare('SELECT * FROM equipos WHERE activo = 1').all();
  res.json(equipos);
});

// GET planes
router.get('/planes', (req, res) => {
  const db = getDb();
  const planes = db.prepare('SELECT * FROM planes WHERE activo = 1').all();
  res.json(planes);
});

// GET parroquias
router.get('/parroquias', (req, res) => {
  const db = getDb();
  const parroquias = db.prepare('SELECT * FROM parroquias WHERE activo = 1').all();
  res.json(parroquias);
});

// GET sectores por parroquia
router.get('/sectores/:parroquiaId', (req, res) => {
  const db = getDb();
  const sectores = db.prepare('SELECT * FROM sectores WHERE parroquia_id = ? AND activo = 1').all(req.params.parroquiaId);
  res.json(sectores);
});

// GET cajas NAP - búsqueda por código o nombre
router.get('/cajas-nap', (req, res) => {
  const db = getDb();
  const { buscar, parroquia_id, sector_id } = req.query;
  let query = 'SELECT cn.*, p.nombre as parroquia_nombre, s.nombre as sector_nombre FROM cajas_nap cn LEFT JOIN parroquias p ON cn.parroquia_id = p.id LEFT JOIN sectores s ON cn.sector_id = s.id WHERE cn.activo = 1';
  const params = [];

  if (buscar) {
    query += ' AND (cn.nombre LIKE ? OR cn.codigo LIKE ?)';
    params.push(`%${buscar}%`, `%${buscar}%`);
  }
  if (parroquia_id) {
    query += ' AND cn.parroquia_id = ?';
    params.push(parroquia_id);
  }
  if (sector_id) {
    query += ' AND cn.sector_id = ?';
    params.push(sector_id);
  }

  const cajas = db.prepare(query).all(...params);
  res.json(cajas);
});

// GET puertos de una caja NAP
router.get('/cajas-nap/:id/puertos', (req, res) => {
  const db = getDb();
  const puertos = db.prepare(`
    SELECT pn.*, i.nombre_completo as cliente_nombre
    FROM puertos_nap pn
    LEFT JOIN instalaciones i ON pn.instalacion_id = i.id
    WHERE pn.caja_nap_id = ?
    ORDER BY pn.numero_puerto
  `).all(req.params.id);
  res.json(puertos);
});

// GET tasa del día (simulada - en producción vendría de una API)
router.get('/tasa-cambio', (req, res) => {
  res.json({ tasa: 36.50, moneda: 'BS/USD', fecha: new Date().toISOString().split('T')[0] });
});

// GET estadísticas del dashboard
router.get('/estadisticas', (req, res) => {
  const db = getDb();

  const totalInstalaciones = db.prepare('SELECT COUNT(*) as total FROM instalaciones').get().total;
  const completadas = db.prepare("SELECT COUNT(*) as total FROM instalaciones WHERE estado = 'completada'").get().total;
  const pendientes = db.prepare("SELECT COUNT(*) as total FROM instalaciones WHERE estado = 'pendiente'").get().total;
  const ingresoTotal = db.prepare('SELECT COALESCE(SUM(monto_pagado), 0) as total FROM instalaciones').get().total;

  res.json({
    totalInstalaciones,
    completadas,
    pendientes,
    ingresoTotal
  });
});

// GET últimas instalaciones
router.get('/ultimas-instalaciones', (req, res) => {
  const db = getDb();
  const instalaciones = db.prepare(`
    SELECT i.*, p.nombre as plan_nombre, pa.nombre as parroquia_nombre, s.nombre as sector_nombre
    FROM instalaciones i
    LEFT JOIN planes p ON i.plan_id = p.id
    LEFT JOIN parroquias pa ON i.parroquia_id = pa.id
    LEFT JOIN sectores s ON i.sector_id = s.id
    ORDER BY i.fecha_creacion DESC
    LIMIT 20
  `).all();
  res.json(instalaciones);
});

module.exports = router;
