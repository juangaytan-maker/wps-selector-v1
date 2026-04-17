/**
 * 🎯 MAIN APPLICATION CONTROLLER - v4.2 (DATA DRIVEN EDITION)
 * 
 * Este archivo coordina:
 * - Navegación entre pantallas
 * - Validación de formularios
 * - Selects dinámicos en cascada (Proceso → Electrodo → Diámetro)
 * - Llamadas a calculadora basada en JSON
 * - Sistema PRO y anuncios
 * - Exportación a PDF
 */

// ============================================================================
// 01. 📦 IMPORTS & DEPENDENCIAS
// ============================================================================
import { 
    calcularWPSCompleto, 
    getElectricalParams,
    getHeatInputRange
} from './wps-calculator.js';

import { 
    updateProUI, 
    activatePro, 
    deactivatePro, 
    contactDeveloper,
    initProSystem 
} from './pro-system.js';

import { initAds, getRandomAd } from './ads-manager.js';
import { DataManager } from './data-manager.js'; // ← CORREGIDO: DataManager (no WPSData)

// ============================================================================
// 02. 📚 CONSTANTES & CONFIGURACIÓN
// ============================================================================
const FREE_MATERIALS = ['A36', 'A500', 'A516-70', 'A53'];
const FREE_SIZES = ['6', '8', '10', '12'];
const FREE_PROCESSES = ['GMAW'];

// Estado global
window.hasCalculated = false;

// ============================================================================
// 03. 🎬 INICIALIZACIÓN (CORREGIDO: async)
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Cargar datos JSON primero
        await DataManager.init();
                // 2. Inicializar sistemas
        initProSystem();
        initAds();
        initDynamicSelects(); // ← NUEVO: Activar selects en cascada
        
        console.log('✅ WPS Selector Pro cargado correctamente');
    } catch (error) {
        console.error('❌ Error crítico al iniciar:', error);
        alert('Error al cargar datos de ingeniería. Recarga la página.');
    }
});

// ============================================================================
// 04. 🔄 SELECTS DINÁMICOS EN CASCADA (NUEVO)
// ============================================================================
function initDynamicSelects() {
    const processSelect = document.getElementById('process');
    const electrodeSelect = document.getElementById('electrode');
    const diameterSelect = document.getElementById('diameter');

    if (!processSelect || !electrodeSelect || !diameterSelect) return;

    // Cuando cambia el PROCESO → cargar ELECTRODOS
    processSelect.addEventListener('change', async function() {
        const processCode = this.value;
        
        // Limpiar selects dependientes
        electrodeSelect.innerHTML = '<option value="">-- Seleccionar Electrodo --</option>';
        diameterSelect.innerHTML = '<option value="">-- Seleccionar Diámetro --</option>';
        diameterSelect.disabled = true;
        
        if (!processCode) {
            electrodeSelect.disabled = true;
            return;
        }

        try {
            const processData = DataManager.getProcess(processCode);
            if (processData && processData.electrodes) {
                electrodeSelect.disabled = false;
                processData.electrodes.forEach(electrode => {
                    const option = document.createElement('option');
                    option.value = electrode.classification.trim();
                    option.textContent = `${electrode.classification.trim()} (${electrode.shielding})`;
                    electrodeSelect.appendChild(option);
                });
            }
        } catch (e) {
            console.error("Error cargando electrodos:", e);
        }    });

    // Cuando cambia el ELECTRODO → cargar DIÁMETROS
    electrodeSelect.addEventListener('change', function() {
        const processCode = processSelect.value;
        const electrodeClass = this.value;
        
        diameterSelect.innerHTML = '<option value="">-- Seleccionar Diámetro --</option>';
        
        if (!electrodeClass) {
            diameterSelect.disabled = true;
            return;
        }

        try {
            const processData = DataManager.getProcess(processCode);
            const electrode = processData.electrodes.find(e => e.classification.trim() === electrodeClass);
            
            if (electrode && electrode.diameters_mm) {
                diameterSelect.disabled = false;
                // Las llaves del objeto son los diámetros: "1.2", "3/32", etc.
                const diameters = Object.keys(electrode.diameters_mm);
                diameters.forEach(d => {
                    const option = document.createElement('option');
                    option.value = d;
                    option.textContent = `Ø ${d} mm`;
                    diameterSelect.appendChild(option);
                });
            }
        } catch (e) {
            console.error("Error cargando diámetros:", e);
        }
    });
}

// ============================================================================
// 05. 🔄 NAVEGACIÓN ENTRE PESTAÑAS (CORREGIDO)
// ============================================================================
window.switchTab = function(screenId, btnElement) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
    if (btnElement) btnElement.classList.add('active');
};

// ============================================================================
// 06. 📋 LÓGICA DEL FORMULARIO
// ============================================================================window.updateFormLogic = function() {
    clearAllErrors();
    const position = document.getElementById('position').value;
    const weldSelect = document.getElementById('weldingType');
    const weldStatic = document.getElementById('weldingTypeStatic');
    
    hideAllConditionalSections();
    if (weldSelect) weldSelect.value = "";
    
    if (!position) return;
    
    if (position.endsWith('F')) {
        if (weldSelect) weldSelect.style.display = 'none';
        if (weldStatic) {
            weldStatic.style.display = 'block';
            weldStatic.value = "FILETE";
        }
        document.getElementById('condition-filete').style.display = 'block';
    } else if (position.endsWith('G')) {
        if (weldSelect) weldSelect.style.display = 'block';
        if (weldStatic) weldStatic.style.display = 'none';
        if (weldSelect) {
            weldSelect.innerHTML = `
                <option value="">-- Seleccionar --</option>
                <option value="Ranura Bisel">Ranura Bisel</option>
                <option value="Tope">Tope (Square)</option>
            `;
        }
    }
};

window.updateConditionalFields = function() {
    const type = document.getElementById('weldingType')?.value;
    hideAllConditionalSections();
    
    if (type === 'Ranura Bisel') {
        document.getElementById('condition-bevel').style.display = 'block';
    } else if (type === 'Tope') {
        document.getElementById('condition-square').style.display = 'block';
    }
};

function hideAllConditionalSections() {
    ['condition-filete', 'condition-bevel', 'condition-square'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

// ============================================================================// 07. ✅ VALIDACIÓN DE CAMPOS (ACTUALIZADO)
// ============================================================================
window.validarYMostrarAnuncio = function(accionReal) {
    const hasError = validateRequiredFields();
    if (hasError) {
        scrollToFirstError();
        return;
    }
    
    const isPro = localStorage.getItem('wps_pro_active') === 'true';
    if (isPro) {
        accionReal();
        return;
    }
    
    // Aquí iría el intersticial de anuncios si lo activas
    accionReal();
};

function validateRequiredFields() {
    let hasError = false;
    clearAllErrors();
    
    const requiredFields = [
        { id: 'process', group: 'group-process' },
        { id: 'baseThickness', group: 'group-thickness' },
        { id: 'position', group: 'group-position' },
        { id: 'material', group: 'group-material' },
        { id: 'electrode', group: 'group-electrode' }, // ← NUEVO
        { id: 'diameter', group: 'group-diameter' }     // ← NUEVO
    ];
    
    requiredFields.forEach(field => {
        const el = document.getElementById(field.id);
        if (el && !el.value) {
            showError(field.group);
            hasError = true;
        }
    });
    
    // Validar tamaño si es filete
    const position = document.getElementById('position')?.value;
    if (position?.endsWith('F')) {
        const weldSize = document.getElementById('weldSize')?.value;
        if (!weldSize) {
            showError('group-weldsize');
            hasError = true;
        }
    }
        return hasError;
}

function showError(groupId) {
    const group = document.getElementById(groupId);
    if (group && !group.classList.contains('error')) {
        group.classList.add('error');
        if (!group.querySelector('.error-message')) {
            const msg = document.createElement('div');
            msg.className = 'error-message';
            msg.textContent = 'Campo obligatorio';
            group.appendChild(msg);
        }
    }
}

window.clearError = function(groupId) {
    const group = document.getElementById(groupId);
    if (group) {
        group.classList.remove('error');
        group.querySelector('.error-message')?.remove();
    }
};

function clearAllErrors() {
    document.querySelectorAll('.form-group.error').forEach(el => {
        el.classList.remove('error');
        el.querySelector('.error-message')?.remove();
    });
}

function scrollToFirstError() {
    document.querySelector('.form-group.error')?.scrollIntoView({ 
        behavior: 'smooth', block: 'center' 
    });
}

// ============================================================================
// 08. 🔒 VALIDACIONES PRO (ACTUALIZADAS)
// ============================================================================
window.checkProcessPro = function() {
    const process = document.getElementById('process')?.value;
    const isPro = localStorage.getItem('wps_pro_active') === 'true';
    
    if (process && !FREE_PROCESSES.includes(process) && !isPro) {
        checkProAccess('process');
        document.getElementById('process').value = '';
    }
};
window.checkMaterialPro = function() {
    const material = document.getElementById('material')?.value;
    const isPro = localStorage.getItem('wps_pro_active') === 'true';
    
    if (material && !FREE_MATERIALS.includes(material) && !isPro) {
        checkProAccess('material');
        document.getElementById('material').value = '';
    }
};

// ← NUEVO: Validar electrodo PRO
window.checkElectrodePro = function() {
    // Por ahora todos los electrodos son FREE, pero aquí puedes agregar lógica futura
    // Ej: si solo E71T-1M es FREE y E71T-11 es PRO
};

// ← NUEVO: Validar diámetro PRO
window.checkDiameterPro = function() {
    // Similar: puedes definir qué diámetros son FREE vs PRO
};

function checkProAccess(type) {
    const isPro = localStorage.getItem('wps_pro_active') === 'true';
    if (!isPro) {
        const modal = document.getElementById('proModal');
        const text = document.getElementById('modalText');
        const messages = {
            'process': 'Este proceso requiere <span class="modal-highlight">WPS PRO</span>',
            'material': 'Este material requiere <span class="modal-highlight">WPS PRO</span>',
            'electrode': 'Este electrodo requiere <span class="modal-highlight">WPS PRO</span>',
            'diameter': 'Este diámetro requiere <span class="modal-highlight">WPS PRO</span>'
        };
        text.innerHTML = messages[type] || messages['process'];
        modal.style.display = 'flex';
    }
}

window.goToActivation = function() {
    closeProModal();
    document.querySelector('.nav-tab:nth-child(2)')?.click();
};

window.closeProModal = function() {
    document.getElementById('proModal').style.display = 'none';
};

// ============================================================================
// 09. 💳 SIMULACIÓN DE PAGO (Sin cambios)
// ============================================================================
window.showSimulatePayment = function() {    const code = generateTestLicenseCode();
    document.getElementById('generated-code').textContent = code;
    document.getElementById('paymentModal').style.display = 'flex';
};

function generateTestLicenseCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let payload = '';
    for (let i = 0; i < 6; i++) payload += chars.charAt(Math.floor(Math.random() * chars.length));
    let checksum = 0;
    for (let i = 0; i < payload.length; i++) checksum += payload.charCodeAt(i);
    checksum = checksum % 10;
    return `WPS-PRO-${payload}-${checksum}`;
}

window.copyCode = function() {
    const code = document.getElementById('generated-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector('.copy-btn');
        const original = btn.textContent;
        btn.textContent = '✅ ¡Copiado!';
        setTimeout(() => btn.textContent = original, 2000);
    });
};

window.closePaymentModal = function() {
    document.getElementById('paymentModal').style.display = 'none';
};

// ============================================================================
// 10. 🔑 ACTIVACIÓN PRO (Sin cambios)
// ============================================================================
window.activatePro = async function() {
    const code = document.getElementById('license-code')?.value.trim();
    const status = document.getElementById('activation-status');
    
    if (!code) {
        status.innerHTML = '<div class="status-message error">⚠️ Ingresa un código</div>';
        return;
    }
    
    status.innerHTML = '<div class="status-message info">⏳ Validando...</div>';
    const result = await activatePro(code);
    
    status.innerHTML = `<div class="status-message ${result.success ? 'success' : 'error'}">${result.message}</div>`;
    
    if (result.success) {
        setTimeout(() => {
            status.innerHTML = '';
            document.getElementById('license-code').value = '';        }, 2000);
    }
};

window.deactivatePro = deactivatePro;
window.contactDeveloper = contactDeveloper;

// ============================================================================
// 11. 🔍 CÁLCULO Y RESULTADOS (ACTUALIZADO: async + nuevos campos)
// ============================================================================
window.mostrarResultados = async function() {
    // Recopilar datos (ahora incluye electrode y diameter)
    const data = {
        proceso: document.getElementById('process')?.value,
        posicion: document.getElementById('position')?.value,
        material: document.getElementById('material')?.value,
        espesor: parseFloat(document.getElementById('baseThickness')?.value) || 0,
        electrode: document.getElementById('electrode')?.value,      // ← NUEVO
        diameter: document.getElementById('diameter')?.value,        // ← NUEVO
        tipoJunta: document.getElementById('position')?.value.endsWith('F') ? 
                   'Filete' : document.getElementById('weldingType')?.value,
        tamanoSoldadura: document.getElementById('weldSize')?.value || '00',
        gap: document.getElementById('position')?.value.endsWith('F') ?
             document.getElementById('fileteGap')?.value :
             document.getElementById('gap')?.value || document.getElementById('squareGap')?.value || '0',
        angulo: document.getElementById('angle')?.value,
        tipoRanura: document.getElementById('grooveType')?.value,
        longitud: document.getElementById('weldLength')?.value
    };
    
    // Validación extra para nuevos campos
    if (!data.electrode || !data.diameter) {
        showWarning('Selecciona Electrodo y Diámetro para calcular');
        return;
    }
    
    try {
        // Calcular (ahora es async)
        const results = await calcularWPSCompleto(data);
        
        // Mostrar resultados
        displayResults(results, data);
        
        // Cambiar vista
        document.getElementById('form-screen').style.display = 'none';
        document.getElementById('result-screen').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Post-cálculo
        window.hasCalculated = true;        showFloatingButtons();
        saveToHistory(data);
        incrementCounter('calculate_clicks');
        
        // Anuncios post-cálculo (si es FREE)
        if (localStorage.getItem('wps_pro_active') !== 'true') {
            setTimeout(() => {
                if (typeof showPostCalculationAd === 'function') {
                    showPostCalculationAd();
                }
            }, 1500);
        }
        
    } catch (error) {
        console.error('❌ Error en cálculo:', error);
        showError('Ocurrió un error calculando. Verifica los datos seleccionados.');
    }
};

function displayResults(results, data) {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val || '-';
    };
    
    // Configuración básica
    set('res-wps-id', results.wpsCode || `WPS-${data.proceso}-${Date.now().toString(36).toUpperCase()}`);
    set('res-process', data.proceso);
    set('res-position', data.posicion);
    set('res-material', data.material);
    set('res-thickness', data.espesor + ' mm');
    set('res-weld-size', data.tamanoSoldadura + ' mm');
    set('res-weld-type', data.tipoJunta);
    set('res-gap', data.gap + ' mm');
    
    // Campos de ranura (condicionales)
    const showGroove = data.tipoJunta === 'Ranura Bisel';
    document.getElementById('box-groove')?.style.setProperty('display', showGroove ? 'block' : 'none');
    document.getElementById('box-rootface')?.style.setProperty('display', showGroove ? 'block' : 'none');
    document.getElementById('box-angle')?.style.setProperty('display', showGroove ? 'block' : 'none');
    
    set('res-groove', data.tipoRanura || '-');
    set('res-rootface', (document.getElementById('rootFace')?.value || '0') + ' mm');
    set('res-angle', results.anguloTotal || '-');
    
    // Parámetros eléctricos (manejar WFS vs Amperaje)
    const p = results.params;
    set('res-voltage', p.voltage ? `${p.voltage.min}-${p.voltage.max} V` : '-');
    
    if (p.wfs) {        set('res-wfs', `${p.wfs.min}-${p.wfs.max} in/min`);
        document.getElementById('res-amperage-row')?.style.setProperty('display', 'none');
        document.getElementById('res-wfs-row')?.style.setProperty('display', 'block');
    } else if (p.amperage) {
        set('res-amperage', `${p.amperage.min}-${p.amperage.max} A`);
        document.getElementById('res-wfs-row')?.style.setProperty('display', 'none');
        document.getElementById('res-amperage-row')?.style.setProperty('display', 'block');
    }
    
    set('res-travel', p.travelSpeed ? `${p.travelSpeed.min}-${p.travelSpeed.max} cm/min` : '-');
    set('res-current', p.current || (p.polarity || '-'));
    set('res-stickout', p.ctwd ? `${p.ctwd.min}-${p.ctwd.max} mm` : '-');
    
    // Técnicas & Preheat
    set('res-preheat', results.preheat || '-');
    
    if (results.heatInput) {
        const hi = typeof results.heatInput === 'object' ? 
            `Min: ${results.heatInput.min} | Max: ${results.heatInput.max}` : 
            `${results.heatInput} kJ/mm`;
        document.getElementById('res-heat-input').innerHTML = hi + (results.heatInput.warning || '');
    }
    
    set('res-transfer', 'Cortocircuito / Spray');
    set('res-work-angle', '90°');
    set('res-travel-angle', '10°-15° (Empuje)');
    
    // Consumibles (usar datos reales del resultado)
    set('res-electrode', results.electrode || 'ER70S-6');
    set('res-diameter', data.diameter + ' mm');
    set('res-class', results.awsSpec || 'AWS A5.18');
    set('res-gas-type', results.shielding?.includes('Ar') ? 'Mezcla' : (results.shielding || '-'));
    set('res-gas-mix', results.shielding || '-');
    set('res-flow', '35-45 CFH');
    
    // Consumo estimado
    const showCons = document.getElementById('showConsumption')?.checked;
    if (showCons && results.consumos) {
        document.getElementById('consumption-section').style.display = 'block';
        set('res-wire-cons', `~${results.consumos.wire?.total || 0} kg`);
        set('res-gas-cons', `~${results.consumos.gas?.total || 0} L`);
    } else {
        document.getElementById('consumption-section').style.display = 'none';
    }
    
    // Notas técnicas
    if (results.notes?.length) {
        document.getElementById('tech-note').innerHTML = results.notes.map(n => `• ${n}`).join('<br>');
        document.getElementById('tech-note').style.display = 'block';
    }}

window.volverFormulario = function() {
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('form-screen').style.display = 'block';
    clearAllErrors();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ============================================================================
// 12. 📤 EXPORTACIÓN A PDF (Sin cambios)
// ============================================================================
window.exportarPDF = function() {
    const wpsCode = document.getElementById('res-wps-id')?.textContent || 'WPS-Documento';
    const originalTitle = document.title;
    document.title = wpsCode.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
    window.print();
    document.title = originalTitle;
    incrementCounter('successful_exports');
};

// ============================================================================
// 13. 🔧 UTILIDADES (Sin cambios)
// ============================================================================
window.validateFileteGap = function() {
    const gap = parseFloat(document.getElementById('fileteGap')?.value);
    const warning = document.getElementById('gapWarning');
    const input = document.getElementById('fileteGap');
    
    if (!isNaN(gap) && gap > 5) {
        warning?.style.setProperty('display', 'block');
        input?.classList.add('warning-input');
    } else {
        warning?.style.setProperty('display', 'none');
        input?.classList.remove('warning-input');
    }
};

window.toggleConsumptionFields = function() {
    const show = document.getElementById('showConsumption')?.checked;
    document.getElementById('consumptionInputs').style.display = show ? 'block' : 'none';
};

// ============================================================================
// 14. 📜 HISTORIAL LOCAL (Sin cambios)
// ============================================================================
function saveToHistory(data) {
    let h = JSON.parse(localStorage.getItem('wps_calc_history') || '[]');
    h.unshift({ ...data, date: new Date().toLocaleString('es-ES') });
    if (h.length > 5) h.pop();    localStorage.setItem('wps_calc_history', JSON.stringify(h));
}

window.loadHistory = function() {
    const h = JSON.parse(localStorage.getItem('wps_calc_history') || '[]');
    const list = document.getElementById('history-list');
    if (!list) return;
    
    list.innerHTML = h.length === 0 ? 
        '<p style="text-align:center;color:var(--muted);padding:20px;">📭 Sin cálculos recientes</p>' :
        h.map((x, i) => `
            <div class="history-item" onclick="applyHistory(${i})">
                <span>${x.wpsCode || 'WPS'} - ${x.material} ${x.espesor}mm</span>
                <small>${x.date}</small>
            </div>
        `).join('');
    
    document.getElementById('history-modal').style.display = 'flex';
};

window.applyHistory = function(i) {
    const h = JSON.parse(localStorage.getItem('wps_calc_history') || '[]')[i];
    if (!h) return;
    
    // Restaurar valores básicos
    ['process', 'baseThickness', 'position', 'material'].forEach(field => {
        if (document.getElementById(field) && h[field]) {
            document.getElementById(field).value = h[field];
        }
    });
    
    updateFormLogic();
    closeModal('history-modal');
    mostrarResultados();
};

// ============================================================================
// 15. ☕ BOTONES FLOTANTES (Sin cambios)
// ============================================================================
function showFloatingButtons() {
    document.getElementById('coffee-btn')?.classList.add('visible');
    document.getElementById('community-float-btn')?.classList.add('visible');
}

window.openCoffeeModal = function() { 
    incrementCounter('coffee_clicks'); 
    document.getElementById('coffee-modal').style.display = 'flex'; 
};

// ============================================================================// 16. 🔧 MODALES & HELPERS (Sin cambios)
// ============================================================================
window.closeModal = function(id) { 
    document.getElementById(id).style.display = 'none'; 
};
window.closeLogoutModal = () => closeModal('logoutModal');
window.confirmLogout = function() { 
    closeModal('logoutModal'); 
    deactivatePro(); 
    location.reload(); 
};

// ============================================================================
// 17. 📊 ANALYTICS FIREBASE (Sin cambios)
// ============================================================================
import { db, doc, setDoc, getDoc } from './firebase-config.js';

async function incrementCounter(key) {
    if (!navigator.onLine) return;
    try {
        const ref = doc(db, 'analytics', 'global_stats');
        const snap = await getDoc(ref);
        let cur = snap.exists() ? snap.data()[key] || 0 : 0;
        await setDoc(ref, { [key]: cur + 1, lastUpdated: new Date().toISOString() }, { merge: true });
    } catch (e) { console.warn('⚠️ Contador offline:', e); }
}

function trackNewDevice() {
    if (!localStorage.getItem('wps_first_visit')) {
        localStorage.setItem('wps_first_visit', 'true');
        incrementCounter('new_devices');
    }
}
