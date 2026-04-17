/* ============================================================================
   📊 WPS DATA MANAGER - v4.2
   ============================================================================
   Descripción: Carga y organiza todos los archivos JSON (Procesos, Materiales, Límites)
   ============================================================================ */

export const WPSData = {
    processes: {},
    materials: null,
    limits: null,
    positionFactors: null,
    loaded: false,

    // Función principal para cargar datos
    async load() {
        if (this.loaded) return; // Si ya cargó, no recargar

        console.log('📦 Cargando datos de ingeniería desde JSON...');

        try {
            // Carga en paralelo de todos los archivos
            const [fcaw, gtaw, saw, smaw, carbonSteels, limits, posFactors] = await Promise.all([
                fetch('data/FCAW.json').then(res => res.json()),
                fetch('data/GTAW.json').then(res => res.json()),
                fetch('data/SAW.json').then(res => res.json()),
                fetch('data/SMAW.json').then(res => res.json()),
                fetch('data/carbon-steels.json').then(res => res.json()),
                fetch('data/aws-limits.json').then(res => res.json()),
                fetch('data/position-factors.json').then(res => res.json())
            ]);

            // Almacenamos los procesos en un objeto fácil de buscar por nombre
            this.processes = {
                'FCAW': fcaw,
                'GTAW': gtaw,
                'SAW': saw,
                'SMAW': smaw
                // Aquí agregaremos GMAW cuando tengas el JSON
            };

            // Extraemos solo la sección de materiales
            this.materials = carbonSteels.materials; 
            
            // Guardamos límites y factores completos
            this.limits = limits;
            this.positionFactors = posFactors.positions;

            this.loaded = true;
            console.log('✅ Datos de ingeniería cargados correctamente');
            
        } catch (error) {
            console.error('❌ Error cargando datos JSON:', error);
            throw error;
        }
    },

    // Helpers para acceso rápido desde otros archivos
    getProcess(processCode) {
        return this.processes[processCode];
    },

    getMaterial(materialCode) {
        return this.materials[materialCode];
    },

    getLimits() {
        return this.limits;
    }
};
