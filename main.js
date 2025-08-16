class TreeGallery {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.tree = null;
        this.leaves = [];
        this.photos = [];
        this.roots = []; // 存储树根
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isLoading = true;
        
        this.init();
        this.setupEventListeners();
    }

    init() {
        try {
            console.log('开始初始化3D树形画廊...');
            
            // 创建场景
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87CEEB);

            // 创建相机
            this.camera = new THREE.PerspectiveCamera(
                75,
                this.getAspect(),
                0.1,
                1000
            );
            this.camera.position.set(0, 8, 15);

            // 创建渲染器
            const canvas = document.getElementById('tree-canvas');
            if (!canvas) {
                throw new Error('找不到canvas元素');
            }
            
            this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            this.resizeRenderer();
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            console.log('渲染器创建成功');

            // 添加光源
            this.setupLighting();

            // 创建地面
            this.createGround();

            // 创建3D树
            this.createTree();

            // 轨道控制
            this.setupControls();

            // 开始渲染循环
            this.animate();

            // 隐藏加载界面
            setTimeout(() => {
                this.isLoading = false;
                const loading = document.getElementById('loading');
                if (loading) {
                    loading.style.display = 'none';
                    console.log('加载完成，隐藏加载界面');
                }
            }, 1000);

        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('初始化失败: ' + error.message);
        }
    }

    setupControls() {
        try {
            if (typeof THREE.OrbitControls !== 'undefined') {
                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.05;
                this.controls.target.set(0, 8, 0);
                this.controls.minDistance = 8;
                this.controls.maxDistance = 40;
                this.controls.minPolarAngle = 0.2;
                this.controls.maxPolarAngle = Math.PI / 2 + 0.3;
                console.log('OrbitControls 设置成功');
            } else {
                console.warn('OrbitControls 未加载，将使用基本交互');
                this.setupBasicControls();
            }
        } catch (error) {
            console.warn('OrbitControls 设置失败:', error);
            this.setupBasicControls();
        }
    }

    setupBasicControls() {
        // 基本的鼠标控制
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;

        this.renderer.domElement.addEventListener('mousedown', (event) => {
            isMouseDown = true;
            mouseX = event.clientX;
            mouseY = event.clientY;
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (isMouseDown) {
                const deltaX = event.clientX - mouseX;
                const deltaY = event.clientY - mouseY;
                
                this.camera.position.x += deltaX * 0.01;
                this.camera.position.y -= deltaY * 0.01;
                this.camera.lookAt(0, 8, 0);
                
                mouseX = event.clientX;
                mouseY = event.clientY;
            }
        });

        this.renderer.domElement.addEventListener('wheel', (event) => {
            const zoomSpeed = 0.1;
            const zoom = event.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed;
            this.camera.position.multiplyScalar(zoom);
        });
    }

    showError(message) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.innerHTML = `
                <div style="color: red; text-align: center;">
                    <h3>加载失败</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">重新加载</button>
                </div>
            `;
        }
    }

    getAspect() {
        const container = document.getElementById('tree-container');
        const width = container ? container.clientWidth : window.innerWidth;
        const height = container ? container.clientHeight : window.innerHeight;
        return Math.max(width / Math.max(1, height), 1 / 10);
    }

    resizeRenderer() {
        const container = document.getElementById('tree-container');
        const width = container ? container.clientWidth : window.innerWidth;
        const height = container ? container.clientHeight : (window.innerHeight - 200);
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / Math.max(1, height);
        this.camera.updateProjectionMatrix();
    }

    setupLighting() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
        this.scene.add(ambientLight);

        // 方向光
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
        directionalLight.position.set(10, 15, 8);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // 点光源
        const pointLight = new THREE.PointLight(0xffa500, 0.5, 100);
        pointLight.position.set(0, 12, 0);
        this.scene.add(pointLight);
    }

    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x90EE90,
            transparent: true,
            opacity: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    // 创建缠绕的树根路径
    createRootPath(rootIndex, totalRoots) {
        const points = [];
        const segments = 20;
        const height = 8;
        const baseRadius = 0.3;
        const spiralRadius = 0.8 + (totalRoots - 3) * 0.2; // 根据树根数量增加螺旋半径
        
        // 计算每个树根的起始角度
        const startAngle = (rootIndex / totalRoots) * Math.PI * 2;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const y = t * height;
            
            // 螺旋上升的路径，根据高度增加半径
            const angle = startAngle + t * Math.PI * 3 + Math.sin(t * Math.PI * 4) * 0.3;
            const radius = baseRadius + spiralRadius * Math.sin(t * Math.PI * 2) + (t * 0.3 * (totalRoots - 3));
            
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        return points;
    }

    // 创建单个树根（始终为棕色）
    createRoot(rootIndex, totalRoots) {
        const points = this.createRootPath(rootIndex, totalRoots);
        const curve = new THREE.CatmullRomCurve3(points);
        
        // 根据树根数量调整树根的粗细
        const baseRadius = 0.15;
        const radiusScale = 1 + (totalRoots - 3) * 0.1; // 树根数量越多，每个树根越粗
        const tubeRadius = baseRadius * radiusScale;
        
        // 创建树根几何体
        const tubeGeometry = new THREE.TubeGeometry(curve, 20, tubeRadius, 8, false);
        
        // 树根始终使用棕色材质
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x8B4513,
            transparent: true,
            opacity: 0.9
        });
        
        const root = new THREE.Mesh(tubeGeometry, material);
        root.castShadow = true;
        
        return root;
    }

    createTree() {
        this.tree = new THREE.Group();

        // 创建基础树根（3个）
        const baseRoots = 3;
        for (let i = 0; i < baseRoots; i++) {
            const root = this.createRoot(i, baseRoots);
            this.roots.push(root);
            this.tree.add(root);
        }

        // 用树叶组成树冠
        this.createLeafCrown();

        this.scene.add(this.tree);
        console.log('3D树创建成功');
    }

    // 创建树叶形状的几何体
    createLeafGeometry() {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0.5);
        shape.quadraticCurveTo(0.3, 0.3, 0.5, 0);
        shape.quadraticCurveTo(0.3, -0.3, 0, -0.5);
        shape.quadraticCurveTo(-0.3, -0.3, -0.5, 0);
        shape.quadraticCurveTo(-0.3, 0.3, 0, 0.5);
        
        const geometry = new THREE.ShapeGeometry(shape);
        return geometry;
    }

    createLeafCrown() {
        // 创建基础树叶材质（绿色）
        const leafMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x228B22,
            transparent: true,
            opacity: 0.8
        });

        // 在树冠区域随机分布树叶
        const leafPositions = [
            // 中心区域
            { x: 0, y: 10, z: 0 },
            { x: 0.5, y: 10.2, z: 0.3 },
            { x: -0.5, y: 10.2, z: -0.3 },
            { x: 0.3, y: 9.8, z: 0.5 },
            { x: -0.3, y: 9.8, z: -0.5 },
            
            // 左侧区域
            { x: -2, y: 8.5, z: 1 },
            { x: -2.2, y: 8.8, z: 0.8 },
            { x: -1.8, y: 8.3, z: 1.2 },
            { x: -2.5, y: 8.6, z: 0.5 },
            { x: -1.5, y: 8.7, z: 1.5 },
            
            // 右侧区域
            { x: 2, y: 8.5, z: -1 },
            { x: 2.2, y: 8.8, z: -0.8 },
            { x: 1.8, y: 8.3, z: -1.2 },
            { x: 2.5, y: 8.6, z: -0.5 },
            { x: 1.5, y: 8.7, z: -1.5 },
            
            // 前侧区域
            { x: 1, y: 9.2, z: 2.2 },
            { x: 1.2, y: 9.5, z: 2 },
            { x: 0.8, y: 9, z: 2.4 },
            { x: 1.5, y: 9.3, z: 1.8 },
            { x: 0.5, y: 9.4, z: 2.6 },
            
            // 后侧区域
            { x: -1, y: 9.2, z: -2.2 },
            { x: -1.2, y: 9.5, z: -2 },
            { x: -0.8, y: 9, z: -2.4 },
            { x: -1.5, y: 9.3, z: -1.8 },
            { x: -0.5, y: 9.4, z: -2.6 }
        ];

        leafPositions.forEach((pos, index) => {
            const leafGeometry = this.createLeafGeometry();
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            
            leaf.position.set(pos.x, pos.y, pos.z);
            leaf.rotation.set(
                (Math.random() - 0.5) * 0.5,
                Math.random() * Math.PI * 2,
                (Math.random() - 0.5) * 0.5
            );
            leaf.scale.setScalar(0.8 + Math.random() * 0.4);
            
            leaf.castShadow = true;
            this.tree.add(leaf);
        });
    }

    // 添加照片树叶
    addPhotoLeaf(photoData) {
        const leafGeometry = this.createLeafGeometry();
        const leafMaterial = new THREE.MeshBasicMaterial({ 
            transparent: true,
            side: THREE.DoubleSide
        });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);

        // 在树冠范围内随机位置
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.5 + Math.random() * 2.5;
        const height = 8 + Math.random() * 3;
        
        leaf.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );

        // 随机旋转
        leaf.rotation.set(
            (Math.random() - 0.5) * 0.6,
            Math.random() * Math.PI * 2,
            (Math.random() - 0.5) * 0.6
        );

        // 随机缩放
        const scale = 0.8 + Math.random() * 0.4;
        leaf.scale.setScalar(scale);

        // 加载照片纹理
        const loader = new THREE.TextureLoader();
        loader.load(photoData.url, (texture) => {
            if (texture.colorSpace !== undefined && THREE.SRGBColorSpace) {
                texture.colorSpace = THREE.SRGBColorSpace;
            }
            texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
            leaf.material.map = texture;
            leaf.material.needsUpdate = true;
            
            // 根据图片比例调整树叶形状
            const img = texture.image;
            if (img && img.width && img.height) {
                const aspect = img.width / img.height;
                leaf.scale.set(scale * aspect, scale, scale);
            }
        });

        // 存储照片数据
        leaf.userData = {
            photoData: photoData,
            isPhotoLeaf: true
        };

        this.leaves.push(leaf);
        this.tree.add(leaf);
        
        console.log('照片树叶添加成功:', photoData.name);
    }

    // 添加新树根（当用户上传照片时）
    addNewRoot() {
        const rootIndex = this.roots.length;
        const totalRoots = rootIndex + 1;
        
        // 创建新的树根
        const newRoot = this.createRoot(rootIndex, totalRoots);
        this.roots.push(newRoot);
        this.tree.add(newRoot);
        
        // 重新调整所有树根的位置（重新计算缠绕）
        this.recalculateRoots();
        
        console.log('新树根添加成功，当前树根数量:', this.roots.length);
    }

    recalculateRoots() {
        const totalRoots = this.roots.length;
        
        this.roots.forEach((root, index) => {
            // 移除旧的树根
            this.tree.remove(root);
            
            // 创建新的树根路径
            const points = this.createRootPath(index, totalRoots);
            const curve = new THREE.CatmullRomCurve3(points);
            
            // 根据树根数量调整树根的粗细
            const baseRadius = 0.15;
            const radiusScale = 1 + (totalRoots - 3) * 0.1;
            const tubeRadius = baseRadius * radiusScale;
            
            const tubeGeometry = new THREE.TubeGeometry(curve, 20, tubeRadius, 8, false);
            
            // 保持原有的材质
            const material = root.material;
            root.geometry.dispose();
            root.geometry = tubeGeometry;
            
            // 重新添加到树中
            this.tree.add(root);
        });
    }

    setupEventListeners() {
        // 窗口大小调整
        window.addEventListener('resize', () => {
            this.resizeRenderer();
        });

        // 鼠标点击事件
        window.addEventListener('click', (event) => {
            this.onMouseClick(event);
        });

        // 文件上传事件
        const fileInput = document.getElementById('photo-upload');
        fileInput.addEventListener('change', (event) => {
            this.handleFileUpload(event);
        });

        // 拖拽上传
        const dropZone = document.querySelector('.upload-container');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragging');
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragging');
            });
            dropZone.addEventListener('drop', async (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragging');
                const dt = e.dataTransfer;
                if (dt && dt.files && dt.files.length) {
                    await this.processFiles(dt.files);
                }
            });
        }

        // 模态框关闭事件
        const modal = document.getElementById('photo-modal');
        const closeBtn = document.querySelector('.close');
        
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    onMouseClick(event) {
        // 计算鼠标位置（基于canvas位置）
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // 射线检测
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.leaves);

        if (intersects.length > 0) {
            const leaf = intersects[0].object;
            if (leaf.userData.isPhotoLeaf) {
                this.showPhotoModal(leaf.userData.photoData);
            }
        }
    }

    async handleFileUpload(event) {
        const files = event.target.files;
        await this.processFiles(files);
        // 清空文件选择，便于再次选择相同文件
        event.target.value = '';
    }

    async processFiles(fileList) {
        for (const file of Array.from(fileList)) {
            if (!file.type.startsWith('image/')) continue;
            const compressedDataUrl = await this.compressImageFile(file, 512);
            const photoData = {
                url: compressedDataUrl,
                name: file.name,
                size: file.size,
                type: file.type,
                uploadTime: new Date().toLocaleString()
            };
            this.photos.push(photoData);
            
            // 添加新树根
            this.addNewRoot();
            
            // 添加照片树叶
            this.addPhotoLeaf(photoData);
            
            this.showUploadSuccess();
        }
    }

    compressImageFile(file, maxSize) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
                    const targetW = Math.round(img.width * ratio);
                    const targetH = Math.round(img.height * ratio);
                    canvas.width = targetW;
                    canvas.height = targetH;
                    ctx.drawImage(img, 0, 0, targetW, targetH);
                    // 统一导出为jpeg以最大化压缩；若需保留透明度可换为 image/png
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    resolve(dataUrl);
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    showPhotoModal(photoData) {
        const modal = document.getElementById('photo-modal');
        const photoTitle = document.getElementById('photo-title');
        const photoDate = document.getElementById('photo-date');
        const modalPhoto = document.getElementById('modal-photo');

        photoTitle.textContent = photoData.name;
        photoDate.textContent = `上传时间: ${photoData.uploadTime}`;
        modalPhoto.src = photoData.url;

        modal.style.display = 'block';
    }

    showUploadSuccess() {
        const successDiv = document.createElement('div');
        successDiv.className = 'upload-success';
        successDiv.textContent = '✅ 作品上传成功！新树根和树叶已添加！';
        document.body.appendChild(successDiv);

        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // 轻微的自转
        if (this.tree) {
            this.tree.rotation.y += 0.002;
        }

        if (this.controls) {
            this.controls.update();
        }

        // 树根轻微摆动
        this.roots.forEach((root, index) => {
            root.rotation.y += 0.003 * Math.sin((performance.now() * 0.001) + index);
        });

        // 树叶轻微摆动
        this.leaves.forEach((leaf, index) => {
            leaf.rotation.y += 0.006 * Math.sin((performance.now() * 0.001) + index);
        });

        this.renderer.render(this.scene, this.camera);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，开始初始化...');
    new TreeGallery();
});
