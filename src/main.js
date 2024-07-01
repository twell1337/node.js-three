import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera( 45, window.innerWidth/window.innerHeight, 0.01, 1000 );
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


// Ваш GLSL-код для вершинного шейдера
const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vLightDir;
    varying vec3 vViewDir;
    varying vec3 vertex_color;

    varying vec2 vUv;

    void main() {
        vUv = uv;

        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        vec3 lightPosition = vec3(100.0, 100.0, 100.0); // Положение источника света
        vLightDir = normalize(lightPosition - vPosition);
        vViewDir = normalize(-vPosition);

        // Вычисление освещения
        vec3 ambientColor = vec3(0.2, 0.2, 0.2); // Фоновая составляющая освещения
        vec3 diffuseColor = vec3(0.8, 0.8, 0.8); // Диффузная составляющая освещения
        vec3 specularColor = vec3(1.0, 1.0, 1.0); // Зеркальная составляющая освещения
        float shininess = 45.0; // Степень блеска материала

        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(vLightDir);
        vec3 viewDir = normalize(vViewDir);

        float lambertian = max(dot(normal, lightDir), 0.0);
        float specular = 0.0;

        if (lambertian > 0.0) {
            vec3 reflectDir = reflect(-lightDir, normal);
            float specAngle = max(dot(reflectDir, viewDir), 0.0);
            specular = pow(specAngle, shininess);
        }

        vertex_color = ambientColor + lambertian * diffuseColor + specular * specularColor;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// Фрагментный шейдер с текстурой
const fragmentShader_tex = `
    uniform sampler2D uTexture;   // Основная текстура (цветовая)
    uniform sampler2D uAlphaMap;  // Текстура для определения альфа-канала

    varying vec3 vertex_color;
    varying vec2 vUv;

    void main() {
        vec2 vUv = vec2(vUv.x, 1.0 - vUv.y); // Инвертируем UV-координаты по вертикали

        // Получаем цвет из основной текстуры
        vec4 texColor = texture2D(uTexture, vUv);

        float alphaValue = 0.0;

        // Сэмплируем цвет пикселя из текстуры uAlphaMap
        vec4 texColor1 = texture2D(uAlphaMap, vUv);

        // Проверяем, что все компоненты RGB пикселя равны (0.0, 0.0, 0.0)
        if (texColor1.rgb != vec3(0.0, 0.0, 0.0)) {
            // Получаем значение альфа-канала из текстуры для альфа-канала
            alphaValue = texture2D(uAlphaMap, vUv).r;
        }

        // Создаем новый цвет с учетом vertex_color и альфа-канала
        vec4 finalColor = vec4(vertex_color, 1.0) * texColor;
        finalColor.a *= alphaValue; // Умножаем текущий альфа-канал на значение из текстуры для альфы

        gl_FragColor = finalColor;
    }
`;

// Фрагментный шейдер с цветом
const fragmentShader_color = `
    uniform vec3 uColor;

    varying vec3 vertex_color;
    varying vec2 vUv;

    void main() {
        gl_FragColor = vec4(vertex_color, 1.0) * vec4(uColor, 1.0);
    }
`;

// Link Texture Maps
const alpha = new THREE.TextureLoader().load('static/textures/axis_points.png');
const bc = new THREE.TextureLoader().load('static/textures/a.png');

// Nearest Interpolation for Base Color
bc.minFilter = THREE.NearestFilter;
bc.magFilter = THREE.NearestFilter;


// Create Light for Default Shaders
const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x8d8d8d, 1 );
                hemiLight.position.set( 0, 0, 0 );
                scene.add( hemiLight );

const light = new THREE.DirectionalLight( 0xffffff, 3 );
light.position.set( 1.5, 0.5, 1 );
light.castShadow = true;
scene.add( light );

const helper = new THREE.DirectionalLightHelper( light, .1 );
scene.add(helper);


// Create Material
const GouraudMaterial_1 = new THREE.ShaderMaterial({
                    transparent: true,
                    vertexShader: vertexShader,
                    fragmentShader: fragmentShader_tex,
                    uniforms: {
                        uTexture: { value: bc},
                        uAlphaMap: { value: alpha}
                    }
                });

const GouraudMaterial_2 = new THREE.ShaderMaterial({
                    vertexShader: vertexShader,
                    fragmentShader: fragmentShader_color,
                    uniforms: {
                        uColor : { value: new THREE.Color(0xF270AA) },
                    },
                });

const DefaultMat = new THREE.MeshPhongMaterial( {color: 0x9E9999, side: THREE.DoubleSide} );

const WireMat = new THREE.MeshBasicMaterial( {color: 0x000000, wireframe: true} );

// Create Meshes for Spheres
const Geometry = new THREE.SphereGeometry(0.2,12,8);

// Create Objects
const sphere = new THREE.Mesh( Geometry, GouraudMaterial_2);
const sphere_wire = new THREE.Mesh( Geometry, WireMat);

// Transform
sphere.position.set(0.4,0,0.45);
sphere_wire.position.copy(sphere.position);
sphere_wire.scale.set(1.01, 1.01, 1.01);

let objs = [sphere, sphere_wire];

const loader = new GLTFLoader();
let mixer;

loader.load(
    "static/models/test_threejs.glb", 
    (gltf) => {
        gltf.scene.scale.set(0.3, 0.3, 0.3);
        gltf.scene.traverse((child) => {
            console.log(`Child type: ${child.type}, name: ${child.name}`);
            if ( child.isSkinnedMesh ) {
                // Установка материала для всех сеток (mesh)
                child.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
                child.material.skinning = true;
                scene.add(child);

                // Создание SkeletonHelper для визуализации скелета
                const Hskeleton = new THREE.SkeletonHelper(scene);
                scene.add(Hskeleton);

                mixer = new THREE.AnimationMixer(gltf.scene);
                gltf.animations.forEach((clip) => {
                    mixer.clipAction(clip).play();
                });
            }
        });
        scene.add(gltf.scene);
        console.log(gltf.scene);
    },
);


for (const i of objs) {
    scene.add(i);
}



const controls = new OrbitControls(camera, renderer.domElement);
const clock = new THREE.Clock();

const animate = () => {
	requestAnimationFrame(animate);

    // Обновление AnimationMixer
    if (mixer) mixer.update(clock.getDelta());

    for (const i of objs) {
        i.rotation.y += 0.01;
    }
	renderer.render(scene, camera);
}

animate()