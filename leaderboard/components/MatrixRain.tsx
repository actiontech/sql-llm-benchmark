// import React, { useRef, useEffect } from 'react';

// const MatrixRain: React.FC = () => {
//     const canvasRef = useRef<HTMLCanvasElement>(null);

//     useEffect(() => {
//         const canvas = canvasRef.current;
//         if (!canvas) return;

//         const ctx = canvas.getContext('2d');
//         if (!ctx) return;

//         let width = canvas.width = window.innerWidth;
//         let height = canvas.height = window.innerHeight;
//         let columns = Math.floor(width / 20) + 1;
//         const yPos: number[] = Array(columns).fill(0);

//         const matrixCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890@#$%^&*()_+{}|:"<>?`~';

//         const draw = () => {
//             ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
//             ctx.fillRect(0, 0, width, height);

//             ctx.fillStyle = '#0F0'; // Green text
//             ctx.font = '15pt monospace';

//             yPos.forEach((y, ind) => {
//                 const text = matrixCharacters.charAt(Math.floor(Math.random() * matrixCharacters.length));
//                 const x = ind * 20;
//                 ctx.fillText(text, x, y);

//                 if (y > 100 + Math.random() * 10000) {
//                     yPos[ind] = 0;
//                 } else {
//                     yPos[ind] = y + 20;
//                 }
//             });
//         };

//         const interval = setInterval(draw, 33);

//         const handleResize = () => {
//             width = canvas.width = window.innerWidth;
//             height = canvas.height = window.innerHeight;
//             columns = Math.floor(width / 20) + 1;
//             yPos.fill(0); // Reset y positions on resize
//         };

//         window.addEventListener('resize', handleResize);

//         return () => {
//             clearInterval(interval);
//             window.removeEventListener('resize', handleResize);
//         };
//     }, []);

//     return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -1 }} />;
// };

// export default MatrixRain;