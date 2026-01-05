import React, { useMemo, useRef } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, CONFIG } from '../utils/constants';

declare global {
    namespace JSX {
        interface IntrinsicElements extends ThreeElements {}
    }
}

interface SnowParticlesProps {
    frozen?: boolean;
}

export const SnowParticles: React.FC<SnowParticlesProps> = ({ frozen = false }) => {
    const pointsRef = useRef<THREE.Points>(null);
    const boxSize = 30;
    const count = CONFIG.snowCount;

    const { positions, velocities } = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count); 
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * boxSize;
            positions[i * 3 + 1] = (Math.random() - 0.5) * boxSize;
            positions[i * 3 + 2] = (Math.random() - 0.5) * boxSize;
            velocities[i] = Math.random() * 0.05 + 0.02; 
        }
        return { positions, velocities };
    }, []);

    useFrame(() => {
        if (!pointsRef.current || frozen) return; // Stop movement if frozen
        
        const geom = pointsRef.current.geometry;
        const posAttr = geom.attributes.position;
        for (let i = 0; i < count; i++) {
            let y = posAttr.getY(i);
            y -= velocities[i];
            if (y < -boxSize / 2) y = boxSize / 2;
            posAttr.setY(i, y);
        }
        posAttr.needsUpdate = true;
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
            </bufferGeometry>
            <shaderMaterial
                vertexShader={`
                    void main() {
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = 60.0 / -mvPosition.z;
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `}
                fragmentShader={`
                    uniform vec3 uColor;
                    void main() {
                        float r = distance(gl_PointCoord, vec2(0.5));
                        if (r > 0.5) discard;
                        float alpha = 1.0 - smoothstep(0.3, 0.5, r);
                        gl_FragColor = vec4(uColor, alpha * 0.8);
                    }
                `}
                uniforms={{ uColor: { value: COLORS.snow } }}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

export const BaseRings = () => {
    const pointsRef = useRef<THREE.Points>(null);
    const { positions, scales } = useMemo(() => {
        const count = CONFIG.ringCount;
        const positions = new Float32Array(count * 3);
        const scales = new Float32Array(count);
        const baseR = CONFIG.treeRadius;

        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const isInnerRing = Math.random() > 0.4;
            let r;
            if (isInnerRing) {
                r = baseR * (1.2 + Math.random() * 0.8);
            } else {
                r = baseR * (2.5 + Math.random() * 1.5);
            }
            const x = r * Math.cos(theta);
            const z = r * Math.sin(theta);
            const ySpread = isInnerRing ? 0.5 : 0.8;
            const y = (Math.random() - 0.5) * ySpread - 1.0; 

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            scales[i] = Math.random();
        }
        return { positions, scales };
    }, []);

    useFrame((state) => {
        if (pointsRef.current) {
            pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.1;
        }
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-aScale" count={scales.length} array={scales} itemSize={1} />
            </bufferGeometry>
            <shaderMaterial
                vertexShader={`
                    attribute float aScale;
                    void main() {
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = aScale * (200.0 / -mvPosition.z);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `}
                fragmentShader={`
                    uniform vec3 uColor;
                    void main() {
                        float r = distance(gl_PointCoord, vec2(0.5));
                        if (r > 0.5) discard;
                        float alpha = (1.0 - r * 2.0);
                        alpha = pow(alpha, 1.5); 
                        gl_FragColor = vec4(uColor, alpha * 0.4);
                    }
                `}
                uniforms={{ uColor: { value: COLORS.ringGold } }}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

export const TopStar = () => {
    const groupRef = useRef<THREE.Group>(null);
    const count = CONFIG.starCount;
    const { positions } = useMemo(() => {
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = Math.pow(Math.random(), 1/3) * 0.8;
            positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i*3+2] = r * Math.cos(phi);
        }
        return { positions };
    }, []);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = -state.clock.getElapsedTime() * 0.5;
            groupRef.current.rotation.z = state.clock.getElapsedTime() * 0.2;
        }
    });

    return (
        <group ref={groupRef} position={[0, CONFIG.treeHeight + 0.5, 0]}>
            <points>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
                </bufferGeometry>
                <shaderMaterial
                    transparent
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    uniforms={{ uColor: { value: COLORS.star } }}
                    vertexShader={`
                        void main() {
                            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                            gl_PointSize = 10.0 * (50.0 / -mvPosition.z);
                            gl_Position = projectionMatrix * mvPosition;
                        }
                    `}
                    fragmentShader={`
                        uniform vec3 uColor;
                        void main() {
                            float d = distance(gl_PointCoord, vec2(0.5));
                            if(d > 0.5) discard;
                            float glow = pow(1.0 - d * 2.0, 3.0);
                            gl_FragColor = vec4(uColor, glow);
                        }
                    `}
                />
            </points>
            <mesh>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshBasicMaterial color={COLORS.star} />
            </mesh>
        </group>
    );
};