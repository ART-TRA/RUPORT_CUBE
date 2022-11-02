uniform float uTime;

void main() {
    vec3 wavesPosition = position;
    wavesPosition.y += 0.1 * (sin(wavesPosition.y * 9.0 + uTime * 4.0) * 0.5 + 0.5);
    wavesPosition.z += 0.08 * (sin(wavesPosition.y * 9.0 + uTime * 2.0) * 0.5 + 0.5);

    vec4 modelPosition = modelViewMatrix * vec4(wavesPosition, 1.0);
    gl_PointSize = 10.0 * (1.0 / - modelPosition.z);
    gl_Position = projectionMatrix * modelPosition;
}