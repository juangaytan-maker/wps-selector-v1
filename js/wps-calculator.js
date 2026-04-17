/* ============================================================================
   🧠 WPS CALCULATOR ENGINE - v4.2 (DATA DRIVEN)
   ============================================================================
   Descripción: Motor de cálculo que usa los datos de DataManager (JSONs)
   ============================================================================ */

import { DataManager } from './data-manager.js';

/**
 * Función Principal: Calcula todos los parámetros WPS
 * @param {Object} data - Datos del formulario (proceso, material, posicion, etc.)
 */
export async function calcularWPSCompleto(data) {
    try {
        // 1. Asegurar que los datos estén cargados
        if (!DataManager._state.loaded) {
            await DataManager.init();
        }

        // 2. Obtener datos base de los JSONs
        const process = DataManager.getProcess(data.proceso);
        const material = DataManager.getMaterial(data.material);
        const position = DataManager.getPositionFactor(data.posicion);

        if (!process) throw new Error(`Proceso ${data.proceso} no encontrado.`);
        if (!material) throw new Error(`Material ${data.material} no encontrado.`);
        if (!position) throw new Error(`Posición ${data.posicion} no encontrada.`);

        // 3. Buscar el electrodo y diámetro específicos
        const electrodeData = process.electrodes.find(e => e.classification.trim() === data.electrode);
        if (!electrodeData) throw new Error(`Electrodo ${data.electrode} no válido para este proceso.`);

        // El diámetro en el JSON puede ser string ("1/8" o "1.2")
        const diameterKey = data.diameter.toString().trim();
        const diameterData = electrodeData.diameters_mm[diameterKey];
        if (!diameterData) throw new Error(`Diámetro ${data.diameter} no disponible para este electrodo.`);

        // 4. Validar Espesor Base vs Rango del Electrodo
        const userThickness = parseFloat(data.espesor);
        const [minT, maxT] = diameterData.thickness_range_mm;
        if (userThickness < minT || userThickness > maxT) {
            console.warn(`⚠️ El espesor ${userThickness}mm está fuera del rango óptimo (${minT}-${maxT}mm) para Ø${data.diameter}.`);
            // No lanzamos error fatal, solo advertencia, para permitir ajustes manuales si es necesario
        }

        // 5. Aplicar Factores de Posición
        // Convertimos posición de "1F" a clave de posición (manejada en position-factors.json)
        // Nota: position.factors en el JSON ya tiene los multiplicadores
        const factors = position.factors;
        // Helper para aplicar factor
        const applyFactor = (baseVal, factorType) => Math.round(baseVal * (factors[factorType] || 1));

        // 6. Calcular Rangos Finales (Voltaje, WFS/Amperaje, Travel)
        let resultParams = {
            voltage: {
                min: applyFactor(diameterData.voltage.min, 'voltage'),
                max: applyFactor(diameterData.voltage.max, 'voltage')
            }
        };

        // Lógica condicional: WFS (FCAW/GMAW/SAW) vs Amperaje (SMAW/GTAW)
        if (diameterData.wfs_ipm) {
            resultParams.wfs = {
                min: applyFactor(diameterData.wfs_ipm.min, 'wfs'),
                max: applyFactor(diameterData.wfs_ipm.max, 'wfs')
            };
        } else if (diameterData.amperage) {
            resultParams.amperage = {
                min: applyFactor(diameterData.amperage.min, 'amperage'),
                max: applyFactor(diameterData.amperage.max, 'amperage')
            };
        }

        resultParams.travelSpeed = {
            min: applyFactor(diameterData.travel_speed_ipm.min, 'travel'),
            max: applyFactor(diameterData.travel_speed_ipm.max, 'travel')
        };

        resultParams.ctwd = {
            min: diameterData.ctwd_mm.min,
            max: diameterData.ctwd_mm.max
        };

        // 7. Calcular Heat Input (Entrada de Calor)
        // Fórmula: (Volts * Amps * 60) / (Travel_Speed_mm_min * 1000) * Efficiency
        // Convertimos Travel de IPM a mm/min (x 25.4)
        const travelSpeedMM = resultParams.travelSpeed.max * 25.4; 
        const avgVoltage = (resultParams.voltage.min + resultParams.voltage.max) / 2;
        
        // Estimación de Amperaje medio basado en el punto medio del rango para el cálculo
        const avgAmp = resultParams.amperage ? 
            (resultParams.amperage.min + resultParams.amperage.max) / 2 : 
            (resultParams.wfs ? (resultParams.wfs.min * 0.5) : 0); // Fallback aprox si no hay amps

        const heatInput = (avgVoltage * avgAmp * 60) / (travelSpeedMM * 1000) * process.efficiency;

        // 8. Preparar Recomendaciones de Precalentamiento e Interpass
        const preheatRec = material.min_preheat_c;
        const interpassMax = material.max_interpass_c;
        // 9. Retornar Objeto Completo
        return {
            processName: process.name_es,
            awsSpec: process.aws_spec,
            electrode: electrodeData.classification.trim(),
            polarity: electrodeData.polarity,
            shielding: electrodeData.shielding,
            thicknessRange: diameterData.thickness_range_mm,
            params: resultParams,
            heatInput: parseFloat(heatInput.toFixed(2)),
            preheat: `${preheatRec}°C (Mín. recomendado)`,
            interpass: `Máx. ${interpassMax}°C`,
            efficiency: process.efficiency,
            notes: process.aws_notes,
            materialNotes: material.notes
        };

    } catch (error) {
        console.error('❌ Error en Calculadora WPS:', error);
        throw error;
    }
}
