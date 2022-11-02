import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Clock } from 'three'
import gsap from 'gsap';

const textureLoader = new THREE.TextureLoader()

//window sizes
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight
}

//CONSTANTS
//------------------------------------------------------------------------------
// Canvas
const canvas = document.querySelector('canvas.canvas');


let currentEdge;
let isNear = false;
let scrollX = {value: 0};
let scroll = 0;
const rotationDelay = 120;
const duration = 1;
let elapsedTimeSide = 0;
let frontRef;
const raycaster = new THREE.Raycaster();
let intersects = [];
let prevScroll = 0;
const clickTimeline = gsap.timeline();
let mouse = new THREE.Vector2(0, 0);
let isLockMove = false;
let acceptToScroll = true;
window.scrollTo(0,0);

//общая высота скролла
const scrollHeight = document.getElementById('root').scrollHeight;
//текущее значение скролла куба
const currentScroll = (window.scrollY * 1.5) / (scrollHeight - window.innerHeight);

const scrollCheckPoints = {
	front: {radian: 0.0, scroll: 0.0},
	bottom: {radian: -Math.PI * 0.5, scroll: scrollHeight * 0.25},
	back: {radian: -Math.PI, scroll: scrollHeight * 0.5},
	top: {radian: -Math.PI * 1.5, scroll: scrollHeight * 0.75},
};

const visibleHeight = (depth, camera) => {
	const cameraOffset = camera.position.z;
	if (depth < cameraOffset) depth -= cameraOffset;
	else depth += cameraOffset;

	// vertical fov in radians
	const vFOV = camera.fov * Math.PI / 180;

	// Math.abs to ensure the result is always positive
	return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

const visibleWidth = (depth, camera) => {
	const height = visibleHeight(depth, camera);
	return height * camera.aspect;
};

//------------------------------------------------------------------------------

// Scene
const scene = new THREE.Scene()

/** Camera */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000)
camera.position.set(0, 0, 4)
scene.add(camera)

//controls
const controls = new OrbitControls(camera, canvas)
controls.enableZoom = false;
controls.enableRotate = false;
controls.enableDamping = true //плавность вращения камеры


/** Renderer */
const renderer = new THREE.WebGLRenderer({
	canvas: canvas,
	antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) //ограничение кол-ва рендеров в завис-ти от плотности пикселей

let geometryArgs = [
	visibleWidth(visibleHeight(0, camera) * 0.2, camera) * 0.9,
	visibleHeight(0, camera) * 0.2,
	visibleHeight(0, camera) * 0.2,
];
let facesPositions = {
	front: {
		sizes: [geometryArgs[0], geometryArgs[1]],
		position: [0, 0, geometryArgs[1] / 2],
		rotation: []
	},
	bottom: {
		sizes: [geometryArgs[0], geometryArgs[1]],
		position: [0, -geometryArgs[1] / 2, 0],
		rotation: [Math.PI / 2, 0, 0]
	},
	back: {
		sizes: [geometryArgs[0], geometryArgs[1]],
		position: [0, 0, -geometryArgs[1] / 2],
		rotation: [0, Math.PI, 0]
	},
	top: {
		sizes: [geometryArgs[0], geometryArgs[1]],
		position: [0, geometryArgs[1] / 2, 0],
		rotation: [-Math.PI / 2, 0, 0]
	},
	left: {
		sizes: [geometryArgs[1], geometryArgs[1]],
		position: [-geometryArgs[0] / 2, 0, 0],
		rotation: [0, -Math.PI / 2, 0]
	},
	right: {
		sizes: [geometryArgs[1], geometryArgs[1]],
		position: [geometryArgs[0] / 2, 0, 0],
		rotation: [0, Math.PI / 2, 0]
	}
}

const mouseMove = (event) => {
	mouse = {
		x: event.clientX / window.innerWidth * 2 - 1,
		y: -(event.clientY / window.innerHeight) * 2 + 1,
	}
	raycaster.setFromCamera(mouse, camera);
	intersects = raycaster.intersectObjects(scene.children, true);
}

window.addEventListener('resize', () => {
	//update sizes
	sizes.width = window.innerWidth
	sizes.height = window.innerHeight

	//update camera
	camera.aspect = sizes?.width / sizes.height
	camera.updateProjectionMatrix()

	//update renderer
	renderer.setSize(sizes?.width, sizes.height)
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

const clock = new Clock();

//VIDEO -------------------------------------------------------------------------
const video = Object.assign(document.createElement('video'), {
	src: 'video/Ricardo.mp4',
	// needed because the video is being hosted on a different server url
	crossOrigin: 'Anonymous',
	loop: true,
	// critical for iOS or the video won't initially play, and will go fullscreen when playing
	playsInline: true,
	// muted attribute is required for videos to autoplay
	muted: true,
});

video.play();
const texture = new THREE.VideoTexture(video);

// CUBE -------------------------------------------------------------------------
const group = new THREE.Group();

const handleScroll = (event) => {
	elapsedTimeSide = 0;
	if (!isLockMove && acceptToScroll) {
		scrollX.value = window.scrollY * -Math.PI * 1.5 / (scrollHeight - window.innerHeight);
		group.rotation.set(scrollX.value, 0, 0);
		scroll = scrollX.value;
	}
};

const firstResize = (texture) => {
	texture.repeat.x = isNear ? 1 : 0.88
	texture.repeat.y = isNear ? 1 : 0.27

	texture.offset.x = isNear ? 0 : 0.045
	texture.offset.y = isNear ? 0 : 0.37
}

const planeMaterialFront = new THREE.MeshBasicMaterial({color: 0xffffff, map: texture});
const planeMaterialBottom = new THREE.MeshBasicMaterial({color: 0xffffff, map: texture});
const planeMaterialBack = new THREE.MeshBasicMaterial({color: 0xffffff, map: texture});
const planeMaterialTop = new THREE.MeshBasicMaterial({color: 0xffffff, map: texture});

planeMaterialFront.map.wrapS = planeMaterialFront.map.wrapT = THREE.ClampToEdgeWrapping;
planeMaterialBottom.map.wrapS = planeMaterialBottom.map.wrapT = THREE.ClampToEdgeWrapping;
planeMaterialBack.map.wrapS = planeMaterialBack.map.wrapT = THREE.ClampToEdgeWrapping;
planeMaterialTop.map.wrapS = planeMaterialTop.map.wrapT = THREE.ClampToEdgeWrapping;

firstResize(planeMaterialFront.map);
firstResize(planeMaterialBottom.map);
firstResize(planeMaterialBack.map);
firstResize(planeMaterialTop.map);

let planeGeometryFront = new THREE.PlaneBufferGeometry(facesPositions.front.sizes[0], facesPositions.front.sizes[1])
const planeFront = new THREE.Mesh(planeGeometryFront, planeMaterialFront);
planeFront.position.set(facesPositions.front.position[0], facesPositions.front.position[1], facesPositions.front.position[2]);
planeFront.name = 'front';

const planeGeometryTop = new THREE.PlaneBufferGeometry(facesPositions.front.sizes[0], facesPositions.front.sizes[1])
const planeTop = new THREE.Mesh(planeGeometryTop, planeMaterialTop);
planeTop.rotation.set(facesPositions.top.rotation[0], facesPositions.top.rotation[1], facesPositions.top.rotation[2]);
planeTop.position.set(facesPositions.top.position[0], facesPositions.top.position[1], facesPositions.top.position[2]);
planeTop.name = 'top';

const planeGeometryBack = new THREE.PlaneBufferGeometry(facesPositions.front.sizes[0], facesPositions.front.sizes[1])
const planeBack = new THREE.Mesh(planeGeometryBack, planeMaterialBack);
planeBack.rotation.set(facesPositions.back.rotation[0], facesPositions.back.rotation[1], facesPositions.back.rotation[2]);
planeBack.position.set(facesPositions.back.position[0], facesPositions.back.position[1], facesPositions.back.position[2]);
planeBack.name = 'back';

const planeGeometryBottom = new THREE.PlaneBufferGeometry(facesPositions.front.sizes[0], facesPositions.front.sizes[1])
const planeBottom = new THREE.Mesh(planeGeometryBottom, planeMaterialBottom);
planeBottom.rotation.set(facesPositions.bottom.rotation[0], facesPositions.bottom.rotation[1], facesPositions.bottom.rotation[2]);
planeBottom.position.set(facesPositions.bottom.position[0], facesPositions.bottom.position[1], facesPositions.bottom.position[2]);
planeBottom.name = 'bottom';

planeFront.material.color = new THREE.Color('rgb(255,255,255)');
planeTop.material.color = new THREE.Color('rgb(255,255,255)');
planeBack.material.color = new THREE.Color('rgb(255,255,255)');
planeBottom.material.color = new THREE.Color('rgb(255,255,255)');

group.add(planeFront)
group.add(planeBottom)
group.add(planeTop)
group.add(planeBack)
scene.add(group)

//todo not working!!!
const { body } = document;
const blockScroll = () => {
	if (isNear) {
		body.classList.add('noscroll');
	} else {
		body.classList.remove('noscroll');
	}
};

const rotateToCheckPoint = (scroll, prevEdge) => {
	if (currentEdge !== prevEdge) {
		elapsedTimeSide = 0;
	}
	currentEdge = prevEdge;
	if (elapsedTimeSide >= rotationDelay) {
		scrollX.value = scroll / (scrollHeight - window.innerHeight);
		elapsedTimeSide = 0;
		window.scrollTo(0, scrollCheckPoints[prevEdge].scroll);
	}
};

const preventScroll = (e) => {
	if (isNear || isLockMove) {
		e.preventDefault();
		e.stopPropagation();
	}
};

const resizeTextureInner = (plane) => {
	clickTimeline.add('resize')
		.to(group.rotation, {
			duration: 0.3,
			x: scrollCheckPoints[currentEdge].radian,
			y: 0,
			ease: 'power3',
			onStart: () => {
				console.log('start')
				clickTimeline.add('resize')
					.to(plane.material.map.repeat, {
						duration: 1,
						x: isNear ? 1 : 0.88,
						y: isNear ? 1 : 0.27,
						ease: 'power3'
					}, 'resize')

					.to(plane.material.map.offset, {
						duration: 1,
						x: isNear ? 0 : 0.045,
						y: isNear ? 0 : 0.37,
						ease: 'power3'
					}, 'resize')
					.to(plane.scale, {
						duration: 1,
						y: isNear ? visibleHeight(0, camera) * 0.7 : 1,
						x: isNear ? visibleWidth(visibleHeight(0, camera), camera) * 0.045 : 1,
						ease: 'power3',
						onComplete: () => {
							if (plane.scale.y === 1) {
								console.log('complete')
								acceptToScroll = true;
								isLockMove = false;
							}
						}
					}, 'resize')

					.to(camera.position, {
						duration: 1,
						y: isNear ? 0 : -mouse.y * 2,
						x: isNear ? 0 : mouse.x * 2,
						z: 4,
						ease: 'power3',
						onStart: () => {
							if (!isLockMove) {
								camera.position.lerp(
									new THREE.Vector3(mouse.x * 2, -mouse.y * 2, 4),
									0.05
								)
							}
						},
						// onComplete: () => {
						// 	if (!isNear) {
						// 		// console.log('complete2')
						// 		acceptToScroll = true;
						// 		isLockMove = false;
						// 	}
						// }
					}, 'resize')
			},
			onComplete: () => {
				// console.log('complete')
				if (!isNear) {

				}
			},
		}, 'resize');
}

const resizeTexture = (edge) => {
	switch (edge) {
		case 'front':
			resizeTextureInner(planeFront);
			break;
		case 'bottom':
			resizeTextureInner(planeBottom);
			break;
		case 'back':
			resizeTextureInner(planeBack);
			break;
		case 'top':
			resizeTextureInner(planeTop);
			break;
	}
}

const handleFaceClick = (event) => {
	currentEdge = intersects[0]?.object?.name;
	if (currentEdge) {
		scrollX.value = scroll / (scrollHeight - window.innerHeight);
		elapsedTimeSide = 0;
		if (!isNear) {
			window.scrollTo(0, scrollCheckPoints[currentEdge]?.scroll);
		}

		isNear = !isNear;
		if (isNear) {
			acceptToScroll = false;
			isLockMove = true;
		}
		frontRef = event.object;
		elapsedTimeSide = 0;
		intersects[0].object.material.color = new THREE.Color('rgb(255,255,255)');

		resizeTexture(currentEdge);
	}
};

const bodyBlur = () => {
	gsap.to(camera.position, {
		duration: 1,
		y: !isNear && 0,
		x: !isNear && 0,
		z: 4,
		ease: 'power3',
	})

	mouse.x = 0
	mouse.y = 0
}

const screen = document.getElementById('root');
screen.addEventListener('pointerout', bodyBlur);
window.addEventListener('mousemove', mouseMove);
window.addEventListener('click', (event) => handleFaceClick(event));
window.addEventListener('scroll', handleScroll);
window.addEventListener('wheel', preventScroll, {passive: false});

const getCurrentEdge = () => {
	if (planeFront) {
		planeFront.material.color = new THREE.Color('rgb(80,80,80)');
		planeTop.material.color = new THREE.Color('rgb(80,80,80)');
		planeBack.material.color = new THREE.Color('rgb(80,80,80)');
		planeBottom.material.color = new THREE.Color('rgb(80,80,80)');

		if (window.scrollY <= scrollCheckPoints.bottom.scroll / 2) {
			planeFront.material.color = new THREE.Color('rgb(255,255,255)')
			currentEdge = 'front';
			console.log('front');
		} else if (window.scrollY > (scrollCheckPoints.bottom.scroll / 2) &&
			window.scrollY <= (scrollCheckPoints.back.scroll / 2 + scrollCheckPoints.bottom.scroll / 2)
		) {
			planeBottom.material.color = new THREE.Color('rgb(255,255,255)')
			currentEdge = 'bottom';
			console.log('bottom');
		} else if (window.scrollY > (scrollCheckPoints.back.scroll / 2 + scrollCheckPoints.bottom.scroll / 2) &&
			window.scrollY <= (scrollHeight - window.innerHeight - scrollCheckPoints.bottom.scroll / 2)) {
			planeBack.material.color = new THREE.Color('rgb(255,255,255)')
			currentEdge = 'back';
			console.log('back');
		} else {
			planeTop.material.color = new THREE.Color('rgb(255,255,255)')
			currentEdge = 'top';
			console.log('top');
		}
	}
};

getCurrentEdge();

const tick = () => {
	const elapsedTime = clock.getElapsedTime()
	blockScroll();

	if (!isLockMove || !isNear) {
		camera.position.lerp(
			new THREE.Vector3(mouse.x * 2, -mouse.y * 2, 4),
			0.05
		)
	}

	if ([scrollCheckPoints.front.scroll].includes(window.scrollY)) {
		elapsedTimeSide = 0
	}

	//докрутка до контрольной точки
	if (!isNear && acceptToScroll) {
		prevScroll = window.scrollY;
		if (prevScroll === window.scrollY) { //если находится в покое
			if (window.scrollY > 0 && window.scrollY < scrollCheckPoints.bottom.scroll / 2) {
				elapsedTimeSide++
				rotateToCheckPoint(scrollCheckPoints.front.scroll, 'front')
			} else if (window.scrollY > (scrollCheckPoints.bottom.scroll / 2) &&
				window.scrollY < (scrollCheckPoints.back.scroll / 2 + scrollCheckPoints.bottom.scroll / 2)
			) {
				elapsedTimeSide++
				rotateToCheckPoint(scrollCheckPoints.bottom.scroll, 'bottom')
			} else if (window.scrollY > (scrollCheckPoints.back.scroll / 2 + scrollCheckPoints.bottom.scroll / 2) &&
				window.scrollY < (scrollHeight - window.innerHeight - scrollCheckPoints.bottom.scroll / 2)) {
				elapsedTimeSide++
				rotateToCheckPoint(scrollCheckPoints.back.scroll, 'back')
			} else if (window.scrollY > (scrollHeight - window.innerHeight - scrollCheckPoints.bottom.scroll / 2)) {
				elapsedTimeSide++
				rotateToCheckPoint(scrollCheckPoints.top.scroll, 'top')
			}
		}
	}

	getCurrentEdge();

	//Update controls
	controls.update() //если включён Damping для камеры необходимо её обновлять в каждом кадре

	renderer.render(scene, camera)
	window.requestAnimationFrame(tick)
}

tick()
