'use client';

import React, { useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// --- КОМПОНЕНТ КНИГИ (3D MODEL) ---
function Book() {
  // 1. Завантажуємо текстури
  const [cover, pages] = useLoader(THREE.TextureLoader, [
    '/cover_zine.png',
    '/A5 - 2.png'
  ]);

  // 2. Налаштування кольору
  cover.colorSpace = THREE.SRGBColorSpace;
  pages.colorSpace = THREE.SRGBColorSpace;

  // 3. Налаштування текстур
  
  // Текстура для ПРАВОЇ грані (вертикальна)
  const textureRight = useMemo(() => {
    const t = pages.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 4); 
    t.needsUpdate = true;
    return t;
  }, [pages]);

  // Текстура для ВЕРХУ та НИЗУ (горизонтальна)
  const textureTopBottom = useMemo(() => {
    const t = pages.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.rotation = Math.PI / 2;
    t.center.set(0.5, 0.5);
    t.repeat.set(4, 1);
    t.needsUpdate = true;
    return t;
  }, [pages]);

  // Розміри книги
  const args: [number, number, number] = [3, 4.2, 0.25];

  return (
    <mesh rotation={[0, -0.5, 0]}>
      <boxGeometry args={args} />
      
      {/* ЯВНЕ ПРИКРІПЛЕННЯ МАТЕРІАЛІВ ДО ГРАНЕЙ (0-5) */}
      <meshBasicMaterial attach="material-0" map={textureRight} />       {/* Right */}
      <meshBasicMaterial attach="material-1" color="#ffffff" />          {/* Left */}
      <meshBasicMaterial attach="material-2" map={textureTopBottom} />   {/* Top */}
      <meshBasicMaterial attach="material-3" map={textureTopBottom} />   {/* Bottom */}
      <meshBasicMaterial attach="material-4" map={cover} />              {/* Front */}
      <meshBasicMaterial attach="material-5" map={cover} />              {/* Back */}
    </mesh>
  );
}

// --- ГОЛОВНА СТОРІНКА ---
export default function BookPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#FF0000] overflow-x-hidden flex flex-col md:block">
      
      {/* Стилі шрифтів */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Helvetica+Neue:wght@400;700&display=swap');
        body { margin: 0; font-family: 'Helvetica Neue', sans-serif; }
        
        .text-base-custom { font-size: 13px; line-height: 103%; letter-spacing: -0.04em; }
        .title-custom { font-size: 26px; line-height: 103%; letter-spacing: -0.04em; }
        .price-text { font-size: 23px; font-weight: bold; line-height: 1; transform: scaleX(1.25); transform-origin: center; }
        .label-text { font-size: 13px; letter-spacing: -0.04em; font-weight: bold; line-height: 1; margin-top: 4px; }
      `}} />

      {/* --- 3D СЦЕНА (CANVAS) --- */}
      <div 
        className="book-wrapper relative z-0 w-full 
                   h-[80vh] 
                   md:absolute md:top-0 md:left-0 md:w-full md:h-full"
      >
        {/* SCALING: 
            Mobile: scale-[1.05] (Зменшено на 15% від 1.2)
            Desktop: scale-100 
        */}
        <div className="w-full h-full scale-[1.05] md:scale-100">
            <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
            <ambientLight intensity={1} />
            
            <Book />

            <OrbitControls 
                enableZoom={false} 
                enablePan={false}
                autoRotate={true}
                autoRotateSpeed={3.4}
            />
            </Canvas>
        </div>
      </div>

      {/* --- MOBILE PANEL (Текст знизу) --- */}
      <div className="mobile-panel md:hidden relative w-full bg-[#D9D9D9] p-[13px] flex flex-col z-10 flex-grow">
        <h1 className="title-custom font-bold m-0 origin-left scale-x-125 w-[80%] mb-[18px]">
          Зін «Мама»<br />
          Христина Новікова
        </h1>

        <div className="flex flex-col gap-[5px] mb-[18px]">
            <a 
                href="ВСТАВ_СЮДИ_ЛІНК_НА_БАНКУ" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-black w-full h-[82px] flex justify-center items-center text-[25px] font-bold tracking-[-0.04em] no-underline hover:scale-[1.01] transition-transform"
            >
                Monopay
            </a>

            <div className="flex w-full gap-[5px]">
                <div className="flex-1 bg-white text-black h-[63px] flex flex-col justify-center items-center">
                    <div className="price-text">666₴</div>
                    <div className="label-text">pre-order</div>
                </div>
                <div className="flex-1 bg-[#ACACAC] text-black h-[63px] flex flex-col justify-center items-center">
                    <div className="price-text relative">
                        <span className="opacity-40">777₴</span>
                        <span className="absolute left-0 top-1/2 w-full h-[2px] bg-black opacity-40 -translate-y-1/2"></span>
                    </div>
                    <div className="label-text">full price</div>
                </div>
            </div>
        </div>

        <p className="text-base-custom font-bold mb-[18px]">
          Цей зін апропріює естетику культової пачки Marlboro Red, перетворюючи хроніку життя в окупації на візуальний об’єкт із попередженням про небезпеку. Червоний колір тривоги тут римується з агресивним брендингом, а очікування повідомлень від мами з Маріуполя (2022–2026) стає метафорою залежності, від якої неможливо відмовитися. Це документація зв’язку, де буденні поради «поїсти супу» перемішані зі звуками вибухів, а любов до рідного дому межує з фатальним ризиком там залишатися.
        </p>

        <div className="text-base-custom font-bold mb-5">
          Дизайн та верстка: Володимир Хоменко<br />
          Видавництво: IDINAHUI PUBLISHING<br />
          Формат А5, 68 с.<br />
          Київ, 2026
        </div>
      </div>


      {/* --- DESKTOP PANEL (Текст збоку) --- */}
      <div className="desktop-panel hidden md:flex absolute top-0 right-0 flex-col z-10 w-[348px]">
        <div 
          className="bg-[#D9D9D9] text-black flex flex-col relative"
          style={{ height: '432px', padding: '15px 18px 15px 14px' }}
        >
          <h1 className="title-custom font-bold m-0 origin-left scale-x-125 w-[80%] mb-5">
            Зін «Мама»<br />
            Христина Новікова
          </h1>

          <div className="text-base-custom font-bold mb-3">
            Дизайн та верстка: Володимир Хоменко<br />
            Видавництво: IDINAHUI PUBLISHING<br />
            Формат А5, 68 с.<br />
            Київ, 2026
          </div>

          <p className="text-base-custom font-bold mb-auto">
            Цей зін апропріює естетику культової пачки Marlboro Red, перетворюючи хроніку життя в окупації на візуальний об’єкт із попередженням про небезпеку. Червоний колір тривоги тут римується з агресивним брендингом, а очікування повідомлень від мами з Маріуполя (2022–2026) стає метафорою залежності, від якої неможливо відмовитися. Це документація зв’язку, де буденні поради «поїсти супу» перемішані зі звуками вибухів, а любов до рідного дому межує з фатальним ризиком там залишатися.
          </p>
          <a href="ВСТАВ_СЮДИ_ЛІНК_НА_БАНКУ" target="_blank" rel="noopener noreferrer" className="bg-white text-black h-[82px] w-full flex justify-center items-center text-[25px] font-bold tracking-[-0.04em] no-underline hover:scale-[1.02] transition-transform mt-4">
            Monopay
          </a>
        </div>
        
        <div className="flex w-full" style={{ height: '63px' }}>
          <div className="w-1/2 bg-white text-black flex flex-col justify-center items-center">
             <div className="price-text">666₴</div>
             <div className="label-text">pre-order</div>
          </div>
          <div className="w-1/2 bg-[#ACACAC] text-black flex flex-col justify-center items-center">
             <div className="price-text relative">
                <span className="opacity-40">777₴</span>
                <span className="absolute left-0 top-1/2 w-full h-[2px] bg-black opacity-40 -translate-y-1/2"></span>
             </div>
             <div className="label-text">full price</div>
          </div>
        </div>
      </div>

    </div>
  );
}