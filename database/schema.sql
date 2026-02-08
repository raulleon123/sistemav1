-- Tabla de equipos disponibles
CREATE TABLE IF NOT EXISTS equipos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo INTEGER DEFAULT 1
);

-- Tabla de planes
CREATE TABLE IF NOT EXISTS planes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  velocidad TEXT,
  precio REAL NOT NULL,
  descripcion TEXT,
  activo INTEGER DEFAULT 1
);

-- Tabla de parroquias
CREATE TABLE IF NOT EXISTS parroquias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  activo INTEGER DEFAULT 1
);

-- Tabla de sectores
CREATE TABLE IF NOT EXISTS sectores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parroquia_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  activo INTEGER DEFAULT 1,
  FOREIGN KEY (parroquia_id) REFERENCES parroquias(id)
);

-- Tabla de cajas NAP
CREATE TABLE IF NOT EXISTS cajas_nap (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  codigo TEXT UNIQUE NOT NULL,
  total_puertos INTEGER NOT NULL DEFAULT 8,
  ubicacion_lat REAL,
  ubicacion_lng REAL,
  parroquia_id INTEGER,
  sector_id INTEGER,
  activo INTEGER DEFAULT 1,
  FOREIGN KEY (parroquia_id) REFERENCES parroquias(id),
  FOREIGN KEY (sector_id) REFERENCES sectores(id)
);

-- Tabla de puertos de caja NAP
CREATE TABLE IF NOT EXISTS puertos_nap (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caja_nap_id INTEGER NOT NULL,
  numero_puerto INTEGER NOT NULL,
  estado TEXT DEFAULT 'disponible' CHECK(estado IN ('disponible', 'ocupado', 'dañado')),
  instalacion_id INTEGER,
  FOREIGN KEY (caja_nap_id) REFERENCES cajas_nap(id),
  FOREIGN KEY (instalacion_id) REFERENCES instalaciones(id)
);

-- Tabla principal de instalaciones
CREATE TABLE IF NOT EXISTS instalaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,

  -- Paso 1: Datos del cliente
  nombre_completo TEXT NOT NULL,
  ci TEXT NOT NULL,
  telefono TEXT NOT NULL,
  correo TEXT,

  -- Paso 2: Equipo y Plan
  equipo_id INTEGER,
  plan_id INTEGER,

  -- Paso 3: Ubicación
  parroquia_id INTEGER,
  sector_id INTEGER,
  latitud REAL,
  longitud REAL,

  -- Paso 4a: Caja NAP y materiales
  caja_nap_id INTEGER,
  puerto_nap_id INTEGER,
  cable_verde REAL DEFAULT 0,
  cable_azul REAL DEFAULT 0,
  grapas INTEGER DEFAULT 0,
  tirraps INTEGER DEFAULT 0,
  herrajes INTEGER DEFAULT 0,
  tensores INTEGER DEFAULT 0,

  -- Paso 4b: Potencia óptica y ONU
  potencia_optica REAL,
  onu_serial TEXT,

  -- Paso 6: Pago
  tipo_pago TEXT DEFAULT 'normal' CHECK(tipo_pago IN ('normal', 'cashea')),
  monto_total REAL DEFAULT 0,
  monto_pagado REAL DEFAULT 0,

  -- Metadata
  estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'completada', 'cancelada')),
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (equipo_id) REFERENCES equipos(id),
  FOREIGN KEY (plan_id) REFERENCES planes(id),
  FOREIGN KEY (parroquia_id) REFERENCES parroquias(id),
  FOREIGN KEY (sector_id) REFERENCES sectores(id),
  FOREIGN KEY (caja_nap_id) REFERENCES cajas_nap(id),
  FOREIGN KEY (puerto_nap_id) REFERENCES puertos_nap(id)
);

-- Tabla de fotos
CREATE TABLE IF NOT EXISTS fotos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instalacion_id INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('comercial', 'tecnica')),
  nombre_archivo TEXT NOT NULL,
  ruta TEXT NOT NULL,
  fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instalacion_id) REFERENCES instalaciones(id) ON DELETE CASCADE
);

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instalacion_id INTEGER NOT NULL,
  metodo TEXT NOT NULL CHECK(metodo IN ('pagomovil', 'efectivo_bs', 'efectivo_usd', 'transferencia', 'zelle')),
  moneda TEXT NOT NULL CHECK(moneda IN ('BS', 'USD')),
  monto REAL NOT NULL,
  referencia TEXT,
  fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instalacion_id) REFERENCES instalaciones(id) ON DELETE CASCADE
);
