/**
 * 📢 ADS MANAGER (FIREBASE EDITION - OPTIMIZED)
 * Rotación suave sin parpadeo
 */

import { db, collection, getDocs } from './firebase-config.js';

let adsData = [];
let currentRotationTimer = null;

export async function initAds() {
    const isPro = localStorage.getItem('wps_pro_active') === 'true';
    const adContainer = document.getElementById('ad-container');

    // Si es PRO o no hay contenedor, no hacemos nada
    if (isPro || !adContainer) {
        if (adContainer) adContainer.style.display = 'none';
        return;
    }

    try {
        // Leer desde Firestore
        const querySnapshot = await getDocs(collection(db, 'ads'));
        
        adsData = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.active) {
                adsData.push({ ...data, id: doc.id });
            }
        });

        if (adsData.length > 0) {
            const rotationTime = 6000; // 6 segundos
            startAdRotation(rotationTime);
            adContainer.style.display = 'block';
        } else {
            adContainer.style.display = 'none';
        }

    } catch (error) {
        console.warn('⚠️ Error cargando anuncios:', error);
    }
}

function startAdRotation(timeMs) {
    showRandomAd();
    currentRotationTimer = setInterval(showRandomAd, timeMs);
}

// ✅ FUNCIÓN OPTIMIZADA: Precarga imagen y hace fade sin recargar el contenedor
function showRandomAd() {
    if (adsData.length === 0) return;

    const ad = getWeightedRandomAd();
    if (!ad) return;

    const container = document.getElementById('ad-container');
    let adLink = container.querySelector('.ad-link');
    let adImg = container.querySelector('.ad-image');
    
    // Si la estructura no existe (primera vez), la creamos
    if (!adLink) {
        container.innerHTML = `
            <a href="#" target="_blank" class="ad-link" style="display:block; position:relative;">
                <div class="ad-label">PUBLICIDAD</div>
                <img src="" alt="Anuncio" class="ad-image" style="width:100%; height:auto; display:block; transition: opacity 0.4s ease-in-out;">
            </a>
        `;
        adLink = container.querySelector('.ad-link');
        adImg = container.querySelector('.ad-image');
    }
    
    // 1. Fade Out (Bajar opacidad)
    adImg.style.opacity = '0.2'; 
    
    // 2. Precargar nueva imagen
    const newImg = new Image();
    newImg.src = ad.imagePath;
    
    // 3. Cuando cargue, actualizar src y hacer Fade In
    newImg.onload = () => {
        adImg.src = ad.imagePath;
        adLink.href = ad.link || '#';
        adLink.onclick = () => handleAdClick(ad.id);
        
        // Fade In (Subir opacidad)
        adImg.style.opacity = '1';
    };
}

function getWeightedRandomAd() {
    const totalWeight = adsData.reduce((sum, ad) => sum + (ad.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const ad of adsData) {
        random -= (ad.weight || 1);
        if (random <= 0) return ad;
    }
    return adsData[0];
}

window.handleAdClick = function(adId) {
    console.log(`🖱️ Clic en anuncio ID: ${adId}`);
};