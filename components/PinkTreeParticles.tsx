import React, { useMemo, useRef } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, CONFIG } from '../utils/constants';

declare global {
    namespace JSX {
        interface IntrinsicElements extends ThreeElements {}
    }
}

const vertexShaderTree = `
    uniform float uTime;
    uniform float uHeight;
    uniform float uExplosion; 
    
    attribute float aSize;
    attribute float aRandomness;
    attribute vec3 aColor; 
    attribute vec3 aExplosionDir;
    
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
        vColor = aColor;
        vec3 pos = position;

        // Breathing
        float breath = sin(uTime * 1.5 + pos.y * 0.5 + aRandomness * 5.0);
        pos.x += pos.x * (breath * 0.02);
        pos.z += pos.z * (breath * 0.02);
        pos.y += sin(uTime * 0.5 + aRandomness * 10.0) * 0.05;

        // Explosion
        float explodeFactor = smoothstep(0.0, 1.0, uExplosion);
        vec3 explosionOffset = aExplosionDir * explodeFactor * 25.0;
        
        // Add some swirl during explosion
        float angle = explodeFactor * aRandomness * 5.0;
        float s = sin(angle);
        float c = cos(angle);
        
        float nx = explosionOffset.x * c - explosionOffset.z * s;
        float nz = explosionOffset.x * s + explosionOffset.z * c;
        explosionOffset.x = nx;
        explosionOffset.z = nz;
        explosionOffset.y += explodeFactor * 5.0 * aRandomness;

        pos += explosionOffset;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        
        float sizeMix = mix(1.0, 0.6, explodeFactor);
        gl_PointSize = (aSize * sizeMix) * (300.0 / -mvPosition.z);
        
        gl_Position = projectionMatrix * mvPosition;
        vAlpha = 1.0 - (explodeFactor * 0.3); 
    }
`;

const fragmentShaderTree = `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
        vec2 xy = gl_PointCoord.xy - vec2(0.5);
        float ll = length(xy);
        if(ll > 0.5) discard;

        float glow = 1.0 - (ll * 2.0);
        glow = pow(glow, 2.0); 

        gl_FragColor = vec4(vColor, vAlpha * glow);
    }
`;

interface PinkTreeParticlesProps {
    explosionValue: number;
}

export const PinkTreeParticles: React.FC<PinkTreeParticlesProps> = ({ explosionValue }) => {
    const pointsRef = useRef<THREE.Points>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const currentExplosion = useRef(0);

    const { positions, colors, sizes, randomness, explosionDirs } = useMemo(() => {
        const count = CONFIG.particleCount;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const randomness = new Float32Array(count);
        const explosionDirs = new Float32Array(count * 3);
        const tempColor = new THREE.Color();
        const vec3 = new THREE.Vector3();

        for (let i = 0; i < count; i++) {
            const h = Math.random(); 
            const theta = Math.random() * Math.PI * 2;
            const maxR = (1 - h) * CONFIG.treeRadius;
            const r = maxR * Math.sqrt(Math.random()); 

            const x = r * Math.cos(theta);
            const y = h * CONFIG.treeHeight - (CONFIG.treeHeight / 2); 
            const z = r * Math.sin(theta);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y + (CONFIG.treeHeight * 0.4);
            positions[i * 3 + 2] = z;

            const distRatio = r / (maxR + 0.001); 
            if (distRatio < 0.4) {
                tempColor.copy(COLORS.treeCore).lerp(COLORS.treeMid, distRatio / 0.4);
            } else {
                tempColor.copy(COLORS.treeMid).lerp(COLORS.treeOuter, (distRatio - 0.4) / 0.6);
            }

            colors[i * 3] = tempColor.r;
            colors[i * 3 + 1] = tempColor.g;
            colors[i * 3 + 2] = tempColor.b;

            sizes[i] = (Math.random() * 0.5 + 0.5) * (1.0 - distRatio * 0.5) * 0.6; 
            randomness[i] = Math.random();

            vec3.set(x, y, z).normalize();
            vec3.x += (Math.random() - 0.5) * 1.5;
            vec3.y += (Math.random() - 0.1) * 1.0; 
            vec3.z += (Math.random() - 0.5) * 1.5;
            vec3.normalize();

            explosionDirs[i*3] = vec3.x;
            explosionDirs[i*3+1] = vec3.y;
            explosionDirs[i*3+2] = vec3.z;
        }
        return { positions, colors, sizes, randomness, explosionDirs };
    }, []);

    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
            currentExplosion.current = THREE.MathUtils.lerp(
                currentExplosion.current, 
                explosionValue, 
                delta * 3.0 // Make it responsive
            );
            materialRef.current.uniforms.uExplosion.value = currentExplosion.current;
        }
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-aColor" count={colors.length / 3} array={colors} itemSize={3} />
                <bufferAttribute attach="attributes-aSize" count={sizes.length} array={sizes} itemSize={1} />
                <bufferAttribute attach="attributes-aRandomness" count={randomness.length} array={randomness} itemSize={1} />
                <bufferAttribute attach="attributes-aExplosionDir" count={explosionDirs.length} array={explosionDirs} itemSize={3} />
            </bufferGeometry>
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShaderTree}
                fragmentShader={fragmentShaderTree}
                uniforms={{
                    uTime: { value: 0 },
                    uHeight: { value: CONFIG.treeHeight },
                    uExplosion: { value: 0 },
                }}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};