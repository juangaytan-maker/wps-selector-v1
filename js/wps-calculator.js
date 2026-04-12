/**
 * 🔧 WPS CALCULATOR
 * 
 * Lógica de cálculos técnicos para soldadura GMAW según AWS D1.1
 * Incluye: precalentamiento, heat input, consumos, parámetros eléctricos
 */

// =========================================
// 📚 BASE DE CONOCIMIENTO - MATERIALES
// =========================================

const MATERIALS_DB = {
    // Aceros al carbono (FREE)
    'A36': { category: 'Mild Steel', minPreheat: 10 },
    'A500': { category: 'Mild Steel', minPreheat: 10 },
    'A516-70': { category: 'Mild Steel', minPreheat: 10 },
    'A53': { category: 'Mild Steel', minPreheat: 10 },
    
    // HSLA (PRO)
    'A514/T1': { category: 'HSLA', minPreheat: 20, maxInterpass: 200 },
    'A572-50': { category: 'HSLA', minPreheat: 20 },
    'A588': { category: 'HSLA', minPreheat: 20 },
    
    // Hardox (PRO)
    'Hardox400': { category: 'Hardox', maxTemp: 225 },
    'Hardox450': { category: 'Hardox', maxTemp: 225 },
    'Hardox500': { category: 'Hardox', maxTemp: 225 },
    'Hardox600': { category: 'Hardox', maxTemp: 225 },
    
    // Hardfacing (PRO)
    'Hadfield': { category: 'Hardfacing', special: 'manganese' },
    'AISI-1045-1060': { category: 'Hardfacing', type: 'high-carbon' },
    'Fundicion': { category: 'Hardfacing', type: 'cast-iron' },
    'D2-H13': { category: 'Hardfacing', type: 'tool-steel' }
};

// =========================================
// 🌡️ CÁLCULO DE PRECALENTAMIENTO
// =========================================

export function calcularPrecalentamiento(material, espesor) {
    if (!material || !espesor) return 'N/A';
    
    const matData = MATERIALS_DB[material];
    if (!matData) return 'Consultar WPS';
    
    const cat = matData.category;
    let temp = '10°C';
    
    switch(cat) {
        case 'Mild Steel':
            if (espesor <= 19) temp = '10°C (Cortesía)';
            else if (espesor <= 38) temp = '65°C';
            else if (espesor <= 63) temp = '110°C';
            else temp = '150°C';
            break;
            
        case 'HSLA':
            if (espesor <= 20) temp = '20-50°C';
            else if (espesor <= 40) temp = '80-110°C';
            else if (espesor <= 65) temp = '120-150°C';
            else temp = '175-230°C';
            break;
            
        case 'Hardox':
            if (material === 'Hardox400') {
                temp = espesor > 40 ? '75-100°C' : '10°C (Mínimo)';
            } else if (material === 'Hardox450') {
                temp = espesor > 30 ? '75-100°C' : '10°C (Mínimo)';
            } else if (material === 'Hardox500') {
                temp = espesor > 20 ? '150°C' : '100°C';
            } else if (material === 'Hardox600') {
                temp = '200°C';
            }
            break;
            
        case 'Hardfacing':
            if (matData.special === 'manganese') {
                temp = 'NINGUNO (Máx 260°C)';
            } else if (matData.type === 'high-carbon') {
                temp = '150-260°C';
            } else if (matData.type === 'tool-steel') {
                temp = '315-540°C';
            } else if (matData.type === 'cast-iron') {
                temp = '200-315°C';
            } else {
                temp = '150-200°C';
            }
            break;
    }
    
    return temp;
}

// =========================================
// 📝 NOTAS TÉCNICAS POR MATERIAL
// =========================================

export function getTechNote(material) {
    if (!material) return '';
    
    const matData = MATERIALS_DB[material];
    if (!matData) return '💡 <strong>Nota:</strong> Consultar especificaciones del material.';
    
    switch(material) {
        case 'Hadfield':
            return '⚠️ <strong>Manganeso (Hadfield):</strong> NO precalentar. Mantener temperatura interpaso <260°C. Usar pasadas cortas y enfriamiento entre pasadas.';
        
        case 'A514/T1':
            return '⚠️ <strong>A514/T1:</strong> Temperatura interpaso MÁX 200°C. Evitar sobrecalentamiento de la ZAC. Control estricto de heat input.';
        
        case 'Hardox400':
        case 'Hardox450':
        case 'Hardox500':
        case 'Hardox600':
            return '⚠️ <strong>Hardox:</strong> Temperatura máxima de trabajo 225°C. Usar lápices térmicos o pirómetro. Evitar fuentes de hidrógeno. Enfriamiento controlado.';
        
        case 'D2-H13':
            return '⚠️ <strong>Acero de Herramientas:</strong> Precalentamiento crítico. Mantener temperatura interpaso. Enfriamiento muy lento post-soldadura.';
        
        default:
            return '💡 <strong>Nota:</strong> Si hay humedad ambiental o frío extremo, aplicar calentamiento de cortesía ≥40°C antes de soldar.';
    }
}

// =========================================
// ⚡ PARÁMETROS ELÉCTRICOS RECOMENDADOS
// =========================================

export function getElectricalParams(posicion, espesor, proceso = 'GMAW') {
    // Valores base para GMAW con alambre 0.045" (1.2mm)
    let params = {
        voltage: { min: 28, max: 31 },
        amperage: { min: 270, max: 320 },
        wfs: { min: 380, max: 450 }, // in/min
        travelSpeed: { min: 25, max: 30 }, // cm/min
        stickOut: { min: 12, max: 15 }, // mm
        current: 'DCEP'
    };
    
    // Ajuste por posición
    if (posicion.includes('4')) { // Sobre cabeza (4F, 4G)
        params.voltage = { min: 26, max: 29 };
        params.amperage = { min: 240, max: 280 };
        params.travelSpeed = { min: 20, max: 25 };
    }
    
    // Ajuste por espesor
    if (espesor > 20) {
        params.amperage = { min: 300, max: 350 };
        params.wfs = { min: 420, max: 500 };
    }
    
    return params;
}

// =========================================
// 🔥 CÁLCULO DE HEAT INPUT (APORTE TÉRMICO)
// =========================================

export function calcularHeatInput(voltage, amperage, travelSpeed) {
    // Fórmula: HI (kJ/mm) = (V × A × 60) / (Travel mm/min × 1000)
    // travelSpeed viene en cm/min, convertir a mm/min: × 10
    
    const travelMmMin = travelSpeed * 10;
    const heatInput = (voltage * amperage * 60) / (travelMmMin * 1000);
    
    return heatInput.toFixed(2); // kJ/mm
}

export function getHeatInputRange(params, material) {
    const hiMin = calcularHeatInput(params.voltage.min, params.amperage.min, params.travelSpeed.max);
    const hiMax = calcularHeatInput(params.voltage.max, params.amperage.max, params.travelSpeed.min);
    
    let warning = '';
    
    // Verificar límites según material
    if (material && MATERIALS_DB[material]) {
        const matData = MATERIALS_DB[material];
        
        if (matData.category === 'Hardox' || material === 'A514/T1') {
            const maxHI = material === 'A514/T1' ? 2.5 : 2.0;
            if (parseFloat(hiMax) > maxHI) {
                warning = '<span class="heat-warning">⚠️ NO exceder ' + maxHI + ' kJ/mm para preservar dureza del material.</span>';
            }
        }
    }
    
    return {
        min: hiMin,
        max: hiMax,
        warning: warning
    };
}

// =========================================
// 📊 CÁLCULO DE CONSUMOS
// =========================================

export function calcularConsumos(tamanoSoldadura, travelSpeed, longitud, proceso = 'GMAW') {
    // Densidad del acero: 7.85 g/cm³
    const density = 7.85;
    
    // Eficiencia de depósito GMAW: ~95%
    const efficiency = 0.95;
    
    // Área de garganta para filete (triángulo isósceles)
    // Area = (leg × leg) / 2
    const areaMm2 = (tamanoSoldadura * tamanoSoldadura) / 2;
    
    // Consumo de alambre por metro (kg/m)
    // (Area mm² × density g/cm³) / (1000 mm³/cm³ × 1000 g/kg × efficiency)
    const wirePerMeter = (areaMm2 * density) / (1000 * efficiency);
    
    // Consumo de gas
    // Caudal típico: 40 L/min (15-20 CFH)
    const flowRate = 40; // L/min
    
    // Travel speed en m/min (viene en cm/min)
    const travelMperMin = travelSpeed / 100;
    
    // Gas por metro = Flow Rate / Travel Speed
    const gasPerMeter = flowRate / travelMperMin;
    
    // Totales para la longitud solicitada
    const totalWire = wirePerMeter * longitud;
    const totalGas = gasPerMeter * longitud;
    
    return {
        wire: {
            perMeter: wirePerMeter.toFixed(3),
            total: totalWire.toFixed(2),
            unit: 'kg'
        },
        gas: {
            perMeter: gasPerMeter.toFixed(1),
            total: totalGas.toFixed(1),
            unit: 'L',
            flowRate: flowRate
        }
    };
}

// =========================================
// 📏 CÁLCULO DE ÁNGULO DE BISEL
// =========================================

export function calcularAnguloTotal(anguloPorPlaca, tipoRanura) {
    if (!anguloPorPlaca) return '0°';
    
    // Sencillo = 1 placa biselada
    // V, U, J = 2 placas biseladas (doble bisel)
    const multiplicador = tipoRanura === 'Sencillo' ? 1 : 2;
    
    return (anguloPorPlaca * multiplicador) + '°';
}

// =========================================
// 🔍 PENETRACIÓN MÍNIMA REQUERIDA
// =========================================

export function getPenetracionMinima(tipoJunta, proceso) {
    if (tipoJunta === 'Filete') {
        // Según AWS D1.1 para calificación de soldadores
        if (proceso === 'GMAW') return '1.5 mm';
        if (proceso === 'FCAW') return '0.5 mm';
        return 'Consultar WPS';
    }
    
    // Para ranuras (groove welds)
    return '100% (CJP)';
}

// =========================================
// 🎯 GENERACIÓN DE CÓDIGO WPS
// =========================================

export function generarWPSCode(posicion, tamanoSoldadura, proceso) {
    // Formato: WPS-POS-TAM-PROC
    // Ej: WPS-2F-08-GMAW
    
    const sizeFormatted = tamanoSoldadura.toString().padStart(2, '0');
    
    return `WPS-${posicion}-${sizeFormatted}-${proceso}`;
}

// =========================================
// 📋 RESUMEN DE CÁLCULOS
// =========================================

export function calcularWPSCompleto(datos) {
    const {
        proceso,
        posicion,
        material,
        espesor,
        tipoJunta,
        tamanoSoldadura,
        gap,
        angulo,
        tipoRanura,
        longitud
    } = datos;
    
    // 1. Parámetros eléctricos
    const params = getElectricalParams(posicion, espesor, proceso);
    
    // 2. Precalentamiento
    const preheat = calcularPrecalentamiento(material, espesor);
    
    // 3. Heat Input
    const heatInput = getHeatInputRange(params, material);
    
    // 4. Consumos (si aplica)
    let consumos = null;
    if (longitud && tamanoSoldadura && tipoJunta === 'Filete') {
        consumos = calcularConsumos(
            parseFloat(tamanoSoldadura),
            params.travelSpeed.min,
            parseFloat(longitud),
            proceso
        );
    }
    
    // 5. Ángulo total (si es ranura)
    let anguloTotal = '-';
    if (tipoJunta === 'Ranura Bisel' && angulo) {
        anguloTotal = calcularAnguloTotal(parseFloat(angulo), tipoRanura);
    }
    
    // 6. Penetración mínima
    const penMinima = getPenetracionMinima(tipoJunta, proceso);
    
    // 7. Código WPS
    const wpsCode = generarWPSCode(posicion, tamanoSoldadura || '00', proceso);
    
    // 8. Nota técnica
    const techNote = getTechNote(material);
    
    return {
        wpsCode,
        params,
        preheat,
        heatInput,
        consumos,
        anguloTotal,
        penMinima,
        techNote,
        gap: gap || '0',
        tipoJunta
    };
}

// Exportar todo
export default {
    calcularPrecalentamiento,
    getTechNote,
    getElectricalParams,
    calcularHeatInput,
    getHeatInputRange,
    calcularConsumos,
    calcularAnguloTotal,
    getPenetracionMinima,
    generarWPSCode,
    calcularWPSCompleto,
    MATERIALS_DB
};