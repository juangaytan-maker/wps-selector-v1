/**
 * 🛠️ ADMIN PANEL LOGIC (CORREGIDO)
 * 
 * Cambios clave:
 * - Ahora usa setDoc para que el ID del documento sea el código de licencia.
 * - Agregado botón para eliminar licencias permanentemente.
 */

import { db, collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, setDoc } from './firebase-config.js';

const ADMIN_PASSWORD = "Dan1&diego"; // Tu contraseña de admin

// =========================================
// 🔔 SISTEMA DE NOTIFICACIONES (TOAST)
// =========================================

function showToast(message, title = '', type = 'success', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function showConfirmModal(message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="border: 2px solid var(--error); max-width: 350px;">
            <div class="modal-icon" style="font-size: 3rem;">⚠️</div>
            <div class="modal-title" style="color: var(--error);">Confirmar Acción</div>
            <div class="modal-text">${message}</div>
            <div class="modal-buttons">
                <button class="btn btn-danger" id="confirm-yes">Aceptar</button>
                <button class="btn btn-cancel" id="confirm-no">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('confirm-yes').onclick = () => {
        modal.remove();
        if (onConfirm) onConfirm();
    };
    
    document.getElementById('confirm-no').onclick = () => {
        modal.remove();
    };
}

// =========================================
// 🔑 AUTENTICACIÓN
// =========================================

window.verifyAdmin = function() {
    const input = document.getElementById('admin-password');
    const errorMsg = document.getElementById('login-error');
    
    if (input.value === ADMIN_PASSWORD) {
        localStorage.setItem('wps_admin_logged', 'true');
        showDashboard();
    } else {
        showToast('Verifica la contraseña', '❌ Acceso Denegado', 'error', 4000);
        errorMsg.textContent = '❌ Contraseña incorrecta';
        errorMsg.style.display = 'block';
        input.value = '';
        input.focus();
    }
};

window.logoutAdmin = function() {
    localStorage.removeItem('wps_admin_logged');
    showToast('Sesión cerrada', '👋 Hasta luego', 'info', 3000);
    setTimeout(() => location.reload(), 500);
};

function checkAdminAuth() {
    const isLoggedIn = localStorage.getItem('wps_admin_logged') === 'true';
    if (isLoggedIn) {
        showDashboard();
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('admin-dashboard').style.display = 'none';
    }
}

function showDashboard() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    loadLicenses();
    loadAds();
    updateStats();
}

// =========================================
// 🎲 GENERAR LICENCIA (CORREGIDO)
// =========================================

window.generateLicense = async function() {
    try {
        const licenseCode = generateUniqueCode();
        const deviceIdInput = document.getElementById('device-id-input');
        const customDeviceId = deviceIdInput ? deviceIdInput.value.trim().toUpperCase() : '';
        const createdAt = new Date().toISOString();
        
        // Datos de la licencia
        const licenseData = {
            code: licenseCode,
            status: 'active',
            assignedDeviceId: customDeviceId || null,
            createdAt: createdAt,
            createdBy: 'admin'
        };
        
        // ⚠️ CAMBIO CLAVE: Usamos setDoc con el licenseCode como ID del documento
        // Esto permite que la búsqueda en la app funcione correctamente.
        await setDoc(doc(db, 'licenses', licenseCode), licenseData);
        
        if (deviceIdInput) deviceIdInput.value = '';
        
        const message = customDeviceId 
            ? `Asignada a: <strong style="color: var(--warning); font-family: monospace;">${customDeviceId}</strong>`
            : `Se asignará automáticamente al activar`;
        
        showToast(
            `Código: <strong style="font-family: monospace; color: var(--warning);">${licenseCode}</strong><br><small>${message}</small>`,
            '✅ Licencia Generada',
            'success',
            8000
        );
        
        loadLicenses();
        updateStats();
        
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, '❌ Error al Generar', 'error', 5000);
    }
};

function generateUniqueCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let payload = '';
    for (let i = 0; i < 6; i++) {
        payload += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    let checksum = 0;
    for (let i = 0; i < payload.length; i++) {
        checksum += payload.charCodeAt(i);
    }
    checksum = checksum % 10;
    return `WPS-PRO-${payload}-${checksum}`;
}

// =========================================
// 📋 CARGAR LICENCIAS (CON BOTÓN BORRAR)
// =========================================

window.loadLicenses = async function() {
    const tbody = document.getElementById('licenses-tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">⏳ Cargando...</td></tr>';
    
    try {
        const licensesRef = collection(db, 'licenses');
        const q = query(licensesRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">📭 No hay licencias</td></tr>';
            return;
        }
        
        let html = '';
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const licenseId = docSnap.id; // Ahora coincidirá con el código
            const statusClass = data.status === 'active' ? 'status-active' : 'status-inactive';
            const statusText = data.status === 'active' ? '✅ Activa' : '❌ Inactiva';
            const date = data.createdAt ? new Date(data.createdAt).toLocaleDateString('es-ES') : 'N/A';
            
            html += `
                <tr>
                    <td><strong style="color: var(--warning); font-family: monospace;">${data.code}</strong></td>
                    <td style="font-family: monospace; font-size: 0.85rem;">
                        ${data.assignedDeviceId 
                            ? `<span style="color: var(--success);">✅ ${data.assignedDeviceId}</span>`
                            : '<span style="color: var(--muted); font-style: italic;">⏳ Pendiente</span>'
                        }
                    </td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${date}</td>
                    <td>
                        <button class="action-btn btn-copy" onclick="copyLicense('${data.code}')" title="Copiar">📋</button>
                        ${data.status === 'active' 
                            ? `<button class="action-btn btn-revoke" onclick="revokeLicense('${licenseId}', '${data.code}')" title="Revocar">🚫 Revocar</button>`
                            : `<button class="action-btn btn-activate" onclick="activateLicense('${licenseId}')" title="Activar">✅ Activar</button>`
                        }
                        <button class="action-btn" onclick="deleteLicense('${licenseId}', '${data.code}')" title="Eliminar" style="background: #666; color: white; margin-left: 2px;">🗑️</button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="color: var(--error);">Error</td></tr>';
    }
};

// =========================================
// 🎛️ ACCIONES (INCLUYE ELIMINAR)
// =========================================

window.copyLicense = function(code) {
    navigator.clipboard.writeText(code).then(() => {
        showToast(`Código: ${code}`, '📋 Copiado', 'success', 3000);
    }).catch(() => {
        showToast('No se pudo copiar', 'Error', 'error', 3000);
    });
};

window.revokeLicense = async function(licenseId, code) {
    showConfirmModal(`¿Revocar <strong style="color:var(--warning)">${code}</strong>?<br><small>El usuario perderá acceso PRO.</small>`, async () => {
        try {
            await updateDoc(doc(db, 'licenses', licenseId), { status: 'inactive' });
            showToast('Licencia revocada', '🚫 Revocada', 'warning', 4000);
            loadLicenses();
            updateStats();
        } catch (error) {
            showToast(error.message, 'Error', 'error', 4000);
        }
    });
};

window.activateLicense = async function(licenseId) {
    try {
        await updateDoc(doc(db, 'licenses', licenseId), { status: 'active' });
        showToast('Licencia activada', '✅ Activada', 'success', 3000);
        loadLicenses();
        updateStats();
    } catch (error) {
        showToast(error.message, 'Error', 'error', 4000);
    }
};

// 🔥 FUNCIÓN NUEVA: Eliminar licencia
window.deleteLicense = async function(licenseId, code) {
    showConfirmModal(`¿Eliminar PERMANENTEMENTE <strong style="color:var(--warning)">${code}</strong>?<br><small>⚠️ Esta acción NO se puede deshacer.</small>`, async () => {
        try {
            await deleteDoc(doc(db, 'licenses', licenseId));
            showToast('Licencia eliminada', '🗑️ Eliminado', 'info', 3000);
            loadLicenses();
            updateStats();
        } catch (error) {
            showToast(error.message, 'Error', 'error', 4000);
        }
    });
};

// =========================================
// 📊 ESTADÍSTICAS
// =========================================

async function updateStats() {
    try {
        const licensesRef = collection(db, 'licenses');
        const querySnapshot = await getDocs(licensesRef);
        
        let total = 0, active = 0, inactive = 0;
        querySnapshot.forEach((docSnap) => {
            total++;
            if (docSnap.data().status === 'active') active++;
            else inactive++;
        });
        
        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-active').textContent = active;
        document.getElementById('stat-inactive').textContent = inactive;
        
    } catch (error) {
        console.error('Error stats:', error);
    }
}

// =========================================
// 🚀 INICIALIZACIÓN
// =========================================

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    console.log('✅ Admin Panel cargado');
});

// =========================================
// 📢 GESTIÓN DE ANUNCIOS (FIREBASE)
// =========================================

window.addNewAd = async function() {
    const name = document.getElementById('ad-name').value;
    const link = document.getElementById('ad-link').value;
    const path = document.getElementById('ad-path').value;
    const weight = parseInt(document.getElementById('ad-weight').value);

    if (!name || !path) {
        showToast('Nombre y Ruta de imagen son obligatorios', '⚠️ Error', 'warning');
        return;
    }

    try {
        const { addDoc, collection, serverTimestamp } = await import('./firebase-config.js');
        
        await addDoc(collection(db, 'ads'), {
            name: name,
            link: link,
            imagePath: path,
            weight: weight,
            active: true,
            createdAt: new Date().toISOString()
        });

        showToast('Anuncio creado exitosamente', '✅ Listo', 'success');
        loadAds();
        
        // Limpiar inputs
        document.getElementById('ad-name').value = '';
        document.getElementById('ad-link').value = '';
        document.getElementById('ad-path').value = '';
        
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, '❌ Error al crear', 'error');
    }
};

window.loadAds = async function() {
    const tbody = document.getElementById('ads-tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">⏳ Cargando...</td></tr>';

    try {
        const querySnapshot = await getDocs(collection(db, 'ads'));
        
        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">📭 No hay anuncios configurados</td></tr>';
            return;
        }

        let html = '';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const adId = doc.id;
            const statusBadge = data.active 
                ? '<span class="status-badge status-active">🟢 Activo</span>' 
                : '<span class="status-badge status-inactive">🔴 Inactivo</span>';

            html += `
                <tr>
                    <td><strong>${data.name}</strong></td>
                    <td><img src="${data.imagePath}" style="height: 30px; border-radius: 4px; background: #fff;"></td>
                    <td><small style="color:var(--muted);">${data.link || '-'}</small></td>
                    <td>${data.weight || 1}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="action-btn" style="background:${data.active ? '#f39c12' : '#2ecc71'}; color:#fff;" onclick="toggleAd('${adId}', ${!data.active})">
                            ${data.active ? '⏸️ Pausar' : '▶️ Activar'}
                        </button>
                        <button class="action-btn" onclick="deleteAd('${adId}')" style="background:#e74c3c; color:white;">🗑️</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="color: var(--error);">Error</td></tr>';
    }
};

window.toggleAd = async function(adId, newStatus) {
    try {
        const { doc, updateDoc } = await import('./firebase-config.js');
        await updateDoc(doc(db, 'ads', adId), { active: newStatus });
        showToast(newStatus ? 'Anuncio activado' : 'Anuncio pausado', '✅ Actualizado', 'success');
        loadAds();
    } catch (error) {
        showToast(error.message, '❌ Error', 'error');
    }
};

window.deleteAd = async function(adId) {
    showConfirmModal('¿Eliminar este anuncio permanentemente?', async () => {
        try {
            const { doc, deleteDoc } = await import('./firebase-config.js');
            await deleteDoc(doc(db, 'ads', adId));
            showToast('Anuncio eliminado', '🗑️ Eliminado', 'info');
            loadAds();
        } catch (error) {
            showToast(error.message, '❌ Error', 'error');
        }
    });
};

// =========================================
// 🌍 EXPOSICIÓN GLOBAL
// =========================================
window.verifyAdmin = verifyAdmin;
window.logoutAdmin = logoutAdmin;
window.generateLicense = generateLicense;
window.loadLicenses = loadLicenses;
window.copyLicense = copyLicense;
window.revokeLicense = revokeLicense;
window.activateLicense = activateLicense;
window.deleteLicense = deleteLicense;
window.loadAds = loadAds;
window.addNewAd = addNewAd;
window.toggleAd = toggleAd;
window.deleteAd = deleteAd;