import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as misc from './misc.js';


const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera( 45, window.innerWidth/window.innerHeight, 0.01, 1000 );
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Делаю кастомный шейдер из ShaderLib
let shader = THREE.ShaderLib["lambert"];
let wVertex = shader.vertexShader;
let wFragment = shader.fragmentShader;
let wUniforms = THREE.UniformsUtils.clone(shader.uniforms);

wVertex =
`
      attribute vec3 offset;
      attribute vec4 orientation;

      vec3 applyQuaternionToVector( vec4 q, vec3 v ){
         return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
      }

   ` + wVertex;

wVertex = wVertex.replace(
"#include <project_vertex>",
`
      vec3 vPosition = applyQuaternionToVector( orientation, transformed );

      vec4 mvPosition = modelViewMatrix * vec4( vPosition, 1.0 );
      gl_Position = projectionMatrix * modelViewMatrix * vec4( offset + vPosition, 1.0 );
      
   `
);

// Ваш GLSL-код для вершинного шейдера
/*
wVertex = `
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
*/

/*
// Фрагментный шейдер с текстурой
const wFragment_tex = `
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
const wFragment_color = `
    uniform vec3 uColor;

    varying vec3 vertex_color;
    varying vec2 vUv;

    void main() {
        gl_FragColor = vec4(vertex_color, 1.0) * vec4(uColor, 1.0);
    }
`;
*/

// Link Texture Maps
const alpha = new THREE.TextureLoader().load('static/textures/axis_points.png');
const bc = new THREE.TextureLoader().load('static/textures/a.png');

// Nearest Interpolation for Base Color
bc.minFilter = THREE.NearestFilter;
bc.magFilter = THREE.NearestFilter;

// Create Material
const GouraudMaterial_1 = new THREE.ShaderMaterial({
                    // transparent: true,
                    vertexShader: wVertex,
                    fragmentShader: wFragment,
                    uniforms: wUniforms,
                    lights: true,
                    depthPacking: THREE.RGBADepthPacking,
                    name: "detail-material",
                    fog: true
                    // uniforms: {uTexture: { value: bc}, uAlphaMap: { value: alpha}},
                });
GouraudMaterial_1.uColor = new THREE.Color(0xd461ae);

// const GouraudMaterial_2 = new THREE.ShaderMaterial({
//                     vertexShader: wVertex,
//                     fragmentShader: wFragment,
//                     uniforms: wUniforms
//                     // uniforms: {uColor : { value: new THREE.Color(0xd461ae) }},
//                 });

const DefaultMat = new THREE.MeshPhongMaterial( {color: 0x9E9999, side: THREE.DoubleSide} );

const WireMat = new THREE.MeshBasicMaterial( {color: 0x000000, wireframe: true} );

// Create Meshes for Spheres
const Geometry = new THREE.SphereGeometry(0.2,12,8);

// Create Objects
const sphere = new THREE.Mesh( Geometry, GouraudMaterial_1);
const sphere_wire = new THREE.Mesh( Geometry, WireMat);

// Transform
sphere.position.set(0.4,0,0.45);
sphere_wire.position.copy(sphere.position);
sphere_wire.scale.set(1.01, 1.01, 1.01);

let objs = [sphere, sphere_wire];

const loader = new GLTFLoader();
let mixers = [], added_clips = [];
const scene_material = GouraudMaterial_1;

loader.load(
    "static/models/test_threejs.glb",
    (gltf) => {
        // Изменение размера и добавление gltf сцены 
        const size = Array(3).fill(0.3);
        gltf.scene.scale.set(...size);
        scene.add(gltf.scene);
        gltf.scene.traverse((child) => {
            const number = child.id;
            // Загрузка костных объектов
            if ( child.isSkinnedMesh ) {
                // Установка материала
                child.material = scene_material;
                // Загрузка анимации
                mixers[number] = new THREE.AnimationMixer(child);
                // Проходка по всем костям дочерним родительной арматуре мешу
                // С исключением меша через фильтр
                child.parent.children.filter(bones_child => bones_child !== child).forEach(bone => {
                    // Нахождение, соответсвующего кости клипа анимации
                    const clip = misc.ClipForObject(bone, gltf.animations);
                    if (added_clips.includes(clip)) {
                        return;
                    }
                    else {
                        mixers[number].clipAction(clip).play();
                        // Сохранение клипа в уже запущенные
                        added_clips.push(clip);
                    }
                });
            }
            // Загрузка остальных объектов
            else if ( child.isMesh ) {
                console.log(child);
                // Установка материала
                child.material = scene_material;
                // Загрузка анимации
                mixers[number] = new THREE.AnimationMixer(child);
                const clip = misc.ClipForObject(child, gltf.animations);
                mixers[number].clipAction(clip).play();
                added_clips.push(clip);
            }
        });
        console.log(added_clips);
        // Создание SkeletonHelper для визуализации скелета
        const Hskeleton = new THREE.SkeletonHelper(gltf.scene);
        scene.add(Hskeleton);
});

for (const i of objs) {
    scene.add(i);
}

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

// Объявление последних объектов
const controls = new OrbitControls(camera, renderer.domElement);
const clock = new THREE.Clock();

const animate = () => {
	requestAnimationFrame(animate);

    // Обновление AnimationMixer
    const delta = clock.getDelta();
    mixers.forEach((mixer) => {
        mixer.update(delta);
    });

    for (const i of objs) {
        i.rotation.y += 0.01;
    }
	renderer.render(scene, camera);
}

animate()