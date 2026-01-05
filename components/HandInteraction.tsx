import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

interface HandInteractionProps {
    onToggleFreeze: (frozen: boolean) => void;
}

export const HandInteraction: React.FC<HandInteractionProps> = ({ onToggleFreeze }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [status, setStatus] = useState<string>('Initializing Vision...');

    useEffect(() => {
        let handLandmarker: HandLandmarker | null = null;
        let animationFrameId: number;
        let lastVideoTime = -1;

        const setup = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
                );

                handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 1
                });

                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: { width: 320, height: 240, facingMode: "user" }
                    });

                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.addEventListener('loadeddata', () => {
                            setStatus('Active');
                            predict();
                        });
                    }
                }
            } catch (err) {
                console.error("Error initializing hand tracking:", err);
                setStatus('Camera Error');
            }
        };

        const distance3D = (a: {x: number, y: number, z: number}, b: {x: number, y: number, z: number}) => {
            return Math.sqrt(
                Math.pow(a.x - b.x, 2) +
                Math.pow(a.y - b.y, 2) +
                Math.pow(a.z - b.z, 2)
            );
        };

        const predict = () => {
            if (videoRef.current && handLandmarker) {
                const startTimeMs = performance.now();
                if (videoRef.current.currentTime !== lastVideoTime) {
                    lastVideoTime = videoRef.current.currentTime;
                    const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

                    if (results.worldLandmarks && results.worldLandmarks.length > 0) {
                        const hand = results.worldLandmarks[0];
                        const wrist = hand[0];

                        // Calculate average extension ratio of fingers
                        const fingers = [
                            { mcp: 5, tip: 8 },   // Index
                            { mcp: 9, tip: 12 },  // Middle
                            { mcp: 13, tip: 16 }, // Ring
                            { mcp: 17, tip: 20 }  // Pinky
                        ];

                        let totalRatio = 0;
                        fingers.forEach(f => {
                            const mcpDist = distance3D(wrist, hand[f.mcp]);
                            const tipDist = distance3D(wrist, hand[f.tip]);
                            totalRatio += (tipDist / (mcpDist || 0.001));
                        });

                        const avgRatio = totalRatio / 4;

                        // Threshold for "Open Hand"
                        // Typically ~1.5 to 1.8+ is open. < 1.2 is closed.
                        const isHandOpen = avgRatio > 1.6;
                        
                        onToggleFreeze(isHandOpen);
                        setStatus(isHandOpen ? 'Freezing Time' : 'Flowing');
                    } else {
                        // No hand detected
                        onToggleFreeze(false);
                        setStatus('No Hand Detected');
                    }
                }
                animationFrameId = requestAnimationFrame(predict);
            }
        };

        setup();

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (handLandmarker) handLandmarker.close();
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, [onToggleFreeze]);

    return (
        <div className="absolute top-4 left-4 z-50 flex flex-col items-center gap-2">
            <div className="relative overflow-hidden rounded-lg border-2 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-48 h-36 object-cover transform scale-x-[-1]"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">
                    <div className={`w-2 h-2 rounded-full ${status === 'Freezing Time' ? 'bg-cyan-400 animate-pulse' : 'bg-green-500'}`} />
                    <span className="text-[10px] text-white/80 font-mono uppercase tracking-wider">
                        {status === 'Freezing Time' ? 'PAUSED' : 'LIVE'}
                    </span>
                </div>
            </div>
            <p className="text-white/40 text-xs font-sans text-center max-w-[200px]">
                Open hand to freeze snow
            </p>
        </div>
    );
};