/**
 * 🔑 PRO SYSTEM & LICENSE VALIDATION
 * 
 * Este archivo maneja:
 * 1. Generación de ID único del dispositivo.
 * 2. Validación de licencias contra Firebase Firestore.
 * 3. Actualización de la interfaz (UI) al activar PRO.
 * 4. Lógica para contactar al desarrollador.
 */

import { db, doc, getDoc, updateDoc } from './firebase-config.js';

// =========================================
// 📱 IDENTIFICACIÓN DEL DISPOSITIVO
// =========================================

function getDeviceId() {
    let deviceId = localStorage.getItem('wps_device_id');
    if (!deviceId) {
        deviceId = 'DEV-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        localStorage.setItem('wps_device_id', deviceId);
    }
    return deviceId;
}

// =========================================
// 🔄 ESTADO DE LA APLICACIÓN
// =========================================

let isProUser = localStorage.getItem('wps_pro_active') === 'true';

// =========================================
// 🎨 ACTUALIZACIÓN DE INTERFAZ (UI)
// =========================================

export function updateProUI() {
    const headerBadge = document.getElementById('header-badge');
    const resultBadge = document.getElementById('res-badge');
    const proNotActiveDiv = document.getElementById('pro-not-active');
    const proActiveDiv = document.getElementById('pro-active');
    const activeCodeDisplay = document.getElementById('active-license-code');
    const activationCard = document.getElementById('activation-card');
    const deviceDisplay = document.getElementById('user-device-id');
    
    if (deviceDisplay) {
        deviceDisplay.textContent = getDeviceId();
    }

    if (isProUser) {
        if (headerBadge) { headerBadge.textContent = 'PRO'; headerBadge.style.color = 'var(--warning)'; }
        if (resultBadge) { resultBadge.textContent = 'PRO'; resultBadge.classList.add('pro'); }
        if (proNotActiveDiv) proNotActiveDiv.style.display = 'none';
        if (proActiveDiv) proActiveDiv.style.display = 'block';
        if (activationCard) activationCard.classList.add('pro-active');
        const savedCode = localStorage.getItem('wps_license_code');
        if (activeCodeDisplay && savedCode) activeCodeDisplay.textContent = savedCode;
        const ads = document.querySelectorAll('.ad-container, .ad-overlay');
        ads.forEach(ad => ad.style.display = 'none');
    } else {
        if (headerBadge) { headerBadge.textContent = 'FREE'; headerBadge.style.color = 'var(--success)'; }
        if (resultBadge) { resultBadge.textContent = 'AWS D1.1'; resultBadge.classList.remove('pro'); }
        if (proNotActiveDiv) proNotActiveDiv.style.display = 'block';
        if (proActiveDiv) proActiveDiv.style.display = 'none';
        if (activationCard) activationCard.classList.remove('pro-active');
    }
}

// =========================================
// 🔑 CLAVE MAESTRA (PARA TI)
// =========================================
const MASTER_KEY = "GTN-MASTER-1306-90"; // 🔐 Cambia esto por tu clave secreta

// =========================================
// ✅ VALIDACIÓN DE LICENCIA
// =========================================

export async function activatePro(licenseCode) {
    if (!licenseCode) return { success: false, message: 'Ingresa un código.' };

    const cleanCode = licenseCode.trim().toUpperCase();
    
    // 🚀 LÓGICA DE CLAVE MAESTRA (Prioridad máxima)
    if (cleanCode === MASTER_KEY) {
        console.log("🔑 ¡Clave Maestra Detectada!");
        localStorage.setItem('wps_pro_active', 'true');
        localStorage.setItem('wps_license_code', cleanCode);
        isProUser = true;
        updateProUI();
        return { success: true, message: '👑 ¡Bienvenido, Administrador!' };
    }

    // 🔥 Validación normal con Firebase (para usuarios reales)
    const currentDevice = getDeviceId();

    try {
        const docRef = doc(db, 'licenses', cleanCode);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return { success: false, message: '❌ Código no encontrado. Contacta al desarrollador.' };
        }

        const data = docSnap.data();

        if (data.status !== 'active') {
            return { success: false, message: '❌ Esta licencia está inactiva o caducada.' };
        }

        if (data.assignedDeviceId && data.assignedDeviceId !== currentDevice) {
            return { success: false, message: '❌ Esta licencia ya está activada en otro dispositivo.' };
        }

        if (!data.assignedDeviceId) {
            await updateDoc(docRef, { assignedDeviceId: currentDevice });
        }

        localStorage.setItem('wps_pro_active', 'true');
        localStorage.setItem('wps_license_code', cleanCode);
        isProUser = true;
        updateProUI();

        return { success: true, message: '✅ ¡Bienvenido a WPS PRO!' };

    } catch (error) {
        console.error('Error activando PRO:', error);
        return { success: false, message: '❌ Error de conexión. Verifica tu internet.' };
    }
}

// =========================================
// 🔓 DESACTIVAR / CERRAR SESIÓN
// =========================================

export function deactivatePro() {
    // Mostrar el modal personalizado en lugar de confirm()
    document.getElementById('logoutModal').style.display = 'flex';
}

// Función para confirmar el cierre de sesión
export function confirmLogout() {
    closeLogoutModal();
    localStorage.removeItem('wps_pro_active');
    localStorage.removeItem('wps_license_code');
    isProUser = false;
    updateProUI();
    location.reload();
}

// Función para cerrar el modal
export function closeLogoutModal() {
    document.getElementById('logoutModal').style.display = 'none';
}

// Hacerlas globales para que funcionen desde HTML
window.confirmLogout = confirmLogout;
window.closeLogoutModal = closeLogoutModal;

// =========================================
// 📞 CONTACTAR DESARROLLADOR
// =========================================

export function contactDeveloper() {
    const deviceId = getDeviceId();
    const message = encodeURIComponent(`Hola, quiero activar WPS PRO. Mi ID de dispositivo es: ${deviceId}`);
    const whatsappNumber = '528141434957'; // ⚠️ TU NÚMERO REAL AQUÍ
    
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
}

// =========================================
// 🚀 INICIALIZACIÓN
// =========================================

export function initProSystem() {
    updateProUI();
}