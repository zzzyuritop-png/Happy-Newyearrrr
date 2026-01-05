import React, { useState, Suspense } from 'react';
import { Canvas, ThreeElements } from '@react-three/fiber';
import { COLORS } from './utils/constants';
import { PinkTreeParticles } from './components/PinkTreeParticles';
import { SnowParticles, BaseRings, TopStar } from './components/Decorations';
import { SceneEffects } from './components/SceneEffects';
import { HandInteraction } from './components/HandInteraction';

declare global {
    namespace JSX {
        interface IntrinsicElements extends ThreeElements {}
    }
}

const App = () => {
    // New state for freezing snow instead of exploding tree
    const [isFrozen, setIsFrozen] = useState(false);

    return (
        <div className="relative w-full h-full bg-black overflow-hidden">
            {/* HandInteraction now controls snow freezing */}
            <HandInteraction onToggleFreeze={setIsFrozen} />

            <div className="absolute bottom-10 right-10 z-10 pointer-events-none select-none">
                <p className="text-xl md:text-2xl tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-yellow-400 opacity-40 drop-shadow-[0_0_10px_rgba(255,215,0,0.2)]" style={{ fontFamily: "'Times New Roman', serif" }}>
                    - Joyce
                </p>
            </div>

            <Canvas
                camera={{ position: [0, 8, 24], fov: 45 }}
                gl={{ 
                    antialias: false, 
                    powerPreference: "high-performance",
                    alpha: false,
                    stencil: false,
                    depth: true 
                }}
                dpr={[1, 2]} 
            >
                <color attach="background" args={[COLORS.background]} />
                
                <Suspense fallback={null}>
                    {/* Tree explosion is disabled (passed 0) as per "cancel other gesture recognitions" */}
                    <PinkTreeParticles explosionValue={0} />
                    <TopStar /> 
                    <BaseRings />
                    
                    {/* Snow receives the frozen state */}
                    <SnowParticles frozen={isFrozen} />
                    
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
                        <planeGeometry args={[50, 50]} />
                        <meshBasicMaterial color="#000000" />
                    </mesh>
                    <SceneEffects />
                </Suspense>
            </Canvas>
        </div>
    );
};

export default App;