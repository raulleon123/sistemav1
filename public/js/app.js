// ============================================
// FibraSystem - App Frontend
// ============================================

const App = {
  currentStep: 1,
  totalSteps: 6,
  data: {
    equipoId: null,
    planId: null,
    planPrecio: 0,
    cajaNapId: null,
    puertoNapId: null,
    pagos: [],
    fotosComercial: [],
    fotosTecnica: [],
    tasaCambio: 36.50
  },

  init() {
    this.loadInitialData();
    this.bindEvents();
    this.updateProgressBar();
    this.loadTasaCambio();
  },

  // ---- Navigation ----
  bindEvents() {
    document.getElementById('btnSiguiente').addEventListener('click', () => this.nextStep());
    document.getElementById('btnAnterior').addEventListener('click', () => this.prevStep());
    document.getElementById('btnGuardar').addEventListener('click', () => this.guardarInstalacion());
    document.getElementById('btnGPS').addEventListener('click', () => this.tomarGPS());
    document.getElementById('btnBuscarNap').addEventListener('click', () => this.buscarNAP());
    document.getElementById('btnAgregarPago').addEventListener('click', () => this.agregarPago());

    // Enter key en búsqueda NAP
    document.getElementById('buscar_nap').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.buscarNAP(); }
    });

    // Potencia óptica change
    document.getElementById('potencia_optica').addEventListener('input', (e) => this.evaluarPotencia(e.target.value));

    // Parroquia change -> cargar sectores
    document.getElementById('parroquia_id').addEventListener('change', (e) => this.cargarSectores(e.target.value));

    // Fotos
    document.getElementById('fotos_comercial').addEventListener('change', (e) => this.previewFotos(e, 'comercial'));
    document.getElementById('fotos_tecnica').addEventListener('change', (e) => this.previewFotos(e, 'tecnica'));

    // Método de pago -> moneda automática
    document.getElementById('pago_metodo').addEventListener('change', (e) => {
      const moneda = ['efectivo_usd', 'zelle'].includes(e.target.value) ? 'USD' : 'BS';
      document.getElementById('pago_moneda').value = moneda;
    });

    // Tipo de pago -> recalcular monto
    document.querySelectorAll('input[name="tipo_pago"]').forEach(r => {
      r.addEventListener('change', () => this.actualizarMontoPago());
    });

    // Scan ONU
    document.getElementById('btnScanONU').addEventListener('click', () => this.scanONU());
  },

  nextStep() {
    if (!this.validateStep(this.currentStep)) return;
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.showStep(this.currentStep);
    }
  },

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.showStep(this.currentStep);
    }
  },

  showStep(step) {
    // Hide all panels
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');

    // Update indicators
    document.querySelectorAll('.step-indicator').forEach(ind => {
      const s = parseInt(ind.dataset.step);
      ind.classList.remove('active', 'completed');
      if (s === step) ind.classList.add('active');
      else if (s < step) ind.classList.add('completed');
    });

    // Show/hide buttons
    document.getElementById('btnAnterior').style.display = step > 1 ? 'inline-block' : 'none';
    document.getElementById('btnSiguiente').style.display = step < this.totalSteps ? 'inline-block' : 'none';
    document.getElementById('btnGuardar').style.display = step === this.totalSteps ? 'inline-block' : 'none';

    // Update progress bar
    this.updateProgressBar();

    // Step-specific actions
    if (step === 6) this.actualizarMontoPago();
  },

  updateProgressBar() {
    const percent = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
    document.getElementById('progressBarFill').style.width = `${percent}%`;
  },

  // ---- Validation ----
  validateStep(step) {
    switch (step) {
      case 1:
        const nombre = document.getElementById('nombre_completo').value.trim();
        const ci = document.getElementById('ci').value.trim();
        const tel = document.getElementById('telefono').value.trim();
        if (!nombre) { this.showAlert('Ingrese el nombre completo'); return false; }
        if (!ci) { this.showAlert('Ingrese la cédula de identidad'); return false; }
        if (!tel) { this.showAlert('Ingrese el teléfono'); return false; }
        return true;

      case 2:
        if (!this.data.equipoId) { this.showAlert('Seleccione un equipo'); return false; }
        if (!this.data.planId) { this.showAlert('Seleccione un plan'); return false; }
        return true;

      case 3:
        if (!document.getElementById('parroquia_id').value) { this.showAlert('Seleccione una parroquia'); return false; }
        if (!document.getElementById('sector_id').value) { this.showAlert('Seleccione un sector'); return false; }
        return true;

      case 4:
        const potencia = document.getElementById('potencia_optica').value;
        const onuSerial = document.getElementById('onu_serial').value.trim();
        if (!potencia) { this.showAlert('Ingrese la potencia óptica'); return false; }
        if (!onuSerial) { this.showAlert('Ingrese o escanee el serial de la ONU'); return false; }
        return true;

      case 5:
        return true; // Fotos son opcionales

      case 6:
        return true;
    }
    return true;
  },

  showAlert(msg) {
    alert(msg);
  },

  // ---- Load Data ----
  async loadInitialData() {
    try {
      const [equiposResp, planesResp, parroquiasResp] = await Promise.all([
        fetch('/api/equipos'),
        fetch('/api/planes'),
        fetch('/api/parroquias')
      ]);

      const equipos = await equiposResp.json();
      const planes = await planesResp.json();
      const parroquias = await parroquiasResp.json();

      this.renderEquipos(equipos);
      this.renderPlanes(planes);
      this.renderParroquias(parroquias);
    } catch (e) {
      console.error('Error cargando datos:', e);
    }
  },

  async loadTasaCambio() {
    try {
      const resp = await fetch('/api/tasa-cambio');
      const data = await resp.json();
      this.data.tasaCambio = data.tasa;
    } catch (e) {
      console.error('Error cargando tasa:', e);
    }
  },

  renderEquipos(equipos) {
    const container = document.getElementById('equipos-container');
    container.innerHTML = equipos.map(e => `
      <div class="col-6">
        <div class="equipo-card" data-id="${e.id}" onclick="App.selectEquipo(${e.id}, this)">
          <div class="equipo-icon"><i class="bi bi-router"></i></div>
          <div class="fw-bold" style="font-size:13px;">${e.nombre}</div>
          <small class="text-muted">${e.descripcion || ''}</small>
        </div>
      </div>
    `).join('');
  },

  renderPlanes(planes) {
    const container = document.getElementById('planes-container');
    container.innerHTML = planes.map(p => `
      <div class="col-6 col-md-4">
        <div class="plan-card" data-id="${p.id}" data-precio="${p.precio}" onclick="App.selectPlan(${p.id}, ${p.precio}, this)">
          <div class="plan-icon"><i class="bi bi-speedometer"></i></div>
          <div class="fw-bold">${p.nombre}</div>
          <div class="text-muted small">${p.velocidad}</div>
          <div class="plan-precio mt-1">$${p.precio.toFixed(2)}</div>
        </div>
      </div>
    `).join('');
  },

  renderParroquias(parroquias) {
    const select = document.getElementById('parroquia_id');
    parroquias.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nombre;
      select.appendChild(opt);
    });
  },

  selectEquipo(id, el) {
    document.querySelectorAll('.equipo-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    this.data.equipoId = id;
  },

  selectPlan(id, precio, el) {
    document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    this.data.planId = id;
    this.data.planPrecio = precio;
  },

  // ---- Sectores ----
  async cargarSectores(parroquiaId) {
    const select = document.getElementById('sector_id');
    select.innerHTML = '<option value="">Cargando...</option>';
    select.disabled = true;

    if (!parroquiaId) {
      select.innerHTML = '<option value="">Primero seleccione una parroquia</option>';
      return;
    }

    try {
      const resp = await fetch(`/api/sectores/${parroquiaId}`);
      const sectores = await resp.json();
      select.innerHTML = '<option value="">Seleccione un sector</option>';
      sectores.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.nombre;
        select.appendChild(opt);
      });
      select.disabled = false;
    } catch (e) {
      select.innerHTML = '<option value="">Error al cargar sectores</option>';
    }
  },

  // ---- GPS ----
  tomarGPS() {
    const statusEl = document.getElementById('gps-status');
    const btn = document.getElementById('btnGPS');
    btn.disabled = true;
    statusEl.innerHTML = '<span class="text-primary"><i class="bi bi-arrow-repeat spin"></i> Obteniendo ubicación...</span>';

    if (!navigator.geolocation) {
      statusEl.innerHTML = '<span class="text-danger">GPS no disponible en este dispositivo</span>';
      btn.disabled = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        document.getElementById('latitud').value = pos.coords.latitude.toFixed(6);
        document.getElementById('longitud').value = pos.coords.longitude.toFixed(6);
        statusEl.innerHTML = '<span class="text-success"><i class="bi bi-check-circle"></i> Ubicación obtenida correctamente</span>';
        btn.disabled = false;
      },
      (err) => {
        statusEl.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> Error: ${err.message}</span>`;
        btn.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  },

  // ---- NAP Box ----
  async buscarNAP() {
    const query = document.getElementById('buscar_nap').value.trim();
    const resultados = document.getElementById('nap-resultados');
    const lista = document.getElementById('nap-lista');

    try {
      const params = new URLSearchParams();
      if (query) params.set('buscar', query);

      const resp = await fetch(`/api/cajas-nap?${params}`);
      const cajas = await resp.json();

      if (cajas.length === 0) {
        lista.innerHTML = '<div class="list-group-item text-center text-muted">No se encontraron cajas NAP</div>';
      } else {
        lista.innerHTML = cajas.map(c => `
          <button type="button" class="list-group-item list-group-item-action" onclick="App.selectNAP(${c.id}, '${c.nombre}', '${c.codigo}')">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <strong><i class="bi bi-box me-1"></i>${c.codigo}</strong>
                <small class="d-block text-muted">${c.nombre}</small>
                <small class="text-muted">${c.parroquia_nombre || ''} - ${c.sector_nombre || ''}</small>
              </div>
              <span class="badge bg-primary">${c.total_puertos} puertos</span>
            </div>
          </button>
        `).join('');
      }

      resultados.style.display = 'block';
    } catch (e) {
      console.error('Error buscando NAP:', e);
    }
  },

  async selectNAP(id, nombre, codigo) {
    this.data.cajaNapId = id;
    document.getElementById('caja_nap_id').value = id;
    document.getElementById('nap-seleccionada-nombre').textContent = `${codigo} - ${nombre}`;
    document.getElementById('nap-resultados').style.display = 'none';
    document.getElementById('nap-puertos-section').style.display = 'block';

    // Cargar puertos
    try {
      const resp = await fetch(`/api/cajas-nap/${id}/puertos`);
      const puertos = await resp.json();
      this.renderPuertos(puertos);
    } catch (e) {
      console.error('Error cargando puertos:', e);
    }
  },

  renderPuertos(puertos) {
    const grid = document.getElementById('puertos-grid');
    grid.innerHTML = puertos.map(p => {
      const isOcupado = p.estado === 'ocupado';
      const clase = isOcupado ? 'ocupado' : 'disponible';
      const clienteInfo = p.cliente_nombre ? `<span class="puerto-status">${p.cliente_nombre}</span>` : '';
      const statusText = isOcupado ? 'Ocupado' : 'Libre';

      return `
        <div class="puerto-btn ${clase}"
             data-id="${p.id}"
             data-numero="${p.numero_puerto}"
             ${!isOcupado ? `onclick="App.selectPuerto(${p.id}, ${p.numero_puerto}, this)"` : ''}>
          <i class="bi ${isOcupado ? 'bi-x-circle' : 'bi-circle'}"></i>
          <span class="d-block">#${p.numero_puerto}</span>
          <span class="puerto-status">${statusText}</span>
          ${clienteInfo}
        </div>
      `;
    }).join('');
  },

  selectPuerto(id, numero, el) {
    document.querySelectorAll('.puerto-btn').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    this.data.puertoNapId = id;
    document.getElementById('puerto_nap_id').value = id;
  },

  // ---- Potencia Óptica ----
  evaluarPotencia(valor) {
    const el = document.getElementById('potencia-estado');
    const v = parseFloat(valor);
    if (isNaN(v)) { el.textContent = ''; return; }

    if (v < -25) {
      el.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-triangle"></i> MALA - Señal muy débil</span>';
    } else if (v < -20) {
      el.innerHTML = '<span class="text-warning"><i class="bi bi-exclamation-circle"></i> REGULAR - Señal aceptable</span>';
    } else if (v < -15) {
      el.innerHTML = '<span class="text-success"><i class="bi bi-check-circle"></i> BUENA - Señal óptima</span>';
    } else {
      el.innerHTML = '<span class="text-success"><i class="bi bi-check-circle-fill"></i> EXCELENTE - Señal perfecta</span>';
    }
  },

  // ---- Scan ONU ----
  scanONU() {
    // Si el navegador soporta BarcodeDetector, usar cámara
    const input = document.getElementById('onu_serial');
    if ('BarcodeDetector' in window) {
      // Usar cámara para escanear
      this.startBarcodeScan(input);
    } else {
      // Fallback: prompt manual
      const serial = prompt('Ingrese el serial de la ONU manualmente:');
      if (serial) input.value = serial.trim();
    }
  },

  async startBarcodeScan(inputEl) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('playsinline', '');
      await video.play();

      const detector = new BarcodeDetector({ formats: ['code_128', 'code_39', 'qr_code', 'ean_13'] });
      const scanInterval = setInterval(async () => {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            inputEl.value = barcodes[0].rawValue;
            clearInterval(scanInterval);
            stream.getTracks().forEach(t => t.stop());
          }
        } catch (e) { /* continue scanning */ }
      }, 500);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(scanInterval);
        stream.getTracks().forEach(t => t.stop());
      }, 30000);

    } catch (e) {
      const serial = prompt('No se pudo acceder a la cámara. Ingrese el serial manualmente:');
      if (serial) inputEl.value = serial.trim();
    }
  },

  // ---- Fotos ----
  previewFotos(event, tipo) {
    const files = Array.from(event.target.files);
    const container = document.getElementById(`fotos-${tipo}-preview`);

    if (tipo === 'comercial') {
      this.data.fotosComercial = [...this.data.fotosComercial, ...files];
    } else {
      this.data.fotosTecnica = [...this.data.fotosTecnica, ...files];
    }

    files.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = 'foto-preview-item';
        const globalIdx = tipo === 'comercial'
          ? this.data.fotosComercial.length - files.length + idx
          : this.data.fotosTecnica.length - files.length + idx;
        div.innerHTML = `
          <img src="${e.target.result}" alt="Foto">
          <button type="button" class="foto-remove" onclick="App.removeFoto('${tipo}', ${globalIdx}, this)">
            <i class="bi bi-x"></i>
          </button>
        `;
        container.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  },

  removeFoto(tipo, index, btn) {
    if (tipo === 'comercial') {
      this.data.fotosComercial.splice(index, 1);
    } else {
      this.data.fotosTecnica.splice(index, 1);
    }
    btn.parentElement.remove();
  },

  // ---- Pagos ----
  actualizarMontoPago() {
    const tipoPago = document.querySelector('input[name="tipo_pago"]:checked').value;
    const precio = this.data.planPrecio;
    const montoTotal = tipoPago === 'cashea' ? precio : precio;

    document.getElementById('monto_total_display').textContent = montoTotal.toFixed(2);
    document.getElementById('monto_total_bs').textContent = (montoTotal * this.data.tasaCambio).toFixed(2);

    const totalPagado = this.data.pagos.reduce((sum, p) => {
      if (p.moneda === 'BS') return sum + (p.monto / this.data.tasaCambio);
      return sum + p.monto;
    }, 0);

    const pendiente = Math.max(0, montoTotal - totalPagado);
    document.getElementById('monto_pendiente').textContent = pendiente.toFixed(2);
  },

  agregarPago() {
    const metodo = document.getElementById('pago_metodo').value;
    const moneda = document.getElementById('pago_moneda').value;
    const monto = parseFloat(document.getElementById('pago_monto').value);
    const referencia = document.getElementById('pago_referencia').value.trim();

    if (!monto || monto <= 0) {
      this.showAlert('Ingrese un monto válido');
      return;
    }

    const pago = { metodo, moneda, monto, referencia };
    this.data.pagos.push(pago);

    this.renderPagos();
    this.actualizarMontoPago();

    // Reset form
    document.getElementById('pago_monto').value = '';
    document.getElementById('pago_referencia').value = '';
  },

  renderPagos() {
    const container = document.getElementById('pagos-items');
    if (this.data.pagos.length === 0) {
      container.innerHTML = `
        <div class="list-group-item text-center text-muted py-3">
          <i class="bi bi-wallet2 d-block fs-4 mb-1"></i>
          No se han registrado pagos
        </div>`;
      return;
    }

    const metodosLabel = {
      'pagomovil': 'Pago Móvil',
      'efectivo_bs': 'Efectivo Bs',
      'efectivo_usd': 'Efectivo USD',
      'transferencia': 'Transferencia',
      'zelle': 'Zelle'
    };

    container.innerHTML = this.data.pagos.map((p, idx) => `
      <div class="list-group-item pago-item d-flex justify-content-between align-items-center">
        <div>
          <strong>${metodosLabel[p.metodo] || p.metodo}</strong>
          <small class="d-block text-muted">${p.referencia || 'Sin referencia'}</small>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="badge bg-success fs-6">${p.moneda} ${p.monto.toFixed(2)}</span>
          <button type="button" class="pago-remove" onclick="App.removePago(${idx})">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  },

  removePago(index) {
    this.data.pagos.splice(index, 1);
    this.renderPagos();
    this.actualizarMontoPago();
  },

  // ---- Guardar Instalación ----
  async guardarInstalacion() {
    const btn = document.getElementById('btnGuardar');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Guardando...';

    try {
      const tipoPago = document.querySelector('input[name="tipo_pago"]:checked').value;
      const totalPagadoUSD = this.data.pagos.reduce((sum, p) => {
        if (p.moneda === 'BS') return sum + (p.monto / this.data.tasaCambio);
        return sum + p.monto;
      }, 0);

      const datos = {
        nombre_completo: document.getElementById('nombre_completo').value.trim(),
        ci: document.getElementById('ci_tipo').value + '-' + document.getElementById('ci').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        correo: document.getElementById('correo').value.trim(),
        equipo_id: this.data.equipoId,
        plan_id: this.data.planId,
        parroquia_id: parseInt(document.getElementById('parroquia_id').value),
        sector_id: parseInt(document.getElementById('sector_id').value),
        latitud: parseFloat(document.getElementById('latitud').value) || null,
        longitud: parseFloat(document.getElementById('longitud').value) || null,
        caja_nap_id: this.data.cajaNapId,
        puerto_nap_id: this.data.puertoNapId,
        cable_verde: parseFloat(document.getElementById('cable_verde').value) || 0,
        cable_azul: parseFloat(document.getElementById('cable_azul').value) || 0,
        grapas: parseInt(document.getElementById('grapas').value) || 0,
        tirraps: parseInt(document.getElementById('tirraps').value) || 0,
        herrajes: parseInt(document.getElementById('herrajes').value) || 0,
        tensores: parseInt(document.getElementById('tensores').value) || 0,
        potencia_optica: parseFloat(document.getElementById('potencia_optica').value),
        onu_serial: document.getElementById('onu_serial').value.trim(),
        tipo_pago: tipoPago,
        monto_total: this.data.planPrecio,
        monto_pagado: totalPagadoUSD,
        pagos: this.data.pagos
      };

      // Crear FormData para enviar fotos + datos
      const formData = new FormData();
      formData.append('datos', JSON.stringify(datos));

      // Agregar fotos
      const fotosTipos = [];
      this.data.fotosComercial.forEach(f => {
        formData.append('fotos', f);
        fotosTipos.push('comercial');
      });
      this.data.fotosTecnica.forEach(f => {
        formData.append('fotos', f);
        fotosTipos.push('tecnica');
      });
      formData.append('fotos_tipos', JSON.stringify(fotosTipos));

      const resp = await fetch('/instalaciones', {
        method: 'POST',
        body: formData
      });

      const result = await resp.json();

      if (result.success) {
        document.getElementById('codigo-instalacion').textContent = result.codigo;
        const modal = new bootstrap.Modal(document.getElementById('modalExito'));
        modal.show();
      } else {
        this.showAlert('Error al guardar: ' + (result.error || 'Error desconocido'));
      }
    } catch (e) {
      console.error('Error guardando:', e);
      this.showAlert('Error al guardar la instalación. Intente nuevamente.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Guardar Instalación';
    }
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => App.init());
