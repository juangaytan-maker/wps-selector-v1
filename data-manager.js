/**
 * 📦 WPS DATA MANAGER - v4.2
 * Encargado de cargar y organizar todos los datos de ingeniería (JSONs)
 */

export const DataManager = {
    // Estado interno para almacenar los datos
    _state: {
        processes: {},
        materials: {},
        config: {
            awsLimits: null,
            positionFactors: null
        },
        loaded: false,
        loading: false
    },

    /**
     * Inicializa y carga todos los datos.
     * Debe llamarse una sola vez al iniciar la app.
     */
    async init() {
        if (this._state.loaded) {
            console.log('📦 Datos ya cargados.');
            return this._state;
        }
        if (this._state.loading) return null;
        
        this._state.loading = true;
        console.log('🚀 Iniciando carga de datos de ingeniería...');

        try {
            // 1. Definir las rutas de los archivos según la estructura acordada
            const FILES = {
                // Procesos
                fcaw: 'data/processes/FCAW.json',
                smaw: 'data/processes/SMAW.json',
                gtaw: 'data/processes/GTAW.json',
                saw: 'data/processes/SAW.json',
                // Materiales
                materials: 'data/materials/carbon-steels.json',
                // Configuración
                awsLimits: 'data/config/aws-limits.json',
                positionFactors: 'data/config/position-factors.json'
            };

            // 2. Cargar todas las promesas en paralelo para mayor velocidad
            const [fcaw, smaw, gtaw, saw, materialsData, limitsData, posFactorsData] = await Promise.all([
                fetch(FILES.fcaw).then(r => r.json()),                fetch(FILES.smaw).then(r => r.json()),
                fetch(FILES.gtaw).then(r => r.json()),
                fetch(FILES.saw).then(r => r.json()),
                fetch(FILES.materials).then(r => r.json()),
                fetch(FILES.awsLimits).then(r => r.json()),
                fetch(FILES.positionFactors).then(r => r.json())
            ]);

            // 3. Procesar y organizar los datos
            // Guardamos cada proceso en un diccionario fácil de buscar por nombre (ej: DataManager.getProcess('FCAW'))
            this._state.processes = {
                'FCAW': fcaw,
                'SMAW': smaw,
                'GTAW': gtaw,
                'SAW': saw
                // Aquí agregaremos GMAW cuando tengas el JSON
            };

            // Los materiales ya vienen en un objeto {"A36": {...}, "A572": {...}}, así que los guardamos directo
            this._state.materials = materialsData.materials;

            // Guardamos configuración
            this._state.config.awsLimits = limitsData;
            this._state.config.positionFactors = posFactorsData.positions;

            // 4. Marcar como cargado
            this._state.loaded = true;
            this._state.loading = false;

            // Exponer datos globales para acceso fácil desde app.js (opcional pero útil)
            window.WPS_DATA = this._state;

            console.log('✅ Datos de ingeniería cargados exitosamente.');
            return this._state;

        } catch (error) {
            console.error('❌ Error fatal al cargar datos:', error);
            this._state.loading = false;
            throw error;
        }
    },

    /**
     * Helper para obtener datos de un proceso específico
     * @param {string} processCode - Ej: 'FCAW', 'SMAW'
     */
    getProcess(processCode) {
        return this._state.processes[processCode.toUpperCase()] || null;
    },
    /**
     * Helper para obtener datos de un material específico
     * @param {string} materialCode - Ej: 'A36', 'A572-50'
     */
    getMaterial(materialCode) {
        return this._state.materials[materialCode] || null;
    },

    /**
     * Helper para obtener los factores de una posición específica
     * @param {string} positionCode - Ej: '3G', '1F'
     */
    getPositionFactor(positionCode) {
        return this._state.config.positionFactors[positionCode] || null;
    }
};
